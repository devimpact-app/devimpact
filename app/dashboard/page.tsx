import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import PatInput from "@/components/dashboard/PatInput";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-bold">Eng Coach</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{session.user.name}</span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold mb-4">
          Welcome back, {session.user.name?.split(" ")[0]}! 👋
        </h2>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold mb-2">Connect Org Repos</h3>
          <p className="text-gray-600 text-sm mb-4">
            Add a Classic PAT to track commits from your organization's private
            repos
          </p>
          <PatInput />
        </div>

        <p className="text-gray-600">
          Your engineering coach dashboard is coming soon...
        </p>
      </main>
    </div>
  );
}
