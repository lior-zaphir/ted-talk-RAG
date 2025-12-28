import { NextResponse } from "next/server";
import { retrieveTopK } from "../../../lib/rag/retrieval";
import { chatWithContext } from "../../../lib/models/rprthpb";
import { bestTalkId, pickTopChunksFromSingleTalk, pickTopDistinctTalks } from "../../../lib/rag/selection";
import { classifyQuestion } from "../../../lib/rag/question_types";

export const runtime = "nodejs";

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

export async function POST(req: Request) {
  let body: PromptRequest;
  try {
    body = (await req.json()) as PromptRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return NextResponse.json({ error: "Missing required field: question" }, { status: 400 });

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

  // Build an augmented prompt that includes the retrieved context.
  const userPrompt = [
    `Question: ${question}`,
    ``,
    `TED dataset context (metadata + transcript chunks):`,
    context.length
      ? context
          .map(
            (c, i) =>
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

  // For the "exactly 3 titles" requirement, if we cannot supply 3 distinct talks, we must refuse.
  if (qType === "multi_title_list_exact_3" && context.length < 3) {
    return NextResponse.json({
      response: fallback,
      context,
      Augmented_prompt: {
        System: REQUIRED_SYSTEM_PROMPT,
        User: userPrompt,
      },
    });
  }

  // For "exactly 3 titles", we can respond deterministically (cheaper + guaranteed formatting).
  if (qType === "multi_title_list_exact_3") {
    const titles = context.map((c) => c.title);
    return NextResponse.json({
      response: titles.join("\n"),
      context,
      Augmented_prompt: {
        System: REQUIRED_SYSTEM_PROMPT,
        User: userPrompt,
      },
    });
  }

  // If we retrieved nothing, avoid spending tokens and return the required refusal.
  const response = context.length === 0 ? fallback : await chatWithContext({ system: REQUIRED_SYSTEM_PROMPT, user: userPrompt });

  return NextResponse.json({
    response,
    context,
    Augmented_prompt: {
      System: REQUIRED_SYSTEM_PROMPT,
      User: userPrompt,
    },
  });
}


