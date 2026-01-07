import z from 'zod';

export const ThreadCategorySchema = z.enum([
  'features',
  'bugs_incidents',
  'tech_debt',
  'collaboration',
  'alignment',
  'skill_growth',
  'hiring',
]);
