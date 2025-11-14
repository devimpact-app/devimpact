import { ReactNode } from "react";
import { auth } from "@/lib/auth"; // your NextAuth server helper
import { redirect } from "next/navigation";
import { Sidebar } from "./Sidebar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // Gate: must be logged in
  if (!session?.user?.id) redirect("/login");
  const sessionUser = session.user;

  // Gate: must have completed onboarding
  // Assuming you store onboardingState on session.user
  const state = session.user.onboardingState ?? null;
  // if (state !== "complete") redirect("/onboarding");

  return (
    <div className="h-screen w-screen flex bg-background text-text-primary overflow-x-hidden">
      <Sidebar userName={sessionUser.name} avatarUrl={sessionUser.image} />
      <div className="flex flex-col flex-1">
        <main className="flex-1 overflow-y-auto no-scrollbar">
          <div className="min-h-screen bg-background text-text-primary">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
