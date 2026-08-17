"use client";

import { useEffect, useState } from "react";
import StudyShell from "@/components/StudyShell";

export default function CompleteClient({
  completionCode,
}: {
  completionCode: string;
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
    </StudyShell>
  );
}
