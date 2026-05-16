import "dotenv/config";

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "super-secret-key-change-me",
  pg: {
    user: process.env.PGUSER || "postgres",
    host: process.env.PGHOST || "localhost",
    database: process.env.PGDATABASE || "books_db",
    password: process.env.PGPASSWORD || "password",
    port: Number(process.env.PGPORT) || 5432,
  },
} as const;
