"use client";

import { useState, type CSSProperties } from "react";
import LikertQuestion from "./LikertQuestion";
import MultichoiceQuestion from "./MultichoiceQuestion";
import OpenEndedQuestion from "./OpenEndedQuestion";
import type { Question } from "@/lib/types";

export default function QuestionnaireForm({
  action,
  questions,
  submitLabel = "Continue",
  hiddenFields = {},
}: {
  action: string;
  questions: Question[];
  submitLabel?: string;
  hiddenFields?: Record<string, string>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const responses: Record<string, string> = {};

    for (const q of questions) {
      const val = formData.get(q.id);
      const isEmpty = val === null || String(val).trim() === "";
      if (isEmpty) {
        if (q.type === "openended" && q.optional) continue;
        setError("Please answer all questions.");
        setLoading(false);
        return;
      }
      responses[q.id] = String(val).trim();
    }

    const payload: Record<string, unknown> = { responses, ...hiddenFields };

    try {
      const res = await fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      const data = (await res.json()) as { redirect?: string };
      if (data.redirect) {
        window.location.href = data.redirect;
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {questions.map((q) => {
        if (q.type === "likert") {
          return <LikertQuestion key={q.id} question={q} name={q.id} />;
        }
        if (q.type === "openended") {
          return (
            <OpenEndedQuestion
              key={q.id}
              id={q.id}
              text={q.text}
              required={!q.optional}
            />
          );
        }
        return <MultichoiceQuestion key={q.id} question={q} name={q.id} />;
      })}
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
