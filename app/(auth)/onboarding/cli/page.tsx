import { CliSetupPageShell } from "./CliSetupPage";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function CliSetupPageLoader() {
  const session = await auth();
  const userFromSession = session?.user;

  if (!userFromSession?.id || !userFromSession.githubUsername) {
    redirect("/login");
  }

  return <CliSetupPageShell userName={userFromSession.name} />;
}
