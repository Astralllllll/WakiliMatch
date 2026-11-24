import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

delete process.env.DB_PASSWORD;
delete process.env.PGPASSWORD;

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "wakilimatch",
  port: 5432,
});

export default pool;
