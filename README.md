# AI Writing Stigma Experiment - Web App

Web interface for a controlled online experiment recruited via Prolific. Each participant reads one op-ed, rates the author and writing quality before and after an editor's note, completes entry/exit surveys, and receives a completion code.

This document is the build spec for the experiment web app.

---

## 1. Stack

| Layer | Choice | Notes |
|---|---|---|
| **Framework** | Next.js (App Router) | Single repo: pages, API routes, and admin in one deploy |
| **Database** | PostgreSQL | Railway PostgreSQL plugin |
| **DB client** | `pg` | Raw SQL via connection pool; no ORM |
| **Schema** | `schema.sql` in repo | Run once on deploy (or manually) to create tables |
| **Hosting** | Railway | Deploy from GitHub; `main` auto-deploys |
| **Language** | TypeScript | Default for Next.js |
| **Content** | JSON files in repo | Articles and survey items; edit in repo, redeploy to update |
| **Admin auth** | Env var password | Read-only dashboard; httpOnly session cookie |

### Railway setup

- **Service 1:** Next.js app (GitHub-connected)
- **Service 2:** PostgreSQL (Railway template → `DATABASE_URL` injected)
- **Env vars:**
  - `DATABASE_URL` — auto from Railway
  - `COMPLETION_CODE` — static code shown at end of study
  - `ADMIN_PASSWORD` — gates `/admin`
  - `PROLIFIC_COMPLETION_URL` — optional redirect after completion

Study settings (reading time, contact email, etc.) live in `content/config.json`, not env vars.

**Build-time validation:** App fails to build (or start) unless `articles.json` has exactly **6 active** op-eds: **3** `human` and **3** `ai_assisted`.

---

## 2. Participant flow

Prolific entry URL passes query params: `PROLIFIC_PID`, `STUDY_ID`, `SESSION_ID`.

```
  → Landing (Prolific ID in URL)
  → Consent
  → Pre-survey (demographics)
  → Read op-ed (minimum reading time)
  → Pre-disclosure ratings + attention check (one page)
  → Post-disclosure ratings + editor's note (one page)
  → Open-ended reflection
  → Exit survey
  → Completion code (+ optional Prolific redirect)
```

Each participant sees **one op-ed** in **one disclosure condition**. There are 6 op-eds × 3 conditions = **18 cells**. Assignment is round-robin across cells (see below).

### Screen details

**Landing**
- If `PROLIFIC_PID` is in the URL, validate and advance automatically (no extra click). Otherwise participant enters ID manually.
- **No session row yet** — only checks the database:
  - **Completed** (`completed_at` set) → block with message.
  - **Incomplete** (session exists, not completed) → block with message (do not resume; do not assign a new cell).
  - **OK** → forward to `/consent` with Prolific params in the URL.

**Block pages** (`/blocked/complete`, `/blocked/incomplete`)

- **Already completed:** *"You have already completed this study. Thank you for your participation."*
- **Incomplete session:** *"You have already started this study but didn't finish. We can't restart or resume your session from here. If you think this is an error, please contact {study_contact_email}."* (from `content/config.json`.)

**Consent**
- Display IRB consent text (placeholder OK for v1).
- **Agree** → Server Action creates session row, assigns next cell (round-robin), sets `consent_at`, sets session cookie, redirects to pre-survey.
- **Decline** → end screen; **no session row** created.

**Pre-survey**
- Multichoice and 7-point Likert items (from JSON).
- Stored in `survey_responses` with `survey_type = pre`.

**Experiment (single op-ed)**

1. **Read op-ed** — headline and body (~500 words) on a single scrolling page. "Next" disabled until elapsed time ≥ `min_reading_time_sec` from `config.json`. Record total reading time on continue.
2. **Pre-disclosure ratings + attention check** — one page. Attention-check multichoice (from assigned op-ed JSON) first, then 7-point Likert items (from `ratings-questions.json`).
3. **Post-disclosure ratings + editor's note** — one page. Editor's note for this participant's condition shown **above** the same Likert items. Single submit saves post ratings.
4. **Open-ended reflection** — one question (from `survey-questions-reflection.json`), e.g. whether ratings changed after the disclosure and why.

