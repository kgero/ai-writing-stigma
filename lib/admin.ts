import { getPool } from "./db";
import { getArticles, getRatingsQuestions } from "./content";
import { isAttentionCorrect } from "./validation";
import type { Assignment } from "./types";

export interface AdminStats {
  totalSessions: number;
  completed: number;
  consented: number;
  cellCounts: Record<string, number>;
  attentionPass: number;
  attentionFail: number;
  attentionTotal: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const pool = getPool();

  const sessionsResult = await pool.query(`
    SELECT id, assignment, completed_at FROM sessions
  `);

  const ratingsResult = await pool.query(`
    SELECT session_id, article_id, responses FROM ratings WHERE phase = 'pre'
  `);

  const totalSessions = sessionsResult.rowCount ?? 0;
  let completed = 0;
  const cellCounts: Record<string, number> = {};

  for (const row of sessionsResult.rows) {
    if (row.completed_at) completed++;
    const a = row.assignment as Assignment;
    const key = `${a.article_id}|${a.condition}`;
    cellCounts[key] = (cellCounts[key] ?? 0) + 1;
  }

  let attentionPass = 0;
  let attentionFail = 0;

  for (const row of ratingsResult.rows) {
    const article = getArticles().find((a) => a.id === row.article_id);
    if (!article) continue;
    const acId = article.attention_check.id;
    const responses = row.responses as Record<string, string>;
    const val = responses[acId];
    if (val === undefined) continue;
    if (isAttentionCorrect(row.article_id, val)) attentionPass++;
    else attentionFail++;
  }

  return {
    totalSessions,
    completed,
    consented: totalSessions,
    cellCounts,
    attentionPass,
    attentionFail,
    attentionTotal: attentionPass + attentionFail,
  };
}

function csvEscape(val: unknown): string {
  const s = val === null || val === undefined ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function exportSessionsCsv(): Promise<string> {
  const result = await getPool().query(`SELECT * FROM sessions ORDER BY created_at`);
  const headers = [
    "session_id",
    "prolific_pid",
    "prolific_study_id",
    "prolific_session_id",
    "article_id",
    "condition",
    "cell_index",
    "authorship_type",
    "reading_time_sec",
    "reading_completed_at",
    "stale_redirect_count",
    "consent_at",
    "completed_at",
    "created_at",
  ];
  const rows = result.rows.map((row) => {
    const a = row.assignment as Assignment;
    return [
      row.id,
      row.prolific_pid,
      row.prolific_study_id,
      row.prolific_session_id,
      a.article_id,
      a.condition,
      a.cell_index,
      a.authorship_type,
      row.reading_time_sec,
      row.reading_completed_at,
      row.stale_redirect_count,
      row.consent_at,
      row.completed_at,
      row.created_at,
    ]
      .map(csvEscape)
      .join(",");
  });
  return [headers.join(","), ...rows].join("\n");
}

export async function exportRatingsCsv(): Promise<string> {
  const result = await getPool().query(`
    SELECT r.*, s.prolific_pid
    FROM ratings r
    JOIN sessions s ON s.id = r.session_id
    ORDER BY r.submitted_at
  `);

  const likertIds = getRatingsQuestions()
    .filter((q) => q.type === "likert")
    .map((q) => q.id);

  const headers = [
    "session_id",
    "prolific_pid",
    "phase",
    "condition",
    "article_id",
    "authorship_type",
    "submitted_at",
    "attention_correct",
    ...likertIds,
  ];

  const rows = result.rows.map((row) => {
    const responses = row.responses as Record<string, string | number>;
    const article = getArticles().find((a) => a.id === row.article_id);
    let attentionCorrect = "";
    if (row.phase === "pre" && article) {
      const acId = article.attention_check.id;
      const val = responses[acId];
      if (typeof val === "string") {
        attentionCorrect = isAttentionCorrect(row.article_id, val) ? "true" : "false";
      }
    }

    const cols = [
      row.session_id,
      row.prolific_pid,
      row.phase,
      row.condition,
      row.article_id,
      row.authorship_type,
      row.submitted_at,
      attentionCorrect,
      ...likertIds.map((id) => responses[id] ?? ""),
    ];
    return cols.map(csvEscape).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

export async function exportSurveysCsv(): Promise<string> {
  const result = await getPool().query(`
    SELECT sr.*, s.prolific_pid
    FROM survey_responses sr
    JOIN sessions s ON s.id = sr.session_id
    ORDER BY sr.submitted_at
  `);

  const questionIds = new Set<string>();
  for (const row of result.rows) {
    const responses = row.responses as Record<string, unknown>;
    Object.keys(responses).forEach((k) => questionIds.add(k));
  }
  const qList = [...questionIds].sort();

  const headers = ["session_id", "prolific_pid", "survey_type", "submitted_at", ...qList];
  const rows = result.rows.map((row) => {
    const responses = row.responses as Record<string, unknown>;
    const cols = [
      row.session_id,
      row.prolific_pid,
      row.survey_type,
      row.submitted_at,
      ...qList.map((id) => responses[id] ?? ""),
    ];
    return cols.map(csvEscape).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
