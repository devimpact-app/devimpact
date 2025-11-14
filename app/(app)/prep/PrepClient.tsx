import { PrepHero } from "./components/Hero";

type Props = {
  user: {
    id: string;
    name: string;
    image: string | null;
    githubUsername: string | null;
  };
};

export default function PrepClient({ user }: Props) {
  // Hero at top
  // Quick actions below - cards for tasks - perf review, 1:1, promotion, job search, custom (future)
  // Then in-profess stuff below that (Ex: mid year review (draft))
  // Then recent highlights and evidence at bottom
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <PrepHero userName={user.name} />
    </main>
  );
}
