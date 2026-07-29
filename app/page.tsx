import { redirect } from "next/navigation";
import { ensureSchema } from "@/lib/db";
import { getProlificStatus } from "@/lib/sessions";
import LandingForm from "@/components/LandingForm";

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<{
    PROLIFIC_PID?: string;
    STUDY_ID?: string;
    SESSION_ID?: string;
  }>;
}) {
  if (process.env.DATABASE_URL) {
    await ensureSchema();
  }
  const params = await searchParams;
  const prolificPid = params.PROLIFIC_PID?.trim();

  if (prolificPid) {
    const status = await getProlificStatus(prolificPid);
    if (status === "complete") redirect("/blocked/complete");
    if (status === "incomplete") redirect("/blocked/incomplete");

    const qs = new URLSearchParams({
      PROLIFIC_PID: prolificPid,
      ...(params.STUDY_ID ? { STUDY_ID: params.STUDY_ID } : {}),
      ...(params.SESSION_ID ? { SESSION_ID: params.SESSION_ID } : {}),
    });
    redirect(`/consent?${qs.toString()}`);
  }

  return (
    <main>
      <div className="card">
        <h1>Research Study</h1>
        <p className="muted">Enter your Prolific ID to begin.</p>
        <LandingForm />
      </div>
    </main>
  );
}
