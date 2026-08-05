import type { AdminFilters } from "@/lib/admin";

export default function AdminFilterForm({ filters }: { filters: AdminFilters }) {
  return (
    <form method="get" action="/admin" style={{ marginBottom: "1.75rem" }}>
      <h2 style={{ fontSize: "1.1rem", marginTop: 0 }}>Filters</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Applied to stats, cell counts, and all downloads below.
      </p>
      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          alignItems: "end",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span>Prolific ID contains</span>
          <input
            type="text"
            name="id_contains"
            defaultValue={filters?.idContains ?? ""}
            placeholder="e.g. test"
            style={{ padding: "0.5rem", font: "inherit" }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <span>Consented after</span>
          <input
            type="datetime-local"
            name="consented_after"
            defaultValue={toDatetimeLocalValue(filters?.consentedAfter ?? "")}
            style={{ padding: "0.5rem", font: "inherit" }}
          />
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit" className="btn">
            Apply
          </button>
          <a href="/admin" className="btn btn-secondary">
            Clear
          </a>
        </div>
      </div>
    </form>
  );
}

/** Convert stored filter (ISO / YYYY-MM-DD) to value for datetime-local. */
function toDatetimeLocalValue(value: string): string {
  if (!value) return "";
  // datetime-local wants YYYY-MM-DDTHH:mm
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
