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
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || !profile || !user.email) return false;

      const userName = user.name || null;
      const userEmail = user.email;
      const githubLogin = (profile as any).login;

      try {
        // Check if user exists
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, userEmail))
          .limit(1);

        let userId: string;

        if (existingUser.length === 0) {
          // Create new user
          const [newUser] = await db
            .insert(users)
            .values({
              email: userEmail,
              fullName: userName,
              githubUsername: githubLogin,
            })
            .returning({ id: users.id });

          userId = newUser.id;
        } else {
          // Update existing user
          await db
            .update(users)
            .set({
              fullName: userName,
              githubUsername: githubLogin,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser[0].id));

          userId = existingUser[0].id;
        }

        // Store GitHub access token
        if (account.access_token) {
          const refreshToken = account.refresh_token || null;
          const expiresAt = account.expires_at
            ? new Date(account.expires_at * 1000)
            : null;

          await db
            .insert(integrationTokens)
            .values({
              userId,
              provider: "github",
              tokenType: "oauth",
              accessToken: account.access_token,
              refreshToken,
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
                refreshToken,
                expiresAt,
                updatedAt: new Date(),
              },
            });
        }

        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return false;
      }
    },
    async session({ session, token }) {
      if (session.user && session.user.email) {
        const [dbUser] = await db
          .select({
            id: users.id,
            githubUsername: users.githubUsername,
            onboardingState: users.onboardingState,
          })
          .from(users)
          .where(eq(users.email, session.user.email))
          .limit(1);

        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.githubUsername = dbUser.githubUsername;
          session.user.onboardingState = dbUser.onboardingState;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
