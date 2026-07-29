"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.reload();
      return;
    }
    setError("Invalid password");
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="question-block">
        <label className="question-text" htmlFor="password">
          Admin password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "0.5rem", font: "inherit" }}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn">
        Log in
      </button>
    </form>
  );
}
