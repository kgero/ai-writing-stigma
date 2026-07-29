import { enforceStudyPath } from "@/lib/guard";
import CompleteClient from "@/components/CompleteClient";

export default async function CompletePage() {
  await enforceStudyPath("/complete");

  const completionCode = process.env.COMPLETION_CODE ?? "COMPLETE";
  const prolificUrl = process.env.PROLIFIC_COMPLETION_URL || null;

  return (
    <CompleteClient completionCode={completionCode} prolificUrl={prolificUrl} />
  );
}
