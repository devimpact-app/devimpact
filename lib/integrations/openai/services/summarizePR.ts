import { openai } from "../client";
import { AiConfig } from "../config";
import { PRSummary } from "../types";
import { SYSTEM_PR_SUMMARY } from "../prompts/prSummary";
import { withRetry } from "../utils/retry";
import { safeJson } from "../utils/json";

export async function summarizePR(input: {
  title: string;
  description?: string;
  reviews?: string[];
  filesChangedSample?: string[]; // optional list of filenames
}) {
  const user = `
Title: ${input.title}
Description: ${input.description ?? "(none)"}
Reviews (snippets): 
${
  (input.reviews ?? [])
    .slice(0, 6)
    .map((r, i) => `- ${r}`)
    .join("\n") || "(none)"
}
Files changed: ${input.filesChangedSample?.slice(0, 10).join(", ") || "(not provided)"}
`;

  const run = () =>
    openai.chat.completions.create({
      model: AiConfig.models.summarize,
      ...AiConfig.json,
      messages: [
        { role: "system", content: SYSTEM_PR_SUMMARY },
        { role: "user", content: user },
      ],
    });

  const res = await withRetry(run);
  const content = res.choices[0]?.message?.content ?? "{}";
  return safeJson<PRSummary>(content);
}
