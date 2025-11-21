import { db } from "@/lib/db/client";
import { User, users } from "@/lib/db/schema";
import { hashCliToken } from "@/lib/utils/crypto";
import { eq } from "drizzle-orm";

export async function getUserFromCliToken(
  rawToken: string,
): Promise<User | null> {
  const hashed = hashCliToken(rawToken);

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.cliTokenHash, hashed))
    .limit(1);

  return rows[0] ?? null;
}
