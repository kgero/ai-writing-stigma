"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicArticle } from "@/lib/types";

export default function ArticleReader({
  article,
  minReadingTimeSec,
  onContinue,
}: {
  article: PublicArticle;
  minReadingTimeSec: number;
  onContinue: (readingTimeSec: number) => Promise<void>;
}) {
  const startTime = useRef(Date.now());
  const [minTimeMet, setMinTimeMet] = useState(minReadingTimeSec <= 0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (minTimeMet) return;
    const remaining = minReadingTimeSec * 1000 - (Date.now() - startTime.current);
    if (remaining <= 0) {
      setMinTimeMet(true);
      return;
    }
    const timer = setTimeout(() => setMinTimeMet(true), remaining);
    return () => clearTimeout(timer);
  }, [minReadingTimeSec, minTimeMet]);

  const canContinue = minTimeMet && !submitting;

  async function handleContinue() {
    if (!canContinue) return;
    setSubmitting(true);
    setError(null);
    const readingTimeSec = Math.round((Date.now() - startTime.current) / 1000);
    try {
      await onContinue(readingTimeSec);
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const paragraphs = article.body.split("\n\n");

  return (
    <div>
      <p className="read-instruction">Please read the article below.</p>
      <h1 className="article-headline">{article.headline}</h1>
      <div className="article-body">
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <p className="muted" style={{ marginTop: "1.5rem" }}>
        {!minTimeMet
          ? `Please read for at least ${minReadingTimeSec} seconds before continuing.`
          : "You may continue when ready."}
      </p>
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button
          type="button"
          className="btn"
          disabled={!canContinue}
          onClick={handleContinue}
        >
          {submitting ? "Continuing…" : "Next"}
        </button>
      </div>
    </div>
  );
}
