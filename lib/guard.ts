import { redirect } from "next/navigation";
import { getSessionIdFromCookie } from "./cookies";
import {
  getExpectedPath,
  getProgressState,
  getSessionById,
  incrementStaleRedirect,
  isPathAllowed,
  isPathStale,
} from "./sessions";
import type { StudyPath } from "./types";

export async function requireSession(): Promise<{
  sessionId: string;
  session: NonNullable<Awaited<ReturnType<typeof getSessionById>>>;
}> {
  const sessionId = await getSessionIdFromCookie();
  if (!sessionId) {
    redirect("/");
  }
  const session = await getSessionById(sessionId);
  if (!session) {
    redirect("/");
  }
  return { sessionId, session };
}

export async function enforceStudyPath(requestedPath: StudyPath): Promise<{
  sessionId: string;
  session: NonNullable<Awaited<ReturnType<typeof getSessionById>>>;
}> {
  const { sessionId, session } = await requireSession();
  const progress = await getProgressState(sessionId);
  const expected = getExpectedPath(progress);

  if (progress.isComplete && requestedPath !== "/complete") {
    redirect("/complete");
  }

  if (isPathAllowed(requestedPath, expected)) {
    return { sessionId, session };
  }

  if (isPathStale(requestedPath, expected)) {
    await incrementStaleRedirect(sessionId);
    redirect(expected);
  }

  // Ahead of progress — send to expected step
  redirect(expected);
}
