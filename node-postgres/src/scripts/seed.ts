import { pool } from "../config/db";
import { seedDemoData } from "../db/init";

async function main(): Promise<void> {
  try {
    await seedDemoData();
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
