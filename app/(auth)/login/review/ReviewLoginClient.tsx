'use client';

import { signIn } from 'next-auth/react';
import { useEffect } from 'react';

export function ReviewLoginClient({ token }: { token?: string }) {
  useEffect(() => {
    if (!token) return;
    signIn('review', { token, redirect: true, callbackUrl: '/dashboard' });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white/80">
      Signing you in…
    </div>
  );
}
