import * as Sentry from '@sentry/nextjs';
import { auth } from '@/lib/auth';
import { NextRequest } from 'next/server';

type AnyRouteHandler = (...args: any[]) => Promise<any> | any;

export const withSentryUser = <T extends AnyRouteHandler>(handler: T) => {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const req = args[0] as NextRequest | Request | undefined;

    return Sentry.withScope(async (scope) => {
      const session = await auth();

      if (session?.user?.id) {
        const user = session.user;

        scope.setUser({ id: user.id, email: user.email ?? undefined });

        // Searchable tags
        scope.setTag('user_id', user.id);
        if (user.email) {
          scope.setTag('user_email', user.email);
        }

        // Extra context (non-searchable, but visible in event)
        scope.setContext('User Session Details', {
          id: user.id,
          email: user.email,
          // add more fields as needed
        });
      } else {
        // clear any user on this scope
        scope.setUser(null);
      }

      if (req?.url) {
        const url = new URL(req.url);
        scope.setTag('api_route', url.pathname);
      }

      // Forward ALL original args (req, ctx, etc.)
      return (await handler(...args)) as ReturnType<T>;
    }) as Promise<ReturnType<T>>;
  };
};
