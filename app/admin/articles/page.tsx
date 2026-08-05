import Link from "next/link";
import StudyShell from "@/components/StudyShell";
import AdminLogin from "@/components/AdminLogin";
import PangramCheckButton from "@/components/PangramCheckButton";
import { isAdminAuthenticated } from "@/lib/cookies";
import { ensureSchema } from "@/lib/db";
import { getArticlesWithPangram } from "@/lib/pangram";

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** First ~2 sentences, capped for the admin preview. */
function articlePreview(body: string, maxChars = 320): string {
  const cleaned = body.replace(/\s+/g, " ").trim();
  const sentenceMatch = cleaned.match(/^(.+?[.!?])(?:\s+.+?[.!?])?/);
  const preview = sentenceMatch ? sentenceMatch[0] : cleaned.slice(0, maxChars);
  if (preview.length < cleaned.length) {
    return `${preview.trim()}…`;
  }
  return preview;
}

export default async function AdminArticlesPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <StudyShell>
        <h1>Articles</h1>
        <p className="error">DATABASE_URL is not configured.</p>
      </StudyShell>
    );
  }

  await ensureSchema();
  const authed = await isAdminAuthenticated();

  if (!authed) {
    return (
      <StudyShell>
        <h1>Admin</h1>
        <AdminLogin />
      </StudyShell>
    );
  }

  const articles = await getArticlesWithPangram();
  const flaggedCount = articles.filter(
    (a) => a.pangram_needs_check || !a.pangram_display,
  ).length;
  const hasPangramKey = Boolean(process.env.PANGRAM_API_KEY);

  return (
    <StudyShell>
      <p className="muted">
        <Link href="/admin">← Dashboard</Link>
      </p>
      <h1>Articles</h1>
      <p className="muted">
        Metadata from <code>content/articles.json</code>. Pangram results are cached; they
        are not re-fetched on every page load.
      </p>

      {!hasPangramKey && (
        <p className="error">
          PANGRAM_API_KEY is not set. Add it to your environment (local .env.local or Railway
          variables) before running checks.
        </p>
      )}

      <PangramCheckButton flaggedCount={flaggedCount} />

      {articles.map((article) => {
        const pangram = article.pangram_display;
        return (
          <section
            key={article.id}
            className="card"
            style={{ marginBottom: "1.25rem", padding: "1.25rem" }}
          >
            <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>
              {article.headline}
              {!article.active && (
                <span className="muted" style={{ marginLeft: "0.5rem", fontSize: "0.9rem" }}>
                  (inactive)
                </span>
              )}
            </h2>
            <p className="muted" style={{ marginTop: 0 }}>
              <code>{article.id}</code>
              {" · "}
              <Link href={`/admin/articles/${article.id}`}>View full text →</Link>
            </p>

            <p
              className="muted"
              style={{
                marginTop: 0,
                marginBottom: "1rem",
                fontStyle: "italic",
                lineHeight: 1.45,
              }}
            >
              {articlePreview(article.body)}
            </p>

            <table className="admin-table" style={{ marginBottom: "1rem" }}>
              <tbody>
                <tr>
                  <th style={{ width: "10rem" }}>Author</th>
                  <td>{article.author}</td>
                </tr>
                <tr>
                  <th>Authorship type</th>
                  <td>
                    <code>{article.authorship_type}</code>
                  </td>
                </tr>
                <tr>
                  <th>Attention check</th>
                  <td>
                    <div>{article.attention_check.text}</div>
                    <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.25rem" }}>
                      {article.attention_check.options.map((opt) => (
                        <li key={opt.value}>
                          {opt.label}
                          {opt.value === article.attention_check.correct_value && (
                            <strong> ← correct</strong>
                          )}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
                <tr>
                  <th>Pangram flag</th>
                  <td>
                    {article.pangram_needs_check ? (
                      <strong>needs check</strong>
                    ) : (
                      <span className="muted">up to date</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ fontSize: "1rem" }}>Pangram</h3>
            {!pangram ? (
              <p className="muted">Not checked yet.</p>
            ) : pangram.error ? (
              <p className="error">Error: {pangram.error}</p>
            ) : (
              <table className="admin-table">
                <tbody>
                  <tr>
                    <th style={{ width: "10rem" }}>Headline</th>
                    <td>{pangram.headline}</td>
                  </tr>
                  <tr>
                    <th>Short</th>
                    <td>
                      <strong>{pangram.prediction_short}</strong>
                    </td>
                  </tr>
                  <tr>
                    <th>Prediction</th>
                    <td>{pangram.prediction}</td>
                  </tr>
                  <tr>
                    <th>AI / assisted / human</th>
                    <td>
                      {pct(pangram.fraction_ai)} / {pct(pangram.fraction_ai_assisted)} /{" "}
                      {pct(pangram.fraction_human)}
                    </td>
                  </tr>
                  <tr>
                    <th>Checked at</th>
                    <td>{new Date(pangram.checked_at).toLocaleString()}</td>
                  </tr>
                  {pangram.version && (
                    <tr>
                      <th>Version</th>
                      <td>{pangram.version}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </StudyShell>
  );
}
