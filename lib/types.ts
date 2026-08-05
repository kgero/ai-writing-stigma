export type Condition = "control" | "disclosure" | "revelation";
export type AuthorshipType = "human" | "ai_assisted";
export type SurveyType = "pre" | "post" | "reflection";
export type RatingPhase = "pre" | "post";

export interface Assignment {
  article_id: string;
  condition: Condition;
  cell_index: number;
  authorship_type: AuthorshipType;
}

export interface CellPair {
  article_id: string;
  condition: Condition;
}

export interface MultichoiceOption {
  value: string;
  label: string;
}

export interface AttentionCheck {
  id: string;
  type: "multichoice";
  text: string;
  options: MultichoiceOption[];
  correct_value: string;
}

export interface PangramResult {
  checked_at: string;
  headline: string;
  prediction: string;
  prediction_short: string;
  fraction_ai: number;
  fraction_ai_assisted: number;
  fraction_human: number;
  version?: string;
  error?: string;
}

export interface Article {
  id: string;
  headline: string;
  author: string;
  body: string;
  authorship_type: AuthorshipType;
  active: boolean;
  attention_check: AttentionCheck;
  /** Set true after editing the body to re-run Pangram on next admin check. */
  pangram_needs_check: boolean;
  /** Cached Pangram result; null until checked. */
  pangram: PangramResult | null;
}

export interface LikertQuestion {
  id: string;
  type: "likert";
  text: string;
  scale: number;
  anchors: { low: string; high: string };
}

export interface MultichoiceQuestion {
  id: string;
  type: "multichoice";
  text: string;
  options: MultichoiceOption[];
}

export interface OpenEndedQuestion {
  id: string;
  type: "openended";
  text: string;
  optional?: boolean;
}

export type Question = LikertQuestion | MultichoiceQuestion | OpenEndedQuestion;

export interface SessionRow {
  id: string;
  prolific_pid: string;
  prolific_study_id: string | null;
  prolific_session_id: string | null;
  assignment: Assignment;
  consent_at: Date;
  reading_time_sec: number | null;
  reading_completed_at: Date | null;
  completed_at: Date | null;
  stale_redirect_count: number;
  created_at: Date;
}

export interface ProgressState {
  hasPreSurvey: boolean;
  hasReading: boolean;
  hasPreRating: boolean;
  hasPostRating: boolean;
  hasReflectionSurvey: boolean;
  hasPostSurvey: boolean;
  isComplete: boolean;
}

export type StudyPath =
  | "/consent"
  | "/survey/pre"
  | "/read"
  | "/rate/pre"
  | "/rate/post"
  | "/survey/reflection"
  | "/survey/post"
  | "/complete";

export const STUDY_PATHS: StudyPath[] = [
  "/survey/pre",
  "/read",
  "/rate/pre",
  "/rate/post",
  "/survey/reflection",
  "/survey/post",
  "/complete",
];

export function pathIndex(path: StudyPath): number {
  return STUDY_PATHS.indexOf(path);
}

export interface PublicArticle {
  headline: string;
  body: string;
}

export interface PublicAttentionCheck {
  id: string;
  type: "multichoice";
  text: string;
  options: MultichoiceOption[];
}
