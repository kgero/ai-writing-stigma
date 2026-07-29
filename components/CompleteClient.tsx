"use client";

import { useEffect, useState } from "react";
import StudyShell from "@/components/StudyShell";

function CompleteContent({
  completionCode,
  prolificUrl,
}: {
  completionCode: string;
  prolificUrl: string | null;
}) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    fetch("/api/session/complete", { method: "POST" })
      .then(() => setDone(true))
      .catch(() => setDone(true));
  }, [done]);

  return (
    <StudyShell>
      <h1>Thank you</h1>
      <p>Your completion code is:</p>
      <p
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          fontFamily: "monospace",
          letterSpacing: "0.05em",
        }}
      >
        {completionCode}
      </p>
      <p className="muted">Please copy this code and submit it on Prolific to receive payment.</p>
      {prolificUrl && (
        <p>
          <a href={prolificUrl} className="btn">
            Return to Prolific
          </a>
        </p>
      )}
    </StudyShell>
  );
}

export default function CompletePageWrapper({
  completionCode,
  prolificUrl,
}: {
  completionCode: string;
  prolificUrl: string | null;
}) {
  return (
    <CompleteContent completionCode={completionCode} prolificUrl={prolificUrl} />
  );
}
