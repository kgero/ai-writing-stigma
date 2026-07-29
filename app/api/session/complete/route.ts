import { NextResponse } from "next/server";
import { getSessionIdFromCookie } from "@/lib/cookies";
import { ensureSchema } from "@/lib/db";
import { getProgressState, markComplete } from "@/lib/sessions";

export async function POST() {
  try {
    await ensureSchema();
    const sessionId = await getSessionIdFromCookie();
    if (!sessionId) {
      return NextResponse.json({ error: "No session" }, { status: 401 });
    }

    const progress = await getProgressState(sessionId);
    if (!progress.hasPostSurvey) {
      return NextResponse.json({ error: "Complete exit survey first" }, { status: 400 });
    }

    await markComplete(sessionId);
    return NextResponse.json({
      redirect: "/complete",
      completion_code: process.env.COMPLETION_CODE ?? "",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
