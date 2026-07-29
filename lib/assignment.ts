import { getActiveArticles } from "./content";
import { getPool } from "./db";
import type { Assignment, CellPair, Condition } from "./types";

const CONDITIONS: Condition[] = ["control", "disclosure", "revelation"];

function buildAllCells(): CellPair[] {
  const articles = getActiveArticles();
  const cells: CellPair[] = [];
  for (const article of articles) {
    for (const condition of CONDITIONS) {
      cells.push({ article_id: article.id, condition });
    }
  }
  return cells;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function assignNextCell(): Promise<Assignment> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let stateResult = await client.query(`SELECT * FROM study_state WHERE id = 1 FOR UPDATE`);

    if (stateResult.rowCount === 0) {
      const cellOrder = shuffle(buildAllCells());
      await client.query(
        `INSERT INTO study_state (id, cell_order, next_index) VALUES (1, $1, 0)`,
        [JSON.stringify(cellOrder)],
      );
      stateResult = await client.query(`SELECT * FROM study_state WHERE id = 1 FOR UPDATE`);
    }

    const state = stateResult.rows[0];
    const cellOrder = state.cell_order as CellPair[];
    const nextIndex = state.next_index as number;
    const cell = cellOrder[nextIndex];

    const article = getActiveArticles().find((a) => a.id === cell.article_id);
    if (!article) {
      throw new Error(`Article not found for assignment: ${cell.article_id}`);
    }

    const assignment: Assignment = {
      article_id: cell.article_id,
      condition: cell.condition,
      cell_index: nextIndex,
      authorship_type: article.authorship_type,
    };

    const newIndex = (nextIndex + 1) % cellOrder.length;
    await client.query(`UPDATE study_state SET next_index = $1 WHERE id = 1`, [newIndex]);

    await client.query("COMMIT");
    return assignment;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function createSession(
  prolificPid: string,
  prolificStudyId: string | null,
  prolificSessionId: string | null,
): Promise<string> {
  const assignment = await assignNextCell();
  const result = await getPool().query(
    `INSERT INTO sessions (prolific_pid, prolific_study_id, prolific_session_id, assignment)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [prolificPid, prolificStudyId, prolificSessionId, JSON.stringify(assignment)],
  );
  return result.rows[0].id as string;
}
