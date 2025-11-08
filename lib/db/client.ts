import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const queryClient = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
  max: 5,
  idle_timeout: 10,
});

export const db = drizzle(queryClient, { schema });
export const sql = queryClient; // Keep for raw queries

export async function closeDb() {
  await queryClient.end({ timeout: 1 });
}
