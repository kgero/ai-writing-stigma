import { getArticleById } from "./content";
import { getPool } from "./db";
import type { Question, RatingPhase, SurveyType } from "./types";

export function validateLikertResponses(
  questions: Question[],
  responses: Record<string, unknown>,
): Record<string, number> {
  const likertQs = questions.filter((q) => q.type === "likert");
  const validated: Record<string, number> = {};

  for (const q of likertQs) {
    const val = responses[q.id];
    const num = typeof val === "string" ? parseInt(val, 10) : val;
    if (typeof num !== "number" || num < 1 || num > q.scale) {
      throw new Error(`Invalid response for ${q.id}`);
    }
    validated[q.id] = num;
  }

  return validated;
}

export function validateMultichoiceResponses(
  questions: Question[],
  responses: Record<string, unknown>,
): Record<string, string> {
  const validated: Record<string, string> = {};

  for (const q of questions.filter((q) => q.type === "multichoice")) {
    const val = responses[q.id];
    if (typeof val !== "string") {
      throw new Error(`Invalid response for ${q.id}`);
    }
    const option = q.options.find((o) => o.value === val);
    if (!option) {
      throw new Error(`Invalid option for ${q.id}`);
    }
    validated[q.id] = val;
  }

  return validated;
}

export function validateOpenEndedResponses(
  questions: Question[],
  responses: Record<string, unknown>,
): Record<string, string> {
  const validated: Record<string, string> = {};

  for (const q of questions.filter((q) => q.type === "openended")) {
    const val = responses[q.id];
    const optional = q.optional === true;
    if (val === undefined || val === null || (typeof val === "string" && val.trim().length === 0)) {
      if (optional) continue;
      throw new Error(`Invalid response for ${q.id}`);
    }
    if (typeof val !== "string" || val.trim().length === 0) {
      throw new Error(`Invalid response for ${q.id}`);
    }
    validated[q.id] = val.trim();
  }

  return validated;
}

export function validateSurveyResponses(
  questions: Question[],
  responses: Record<string, unknown>,
): Record<string, string | number> {
  return {
    ...validateMultichoiceResponses(questions, responses),
    ...validateLikertResponses(questions, responses),
    ...validateOpenEndedResponses(questions, responses),
  };
}

export async function saveSurvey(
  sessionId: string,
  type: SurveyType,
  responses: Record<string, string | number>,
): Promise<void> {
  await getPool().query(
    `INSERT INTO survey_responses (session_id, survey_type, responses)
     VALUES ($1, $2, $3)
     ON CONFLICT (session_id, survey_type) DO NOTHING`,
    [sessionId, type, JSON.stringify(responses)],
  );
}

export async function saveRatings(
  sessionId: string,
  phase: RatingPhase,
  condition: string,
  articleId: string,
  authorshipType: string,
  responses: Record<string, string | number>,
): Promise<void> {
  await getPool().query(
    `INSERT INTO ratings (session_id, phase, condition, article_id, authorship_type, responses)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (session_id, phase) DO NOTHING`,
    [sessionId, phase, condition, articleId, authorshipType, JSON.stringify(responses)],
  );
}

export function validatePreRatings(
  articleId: string,
  ratingQuestions: Question[],
  responses: Record<string, unknown>,
): Record<string, string | number> {
  const article = getArticleById(articleId);
  if (!article) throw new Error("Article not found");

  const ac = article.attention_check;
  const acVal = responses[ac.id];
  if (typeof acVal !== "string" || !ac.options.some((o) => o.value === acVal)) {
    throw new Error("Invalid attention check response");
  }

  return {
    [ac.id]: acVal,
    ...validateLikertResponses(ratingQuestions, responses),
  };
}

export function validatePostRatings(
  ratingQuestions: Question[],
  responses: Record<string, unknown>,
): Record<string, number> {
  return validateLikertResponses(ratingQuestions, responses);
}

export function isAttentionCorrect(articleId: string, responseValue: string): boolean {
  const article = getArticleById(articleId);
  if (!article) return false;
  return article.attention_check.correct_value === responseValue;
}
