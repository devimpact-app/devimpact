'use client';

import { useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

export default function ReviewLoginPage() {
  const params = useSearchParams();
  const token = params.get('t');

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
