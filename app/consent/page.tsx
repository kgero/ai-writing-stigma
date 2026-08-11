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
      <div className="consent-body">
        <p>
          <strong>Principal Investigator:</strong> Dr. Paramveer Dhillon, School of
          Information, University of Michigan — dhillonp@umich.edu
        </p>
        <p>
          <strong>Co‑Principal Investigator:</strong> Dr. Katy Gero, School of Computer
          Science, University of Sydney — katy.gero@sydney.edu.au
        </p>
        <p>
          <strong>IRB:</strong> University of Michigan Health Sciences &amp; Behavioral
          Sciences IRB (HSBS)
        </p>
        <p>
          <strong>IRB number:</strong> XXX
        </p>
        <p>
          <strong>IRB contact (questions about your rights as a participant):</strong>{" "}
          irbhsbs@umich.edu | +1 734‑936‑0933
        </p>

        <div className="consent-section">
          <h2>What is this study about?</h2>
          <p>We are studying how people perceive op-ed articles.</p>
        </div>

        <div className="consent-section">
          <h2>What will happen if I take part?</h2>
          <ol>
            <li>Answer some demographic questions (&quot;pre survey&quot;).</li>
            <li>Read an op-ed.</li>
            <li>Rate the op-ed you just read.</li>
            <li>
              Answer a brief post‑task survey about your experience (&quot;post
              survey&quot;).
            </li>
          </ol>
          <p>The whole session will take about 5 minutes.</p>
        </div>

        <div className="consent-section">
          <h2>What data will be collected?</h2>
          <p>The app will securely record your answers to the pre and post surveys, as well as some telemetry data like how long you spent reading the op-ed.</p>
        </div>

        <div className="consent-section">
          <h2>What are the risks?</h2>
          <p>The study involves minimal risk. You may leave the study at any time.</p>
        </div>

        <div className="consent-section">
          <h2>What are the benefits?</h2>
          <p>
            There is no direct personal benefit. You may find the op-ed interesting, and
            society may benefit from improved understanding of reader perspectives.
          </p>
        </div>

        <div className="consent-section">
          <h2>How will my information be protected?</h2>
          <p>
            No personally identifying information will be stored with your responses. Data
            are retained on secure, access‑controlled U‑M servers for up to ten years and
            may be shared in de‑identified form for scholarly purposes. Publications will
            never include information that could reasonably identify you.
          </p>
        </div>

        <div className="consent-section">
          <h2>Will I be paid?</h2>
          <p>
            Yes. Upon completing the study, you will receive $3.00 base payment via
            Prolific. Payment may be prorated if you withdraw early.
          </p>
        </div>

        <div className="consent-section">
          <h2>Voluntary participation</h2>
          <p>
            Taking part is completely voluntary. You may stop at any time by closing the
            browser tab without penalty.
          </p>
        </div>

        <div className="consent-section">
          <h2>Debrief</h2>
          <p>
            A short debriefing page will appear at the end of the session, explaining the
            study in more detail and providing contact information for any follow‑up
            questions.
          </p>
        </div>

        <div className="consent-section">
          <h2>Who can I talk to?</h2>
          <ul>
            <li>
              Study questions? Contact Dr. Gero (katy.gero@sydney.edu.au) OR Dr. Dhillon
              (dhillonp@umich.edu).
            </li>
            <li>
              Rights as a participant or complaints? Contact the U‑M IRB‑HSBS
              (irbhsbs@umich.edu | 734‑936‑0933).
            </li>
          </ul>
        </div>

        <p>
          By clicking the &quot;I consent — continue&quot; button below, you confirm that
          you are at least 18 years old, have read and understood this information, and
          voluntarily agree to participate. If you do not wish to take part, simply close
          this tab.
        </p>
      </div>
      <form action={consentAgree}>
        <input type="hidden" name="prolific_pid" value={prolificPid} />
        <input type="hidden" name="prolific_study_id" value={params.STUDY_ID ?? ""} />
        <input type="hidden" name="prolific_session_id" value={params.SESSION_ID ?? ""} />
        <div className="form-actions">
          <button type="submit" className="btn">
            I consent — continue
          </button>
          <Link href="/consent/declined" className="btn btn-secondary">
            I do not consent
          </Link>
        </div>
      </form>
    </StudyShell>
  );
}
