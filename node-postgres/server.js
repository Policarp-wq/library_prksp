require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.PGUSER || 'postgres',
  host: process.env.PGHOST || 'localhost',
  database: process.env.PGDATABASE || 'books_db',
  password: process.env.PGPASSWORD || 'password',
  port: process.env.PGPORT || 5432,
});

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';
const ALLOWED_ROLES = new Set(["admin", "user"]);
const BOOK_QUERY_PATTERN = /^[\p{L}\p{N}\s\-'.]+$/u;

function isNonEmptyTrimmedString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidUsername(value) {
  if (!isNonEmptyTrimmedString(value)) return false;
  const normalized = value.trim();
  return normalized.length >= 3 && normalized.length <= 50;
}

function isValidPassword(value) {
  if (!isNonEmptyTrimmedString(value)) return false;
  const normalized = value.trim();
  return normalized.length >= 4 && normalized.length <= 128;
}

function parsePositiveIntId(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const normalized = String(value).trim();
  if (!/^[1-9]\d*$/.test(normalized)) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

function validateBookPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const author =
    typeof payload.author === "string" ? payload.author.trim() : "";
  const year = payload.year;
  const currentYear = new Date().getFullYear();

  if (!title || title.length > 255) {
    return { ok: false, error: "Invalid title" };
  }

  if (!author || author.length > 255) {
    return { ok: false, error: "Invalid author" };
  }

  if (!Number.isInteger(year) || year < 1000 || year > currentYear + 1) {
    return { ok: false, error: "Invalid year" };
  }

  if (
    payload.image !== undefined &&
    payload.image !== null &&
    typeof payload.image !== "string"
  ) {
    return { ok: false, error: "Invalid image" };
  }

  return {
    ok: true,
    data: {
      title,
      author,
      year,
      image: payload.image ?? null,
    },
  };
}

function validateLoanPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const bookId = parsePositiveIntId(payload.bookId);
  if (!bookId) {
    return { ok: false, error: "Invalid bookId" };
  }

  return {
    ok: true,
    data: {
      bookId,
    },
  };
}

function validateBooksQueryValue(rawValue, fieldName) {
  if (rawValue === undefined) {
    return { ok: true, value: null };
  }

  if (typeof rawValue !== "string") {
    return { ok: false, error: `Invalid ${fieldName}` };
  }

  const value = rawValue.trim();
  if (value.length > 100) {
    return { ok: false, error: `Invalid ${fieldName}` };
  }

  if (value.length === 0) {
    return { ok: true, value: null };
  }

  if (!BOOK_QUERY_PATTERN.test(value)) {
    return { ok: false, error: `Invalid ${fieldName}` };
  }

  return { ok: true, value };
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    if (!user || !ALLOWED_ROLES.has(user.role)) {
      return res.status(403).json({ error: "Invalid token role" });
    }
    req.user = user; // contains { id, username, role }
    next();
  });
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  return next();
}

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user'
      );
    `);

    const countUsersRes = await pool.query("SELECT count(*) FROM users");
    if (countUsersRes.rows[0].count === "0") {
      const adminHash = await bcrypt.hash("admin", 10);
      const userHash = await bcrypt.hash("user", 10);
      await pool.query(
        "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3), ($4, $5, $6)",
        ["admin", adminHash, "admin", "user", userHash, "user"]
      );
      console.log("Начальные пользователи добавлены.");
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        year INTEGER NOT NULL,
        image TEXT,
        owner_id VARCHAR(255)
      );
    `);

    try {
      await pool.query(`ALTER TABLE books ADD COLUMN owner_id VARCHAR(255);`);
    } catch (e) {}

    const countRes = await pool.query("SELECT count(*) FROM books");
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

    const countLoansRes = await pool.query("SELECT count(*) FROM loans");
    if (countLoansRes.rows[0].count === "0") {
      const userResult = await pool.query(
        "SELECT id FROM users WHERE username = $1 LIMIT 1",
        ["user"]
      );
      const booksResult = await pool.query(
        "SELECT id FROM books ORDER BY id ASC LIMIT 2"
      );

      if (userResult.rows.length > 0 && booksResult.rows.length > 0) {
        const userId = userResult.rows[0].id;
        const firstBookId = booksResult.rows[0].id;
        const secondBookId = (booksResult.rows[1] || booksResult.rows[0]).id;

        await pool.query(
          `INSERT INTO loans (user_id, book_id, issued_at, returned_at)
           VALUES ($1, $2, NOW() - INTERVAL '14 days', NOW() - INTERVAL '7 days'),
                  ($3, $4, NOW() - INTERVAL '2 days', NULL)`,
          [userId, firstBookId, userId, secondBookId]
        );
      }
    }
  } catch (err) {
    console.error("Ошибка инициализации БД:", err);
  }
}
if (process.env.NODE_ENV !== "test") {
  initDb();
}

