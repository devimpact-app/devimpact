import * as Sentry from '@sentry/nextjs';
import { auth } from '@/lib/auth';

export function withSentryUser(handler: Function) {
  return async (...args: any[]) => {
    const session = await auth();

    Sentry.withScope((scope) => {
      if (session?.user?.id) {
        scope.setUser({
          id: session.user.id,
          email: session.user.email ?? undefined,
        });
      }
    });

    return handler(...args);
  };
}
