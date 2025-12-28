import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { mustGetEnvAny } from "../env";
import { CHAT_MODEL, EMBEDDING_MODEL } from "../rag/config";

function resolveAuth() {
  const { name: keyName, value: apiKey } = mustGetEnvAny(["LLMOD_API_KEY", "RPRTHPB_API_KEY"]);
  const baseURL =
    process.env.LLMOD_BASE_URL ??
    (keyName === "LLMOD_API_KEY" ? "https://api.llmod.ai/v1" : undefined) ??
    process.env.RPRTHPB_BASE_URL;
  return { apiKey, baseURL };
}

let _embeddings: OpenAIEmbeddings | null = null;
function getEmbeddings(): OpenAIEmbeddings {
  if (_embeddings) return _embeddings;
  const { apiKey, baseURL } = resolveAuth();
  _embeddings = new OpenAIEmbeddings({
    model: EMBEDDING_MODEL,
    apiKey,
    configuration: baseURL ? { baseURL } : undefined,
  });
  return _embeddings;
}

// Exported for LangChain vector store integrations (e.g., PineconeStore)
export function getLangChainEmbeddings(): OpenAIEmbeddings {
  return getEmbeddings();
}

let _chat: ChatOpenAI | null = null;
function getChat(): ChatOpenAI {
  if (_chat) return _chat;
  const { apiKey, baseURL } = resolveAuth();
  _chat = new ChatOpenAI({
    model: CHAT_MODEL,
    // NOTE: LLMOD/litellm may reject unsupported params for some gpt-5* models.
    // We omit temperature to avoid 400s like: "gpt-5 models don't support temperature=0".
    apiKey,
    configuration: baseURL ? { baseURL } : undefined,
  });
  return _chat;
}

export async function embedText(input: string): Promise<number[]> {
  const embeddings = getEmbeddings();
  return await embeddings.embedQuery(input);
}

export async function chatWithContext(args: { system: string; user: string }): Promise<string> {
  const chat = getChat();
  const res = await chat.invoke([new SystemMessage(args.system), new HumanMessage(args.user)]);
  const content = typeof res.content === "string" ? res.content : JSON.stringify(res.content);
  if (!content) throw new Error("Chat response missing content");
  return content;
}


