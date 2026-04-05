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
        image TEXT
      );
    `);
    
    const countRes = await pool.query('SELECT count(*) FROM books');
    if (countRes.rows[0].count === '0') {
      await pool.query(`
        INSERT INTO books (title, author, year) VALUES 
        ('Мастер и Маргарита', 'Михаил Булгаков', 1967),
        ('Война и мир', 'Лев Толстой', 1869),
        ('Преступление и наказание', 'Фёдор Достоевский', 1866)
      `);
      console.log('Начальные данные добавлены.');
    }
  } catch (err) {
    console.error('Ошибка инициализации БД:', err);
  }
}
initDb();

app.get('/api/books', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM books ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/books', async (req, res) => {
  const { title, author, year, image } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO books (title, author, year, image) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, author, year || 0, image || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.delete('/api/books/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM books WHERE id = $1', [id]);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
});