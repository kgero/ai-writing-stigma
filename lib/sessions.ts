import { getPool } from "./db";
import type { Assignment, ProgressState, SessionRow, StudyPath } from "./types";
import { STUDY_PATHS } from "./types";

function mapSession(row: Record<string, unknown>): SessionRow {
  return {
    id: row.id as string,
    prolific_pid: row.prolific_pid as string,
    prolific_study_id: (row.prolific_study_id as string) ?? null,
    prolific_session_id: (row.prolific_session_id as string) ?? null,
    assignment: row.assignment as Assignment,
    consent_at: new Date(row.consent_at as string),
    reading_time_sec: row.reading_time_sec as number | null,
    reading_completed_at: row.reading_completed_at
      ? new Date(row.reading_completed_at as string)
      : null,
    completed_at: row.completed_at ? new Date(row.completed_at as string) : null,
    stale_redirect_count: row.stale_redirect_count as number,
    created_at: new Date(row.created_at as string),
  };
}

export async function getSessionById(id: string): Promise<SessionRow | null> {
  const result = await getPool().query(`SELECT * FROM sessions WHERE id = $1`, [id]);
  if (result.rowCount === 0) return null;
  return mapSession(result.rows[0]);
}

export type ProlificStatus = "ok" | "complete" | "incomplete";

export async function getProlificStatus(prolificPid: string): Promise<ProlificStatus> {
  const result = await getPool().query(
    `SELECT completed_at FROM sessions WHERE prolific_pid = $1`,
    [prolificPid],
  );
  if (result.rowCount === 0) return "ok";
  if (result.rows[0].completed_at) return "complete";
  return "incomplete";
}

export async function getProgressState(sessionId: string): Promise<ProgressState> {
  const pool = getPool();
  const [preSurvey, reflectionSurvey, postSurvey, preRating, postRating, session] =
    await Promise.all([
    pool.query(
      `SELECT 1 FROM survey_responses WHERE session_id = $1 AND survey_type = 'pre'`,
      [sessionId],
    ),
    pool.query(
      `SELECT 1 FROM survey_responses WHERE session_id = $1 AND survey_type = 'reflection'`,
      [sessionId],
    ),
    pool.query(
      `SELECT 1 FROM survey_responses WHERE session_id = $1 AND survey_type = 'post'`,
      [sessionId],
    ),
    pool.query(`SELECT 1 FROM ratings WHERE session_id = $1 AND phase = 'pre'`, [sessionId]),
    pool.query(`SELECT 1 FROM ratings WHERE session_id = $1 AND phase = 'post'`, [sessionId]),
    pool.query(`SELECT reading_completed_at, completed_at FROM sessions WHERE id = $1`, [
      sessionId,
    ]),
  ]);

  const sessionRow = session.rows[0];
  const isComplete = Boolean(sessionRow?.completed_at);

  return {
    hasPreSurvey: (preSurvey.rowCount ?? 0) > 0,
    hasReading: Boolean(sessionRow?.reading_completed_at),
    hasPreRating: (preRating.rowCount ?? 0) > 0,
    hasPostRating: (postRating.rowCount ?? 0) > 0,
    hasReflectionSurvey: (reflectionSurvey.rowCount ?? 0) > 0,
    hasPostSurvey: (postSurvey.rowCount ?? 0) > 0,
    isComplete,
  };
}

export function getExpectedPath(progress: ProgressState): StudyPath {
  if (progress.isComplete) return "/complete";
  if (!progress.hasPreSurvey) return "/survey/pre";
  if (!progress.hasReading) return "/read";
  if (!progress.hasPreRating) return "/rate/pre";
  if (!progress.hasPostRating) return "/rate/post";
  if (!progress.hasReflectionSurvey) return "/survey/reflection";
  if (!progress.hasPostSurvey) return "/survey/post";
  return "/complete";
}

export function isPathAllowed(requested: StudyPath, expected: StudyPath): boolean {
  const reqIdx = STUDY_PATHS.indexOf(requested);
  const expIdx = STUDY_PATHS.indexOf(expected);
  if (reqIdx === -1 || expIdx === -1) return false;
  return reqIdx === expIdx;
}

export function isPathStale(requested: StudyPath, expected: StudyPath): boolean {
  const reqIdx = STUDY_PATHS.indexOf(requested);
  const expIdx = STUDY_PATHS.indexOf(expected);
  return reqIdx < expIdx;
}

export async function incrementStaleRedirect(sessionId: string): Promise<void> {
  await getPool().query(
    `UPDATE sessions SET stale_redirect_count = stale_redirect_count + 1 WHERE id = $1`,
    [sessionId],
  );
}

export async function markReadingComplete(
  sessionId: string,
  readingTimeSec: number,
): Promise<void> {
  await getPool().query(
    `UPDATE sessions SET reading_time_sec = $2, reading_completed_at = NOW() WHERE id = $1`,
    [sessionId, readingTimeSec],
  );
}

export async function markComplete(sessionId: string): Promise<void> {
  await getPool().query(
    `UPDATE sessions SET completed_at = NOW() WHERE id = $1 AND completed_at IS NULL`,
    [sessionId],
  );
}
