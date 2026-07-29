import fs from "fs";
import path from "path";
import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    pool = new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }
  return pool;
}

let schemaInitialized = false;

export async function ensureSchema(): Promise<void> {
  if (schemaInitialized) return;

  const schemaPath = path.join(process.cwd(), "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");
  await getPool().query(sql);

  // Migrate existing databases created before reflection survey type was added
  await getPool().query(`
    ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS survey_responses_survey_type_check;
    ALTER TABLE survey_responses ADD CONSTRAINT survey_responses_survey_type_check
      CHECK (survey_type IN ('pre', 'post', 'reflection'));
  `);

  schemaInitialized = true;
}
