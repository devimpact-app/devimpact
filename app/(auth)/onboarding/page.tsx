import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import SyncingPage from "./components/SyncingLoader";
import { unstable_noStore as noStore } from "next/cache";

function assertNever(x: never): never {
  throw new Error(`Unhandled onboarding state: ${x}`);
}

export default async function OnboardingPage() {
  noStore();

  const session = await auth();
  const userFromSession = session?.user;

  if (!userFromSession?.id || !userFromSession.githubUsername) {
    redirect("/login");
  }

  const [user] = await db
    .select({
      id: users.id,
      onboardingState: users.onboardingState,
    })
    .from(users)
    .where(eq(users.id, userFromSession.id))
    .limit(1);

  if (!user) {
    redirect("/login");
  }

  const state = user.onboardingState ?? "need_data_source";

  switch (state) {
    case "need_data_source":
      redirect("/onboarding/cli");
    // case "token_provided":
    //   redirect("/onboarding/repos");
    case "syncing":
      return <SyncingPage />;
    case "complete":
      redirect("/dashboard");
    default:
      // Ensure we catch new states at build time
      assertNever(state as never);
  }
}
