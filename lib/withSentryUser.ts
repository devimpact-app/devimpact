import * as Sentry from '@sentry/nextjs';
import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';

type AnyRouteHandler = (...args: any[]) => any;

export const withSentryUser = <T extends AnyRouteHandler>(handler: T) => {
  return (...args: Parameters<T>): ReturnType<T> => {
    const req = args[0] as NextRequest | Request | undefined;

    const result = Sentry.withScope((scope) => {
      return (async () => {
        const session = await auth();

        if (session?.user?.id) {
          const user = session.user;

          scope.setUser({ id: user.id, email: user.email ?? undefined });

          scope.setTag('user_id', user.id);
          if (user.email) {
            scope.setTag('user_email', user.email);
          }

          scope.setContext('User Session Details', {
            id: user.id,
            email: user.email,
          });
        } else {
          scope.setUser(null);
        }

        if (req?.url) {
          const url = new URL(req.url);
          scope.setTag('api_route', url.pathname);
        }

        // forward to the real handler
        return handler(...args);
      })();
    });

    return result as ReturnType<T>;
  };
};
