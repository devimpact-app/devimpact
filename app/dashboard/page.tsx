import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = {
    id: session.user.id,
    name: session.user.name ?? "",
    image: session.user.image ?? null,
    githubUsername: session.user.githubUsername ?? null,
  };

  return <DashboardClient user={user} />;
}
