import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'; // adjust import if you're using the new API
import { PR_DOMAIN_VOCAB, PR_TYPE_VOCAB, PRSummarizationInput } from './types';

export function buildPrSummaryPrompt(
  input: PRSummarizationInput
): ChatCompletionMessageParam[] {
  const system: ChatCompletionMessageParam = {
    role: 'system',
    content: [
      'You are an assistant that summarizes GitHub pull requests for an engineer’s personal log. Focus on what changed and why it mattered; treat comments as supporting context only.',
      'Your goal is to turn raw PR and review metadata into concise, human, non-buzzwordy summaries.',
      '',
      'Constraints:',
      "- Be concrete and specific; avoid generic phrases like 'various improvements' or 'general refactors'.",
      "- Do not invent code details that aren't implied by the input.",
      '- Do not speculate about motivation (‘to improve X’) unless it’s stated in title/body/comments.',
      '- Focus on what changed and why it mattered, not process ceremony.',
      '- Keep tone neutral and professional, not salesy.',
      '',
      'Output strictly as a compact JSON object with keys:',
      '  shortSummary, longSummary, highlights, typeTags, domainTags.',
      'typeTags and domainTags should reflect the PR itself (not the reviewer’s feedback).',
      'Do not include any extra commentary or markdown.',
    ].join('\n'),
  };

  const typeTagList = PR_TYPE_VOCAB.join(', ');
  const domainTagList = PR_DOMAIN_VOCAB.join(', ');

  const user: ChatCompletionMessageParam = {
    role: 'user',
    content: [
      'Here is structured metadata about a single pull request.',
      'Use it to produce a concise summary of what happened in the PR (what changed + why), appropriate for an engineer’s personal log. The engineer may have authored or reviewed it; the goal is the same.',
      '',
      'PR data (JSON):',
      JSON.stringify(input, null, 2),
      '',
      'Output format:',
      'Return a single JSON object with the following shape:',
      '{',
      '  "shortSummary": string,',
      '  "longSummary": string,',
      '  "highlights": string[],',
      '  "typeTags": string[],',
      '  "domainTags": string[],',
      '}',
      '',
      'Field requirements:',
      '- shortSummary: 1–2 sentences describing what this PR accomplished in plain, grounded language.',
      '- longSummary: 3–6 sentences: what changed, why, and any notable context (e.g., major scope, key areas touched, or a major blocking concern if present).',
      '- highlights: 3–6 short, factual highlight lines (no bullet characters). Prioritize impact, scope, collaboration, or changes over time. Each highlight should stand alone as a fragment or short sentence. Highlights should not repeat the same sentence with minor rewording; each should add a distinct fact.',
      '',
      '- typeTags: 1-3 short lowercase tags describing the nature of the work. You MUST choose only from the allowed type tag list below.',
      '- domainTags: 1–3 tags describing where the work happened in the stack. You MUST choose only from the allowed domain tag list below.',
      '- typeTags must contain at least 1 tag and domainTags must contain at least 1 tag.',
      '',
      'Allowed typeTags (choose only from this list, do not invent new ones):',
      typeTagList,
      '',
      'Allowed domainTags (choose only from this list, do not invent new ones):',
      domainTagList,
      '',
      'Tag guidelines:',
      '- typeTags should describe what kind of work this was (e.g., features vs bugfixes vs refactors).',
      '- domainTags should reflect the main areas of the codebase touched (e.g., frontend vs backend vs infra).',
      '- It is OK to pick multiple tags when they clearly apply, but avoid over-tagging.',
      '- Do NOT create new tag words or synonyms. Choose the closest tags only if they’re genuinely applicable; otherwise choose fewer tags rather than incorrect tags.',
      '',
      'Interpretation guidelines:',
      '- Metrics fields represent aggregate information about the PR, not code content.',
      '- notableComments and firstBlockingReview provide context about concerns or decisions; do not treat them as exhaustive or definitive. Never include code snippets.',
      '- If notableComments exist, treat them as ‘notable discussion points’ not ‘what the PR is about’.',
      "- Use file information only to infer approximate scope (for example, 'touches frontend components'); do not guess implementation details.",
      '- Time-related fields provide context only; mention delays neutrally if they matter.',
      '- When inferring domainTags, rely primarily on file extensions and directories. Use PR title/body first; use files only to infer surface area. If PR body is empty/unhelpful, lean more on title + file summary + notableComments.',
      '- Ignore context.perspective unless it helps avoid incorrect claims (e.g., don’t say ‘I implemented’ when the engineer is the reviewer). Prefer neutral phrasing like ‘This PR…’.',
      '',
      'If the PR is small, keep everything tight and avoid overstating impact.',
      'If reviewRounds is high, you may mention it neutrally as iteration (no blame).',
    ].join('\n'),
  };

  return [system, user];
}
