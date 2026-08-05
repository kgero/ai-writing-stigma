"use server";

import { isAdminAuthenticated } from "@/lib/cookies";
import { ensureSchema } from "@/lib/db";
import { runPangramForFlaggedArticles } from "@/lib/pangram";
import { revalidatePath } from "next/cache";

export async function runFlaggedPangramChecks(): Promise<{
  ok: boolean;
  message: string;
  ran: number;
  errors: string[];
}> {
  if (!(await isAdminAuthenticated())) {
    return { ok: false, message: "Unauthorized", ran: 0, errors: [] };
  }

  if (!process.env.PANGRAM_API_KEY) {
    return {
      ok: false,
      message: "PANGRAM_API_KEY is not set",
      ran: 0,
      errors: [],
    };
  }

  await ensureSchema();
  const summaries = await runPangramForFlaggedArticles();
  const ran = summaries.filter((s) => s.ran).length;
  const errors = summaries
    .filter((s) => s.error)
    .map((s) => `${s.article_id}: ${s.error}`);

  revalidatePath("/admin/articles");

  return {
    ok: errors.length === 0,
    message:
      ran === 0
        ? "No articles flagged for Pangram (pangram_needs_check is false for all)."
        : `Ran Pangram on ${ran} article(s).`,
    ran,
    errors,
  };
}
