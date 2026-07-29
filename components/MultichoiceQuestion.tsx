"use client";

import type { MultichoiceQuestion as MultichoiceQuestionType } from "@/lib/types";

export default function MultichoiceQuestion({
  question,
  name,
  required = true,
}: {
  question: MultichoiceQuestionType;
  name: string;
  required?: boolean;
}) {
  return (
    <div className="question-block">
      <p className="question-text">{question.text}</p>
      <div className="multichoice-options" role="radiogroup" aria-label={question.text}>
        {question.options.map((opt) => (
          <label key={opt.value}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              required={required}
            />
            <span>{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
