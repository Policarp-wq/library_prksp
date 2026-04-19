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
    const search = req.query.search ? `%${req.query.search}%` : "%";
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = 12;
    const offset = (page - 1) * limit;

    // Count total matching books
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM books WHERE title ILIKE $1",
      [search]
    );
    const total = parseInt(countResult.rows[0].count);

    // Get paginated books
    const { rows } = await pool.query(
      "SELECT * FROM books WHERE title ILIKE $1 ORDER BY id DESC LIMIT $2 OFFSET $3",
      [search, limit, offset]
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

app.post("/api/books", authenticateToken, async (req, res) => {
  console.log("POST /api/books", { body: req.body, user: req.user });
  const validation = validateBookPayload(req.body);
  console.log("Validation result:", validation);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const { title, author, year, image } = validation.data;
  const ownerId = String(req.user.id);
  console.log("Inserting book:", { title, author, year, image, ownerId });

  try {
    const { rows } = await pool.query(
      "INSERT INTO books (title, author, year, image, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [title, author, year, image, ownerId]
    );
    console.log("Book inserted successfully:", rows[0]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.log("Error inserting book:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/books/:id", authenticateToken, async (req, res) => {
  const id = parsePositiveIntId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const validation = validateBookPayload(req.body);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }

  const { title, author, year } = validation.data;
  const ownerId = String(req.user.id);
  const isAdmin = req.user.role === "admin";

  try {
    const { rows } = await pool.query(
      "SELECT owner_id FROM books WHERE id = $1",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });

    const bookOwnerId = rows[0].owner_id;

    if (bookOwnerId !== ownerId && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { rows: updated } = await pool.query(
      "UPDATE books SET title = $1, author = $2, year = $3 WHERE id = $4 RETURNING *",
      [title, author, year, id]
    );
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/books/:id", authenticateToken, async (req, res) => {
  const id = parsePositiveIntId(req.params.id);
  if (!id) {
    return res.status(400).json({ error: "Invalid id" });
  }

  const ownerId = String(req.user.id);
  const isAdmin = req.user.role === "admin";

  try {
    const { rows } = await pool.query(
      "SELECT owner_id FROM books WHERE id = $1",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });

    const bookOwnerId = rows[0].owner_id;

    if (bookOwnerId !== ownerId && !isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await pool.query("DELETE FROM books WHERE id = $1", [id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
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
};