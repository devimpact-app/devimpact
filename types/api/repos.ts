import z from 'zod';

export const AvailableGithubRepoSchema = z.object({
  id: z.string(),
  isSelected: z.boolean(),
  githubRepoId: z.string(),
  owner: z.string(),
  name: z.string(),
  fullName: z.string(),
  isPrivate: z.boolean(),
  pushedAt: z.date().nullable(),
});

export type AvailableGithubRepo = z.infer<typeof AvailableGithubRepoSchema>;

export const AvailableGithubResponseSchema = z.object({
  repos: z.array(AvailableGithubRepoSchema),
});

export type AvailableGithubResponse = z.infer<
  typeof AvailableGithubResponseSchema
>;

export const RepoSelectionInputSchema = z.object({
  selectedRepoIds: z.array(z.string()),
});
