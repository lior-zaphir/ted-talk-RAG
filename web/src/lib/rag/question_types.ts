export type QuestionType =
  | "multi_title_list_exact_3"
  | "precise_fact"
  | "summary"
  | "recommendation"
  | "generic";

export function classifyQuestion(question: string): QuestionType {
  const q = (question ?? "").toLowerCase();

  const asksExact3 =
    (q.includes("exactly 3") || q.includes("exactly three")) &&
    (q.includes("list") || q.includes("titles") || q.includes("talk titles"));
  if (asksExact3) return "multi_title_list_exact_3";

  const asksRecommend = q.includes("recommend") || q.includes("which talk would you recommend");
  if (asksRecommend) return "recommendation";

  const asksSummary =
    q.includes("summary") ||
    q.includes("summar") ||
    q.includes("key idea") ||
    q.includes("main idea") ||
    (q.includes("provide the title") && q.includes("short summary"));
  if (asksSummary) return "summary";

  const asksFind = q.startsWith("find ") || q.includes("find a ted talk") || q.includes("find a talk");
  const asksProvideTitleSpeaker = q.includes("title") && (q.includes("speaker") || q.includes("speaker_1"));
  if (asksFind || asksProvideTitleSpeaker) return "precise_fact";

  return "generic";
}


