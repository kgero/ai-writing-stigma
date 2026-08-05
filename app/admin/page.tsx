import Link from "next/link";
import StudyShell from "@/components/StudyShell";
import AdminLogin from "@/components/AdminLogin";
import AdminFilterForm from "@/components/AdminFilterForm";
import { isAdminAuthenticated } from "@/lib/cookies";
import { ensureSchema } from "@/lib/db";
import {
  adminFiltersToQuery,
  getAdminStats,
  parseAdminFilters,
} from "@/lib/admin";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ id_contains?: string; consented_after?: string }>;
}) {
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

  const params = await searchParams;
  const filters = parseAdminFilters(params);
  const stats = await getAdminStats(filters);
  const q = adminFiltersToQuery(filters);

  const completionRate =
    stats.consented > 0 ? Math.round((stats.completed / stats.consented) * 100) : 0;
  const attentionRate =
    stats.attentionTotal > 0
      ? Math.round((stats.attentionPass / stats.attentionTotal) * 100)
      : null;

  const cellEntries = Object.entries(stats.cellCounts).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  return (
    <StudyShell>
      <h1>Admin dashboard</h1>
      <p className="muted">
        Stats and downloads respect the filters below.{" "}
        {stats.filtersActive ? (
          <strong>Filters active ({stats.consented} sessions).</strong>
        ) : (
          "No filters — showing all sessions."
        )}
      </p>

      <AdminFilterForm filters={filters} />

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
                No sessions in this filter
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <h2 style={{ marginTop: "2rem" }}>Articles</h2>
      <p>
        <Link href="/admin/articles">View articles &amp; Pangram results →</Link>
      </p>

      <h2 style={{ marginTop: "2rem" }}>Export data</h2>
      <p className="muted">
        Raw files keep JSON blobs as-is. <code>wide_participants.csv</code> flattens one row
        per participant for analysis.
      </p>
      <ul>
        <li>
          <Link href={`/admin/export/sessions${q}`}>Download sessions.csv (raw)</Link>
        </li>
        <li>
          <Link href={`/admin/export/ratings${q}`}>Download ratings.csv (raw)</Link>
        </li>
        <li>
          <Link href={`/admin/export/surveys${q}`}>Download surveys.csv (raw)</Link>
        </li>
        <li>
          <Link href={`/admin/export/wide_participants${q}`}>
            Download wide_participants.csv (flattened)
          </Link>
        </li>
      </ul>
    </StudyShell>
  );
}
