import Link from "next/link";
import { getConfig } from "@/lib/content";
import StudyShell from "@/components/StudyShell";

export default function BlockedIncompletePage() {
  const { study_contact_email } = getConfig();

  return (
    <StudyShell>
      <h1>Session already started</h1>
      <p>
        You have already started this study but didn&apos;t finish. We can&apos;t restart or
        resume your session from here. If you think this is an error, please contact{" "}
        <a href={`mailto:${study_contact_email}`}>{study_contact_email}</a>.
      </p>
      <p className="muted">
        <Link href="/">Return to start</Link>
      </p>
    </StudyShell>
  );
}
