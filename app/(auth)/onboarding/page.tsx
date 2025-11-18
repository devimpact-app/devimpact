import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { unstable_noStore as noStore } from "next/cache";

function assertNever(x: never): never {
  throw new Error(`Unhandled onboarding state: ${x}`);
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ beta?: string }>;
}) {
  noStore();

  const params = await searchParams;
  const betaCode = params.beta;

  const session = await auth();
  const userFromSession = session?.user;

  if (!userFromSession?.id || !userFromSession.githubUsername) {
    redirect("/login");
  }

  if (betaCode && betaCode === process.env.BETA_ACCESS_CODE) {
    await db
      .update(users)
      .set({ betaAllowed: true })
      .where(eq(users.id, userFromSession.id));
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userFromSession.id))
    .limit(1);

  if (!user || !user.betaAllowed) {
    redirect("/login");
  }

  const state = user.onboardingState ?? "account_created";

  switch (state) {
    case "account_created":
    case "cli_pending":
    case "cli_linked":
    case "syncing":
      redirect("/onboarding/cli");
    case "synced":
      redirect("/dashboard");
    default:
      // Ensure we catch new states at build time
      assertNever(state as never);
  }
}
