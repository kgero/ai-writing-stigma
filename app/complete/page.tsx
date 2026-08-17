import { enforceStudyPath } from "@/lib/guard";
import CompleteClient from "@/components/CompleteClient";

export default async function CompletePage() {
  await enforceStudyPath("/complete");

  const completionCode = process.env.COMPLETION_CODE ?? "COMPLETE";

  return <CompleteClient completionCode={completionCode} />;
}
