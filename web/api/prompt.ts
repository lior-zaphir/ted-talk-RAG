import { retrieveTopK } from "../src/lib/rag/retrieval";
import { chatWithContext } from "../src/lib/models/rprthpb";
import { bestTalkId, pickTopChunksFromSingleTalk, pickTopDistinctTalks } from "../src/lib/rag/selection";
import { classifyQuestion } from "../src/lib/rag/question_types";

const REQUIRED_SYSTEM_PROMPT = `You are a TED Talk assistant that answers questions strictly and
only based on the TED dataset context provided to you (metadata
and transcript passages). You must not use any external
knowledge, the open internet, or information that is not explicitly
contained in the retrieved context. If the answer cannot be
determined from the provided context, respond: “I don’t know
based on the provided TED data.” Always explain your answer
using the given context, quoting or paraphrasing the relevant
transcript or metadata when helpful.`;

type PromptRequest = { question?: unknown };

function readJsonBody(req: any): PromptRequest | null {
  // Vercel Node functions may give parsed JSON (object) or a string.
  const body = req?.body;
  if (!body) return {};
  if (typeof body === "object") return body as PromptRequest;
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as PromptRequest;
    } catch {
      return null;
    }
  }
  return null;
}

export default async function handler(req: any, res: any) {
  if ((req?.method ?? "GET").toUpperCase() !== "POST") {
    res.statusCode = 405;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Method Not Allowed" }));
    return;
  }

  const body = readJsonBody(req);
  if (body === null) {
    res.statusCode = 400;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Invalid JSON body" }));
    return;
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    res.statusCode = 400;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Missing required field: question" }));
    return;
  }

  try {
    const qType = classifyQuestion(question);

    // Retrieve more for listing to increase the odds of finding 3 distinct talks.
    const retrievalTopK = qType === "multi_title_list_exact_3" ? 20 : undefined;
    const rawContext = await retrieveTopK({ question, topK: retrievalTopK });

    let context = rawContext;
    if (qType === "multi_title_list_exact_3") {
      context = pickTopDistinctTalks({ chunks: rawContext, limit: 3 });
    } else if (qType === "precise_fact" || qType === "summary" || qType === "recommendation") {
      const talkId = bestTalkId(rawContext);
      context = talkId ? pickTopChunksFromSingleTalk({ chunks: rawContext, talkId, limit: 3 }) : [];
    } else {
      context = rawContext.slice(0, 8);
    }

    const userPrompt = [
      `Question: ${question}`,
      ``,
      `TED dataset context (metadata + transcript chunks):`,
      context.length
        ? context
            .map(
              (c: any, i: number) =>
                `[#${i + 1}] talk_id=${c.talk_id} | title="${c.title}"${
                  c.speaker_1 ? ` | speaker_1="${c.speaker_1}"` : ""
                } | score=${c.score}\nchunk:\n${c.chunk}`,
            )
            .join("\n\n")
        : "(no relevant context retrieved)",
      ``,
      `Rules:`,
      `- Only use the provided TED dataset context.`,
      `- If the answer cannot be determined from the provided context, respond exactly: “I don’t know based on the provided TED data.”`,
      `- If asked for a list of exactly 3 talk titles, output exactly 3 distinct titles (no extra text).`,
    ].join("\n");

    const fallback = "I don’t know based on the provided TED data.";

    if (qType === "multi_title_list_exact_3" && context.length < 3) {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          response: fallback,
          context,
          Augmented_prompt: { System: REQUIRED_SYSTEM_PROMPT, User: userPrompt },
        }),
      );
      return;
    }

    if (qType === "multi_title_list_exact_3") {
      const titles = context.map((c: any) => c.title);
      res.statusCode = 200;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          response: titles.join("\n"),
          context,
          Augmented_prompt: { System: REQUIRED_SYSTEM_PROMPT, User: userPrompt },
        }),
      );
      return;
    }

    const response =
      context.length === 0 ? fallback : await chatWithContext({ system: REQUIRED_SYSTEM_PROMPT, user: userPrompt });

    res.statusCode = 200;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        response,
        context,
        Augmented_prompt: { System: REQUIRED_SYSTEM_PROMPT, User: userPrompt },
      }),
    );
  } catch (err: any) {
    // Important: if env vars are missing on Vercel, this will likely throw.
    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Internal Server Error", message: String(err?.message ?? err) }));
  }
}


