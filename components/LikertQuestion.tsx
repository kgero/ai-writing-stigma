"use client";

import { type CSSProperties } from "react";
import type { LikertQuestion as LikertQuestionType } from "@/lib/types";

export default function LikertQuestion({
  question,
  name,
  required = true,
}: {
  question: LikertQuestionType;
  name: string;
  required?: boolean;
}) {
  const scale = question.scale;

  return (
    <div className="question-block">
      <p className="question-text">{question.text}</p>
      <div
        className="likert-grid"
        style={{ "--likert-cols": scale } as CSSProperties}
        role="radiogroup"
        aria-label={question.text}
      >
        {Array.from({ length: scale }, (_, i) => i + 1).map((n) => (
          <label
            key={n}
            className="likert-option"
            style={{ gridColumn: n, gridRow: 1 }}
          >
            <input type="radio" name={name} value={n} required={required} />
            <span>{n}</span>
          </label>
        ))}
        <span className="likert-anchor likert-anchor-low" style={{ gridColumn: 1, gridRow: 2 }}>
          {question.anchors.low}
        </span>
        <span
          className="likert-anchor likert-anchor-high"
          style={{ gridColumn: scale, gridRow: 2 }}
        >
          {question.anchors.high}
        </span>
      </div>
    </div>
  );
}
