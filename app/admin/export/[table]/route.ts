import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/cookies";
import { ensureSchema } from "@/lib/db";
import {
  exportRatingsCsv,
  exportSessionsCsv,
  exportSurveysCsv,
  exportWideParticipantsCsv,
  parseAdminFilters,
} from "@/lib/admin";

export async function GET(
  request: Request,
  context: { params: Promise<{ table: string }> },
) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();
  const { table } = await context.params;
  const url = new URL(request.url);
  const filters = parseAdminFilters({
    id_contains: url.searchParams.get("id_contains") ?? undefined,
    consented_after: url.searchParams.get("consented_after") ?? undefined,
  });

  let csv: string;
  let filename: string;

  switch (table) {
    case "sessions":
      csv = await exportSessionsCsv(filters);
      filename = "sessions.csv";
      break;
    case "ratings":
      csv = await exportRatingsCsv(filters);
      filename = "ratings.csv";
      break;
    case "surveys":
      csv = await exportSurveysCsv(filters);
      filename = "surveys.csv";
      break;
    case "wide_participants":
      csv = await exportWideParticipantsCsv(filters);
      filename = "wide_participants.csv";
      break;
    default:
      return NextResponse.json({ error: "Unknown table" }, { status: 404 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
