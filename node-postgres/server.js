const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'books_db',
  password: 'password',
  port: 5432,
});

async function initDb() {
  try {
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

app.get("/api/books", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM books ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/books", async (req, res) => {
  const { title, author, year, image } = req.body;

  const ownerId = req.headers["x-user-id"] || "anonymous";

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

app.put("/api/books/:id", async (req, res) => {
  const { id } = req.params;
  const { title, author, year } = req.body;
  const userId = req.headers["x-user-id"];
  const userRoles = req.headers["x-user-roles"] || "";

  try {
    const { rows } = await pool.query(
      "SELECT owner_id FROM books WHERE id = $1",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });

    const ownerId = rows[0].owner_id;
    const isAdmin = userRoles.includes("admin");

    if (ownerId !== userId && !isAdmin) {
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

app.delete("/api/books/:id", async (req, res) => {
  const { id } = req.params;
  const userId = req.headers["x-user-id"];
  const userRoles = req.headers["x-user-roles"] || "";

  try {
    const { rows } = await pool.query(
      "SELECT owner_id FROM books WHERE id = $1",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });

    const ownerId = rows[0].owner_id;
    const isAdmin = userRoles.includes("admin");

    if (ownerId !== userId && !isAdmin) {
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