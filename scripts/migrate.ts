import "dotenv/config";
import postgres from "postgres";
import fs from "fs";
import path from "path";

async function runMigrations() {
  // Check if DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not found in environment");
    console.log("\nMake sure you have .env.local with:");
    console.log('DATABASE_URL="postgresql://..."');
    process.exit(1);
  }

  console.log("🔌 Connecting to database...");
  console.log(`URL: ${process.env.DATABASE_URL.replace(/:[^:@]+@/, ":****@")}`); // Hide password

  const sql = postgres(process.env.DATABASE_URL, {
    ssl: "require", // Supabase requires SSL
    max: 1, // Only need 1 connection for migrations
  });

  try {
    // Test connection
    await sql`SELECT 1 as test`;
    console.log("✅ Connected successfully!\n");
  } catch (error) {
    console.error("❌ Connection failed:", error);
    process.exit(1);
  }

  const migrationsDir = path.join(process.cwd(), "lib/db/migrations");

  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.log("⚠️  No migration files found");
    process.exit(0);
  }

  console.log("🚀 Running migrations...\n");

  for (const file of files) {
    console.log(`Running ${file}...`);
    const filePath = path.join(migrationsDir, file);
    const migration = fs.readFileSync(filePath, "utf-8");

    try {
      await sql.unsafe(migration);
      console.log(`✅ ${file} completed\n`);
    } catch (error) {
      console.error(`❌ ${file} failed:`, error);
      await sql.end();
      process.exit(1);
    }
  }

  console.log("✨ All migrations completed!");
  await sql.end();
  process.exit(0);
}

runMigrations();
