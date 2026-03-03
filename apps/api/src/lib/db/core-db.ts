import pg from "pg";
import { env } from "../../config/env.js";

const { Pool } = pg;

export const coreDb = new Pool({
  connectionString: env.CORE_DB_URL,
  max: 20,
  ssl: env.NODE_ENV === "production" ? { rejectUnauthorized: true } : false
});
