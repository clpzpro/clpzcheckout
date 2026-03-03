import pg from "pg";
import { env } from "../../config/env.js";

const { Pool } = pg;

export const authDb = new Pool({
  connectionString: env.AUTH_DB_URL,
  max: 10,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: true } : false
});
