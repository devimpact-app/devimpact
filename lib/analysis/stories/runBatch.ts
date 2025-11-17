import { generateCollaborationPatternsStory } from "./generateCollaborationPatterns";
import { generateInvisibleLoad } from "./generateInvisibleLoad";
import { StoryCard, StoryContext, StoryGenerator, StoryId } from "./types";

const storyRegistry: Record<StoryId, StoryGenerator> = {
  "invisible_load.v1": generateInvisibleLoad,
  "collaboration_patterns.v1": generateCollaborationPatternsStory,
};

export async function generateStoriesBatch(
  ctx: StoryContext,
  storyIds?: StoryId[],
): Promise<StoryCard[]> {
  const ids = storyIds ?? (Object.keys(storyRegistry) as StoryId[]);
  const generators = ids.map((id) => storyRegistry[id]);

  const results = await Promise.all(generators.map((gen) => gen(ctx)));

  // Filter out null/disabled stories
  return results.filter((s): s is StoryCard => Boolean(s));
}