// Auth routes
app.post("/api/auth/register", async (req, res) => {
  const { username, password, role } = req.body;

  if (!isValidUsername(username)) {
    return res.status(400).json({ error: "Invalid username" });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ error: "Invalid password" });
  }

  if (role !== undefined && !ALLOWED_ROLES.has(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  if (role === "admin") {
    return res
      .status(403)
      .json({ error: "Self-registration as admin is forbidden" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const userRole = "user";

    const { rows } = await pool.query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role",
      [username.trim(), hashedPassword, userRole]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      // unique violation
      return res.status(400).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;

  if (!isValidUsername(username) || !isValidPassword(password)) {
    return res.status(400).json({ error: "Invalid credentials payload" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT * FROM users WHERE username = $1",
      [username.trim()]
    );
    if (rows.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = rows[0];
    const validPassword = await bcrypt.compare(
      password.trim(),
      user.password_hash
    );
    if (!validPassword)
      return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json(req.user);
});

// Books routes
app.get("/api/books", async (req, res) => {
  try {
    const qValidation = validateBooksQueryValue(req.query.q, "q");
    if (!qValidation.ok) {
      return res.status(400).json({ error: qValidation.error });
    }

    const titleValidation = validateBooksQueryValue(req.query.title, "title");
    if (!titleValidation.ok) {
      return res.status(400).json({ error: titleValidation.error });
    }

    const authorValidation = validateBooksQueryValue(req.query.author, "author");
    if (!authorValidation.ok) {
      return res.status(400).json({ error: authorValidation.error });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 12;
    const offset = (page - 1) * limit;
    const whereClauses = [];
    const params = [];

    if (qValidation.value) {
      params.push(qValidation.value);
      whereClauses.push(
        `(b.title ILIKE '%' || $${params.length} || '%' OR b.author ILIKE '%' || $${params.length} || '%')`
      );
    }

    if (titleValidation.value) {
      params.push(titleValidation.value);
      whereClauses.push(`b.title ILIKE '%' || $${params.length} || '%'`);
    }

    if (authorValidation.value) {
      params.push(authorValidation.value);
      whereClauses.push(`b.author ILIKE '%' || $${params.length} || '%'`);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) AS count FROM books b ${whereSql}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const dataParams = [...params, limit, offset];
    const limitParam = `$${params.length + 1}`;
    const offsetParam = `$${params.length + 2}`;
    const { rows } = await pool.query(
      `SELECT
        b.*,
        NOT EXISTS (
          SELECT 1
          FROM loans l
          WHERE l.book_id = b.id AND l.returned_at IS NULL
        ) AS available,
        NOT EXISTS (
          SELECT 1
          FROM loans l_active
          WHERE l_active.book_id = b.id AND l_active.returned_at IS NULL
        ) AS "canDelete",
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM loans l_active
            WHERE l_active.book_id = b.id AND l_active.returned_at IS NULL
          ) THEN 'Нельзя удалить: книга сейчас выдана'
          ELSE NULL
        END AS "deleteReason"
      FROM books b
      ${whereSql}
      ORDER BY b.id DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}`,
      dataParams
    );

    res.json({
      books: rows,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      limit,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/books", authenticateToken, requireAdmin, async (req, res) => {
  const validation = validateBookPayload(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const { title, author, year, image } = validation.data;
  const ownerId = String(req.user.id);

  try {
    const { rows } = await pool.query(
      "INSERT INTO books (title, author, year, image, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [title, author, year, image, ownerId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/books/:id", authenticateToken, requireAdmin, async (req, res) => {
  const id = parsePositiveIntId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const validation = validateBookPayload(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const { title, author, year } = validation.data;

  try {
    const { rows: updated } = await pool.query(
      "UPDATE books SET title = $1, author = $2, year = $3 WHERE id = $4 RETURNING *",
      [title, author, year, id]
    );
    if (updated.length === 0) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete(
  "/api/books/:id",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
  const id = parsePositiveIntId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid id" });
  }

  try {
    const { rows: activeLoans } = await pool.query(
      "SELECT id FROM loans WHERE book_id = $1 AND returned_at IS NULL LIMIT 1",
      [id]
    );
    if (activeLoans.length > 0) {
      return res.status(409).json({ error: "Нельзя удалить: книга сейчас выдана" });
    }

    const { rowCount } = await pool.query("DELETE FROM books WHERE id = $1", [
      id,
    ]);
    if (rowCount === 0) {
      return res.status(404).json({ error: "Not found" });
    }
    res.status(204).end();
  } catch (err) {
    if (err.code === "23503") {
      return res
        .status(409)
        .json({ error: "Нельзя удалить: книга сейчас выдана" });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/loans", authenticateToken, async (req, res) => {
  const userId = parsePositiveIntId(req.user?.id);
  if (!userId) {
    return res.status(403).json({ error: "Invalid token subject" });
  }

  const validation = validateLoanPayload(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const { bookId } = validation.data;

  try {
    const { rows: books } = await pool.query("SELECT id FROM books WHERE id = $1", [
      bookId,
    ]);
    if (books.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    const { rows: activeLoans } = await pool.query(
      "SELECT id FROM loans WHERE book_id = $1 AND returned_at IS NULL LIMIT 1",
      [bookId]
    );
    if (activeLoans.length > 0) {
      return res.status(409).json({ error: "Book is already loaned" });
    }

    const { rows } = await pool.query(
      `INSERT INTO loans (user_id, book_id)
       VALUES ($1, $2)
       RETURNING id, user_id, book_id, issued_at, returned_at`,
      [userId, bookId]
    );
    return res.status(201).json(rows[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch("/api/loans/:id/return", authenticateToken, async (req, res) => {
  const loanId = parsePositiveIntId(req.params.id);
  if (!loanId) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const userId = parsePositiveIntId(req.user?.id);
  if (!userId) {
    return res.status(403).json({ error: "Invalid token subject" });
  }

  try {
    const { rows } = await pool.query(
      "SELECT id, user_id, returned_at FROM loans WHERE id = $1",
      [loanId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Loan not found" });
    }

    const loan = rows[0];
    if (loan.returned_at) {
      return res.status(409).json({ error: "Loan already returned" });
    }

    const isOwner = Number(loan.user_id) === userId;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { rows: updated } = await pool.query(
      `UPDATE loans
       SET returned_at = NOW()
       WHERE id = $1
       RETURNING id, user_id, book_id, issued_at, returned_at`,
      [loanId]
    );
    return res.json(updated[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.get("/api/loans", authenticateToken, async (req, res) => {
  const userId = parsePositiveIntId(req.user?.id);
  if (!userId) {
    return res.status(403).json({ error: "Invalid token subject" });
  }

  const { active } = req.query;
  if (
    active !== undefined &&
    active !== "true" &&
    active !== "false"
  ) {
    return res.status(400).json({ error: "Invalid active filter" });
  }

  const whereClauses = [];
  const params = [];
  const isAdmin = req.user.role === "admin";

  if (!isAdmin) {
    params.push(userId);
    whereClauses.push(`l.user_id = $${params.length}`);
  }

  if (active === "true") {
    whereClauses.push("l.returned_at IS NULL");
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  try {
    const { rows } = await pool.query(
      `SELECT
        l.id,
        l.user_id,
        l.book_id,
        l.issued_at,
        l.returned_at,
        b.title AS book_title,
        b.author AS book_author,
        b.year AS book_year
      FROM loans l
      JOIN books b ON b.id = l.book_id
      ${whereSql}
      ORDER BY l.issued_at DESC, l.id DESC`,
      params
    );
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
  });
}

module.exports = {
  app,
  ALLOWED_ROLES,
  isNonEmptyTrimmedString,
  isValidUsername,
  isValidPassword,
  parsePositiveIntId,
  validateBookPayload,
  validateLoanPayload,
};