**Exit survey**
- 7-point Likert and multichoice items (from JSON).
- Stored with `survey_type = post`.

**Completion**
- Display static `COMPLETION_CODE` only (no debrief page in v1).
- Optional button/link to `PROLIFIC_COMPLETION_URL`.

### Reading enforcement

- Start timer when op-ed renders.
- Disable "Next" until elapsed time ≥ `min_reading_time_sec` in `content/config.json`.
- On continue, a **Server Action** writes `reading_time_sec` and `reading_completed_at` to the session row, then redirects to `/rate/pre`.

Reading time is stored on **`sessions`**, not on the pre-ratings row — it belongs to the read phase. This also preserves reading time if a participant abandons on the ratings page.

### Attention check (failed responses)

If the attention-check answer is wrong, the participant **continues through the rest of the study** and receives the completion code. Response stored as-is; export includes derived `attention_correct`. Review pass rates in the pilot; adjust policy or questions if needed.

### Navigation (browser back)

**Soft block (chosen):** the browser back button still works, but every protected page re-runs server-side progress checks on load. If the URL doesn't match DB state (e.g. back to `/read` after pre-ratings are saved), the server **redirects forward** to the correct step. Participant stays in the study — not booted to Prolific. They cannot re-read the op-ed, change submitted ratings, or skip ahead.

No error modal — just a redirect. Do **not** use `router.replace` on step transitions (that would drop history and risk kicking people out of the study).

**Logging back / stale navigation:** when the progress guard redirects because the URL is behind current state, increment `sessions.stale_redirect_count`. Export includes this column for pilot review. No per-event log in v1.

One consent-line note optional: *"Please use the Next buttons rather than your browser's back button."*

### Cell assignment (round-robin)

**Design:** 6 op-eds × 3 conditions (`control`, `disclosure`, `revelation`) = **18 cells**. Each participant is assigned exactly one cell. Op-eds have a hidden authorship type (`human` | `ai_assisted`); participants are blind to this.

**Algorithm:**
1. On **first consent** (first session row created): if no `study_state` row exists, build all 18 `{ article_id, condition }` pairs from the 6 active op-eds, shuffle, `INSERT` into `study_state` with `next_index = 0`.
2. On each new session at consent: in a transaction, read `cell_order[next_index]`, write assignment to session, increment `next_index` (wrap to 0 after 17).

Round-robin runs at **consent**, not landing — declined consent never consumes a cell. Incomplete sessions block re-entry but may leave slight cell imbalance; acceptable at expected sample sizes (100s).

To reset cell order mid-study (e.g. new data collection wave), manually delete the `study_state` row — next consent will re-shuffle.

Store the resolved cell on the session record, e.g. `assignment: { "article_id": "article_01", "condition": "control", "cell_index": 4, "authorship_type": "human" }`. `authorship_type` is copied from the article JSON at assignment time so exports and admin don't need to re-read `articles.json`. Immutable once created.

---

## 3. Data model

Table definitions live in `schema.sql` at the repo root.

### `sessions`

One row per participant who consented. Created on consent agree — not on landing.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK; session cookie |
| `prolific_pid` | text | **Unique** — one row per Prolific ID (blocks duplicate complete or incomplete) |
| `prolific_study_id` | text | From URL |
| `prolific_session_id` | text | From URL |
| `assignment` | JSONB | `{ "article_id", "condition", "cell_index", "authorship_type" }` |
| `consent_at` | timestamptz | Set when row created |
| `reading_time_sec` | int | null until read page complete |
| `reading_completed_at` | timestamptz | null until read page complete |
| `completed_at` | timestamptz | null until study finished |
| `stale_redirect_count` | int | Default 0; incremented when progress guard redirects forward from a stale URL |
| `created_at` | timestamptz | Same as consent (row created on agree) |

