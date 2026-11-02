import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "../src/db";

async function main() {
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Database migrations applied.");
  } finally { await pool.end(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
