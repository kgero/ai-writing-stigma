import { NextResponse } from "next/server";
import { getSessionIdFromCookie } from "@/lib/cookies";
import { getSurveyQuestions } from "@/lib/content";
import { ensureSchema } from "@/lib/db";
import { getProgressState, getSessionById } from "@/lib/sessions";
import { saveSurvey, validateSurveyResponses } from "@/lib/validation";
import type { SurveyType } from "@/lib/types";

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
      type?: SurveyType;
      responses?: Record<string, unknown>;
    };

    const type = body.type;
    if (type !== "pre" && type !== "post" && type !== "reflection") {
      return NextResponse.json({ error: "Invalid survey type" }, { status: 400 });
    }

    const progress = await getProgressState(sessionId);
    if (type === "pre" && progress.hasPreSurvey) {
      return NextResponse.json({ redirect: "/read" });
    }
    if (type === "reflection" && progress.hasReflectionSurvey) {
      return NextResponse.json({ redirect: "/survey/post" });
    }
    if (type === "post" && progress.hasPostSurvey) {
      return NextResponse.json({ redirect: "/complete" });
    }

    const questions = getSurveyQuestions(type);
    const responses = validateSurveyResponses(questions, body.responses ?? {});
    await saveSurvey(sessionId, type, responses);

    const redirectTo =
      type === "pre" ? "/read" : type === "reflection" ? "/survey/post" : "/complete";
    return NextResponse.json({ redirect: redirectTo });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid submission";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
