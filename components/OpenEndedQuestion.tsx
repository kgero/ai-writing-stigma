"use client";

export default function OpenEndedQuestion({
  id,
  text,
  required = true,
}: {
  id: string;
  text: string;
  required?: boolean;
}) {
  return (
    <div className="question-block">
      <label className="question-text" htmlFor={id}>
        {text}
      </label>
      <textarea
        id={id}
        name={id}
        required={required}
        rows={5}
        className="openended-input"
        placeholder="Your response…"
      />
    </div>
  );
}
