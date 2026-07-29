import Link from "next/link";
import StudyShell from "@/components/StudyShell";
import AdminLogin from "@/components/AdminLogin";
import { isAdminAuthenticated } from "@/lib/cookies";
import { ensureSchema } from "@/lib/db";
import { getAdminStats } from "@/lib/admin";

export default async function AdminPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <StudyShell>
        <h1>Admin</h1>
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

  const stats = await getAdminStats();
  const completionRate =
    stats.consented > 0 ? Math.round((stats.completed / stats.consented) * 100) : 0;
  const attentionRate =
    stats.attentionTotal > 0
      ? Math.round((stats.attentionPass / stats.attentionTotal) * 100)
      : null;

  const cellEntries = Object.entries(stats.cellCounts).sort(([a], [b]) => a.localeCompare(b));

  return (
    <StudyShell>
      <h1>Admin dashboard</h1>
      <p className="muted">Read-only. Refresh to update.</p>

      <div className="stat-grid">
        <div className="stat-box">
          <strong>{stats.consented}</strong>
          <span className="muted">Consented</span>
        </div>
        <div className="stat-box">
          <strong>{stats.completed}</strong>
          <span className="muted">Completed</span>
        </div>
        <div className="stat-box">
          <strong>{completionRate}%</strong>
          <span className="muted">Completion rate</span>
        </div>
        <div className="stat-box">
          <strong>{stats.attentionTotal}</strong>
          <span className="muted">Attention checks</span>
        </div>
        {attentionRate !== null && (
          <div className="stat-box">
            <strong>{attentionRate}%</strong>
            <span className="muted">Attention pass rate</span>
          </div>
        )}
      </div>

      <h2>Cell counts</h2>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Article</th>
            <th>Condition</th>
            <th>N</th>
          </tr>
        </thead>
        <tbody>
          {cellEntries.map(([key, n]) => {
            const [article_id, condition] = key.split("|");
            return (
              <tr key={key}>
                <td>{article_id}</td>
                <td>{condition}</td>
                <td>{n}</td>
              </tr>
            );
          })}
          {cellEntries.length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                No sessions yet
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ marginTop: "2rem" }}>Export data</h2>
      <ul>
        <li>
          <Link href="/admin/export/sessions">Download sessions.csv</Link>
        </li>
        <li>
          <Link href="/admin/export/ratings">Download ratings.csv</Link>
        </li>
        <li>
          <Link href="/admin/export/surveys">Download surveys.csv</Link>
        </li>
      </ul>
    </StudyShell>
  );
}
