'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

type User = {
  id: string;
  email?: string;
};

export function SentryUserBridge({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (user?.id) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [user?.id, user?.email]);

  return <>{children}</>;
}
