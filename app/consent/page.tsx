import Link from "next/link";
import { redirect } from "next/navigation";
import StudyShell from "@/components/StudyShell";
import { consentAgree } from "./actions";
import { getSessionIdFromCookie } from "@/lib/cookies";
import { getProlificStatus, getSessionById, getProgressState, getExpectedPath } from "@/lib/sessions";

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{
    PROLIFIC_PID?: string;
    STUDY_ID?: string;
    SESSION_ID?: string;
  }>;
}) {
  const params = await searchParams;
  const prolificPid = params.PROLIFIC_PID?.trim();

  if (!prolificPid) {
    redirect("/");
  }

  const status = await getProlificStatus(prolificPid);
  if (status === "complete") redirect("/blocked/complete");
  if (status === "incomplete") redirect("/blocked/incomplete");

  const existingSession = await getSessionIdFromCookie();
  if (existingSession) {
    const session = await getSessionById(existingSession);
    if (session) {
      const progress = await getProgressState(existingSession);
      redirect(getExpectedPath(progress));
    }
  }

  return (
    <StudyShell>
      <h1>Informed Consent</h1>
      <p className="muted">
        Please use the Next buttons rather than your browser&apos;s back button.
      </p>
      <div style={{ margin: "1.5rem 0" }}>
        <p>
          [Placeholder consent text — replace with IRB-approved language before launch.]
        </p>
        <p>
          You are invited to participate in a research study about online opinion articles.
          The session takes approximately 15–20 minutes. You may decline to participate
          without penalty. You may skip questions you prefer not to answer, except where
          noted. Your Prolific ID will be stored for completion verification only.
        </p>
      </div>
      <form action={consentAgree}>
        <input type="hidden" name="prolific_pid" value={prolificPid} />
        <input type="hidden" name="prolific_study_id" value={params.STUDY_ID ?? ""} />
        <input type="hidden" name="prolific_session_id" value={params.SESSION_ID ?? ""} />
        <div className="form-actions">
          <button type="submit" className="btn">
            I agree — continue
          </button>
          <Link href="/consent/declined" className="btn btn-secondary">
            I do not agree
          </Link>
        </div>
      </form>
    </StudyShell>
  );
}
