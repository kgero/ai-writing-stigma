CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prolific_pid TEXT NOT NULL UNIQUE,
  prolific_study_id TEXT,
  prolific_session_id TEXT,
  assignment JSONB NOT NULL,
  consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reading_time_sec INT,
  reading_completed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  stale_redirect_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS study_state (
  id INT PRIMARY KEY CHECK (id = 1),
  cell_order JSONB NOT NULL,
  next_index INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  phase TEXT NOT NULL CHECK (phase IN ('pre', 'post')),
  condition TEXT NOT NULL,
  article_id TEXT NOT NULL,
  authorship_type TEXT NOT NULL,
  responses JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, phase)
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  survey_type TEXT NOT NULL CHECK (survey_type IN ('pre', 'post', 'reflection')),
  responses JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, survey_type)
);

CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON sessions(completed_at);

CREATE TABLE IF NOT EXISTS pangram_results (
  article_id TEXT PRIMARY KEY,
  body_hash TEXT NOT NULL,
  result JSONB NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
