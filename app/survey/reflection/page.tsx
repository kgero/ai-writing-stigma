import StudyShell from "@/components/StudyShell";
import QuestionnaireForm from "@/components/QuestionnaireForm";
import { getSurveyQuestions } from "@/lib/content";
import { enforceStudyPath } from "@/lib/guard";

export default async function ReflectionSurveyPage() {
  await enforceStudyPath("/survey/reflection");
  const questions = getSurveyQuestions("reflection");

  return (
    <StudyShell>
      <h1>Rating explanation</h1>
      <QuestionnaireForm
        action="/api/survey"
        questions={questions}
        hiddenFields={{ type: "reflection" }}
      />
    </StudyShell>
  );
}
