import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import SyncingPage from "./components/SyncingLoader";

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id || !session.user.githubUsername) {
    redirect("/login");
  }

  // Fetch user with onboarding state
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    redirect("/login");
  }

  switch (user.onboardingState) {
    case "need_data_source":
    case null:
    case undefined:
      redirect("/onboarding/setup");

    case "token_provided":
      redirect("/onboarding/repos");

    case "syncing":
      return <SyncingPage />;

    case "complete":
      redirect("/dashboard");

    default:
      redirect("/onboarding/setup");
  }
}
