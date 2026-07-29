import StudyShell from "@/components/StudyShell";
import QuestionnaireForm from "@/components/QuestionnaireForm";
import { getSurveyQuestions } from "@/lib/content";
import { enforceStudyPath } from "@/lib/guard";

export default async function PreSurveyPage() {
  await enforceStudyPath("/survey/pre");
  const questions = getSurveyQuestions("pre");

  return (
    <StudyShell>
      <h1>Before you begin</h1>
      <QuestionnaireForm
        action="/api/survey"
        questions={questions}
        hiddenFields={{ type: "pre" }}
      />
    </StudyShell>
  );
}
