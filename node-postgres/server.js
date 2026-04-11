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

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
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
      const adminHash = await bcrypt.hash('admin', 10);
      const userHash = await bcrypt.hash('user', 10);
      await pool.query(
        "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3), ($4, $5, $6)",
        ['admin', adminHash, 'admin', 'user', userHash, 'user']
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
initDb();

// Auth routes
app.post("/api/auth/register", async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'admin' ? 'admin' : 'user';

    const { rows } = await pool.query(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role",
      [username, hashedPassword, userRole]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(400).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const user = rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
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
    const { rows } = await pool.query("SELECT * FROM books ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/books", authenticateToken, async (req, res) => {
  const { title, author, year, image } = req.body;
  const ownerId = req.user.username; // Bind book strictly to authenticated user

  try {
    const { rows } = await pool.query(
      "INSERT INTO books (title, author, year, image, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [title, author, year || 0, image || null, ownerId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/books/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, author, year } = req.body;
  const ownerId = req.user.username;
  const isAdmin = req.user.role === 'admin';

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
  const { id } = req.params;
  const ownerId = req.user.username;
  const isAdmin = req.user.role === 'admin';

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

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});