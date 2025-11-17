import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TimelineClient from "./TimelineClient";

export default async function TimelinePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = {
    id: session.user.id,
    name: session.user.name ?? "",
    image: session.user.image ?? null,
    githubUsername: session.user.githubUsername ?? null,
  };

  return <TimelineClient user={user} />;
}
