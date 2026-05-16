import { pool } from "../config/db";

export interface LoanRecord {
  id: number;
  user_id: number;
  book_id: number;
  issued_at: Date;
  returned_at: Date | null;
}

export interface LoanListItem extends LoanRecord {
  book_title: string;
  book_author: string;
  book_year: number;
}

export const loanRepository = {
  async hasActiveLoan(bookId: number): Promise<boolean> {
    const { rows } = await pool.query(
      "SELECT id FROM loans WHERE book_id = $1 AND returned_at IS NULL LIMIT 1",
      [bookId],
    );
    return rows.length > 0;
  },

  async findById(loanId: number): Promise<LoanRecord | null> {
    const { rows } = await pool.query<LoanRecord>(
      "SELECT id, user_id, book_id, issued_at, returned_at FROM loans WHERE id = $1",
      [loanId],
    );
    return rows[0] ?? null;
  },

  async create(userId: number, bookId: number): Promise<LoanRecord> {
    const { rows } = await pool.query<LoanRecord>(
      `INSERT INTO loans (user_id, book_id)
       VALUES ($1, $2)
       RETURNING id, user_id, book_id, issued_at, returned_at`,
      [userId, bookId],
    );
    return rows[0];
  },

  async markReturned(loanId: number): Promise<LoanRecord> {
    const { rows } = await pool.query<LoanRecord>(
      `UPDATE loans
       SET returned_at = NOW()
       WHERE id = $1
       RETURNING id, user_id, book_id, issued_at, returned_at`,
      [loanId],
    );
    return rows[0];
  },

  async list(filters: {
    userId?: number;
    activeOnly?: boolean;
  }): Promise<LoanListItem[]> {
    const whereClauses: string[] = [];
    const params: unknown[] = [];

    if (filters.userId !== undefined) {
      params.push(filters.userId);
      whereClauses.push(`l.user_id = $${params.length}`);
    }
    if (filters.activeOnly) {
      whereClauses.push("l.returned_at IS NULL");
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const { rows } = await pool.query<LoanListItem>(
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
      params,
    );
    return rows;
  },
};
