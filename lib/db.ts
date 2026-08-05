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
    const isLocal =
      connectionString.includes("localhost") || connectionString.includes("127.0.0.1");
    pool = new Pool({
      connectionString,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}

let schemaPromise: Promise<void> | null = null;

async function applySchema(): Promise<void> {
  const schemaPath = path.join(process.cwd(), "schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf-8");

  // Run statements one at a time so a mid-file failure doesn't leave half-applied DDL
  // in a confusing state, and so concurrent callers don't each re-run the whole file.
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const client = await getPool().connect();
  try {
    for (const statement of statements) {
      await client.query(statement);
    }

    // Migrate existing databases created before reflection survey type was added
    await client.query(`
      ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS survey_responses_survey_type_check
    `);
    await client.query(`
      ALTER TABLE survey_responses ADD CONSTRAINT survey_responses_survey_type_check
        CHECK (survey_type IN ('pre', 'post', 'reflection'))
    `);
  } finally {
    client.release();
  }
}

export async function ensureSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = applySchema().catch((err) => {
      // Allow retry on next request if init failed
      schemaPromise = null;
      throw err;
    });
  }
  await schemaPromise;
}
