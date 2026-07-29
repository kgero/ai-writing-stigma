"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LandingForm() {
  const router = useRouter();
  const [pid, setPid] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = pid.trim();
    if (!trimmed) {
      setError("Please enter your Prolific ID.");
      return;
    }
    const qs = new URLSearchParams({ PROLIFIC_PID: trimmed });
    router.push(`/consent?${qs.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="question-block">
        <label className="question-text" htmlFor="prolific_pid">
          Prolific ID
        </label>
        <input
          id="prolific_pid"
          name="prolific_pid"
          type="text"
          value={pid}
          onChange={(e) => setPid(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", font: "inherit" }}
          autoComplete="off"
        />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn">
          Continue
        </button>
      </div>
    </form>
  );
}
