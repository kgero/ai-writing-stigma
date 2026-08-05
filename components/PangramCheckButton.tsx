"use client";

import { useState, useTransition } from "react";
import { runFlaggedPangramChecks } from "@/app/admin/articles/actions";

export default function PangramCheckButton({ flaggedCount }: { flaggedCount: number }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  function handleClick() {
    setMessage(null);
    setErrors([]);
    startTransition(async () => {
      const result = await runFlaggedPangramChecks();
      setMessage(result.message);
      setErrors(result.errors);
      if (result.ran > 0 || result.errors.length > 0) {
        window.location.reload();
      }
    });
  }

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <button
        type="button"
        className="btn"
        disabled={pending || flaggedCount === 0}
        onClick={handleClick}
      >
        {pending
          ? "Running Pangram…"
          : flaggedCount === 0
            ? "No articles flagged for Pangram"
            : `Run Pangram on ${flaggedCount} flagged article${flaggedCount === 1 ? "" : "s"}`}
      </button>
      <p className="muted" style={{ marginTop: "0.5rem" }}>
        Runs only for articles with <code>pangram_needs_check: true</code> in{" "}
        <code>content/articles.json</code>, or with no / outdated cached result. After a
        successful check, the flag is set to <code>false</code> and results are saved to the
        JSON file and the database. Set the flag back to <code>true</code> after editing an
        article to force a re-check. On Railway, commit the updated{" "}
        <code>articles.json</code> after running so flags stay cleared across deploys.
      </p>
      {message && <p style={{ marginTop: "0.75rem" }}>{message}</p>}
      {errors.length > 0 && (
        <ul className="error">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
