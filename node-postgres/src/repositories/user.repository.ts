import { pool } from "../config/db";

export interface UserRecord {
  id: number;
  username: string;
  password_hash: string;
  role: "admin" | "user";
}

export const userRepository = {
  async findByUsername(username: string): Promise<UserRecord | null> {
    const { rows } = await pool.query<UserRecord>(
      "SELECT id, username, password_hash, role FROM users WHERE username = $1",
      [username],
    );
    return rows[0] ?? null;
  },

  async create(
    username: string,
    passwordHash: string,
    role: "admin" | "user",
  ): Promise<Pick<UserRecord, "id" | "username" | "role">> {
    const { rows } = await pool.query<Pick<UserRecord, "id" | "username" | "role">>(
      "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role",
      [username, passwordHash, role],
    );
    return rows[0];
  },
};
