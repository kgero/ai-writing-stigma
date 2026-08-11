import { getPool } from "./db";
import {
  getArticles,
  getRatingsQuestions,
  getSurveyQuestions,
} from "./content";
import { isAttentionCorrect } from "./validation";
import type { Assignment } from "./types";

export interface AdminFilters {
  /** Case-insensitive substring match on prolific_pid */
  idContains: string;
  /** ISO date/datetime; include sessions with consent_at >= this */
  consentedAfter: string;
}

export const EMPTY_ADMIN_FILTERS: AdminFilters = {
  idContains: "",
  consentedAfter: "",
};

export function parseAdminFilters(
  params?: { id_contains?: string; consented_after?: string } | null,
): AdminFilters {
  return {
    idContains: (params?.id_contains ?? "").trim(),
    consentedAfter: (params?.consented_after ?? "").trim(),
  };
}

export function adminFiltersToQuery(filters: AdminFilters = EMPTY_ADMIN_FILTERS): string {
  const qs = new URLSearchParams();
  if (filters.idContains) qs.set("id_contains", filters.idContains);
  if (filters.consentedAfter) qs.set("consented_after", filters.consentedAfter);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

function filtersActive(filters: AdminFilters): boolean {
  return Boolean(filters.idContains || filters.consentedAfter);
}

/** SQL WHERE fragment + params for sessions alias `s`. */
function sessionFilterSql(
  filters: AdminFilters | undefined | null,
  startParam = 1,
): { clause: string; params: unknown[] } {
  const f = filters ?? EMPTY_ADMIN_FILTERS;
  const parts: string[] = [];
  const params: unknown[] = [];
  let i = startParam;

  if (f.idContains) {
    parts.push(`s.prolific_pid ILIKE $${i}`);
    params.push(`%${f.idContains}%`);
    i++;
  }
  if (f.consentedAfter) {
    // Accept YYYY-MM-DD, datetime-local (YYYY-MM-DDTHH:mm), or full ISO
    const raw = f.consentedAfter;
    const ts =
      raw.length === 10
        ? `${raw}T00:00:00.000Z`
        : raw.length === 16
          ? `${raw}:00`
          : raw;
    parts.push(`s.consent_at >= $${i}::timestamptz`);
    params.push(ts);
    i++;
  }

  return {
    clause: parts.length ? `WHERE ${parts.join(" AND ")}` : "",
    params,
  };
}

export interface AdminStats {
  totalSessions: number;
  completed: number;
  consented: number;
  cellCounts: Record<string, number>;
  attentionPass: number;
  attentionFail: number;
  attentionTotal: number;
  filters: AdminFilters;
  filtersActive: boolean;
}

export async function getAdminStats(
  filters: AdminFilters = EMPTY_ADMIN_FILTERS,
): Promise<AdminStats> {
  const pool = getPool();
  const resolved = filters ?? EMPTY_ADMIN_FILTERS;
  const { clause, params } = sessionFilterSql(resolved);

  const sessionsResult = await pool.query(
    `SELECT s.id, s.assignment, s.completed_at FROM sessions s ${clause}`,
    params,
  );

  const sessionIds = sessionsResult.rows.map((r) => r.id as string);

  let ratingsResult = { rows: [] as Array<{
    session_id: string;
    article_id: string;
    responses: Record<string, string>;
  }> };

  if (sessionIds.length > 0) {
    ratingsResult = await pool.query(
      `SELECT session_id, article_id, responses FROM ratings
       WHERE phase = 'pre' AND session_id = ANY($1::uuid[])`,
      [sessionIds],
    );
  }

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
    filters: resolved,
    filtersActive: filtersActive(resolved),
  };
}