Unique index: `prolific_pid`.

---

### `study_state`

Single row tracking round-robin assignment order. Table created by `schema.sql`; **row** created on first consent (see Cell assignment).

| Column | Type | Notes |
|---|---|---|
| `id` | int | Always `1` (singleton) |
| `cell_order` | JSONB | Shuffled array of 18 `{ "article_id", "condition" }` objects |
| `next_index` | int | Index of next cell to assign (wraps at 18) |

---

### `ratings`

One row per session × phase (`pre` | `post`). Rating **values** are stored as JSON so question sets can change after a pilot without altering the table schema.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `session_id` | UUID | FK → sessions |
| `phase` | text | `pre` or `post` |
| `condition` | text | This participant's condition |
| `article_id` | text | This participant's op-ed |
| `authorship_type` | text | Denormalized from article JSON (`human` \| `ai_assisted`); for export only, never sent to client |
| `responses` | JSONB | `{ "question_id": value, ... }` — Likert keys from `ratings-questions.json`; pre row also includes attention-check key from article JSON |
| `submitted_at` | timestamptz | |

Unique constraint: `(session_id, phase)`.

Likert definitions live in `content/ratings-questions.json`. Attention-check definition lives per op-ed in `articles.json`. All Likert items use 7-point scales with endpoint labels ("Strongly disagree" / "Strongly agree") and numeric values 1–7.

---

### `survey_responses`

One row per session × survey type.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `session_id` | UUID | FK → sessions |
| `survey_type` | text | `pre`, `post`, or `reflection` |
| `responses` | JSONB | `{ "question_id": value, ... }` |
| `submitted_at` | timestamptz | |

Unique constraint: `(session_id, survey_type)`.

---

## 4. JSON in repo

Content lives under `content/`. Edit files in the repo and redeploy to update copy. No CMS or database seeding required for content.

```
content/
  config.json
  articles.json
  editors-notes.json
  ratings-questions.json
  survey-questions-reflection.json
  survey-questions-pre.json
  survey-questions-post.json
```

### `config.json`

```json
{
  "min_reading_time_sec": 60,
  "study_contact_email": "researcher@example.com"
}
```

- `min_reading_time_sec` — minimum seconds on the read page before "Next" unlocks. Tune after pilot.
- `study_contact_email` — shown on the incomplete block page. Replace with real address before launch.

### `articles.json`

```json
{
  "articles": [
    {
      "id": "article_01",
      "headline": "Dummy Headline One",
      "byline": "By Jane Doe",
      "body": "... ~500 words ...",
      "authorship_type": "human",
      "active": true,
      "attention_check": {
        "id": "attention_article_01",
        "type": "multichoice",
        "text": "What was the main topic of this article?",
        "options": [
          { "value": "topic_a", "label": "Topic A (correct)" },
          { "value": "topic_b", "label": "Topic B" },
          { "value": "topic_c", "label": "Topic C" }
        ],
        "correct_value": "topic_a"
      }
    }
  ]
}
```

- **Exactly 6 active op-eds:** 3 `human`, 3 `ai_assisted` (enforced at build). Dummy text until real op-eds are ready.
- `authorship_type` and `correct_value` are server-side only (balancing, export, attention-check scoring). Never sent to the client.
- `active: false` excludes an article from the 18-cell grid without deleting it.
- Each op-ed must have exactly one `attention_check` multichoice item with a unique `id`.

### `survey-questions-pre.json` / `survey-questions-post.json`

```json
{
  "questions": [
    {
      "id": "demo_age",
      "type": "multichoice",
      "text": "What is your age range?",
      "options": [
        { "value": "18-24", "label": "18–24" },
        { "value": "25-34", "label": "25–34" }
      ]
    },
    {
      "id": "demo_education",
      "type": "likert",
      "text": "I read opinion articles regularly.",
      "scale": 7,
      "anchors": {
        "low": "Strongly disagree",
        "high": "Strongly agree"
      }
    }
  ]
}
```

