import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  user: env.pg.user,
  host: env.pg.host,
  database: env.pg.database,
  password: env.pg.password,
  port: env.pg.port,
});
