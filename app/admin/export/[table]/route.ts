import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/cookies";
import { ensureSchema } from "@/lib/db";
import {
  exportRatingsCsv,
  exportSessionsCsv,
  exportSurveysCsv,
} from "@/lib/admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ table: string }> },
) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureSchema();
  const { table } = await context.params;

  let csv: string;
  let filename: string;

  switch (table) {
    case "sessions":
      csv = await exportSessionsCsv();
      filename = "sessions.csv";
      break;
    case "ratings":
      csv = await exportRatingsCsv();
      filename = "ratings.csv";
      break;
    case "surveys":
      csv = await exportSurveysCsv();
      filename = "surveys.csv";
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
