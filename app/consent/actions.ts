"use server";

import { redirect } from "next/navigation";
import { createSession } from "@/lib/assignment";
import { setSessionCookie } from "@/lib/cookies";
import { ensureSchema } from "@/lib/db";
import { getProlificStatus } from "@/lib/sessions";

export async function consentAgree(formData: FormData) {
  await ensureSchema();

  const prolificPid = String(formData.get("prolific_pid") ?? "").trim();
  const prolificStudyId = String(formData.get("prolific_study_id") ?? "").trim() || null;
  const prolificSessionId = String(formData.get("prolific_session_id") ?? "").trim() || null;

  if (!prolificPid) {
    redirect("/");
  }

  const status = await getProlificStatus(prolificPid);
  if (status === "complete") redirect("/blocked/complete");
  if (status === "incomplete") redirect("/blocked/incomplete");

  const sessionId = await createSession(prolificPid, prolificStudyId, prolificSessionId);
  await setSessionCookie(sessionId);
  redirect("/survey/pre");
}
