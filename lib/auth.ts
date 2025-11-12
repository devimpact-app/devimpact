import "server-only";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "./db/client";
import { users, integrationTokens } from "./db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email",
        },
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user?.email) return false;
      const githubLogin = (profile as any)?.login ?? null;
      const fullName = user.name ?? null;
      const email = user.email;

      const result = await db.transaction(async (tx) => {
        const [found] = await tx
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        let userId;
        if (!found) {
          const [created] = await tx
            .insert(users)
            .values({
              email,
              fullName,
              githubUsername: githubLogin,
            })
            .returning({ id: users.id });
          userId = created.id;
        } else {
          await tx
            .update(users)
            .set({
              fullName,
              githubUsername: githubLogin,
              updatedAt: new Date(),
            })
            .where(eq(users.id, found.id));
          userId = found.id;
        }
        return userId;
      });

      if (account?.access_token) {
        const expiresAt = account.expires_at
          ? new Date(account.expires_at * 1000)
          : null;
        await db
          .insert(integrationTokens)
          .values({
            userId: result,
            provider: "github",
            tokenType: "oauth",
            accessToken: account.access_token,
            refreshToken: account.refresh_token ?? null,
            expiresAt,
          })
          .onConflictDoUpdate({
            target: [
              integrationTokens.userId,
              integrationTokens.provider,
              integrationTokens.tokenType,
            ],
            set: {
              accessToken: account.access_token,
              refreshToken: account.refresh_token ?? null,
              expiresAt,
              updatedAt: new Date(),
            },
          });
      }

      (account as any).__userId = result;
      (account as any).__githubLogin = githubLogin;
      return true;
    },
    async jwt({ token, account }) {
      // On initial sign-in, account is present; grab user id we stashed
      if (account && (account as any).__userId) {
        const accountUserId = (account as any).__userId;
        token.uid = accountUserId;
        token.githubUsername = (account as any).__githubLogin ?? null;

        // Fetch any extra user fields once (on initial sign-in only)
        const [u] = await db
          .select({
            onboardingState: users.onboardingState,
          })
          .from(users)
          .where(eq(users.id, accountUserId));
        token.onboardingState = u?.onboardingState ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.githubUsername = (token.githubUsername as string) ?? null;
        session.user.onboardingState =
          (token.onboardingState as string) ?? null;
      }
      return session;
    },
  },
});
