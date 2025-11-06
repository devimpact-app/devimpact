import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { integrationTokens, users } from "@/lib/db/schema";
import { and, eq, not } from "drizzle-orm";
import DataSourceChoice from "./components/DataSourceChoice";
import WaitingForApproval from "./components/WaitingForApproval";
import RepoSelector from "./components/RepoSelector";
import SyncingPage from "./components/SyncingLoader";
import GridTest from "./components/GridTest";

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
      return (
        <DataSourceChoice
          userId={user.id}
          githubUsername={session.user.githubUsername}
        />
      );

    case "gh_app_pending":
      return <WaitingForApproval type="github_app" />;

    case "fg_pat_pending":
      return <WaitingForApproval type="fine_grained_pat" />;

    case "gh_app_approved":
    case "fg_pat_approved":
      return <RepoSelector />;

    case "syncing":
      return <SyncingPage />;

    case "complete":
      redirect("/dashboard");

    default:
      // Fallback to data source choice if unknown state
      return (
        <DataSourceChoice
          userId={user.id}
          githubUsername={session.user.githubUsername}
        />
      );
  }
}
