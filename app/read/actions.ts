"use server";

import { redirect } from "next/navigation";
import { getSessionIdFromCookie } from "@/lib/cookies";
import { ensureSchema } from "@/lib/db";
import { markReadingComplete } from "@/lib/sessions";

export async function continueReading(readingTimeSec: number) {
  await ensureSchema();
  const sessionId = await getSessionIdFromCookie();
  if (!sessionId) redirect("/");

  if (readingTimeSec < 0 || readingTimeSec > 86400) {
    throw new Error("Invalid reading time");
  }

  await markReadingComplete(sessionId, readingTimeSec);
  redirect("/rate/pre");
}
