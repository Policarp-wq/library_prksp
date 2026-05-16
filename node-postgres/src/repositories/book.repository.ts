import { pool } from "../config/db";

export interface BookRecord {
  id: number;
  title: string;
  author: string;
  year: number;
  image: string | null;
  owner_id: string | null;
  url: string | null;
}

export interface BookListItem extends BookRecord {
  available: boolean;
  canDelete: boolean;
  deleteReason: string | null;
}

export interface BookListFilters {
  q?: string | null;
  title?: string | null;
  author?: string | null;
  page: number;
  limit: number;
}

export interface BookListResult {
  rows: BookListItem[];
  total: number;
}

export const bookRepository = {
  async list(filters: BookListFilters): Promise<BookListResult> {
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (filters.q) {
      params.push(filters.q);
      whereClauses.push(
        `(b.title ILIKE '%' || $${params.length} || '%' OR b.author ILIKE '%' || $${params.length} || '%')`,
      );
    }
    if (filters.title) {
      params.push(filters.title);
      whereClauses.push(`b.title ILIKE '%' || $${params.length} || '%'`);
    }
    if (filters.author) {
      params.push(filters.author);
      whereClauses.push(`b.author ILIKE '%' || $${params.length} || '%'`);
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM books b ${whereSql}`,
      params,
    );
    const total = Number.parseInt(countResult.rows[0].count, 10);

    const dataParams = [...params, filters.limit, (filters.page - 1) * filters.limit];
    const limitParam = `$${params.length + 1}`;
    const offsetParam = `$${params.length + 2}`;

    const { rows } = await pool.query<BookListItem>(
      `SELECT
        b.*,
        NOT EXISTS (
          SELECT 1 FROM loans l
          WHERE l.book_id = b.id AND l.returned_at IS NULL
        ) AS available,
        NOT EXISTS (
          SELECT 1 FROM loans l_active
          WHERE l_active.book_id = b.id AND l_active.returned_at IS NULL
        ) AS "canDelete",
        CASE
          WHEN EXISTS (
            SELECT 1 FROM loans l_active
            WHERE l_active.book_id = b.id AND l_active.returned_at IS NULL
          ) THEN 'Нельзя удалить: книга сейчас выдана'
          ELSE NULL
        END AS "deleteReason"
      FROM books b
      ${whereSql}
      ORDER BY b.id DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}`,
      dataParams,
    );

    return { rows, total };
  },

  async findById(id: number): Promise<BookRecord | null> {
    const { rows } = await pool.query<BookRecord>(
      "SELECT * FROM books WHERE id = $1",
      [id],
    );
    return rows[0] ?? null;
  },

  async create(input: {
    title: string;
    author: string;
    year: number;
    image: string | null;
    ownerId: string;
    url: string | null;
  }): Promise<BookRecord> {
    const { rows } = await pool.query<BookRecord>(
      "INSERT INTO books (title, author, year, image, owner_id, url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [input.title, input.author, input.year, input.image, input.ownerId, input.url],
    );
    return rows[0];
  },

  async update(
    id: number,
    input: { title: string; author: string; year: number; url: string | null },
  ): Promise<BookRecord | null> {
    const { rows } = await pool.query<BookRecord>(
      "UPDATE books SET title = $1, author = $2, year = $3, url = $4 WHERE id = $5 RETURNING *",
      [input.title, input.author, input.year, input.url, id],
    );
    return rows[0] ?? null;
  },

  async deleteById(id: number): Promise<boolean> {
    const { rowCount } = await pool.query("DELETE FROM books WHERE id = $1", [id]);
    return (rowCount ?? 0) > 0;
  },
};
