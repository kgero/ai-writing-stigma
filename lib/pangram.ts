import crypto from "crypto";
import fs from "fs";
import path from "path";
import { getArticles } from "./content";
import { getPool } from "./db";
import type { Article, PangramResult } from "./types";

const PANGRAM_BASE = "https://text.external-api.pangram.com";
const articlesPath = path.join(process.cwd(), "content", "articles.json");

function bodyHash(body: string): string {
  return crypto.createHash("sha256").update(body).digest("hex");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface PangramTaskResponse {
  task_id?: string;
  stage?: string;
  headline?: string;
  prediction?: string;
  prediction_short?: string;
  fraction_ai?: number;
  fraction_ai_assisted?: number;
  fraction_human?: number;
  version?: string;
}

async function pollTask(apiKey: string, taskId: string): Promise<PangramTaskResponse> {
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${PANGRAM_BASE}/task/${taskId}`, {
      headers: { "x-api-key": apiKey },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Pangram poll failed (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as PangramTaskResponse;
    if (data.stage === "STAGE_SUCCESS" || data.stage === "STAGE_FAILED") {
      return data;
    }
    await sleep(1500);
  }
  throw new Error("Pangram task timed out");
}

export async function runPangramOnText(text: string): Promise<PangramResult> {
  const apiKey = process.env.PANGRAM_API_KEY;
  if (!apiKey) {
    throw new Error("PANGRAM_API_KEY is not set");
  }

  const createRes = await fetch(`${PANGRAM_BASE}/task`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model: "pangram-4",
      public_dashboard_link: false,
    }),
    cache: "no-store",
  });

  if (!createRes.ok) {
    throw new Error(`Pangram create failed (${createRes.status}): ${await createRes.text()}`);
  }

  const { task_id } = (await createRes.json()) as { task_id: string };
  if (!task_id) throw new Error("Pangram did not return a task_id");

  const data = await pollTask(apiKey, task_id);

  if (data.stage === "STAGE_FAILED") {
    return {
      checked_at: new Date().toISOString(),
      headline: data.headline ?? "Failed",
      prediction: data.prediction ?? "",
      prediction_short: data.prediction_short ?? "Error",
      fraction_ai: data.fraction_ai ?? 0,
      fraction_ai_assisted: data.fraction_ai_assisted ?? 0,
      fraction_human: data.fraction_human ?? 0,
      version: data.version,
      error: data.headline || "Pangram classification failed",
    };
  }

  return {
    checked_at: new Date().toISOString(),
    headline: data.headline ?? "",
    prediction: data.prediction ?? "",
    prediction_short: data.prediction_short ?? "",
    fraction_ai: data.fraction_ai ?? 0,
    fraction_ai_assisted: data.fraction_ai_assisted ?? 0,
    fraction_human: data.fraction_human ?? 0,
    version: data.version,
  };
}

async function savePangramToDb(articleId: string, body: string, result: PangramResult) {
  await getPool().query(
    `INSERT INTO pangram_results (article_id, body_hash, result, checked_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (article_id) DO UPDATE SET
       body_hash = EXCLUDED.body_hash,
       result = EXCLUDED.result,
       checked_at = EXCLUDED.checked_at`,
    [articleId, bodyHash(body), JSON.stringify(result), result.checked_at],
  );
}

async function loadPangramFromDb(articleId: string): Promise<{
  body_hash: string;
  result: PangramResult;
} | null> {
  const res = await getPool().query(
    `SELECT body_hash, result FROM pangram_results WHERE article_id = $1`,
    [articleId],
  );
  if ((res.rowCount ?? 0) === 0) return null;
  return {
    body_hash: res.rows[0].body_hash as string,
    result: res.rows[0].result as PangramResult,
  };
}

function writeArticlesFile(articles: Article[]) {
  fs.writeFileSync(
    articlesPath,
    JSON.stringify({ articles }, null, 2) + "\n",
    "utf-8",
  );
}

/** Resolve display result: JSON cache, else DB (survives Railway redeploys). */
export async function getCachedPangram(article: Article): Promise<PangramResult | null> {
  try {
    const fromDb = await loadPangramFromDb(article.id);
    if (fromDb && fromDb.body_hash === bodyHash(article.body)) {
      return fromDb.result;
    }
  } catch {
    // DB unavailable
  }
  return article.pangram;
}

export interface PangramCheckSummary {
  article_id: string;
  ran: boolean;
  skipped: boolean;
  result: PangramResult | null;
  error?: string;
}

async function articleNeedsPangramRun(article: Article): Promise<boolean> {
  if (article.pangram_needs_check) return true;
  try {
    const fromDb = await loadPangramFromDb(article.id);
    if (!fromDb) return true;
    if (fromDb.body_hash !== bodyHash(article.body)) return true;
    return false;
  } catch {
    return !article.pangram;
  }
}

/**
 * Run Pangram for articles that need a check:
 * - pangram_needs_check is true in articles.json, or
 * - no cached result / body changed since last check
 *
 * Writes results into articles.json (clears the flag) and into the DB.
 * On Railway, commit the updated articles.json after checks so flags stay false
 * across deploys; DB results still display either way.
 */
export async function runPangramForFlaggedArticles(): Promise<PangramCheckSummary[]> {
  const file = JSON.parse(fs.readFileSync(articlesPath, "utf-8")) as {
    articles: Article[];
  };
  const summaries: PangramCheckSummary[] = [];

  for (const article of file.articles) {
    const needsRun = await articleNeedsPangramRun(article);
    if (!needsRun) {
      summaries.push({
        article_id: article.id,
        ran: false,
        skipped: true,
        result: article.pangram,
      });
      continue;
    }

    try {
      const result = await runPangramOnText(article.body);
      article.pangram = result;
      article.pangram_needs_check = false;
      try {
        await savePangramToDb(article.id, article.body, result);
      } catch {
        // DB optional if schema not ready yet
      }
      summaries.push({
        article_id: article.id,
        ran: true,
        skipped: false,
        result,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      summaries.push({
        article_id: article.id,
        ran: false,
        skipped: false,
        result: article.pangram,
        error: message,
      });
    }
  }

  writeArticlesFile(file.articles);
  return summaries;
}

export async function getArticlesWithPangram(): Promise<
  Array<Article & { pangram_display: PangramResult | null }>
> {
  const articles = getArticles();
  return Promise.all(
    articles.map(async (article) => ({
      ...article,
      pangram_display: await getCachedPangram(article),
    })),
  );
}