- All Likert items use `"scale": 7`, endpoint anchor labels, and store integers 1–7 in `responses`.

### `ratings-questions.json`

Same structure as survey question files. Defines **five** Likert items at pre- and post-disclosure (one shared list for both phases): competence, willingness to read again, writing quality (style, argument, overall).

```json
{
  "questions": [
    {
      "id": "competence",
      "type": "likert",
      "text": "This author is competent.",
      "scale": 7,
      "anchors": { "low": "Strongly disagree", "high": "Strongly agree" }
    },
    {
      "id": "willingness_read_again",
      "type": "likert",
      "text": "I would read another piece by this author.",
      "scale": 7,
      "anchors": { "low": "Strongly disagree", "high": "Strongly agree" }
    },
    {
      "id": "quality_style",
      "type": "likert",
      "text": "This piece is well written in terms of style.",
      "scale": 7,
      "anchors": { "low": "Strongly disagree", "high": "Strongly agree" }
    },
    {
      "id": "quality_argument",
      "type": "likert",
      "text": "This piece is well written in terms of argument.",
      "scale": 7,
      "anchors": { "low": "Strongly disagree", "high": "Strongly agree" }
    },
    {
      "id": "quality_overall",
      "type": "likert",
      "text": "Overall, this is a well-written piece.",
      "scale": 7,
      "anchors": { "low": "Strongly disagree", "high": "Strongly agree" }
    }
  ]
}
```

- Likert values go in `ratings.responses` keyed by `id`.
- Attention-check value goes in the **pre** row's `responses` under the article's `attention_check.id`.
- Changing questions after a pilot means editting the JSON and then redeploying; existing rows keep whatever keys were submitted at the time.

### `editors-notes.json`

```json
{
  "control": "The author has disclosed that AI tools were not used in the writing of this piece.",
  "disclosure": "The author has disclosed that AI tools were used in the writing of this piece.",
  "revelation": "Following publication, a review of the writing identified the use of AI tools, which the author had not previously disclosed."
}
```

---

## 5. Data flow: pages & API routes

Server Components read the session cookie, query Postgres, and load JSON from `content/` on the server. Each page checks where the participant should be and redirects if out of order (including browser-back soft block).

Session cookie set on **consent agree**. No login for participants.

### POST endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/survey` | Body: `{ type: "pre" \| "reflection" \| "post", responses: { question_id: value } }`. Validates against the matching survey JSON file. Redirects to next step. |
| `POST` | `/api/ratings` | Body: `{ phase: "pre" \| "post", responses: { question_id: value } }`. Pre: validates Likert keys + attention-check key. Post: Likert only. Redirects to next step. |
| `POST` | `/api/session/complete` | Sets `completed_at` if not set. Used from `/complete` after exit survey. |

**Server Actions (not REST):**
- **Consent agree** — create session, round-robin assign, set cookie, redirect to `/survey/pre`.
- **Read continue** — write `reading_time_sec`, `reading_completed_at`, redirect to `/rate/pre`.

**Landing** — no POST route. Server Component validates Prolific ID and redirects to `/consent` or block page.

### Page map (all server-rendered)

| Route | Loads on server | Submit via |
|---|---|---|
| `/` | Prolific URL params | validate → `/consent` or `/blocked/*` |
| `/blocked/complete` | — | already finished |
| `/blocked/incomplete` | — | started but not finished |
| `/consent` | — | Server Action on agree → session + cookie; decline → end |
| `/survey/pre` | `survey-questions-pre.json` | `POST /api/survey` → `/read` |
| `/read` | assigned article + `config.json` | Server Action → reading time, redirect `/rate/pre` |
| `/rate/pre` | article `attention_check` + `ratings-questions.json` | `POST /api/ratings` (pre) → `/rate/post` |
| `/rate/post` | editor's note + `ratings-questions.json` | `POST /api/ratings` (post) → `/survey/reflection` |
| `/survey/reflection` | `survey-questions-reflection.json` | `POST /api/survey` → `/survey/post` |
| `/survey/post` | `survey-questions-post.json` | `POST /api/survey` → `/complete` |
| `/complete` | — | `POST /api/session/complete`; show `COMPLETION_CODE` |

