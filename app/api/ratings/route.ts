import { NextResponse } from "next/server";
import { getSessionIdFromCookie } from "@/lib/cookies";
import { getRatingsQuestions } from "@/lib/content";
import { ensureSchema } from "@/lib/db";
import { getProgressState, getSessionById } from "@/lib/sessions";
import {
  saveRatings,
  validatePostRatings,
  validatePreRatings,
} from "@/lib/validation";
import type { RatingPhase } from "@/lib/types";

export async function POST(request: Request) {
  try {
    await ensureSchema();
    const sessionId = await getSessionIdFromCookie();
    if (!sessionId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const session = await getSessionById(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = (await request.json()) as {
      phase?: RatingPhase;
      responses?: Record<string, unknown>;
    };

    const phase = body.phase;
    if (phase !== "pre" && phase !== "post") {
      return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
    }

    const progress = await getProgressState(sessionId);
    const { assignment } = session;
    const ratingQuestions = getRatingsQuestions();

    if (phase === "pre") {
      if (!progress.hasReading) {
        return NextResponse.json({ error: "Complete reading first" }, { status: 400 });
      }
      const validated = validatePreRatings(
        assignment.article_id,
        ratingQuestions,
        body.responses ?? {},
      );
      await saveRatings(
        sessionId,
        "pre",
        assignment.condition,
        assignment.article_id,
        assignment.authorship_type,
        validated,
      );
      return NextResponse.json({ redirect: "/rate/post" });
    }

    if (!progress.hasPreRating) {
      return NextResponse.json({ error: "Complete pre-ratings first" }, { status: 400 });
    }

    const validated = validatePostRatings(ratingQuestions, body.responses ?? {});
    await saveRatings(
      sessionId,
      "post",
      assignment.condition,
      assignment.article_id,
      assignment.authorship_type,
      validated,
    );
    return NextResponse.json({ redirect: "/survey/reflection" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid submission";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
