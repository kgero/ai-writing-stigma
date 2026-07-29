import fs from "fs";
import path from "path";
import type {
  Article,
  Condition,
  OpenEndedQuestion,
  PublicArticle,
  PublicAttentionCheck,
  Question,
  SurveyType,
} from "./types";

const contentDir = path.join(process.cwd(), "content");

function readJson<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(contentDir, filename), "utf-8")) as T;
}

export interface AppConfig {
  min_reading_time_sec: number;
  study_contact_email: string;
}

export function getConfig(): AppConfig {
  return readJson<AppConfig>("config.json");
}

export function getArticles(): Article[] {
  return readJson<{ articles: Article[] }>("articles.json").articles;
}

export function getActiveArticles(): Article[] {
  return getArticles().filter((a) => a.active);
}

export function getArticleById(id: string): Article | undefined {
  return getArticles().find((a) => a.id === id);
}

export function getPublicArticle(id: string): PublicArticle | null {
  const article = getArticleById(id);
  if (!article) return null;
  return {
    headline: article.headline,
    body: article.body,
  };
}

export function getPublicAttentionCheck(id: string): PublicAttentionCheck | null {
  const article = getArticleById(id);
  if (!article) return null;
  const { id: qid, type, text, options } = article.attention_check;
  return { id: qid, type, text, options };
}

export function getSurveyQuestions(type: SurveyType): Question[] {
  const files: Record<SurveyType, string> = {
    pre: "survey-questions-pre.json",
    post: "survey-questions-post.json",
    reflection: "survey-questions-reflection.json",
  };
  return readJson<{ questions: Question[] }>(files[type]).questions;
}

export function getReflectionQuestions(): OpenEndedQuestion[] {
  return getSurveyQuestions("reflection").filter(
    (q): q is OpenEndedQuestion => q.type === "openended",
  );
}

export function getRatingsQuestions(): Question[] {
  return readJson<{ questions: Question[] }>("ratings-questions.json").questions;
}

export function getEditorsNote(condition: Condition): string {
  const notes = readJson<Record<Condition, string>>("editors-notes.json");
  return notes[condition];
}

export function validateArticlesAtBuildTime(): void {
  const active = getActiveArticles();
  const human = active.filter((a) => a.authorship_type === "human");
  const ai = active.filter((a) => a.authorship_type === "ai_assisted");
  if (active.length !== 6) {
    throw new Error(`Expected 6 active articles, found ${active.length}`);
  }
  if (human.length !== 3 || ai.length !== 3) {
    throw new Error(
      `Expected 3 human and 3 ai_assisted, found ${human.length} human and ${ai.length} ai_assisted`,
    );
  }
}
