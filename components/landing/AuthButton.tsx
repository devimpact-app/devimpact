import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

function btnClassName() {
  return `
    rounded-xl border border-[#283047]
    bg-transparent px-4 py-2
    text-sm font-medium text-[#E2E6FF]
    hover:bg-white/5 hover:border-[#3B4A78]
    transition
  `;
}

export async function NavAuthButton({ code }: { code?: string }) {
  const session = await auth();
  const loginHref = `/login${code ? `?code=${encodeURIComponent(code)}` : ''}`;

  if (!session?.user?.id) {
    return (
      <Link href={loginHref} className={btnClassName()}>
        Log in
      </Link>
    );
  }

  const [row] = await db
    .select({ setupState: users.setupState })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const ready = Boolean(row?.setupState.ready);

  const href = ready ? '/dashboard' : '/onboarding';
  const label = ready ? 'Go to dashboard' : 'Continue setup';

  return (
    <Link href={href} className={btnClassName()}>
      {label}
    </Link>
  );
}