function csvEscape(val: unknown): string {
  const s = val === null || val === undefined ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Raw sessions export — assignment kept as JSON blob. */
export async function exportSessionsCsv(
  filters: AdminFilters = EMPTY_ADMIN_FILTERS,
): Promise<string> {
  const { clause, params } = sessionFilterSql(filters);
  const result = await getPool().query(
    `SELECT s.* FROM sessions s ${clause} ORDER BY s.created_at`,
    params,
  );
  const headers = [
    "session_id",
    "prolific_pid",
    "prolific_study_id",
    "prolific_session_id",
    "assignment",
    "reading_time_sec",
    "reading_completed_at",
    "stale_redirect_count",
    "consent_at",
    "completed_at",
    "created_at",
  ];
  const rows = result.rows.map((row) =>
    [
      row.id,
      row.prolific_pid,
      row.prolific_study_id,
      row.prolific_session_id,
      JSON.stringify(row.assignment),
      row.reading_time_sec,
      row.reading_completed_at,
      row.stale_redirect_count,
      row.consent_at,
      row.completed_at,
      row.created_at,
    ]
      .map(csvEscape)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

/** Raw ratings export — responses kept as JSON blob. */
export async function exportRatingsCsv(
  filters: AdminFilters = EMPTY_ADMIN_FILTERS,
): Promise<string> {
  const { clause, params } = sessionFilterSql(filters);
  const result = await getPool().query(
    `SELECT r.*, s.prolific_pid
     FROM ratings r
     JOIN sessions s ON s.id = r.session_id
     ${clause}
     ORDER BY r.submitted_at`,
    params,
  );

  const headers = [
    "session_id",
    "prolific_pid",
    "phase",
    "condition",
    "article_id",
    "authorship_type",
    "responses",
    "submitted_at",
  ];

  const rows = result.rows.map((row) =>
    [
      row.session_id,
      row.prolific_pid,
      row.phase,
      row.condition,
      row.article_id,
      row.authorship_type,
      JSON.stringify(row.responses),
      row.submitted_at,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

/** Raw surveys export — responses kept as JSON blob. */
export async function exportSurveysCsv(
  filters: AdminFilters = EMPTY_ADMIN_FILTERS,
): Promise<string> {
  const { clause, params } = sessionFilterSql(filters);
  const result = await getPool().query(
    `SELECT sr.*, s.prolific_pid
     FROM survey_responses sr
     JOIN sessions s ON s.id = sr.session_id
     ${clause}
     ORDER BY sr.submitted_at`,
    params,
  );

  const headers = [
    "session_id",
    "prolific_pid",
    "survey_type",
    "responses",
    "submitted_at",
  ];
  const rows = result.rows.map((row) =>
    [
      row.session_id,
      row.prolific_pid,
      row.survey_type,
      JSON.stringify(row.responses),
      row.submitted_at,
    ]
      .map(csvEscape)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

/** One wide row per session in the filtered subset; JSON flattened to columns. */
export async function exportWideParticipantsCsv(
  filters: AdminFilters = EMPTY_ADMIN_FILTERS,
): Promise<string> {
  const { clause, params } = sessionFilterSql(filters);
  const pool = getPool();

  const sessions = await pool.query(
    `SELECT s.* FROM sessions s ${clause} ORDER BY s.created_at`,
    params,
  );

  const sessionIds = sessions.rows.map((r) => r.id as string);
  const ratingsBySession = new Map<
    string,
    { pre?: Record<string, unknown>; post?: Record<string, unknown> }
  >();
  const surveysBySession = new Map<
    string,
    { pre?: Record<string, unknown>; post?: Record<string, unknown>; reflection?: Record<string, unknown> }
  >();

  if (sessionIds.length > 0) {
    const ratings = await pool.query(
      `SELECT session_id, phase, article_id, responses FROM ratings
       WHERE session_id = ANY($1::uuid[])`,
      [sessionIds],
    );
    for (const row of ratings.rows) {
      const cur = ratingsBySession.get(row.session_id) ?? {};
      cur[row.phase as "pre" | "post"] = {
        ...(row.responses as Record<string, unknown>),
        _article_id: row.article_id,
      };
      ratingsBySession.set(row.session_id, cur);
    }

    const surveys = await pool.query(
      `SELECT session_id, survey_type, responses FROM survey_responses
       WHERE session_id = ANY($1::uuid[])`,
      [sessionIds],
    );
    for (const row of surveys.rows) {
      const cur = surveysBySession.get(row.session_id) ?? {};
      cur[row.survey_type as "pre" | "post" | "reflection"] = row.responses as Record<
        string,
        unknown
      >;
      surveysBySession.set(row.session_id, cur);
    }
  }

  const ratingIds = getRatingsQuestions().map((q) => q.id);
  const demoIds = getSurveyQuestions("pre")
    .filter((q) => q.type !== "section")
    .map((q) => q.id);
  const exitIds = getSurveyQuestions("post")
    .filter((q) => q.type !== "section")
    .map((q) => q.id);
  const reflectionIds = getSurveyQuestions("reflection")
    .filter((q) => q.type !== "section")
    .map((q) => q.id);

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
    "attention_response",
    "attention_correct",
    ...ratingIds.map((id) => `pre_${id}`),
    ...ratingIds.map((id) => `post_${id}`),
    // Question ids are already namespaced (demo_*, exit_*, etc.)
    ...demoIds,
    ...reflectionIds,
    ...exitIds,
  ];

  const rows = sessions.rows.map((row) => {
    const a = row.assignment as Assignment;
    const ratings = ratingsBySession.get(row.id) ?? {};
    const surveys = surveysBySession.get(row.id) ?? {};
    const pre = ratings.pre ?? {};
    const post = ratings.post ?? {};
    const demo = surveys.pre ?? {};
    const exit = surveys.post ?? {};
    const reflection = surveys.reflection ?? {};

    const article = getArticles().find((art) => art.id === a.article_id);
    const acId = article?.attention_check.id;
    const attentionResponse =
      acId && typeof pre[acId] === "string" ? (pre[acId] as string) : "";
    let attentionCorrect = "";
    if (acId && attentionResponse) {
      attentionCorrect = isAttentionCorrect(a.article_id, attentionResponse)
        ? "true"
        : "false";
    }

    const cols = [
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
      attentionResponse,
      attentionCorrect,
      ...ratingIds.map((id) => pre[id] ?? ""),
      ...ratingIds.map((id) => post[id] ?? ""),
      ...demoIds.map((id) => demo[id] ?? ""),
      ...reflectionIds.map((id) => reflection[id] ?? ""),
      ...exitIds.map((id) => exit[id] ?? ""),
    ];
    return cols.map(csvEscape).join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
