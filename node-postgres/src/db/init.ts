import bcrypt from "bcrypt";
import { pool } from "../config/db";
import { env } from "../config/env";

const BCRYPT_ROUNDS = 10;

export async function initDb(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user'
      );
    `);

    const countUsersRes = await pool.query<{ count: string }>("SELECT count(*) FROM users");
    if (countUsersRes.rows[0].count === "0") {
      if (env.seed.demoUsers) {
        if (!env.seed.adminPassword || !env.seed.userPassword) {
          console.warn(
            "SEED_DEMO_USERS=true, but SEED_ADMIN_PASSWORD and/or SEED_USER_PASSWORD are empty — skipping seed.",
          );
        } else {
          const adminHash = await bcrypt.hash(env.seed.adminPassword, BCRYPT_ROUNDS);
          const userHash = await bcrypt.hash(env.seed.userPassword, BCRYPT_ROUNDS);
          await pool.query(
            "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3), ($4, $5, $6)",
            [
              env.seed.adminUsername,
              adminHash,
              "admin",
              env.seed.userUsername,
              userHash,
              "user",
            ],
          );
          console.log("Демонстрационные пользователи добавлены.");
        }
      }
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        year INTEGER NOT NULL,
        image TEXT,
        owner_id VARCHAR(255),
        url TEXT
      );
    `);

    try {
      await pool.query(`ALTER TABLE books ADD COLUMN owner_id VARCHAR(255);`);
    } catch {
      /* column may exist */
    }
    try {
      await pool.query(`ALTER TABLE books ADD COLUMN url TEXT;`);
    } catch {
      /* column may exist */
    }

    const countRes = await pool.query<{ count: string }>("SELECT count(*) FROM books");
    if (countRes.rows[0].count === "0") {
      await pool.query(`
        INSERT INTO books (title, author, year, owner_id) VALUES
        ('Мастер и Маргарита', 'Михаил Булгаков', 1967, 'system'),
        ('Война и мир', 'Лев Толстой', 1869, 'system'),
        ('Преступление и наказание', 'Фёдор Достоевский', 1866, 'system')
      `);
      console.log("Начальные данные добавлены.");
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
        issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
        returned_at TIMESTAMP NULL
      );
    `);
    await pool.query(`
      ALTER TABLE loans DROP CONSTRAINT IF EXISTS loans_book_id_fkey;
    `);
    await pool.query(`
      ALTER TABLE loans
      ADD CONSTRAINT loans_book_id_fkey
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE;
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_loans_book_active ON loans(book_id) WHERE returned_at IS NULL;
    `);

    const countLoansRes = await pool.query<{ count: string }>("SELECT count(*) FROM loans");
    if (env.seed.demoUsers && countLoansRes.rows[0].count === "0") {
      const userResult = await pool.query<{ id: number }>(
        "SELECT id FROM users WHERE username = $1 LIMIT 1",
        [env.seed.userUsername],
      );
      const booksResult = await pool.query<{ id: number }>(
        "SELECT id FROM books ORDER BY id ASC LIMIT 2",
      );

      if (userResult.rows.length > 0 && booksResult.rows.length > 0) {
        const userId = userResult.rows[0].id;
        const firstBookId = booksResult.rows[0].id;
        const secondBookId = (booksResult.rows[1] ?? booksResult.rows[0]).id;

        await pool.query(
          `INSERT INTO loans (user_id, book_id, issued_at, returned_at)
           VALUES ($1, $2, NOW() - INTERVAL '14 days', NOW() - INTERVAL '7 days'),
                  ($3, $4, NOW() - INTERVAL '2 days', NULL)`,
          [userId, firstBookId, userId, secondBookId],
        );
      }
    }
  } catch (err) {
    console.error("Ошибка инициализации БД:", err);
  }
}