Progress is **inferred from DB rows**. Example: no pre survey → `/survey/pre`; no `reading_completed_at` → `/read`; no pre rating → `/rate/pre`; no post rating → `/rate/post`.


### Admin (read-only)

Admin pages are also Server Components — stats and CSV export query Postgres directly. No participant-style API layer needed.

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/admin/login` | Body: `{ password }`. Sets admin cookie. |

Dashboard at `/admin` — completion rates, **counts per cell** (18 cells), attention-check pass rates, CSV download links. All read-only.

---

## 6. Local development

### Prerequisites

- Node.js 20+
- PostgreSQL running locally (Homebrew, Postgres.app, Docker, etc.)

### Setup

```bash
git clone <repo-url>
cd ai-writing-stigma
npm install
```

Create `.env.local`:

```env
DATABASE_URL=postgresql://localhost:5432/ai_writing_stigma
COMPLETION_CODE=TEST-COMPLETE
ADMIN_PASSWORD=dev-admin
# optional
PROLIFIC_COMPLETION_URL=
```

Contact email for block pages is in `content/config.json` (`study_contact_email`).

Create the database and apply schema:

```bash
createdb ai_writing_stigma
psql $DATABASE_URL -f schema.sql
```

On Railway, schema runs automatically on app startup if tables are missing; locally you run `schema.sql` yourself.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Test a participant flow

Simulate Prolific entry with query params:

```
http://localhost:3000/?PROLIFIC_PID=test_user_001&STUDY_ID=local&SESSION_ID=local1
```

Walk through consent → surveys → op-ed → ratings → completion. Use a **new** `PROLIFIC_PID` for each full run (incomplete and completed IDs are blocked on reuse).

To shorten the read timer while testing, temporarily lower `min_reading_time_sec` in `content/config.json`.

### Test admin

1. Go to [http://localhost:3000/admin](http://localhost:3000/admin)
2. Log in with `ADMIN_PASSWORD`
3. Check cell counts and download CSV exports

### Reset local data

```bash
psql $DATABASE_URL -c "TRUNCATE sessions, ratings, survey_responses, study_state RESTART IDENTITY CASCADE;"
```

Or drop and recreate the database. To reset round-robin order only, delete the `study_state` row.

### Pilot rescue

To unblock a stuck Prolific ID locally or in production, delete that participant's row from `sessions` (cascades to ratings/surveys if FK set up that way).

---

## Appendix: Export columns

**sessions.csv** — `session_id, prolific_pid, prolific_study_id, prolific_session_id, article_id, condition, cell_index, authorship_type, reading_time_sec, reading_completed_at, stale_redirect_count, consent_at, completed_at, created_at`

**ratings.csv** — one row per rating row. Fixed columns: `session_id, prolific_pid, phase, condition, article_id, authorship_type, submitted_at`. Question columns flattened from `responses` JSON (Likert ids from `ratings-questions.json` + attention-check id from article). Export can include derived `attention_correct` (boolean) using `correct_value` from article JSON. Join `sessions.reading_time_sec` in analysis or wide export as needed.

**surveys.csv** — one row per session; `session_id, prolific_pid, survey_type, <question_id columns...>, submitted_at`

---

## Open items

- [ ] Tune `min_reading_time_sec` in `config.json` after pilot
- [ ] Replace dummy articles and survey questions with final copy
- [ ] IRB consent and debrief text
- [ ] Review attention-check pass rates after pilot

## To do

- [ ] pm didn't like the 'please read for 60 sec'