import { sql } from "@/lib/db/client";

export async function fetchUserCommits(userId: string) {
  // 1. Get user's GitHub token
  const tokens = await sql`
    SELECT access_token FROM integration_tokens
    WHERE user_id = ${userId} AND provider = 'github'
  `;

  if (!tokens.length) throw new Error("No GitHub token");

  // 2. Fetch from GitHub
  // 3. Store in cached_data table
  // 4. Return summary
}
