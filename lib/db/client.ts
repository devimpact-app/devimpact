// lib/db/client.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const queryClient = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
  max: 10,
});

export const db = drizzle(queryClient, { schema });
export const sql = queryClient; // Keep for raw queries
