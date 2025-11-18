"use server";

import { signIn } from "@/lib/auth";

export async function loginWithGithub(formData: FormData) {
  const betaCode = formData.get("betaCode")?.toString() || "";

  const redirectTo = betaCode
    ? `/onboarding?beta=${encodeURIComponent(betaCode)}`
    : "/onboarding";

  await signIn("github", { redirectTo });
}
