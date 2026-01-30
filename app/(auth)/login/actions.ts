'use server';

import { signIn } from '@/lib/auth';

export async function loginWithGithub(formData: FormData) {
  const redirectTo = '/onboarding';

  await signIn('github', { redirectTo });
}
