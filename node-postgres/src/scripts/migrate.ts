import { pool } from "../config/db";
import { migrateSchema } from "../db/init";

async function main(): Promise<void> {
  try {
    await migrateSchema();
    console.log("Schema migrated.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
