import StudyShell from "@/components/StudyShell";
import QuestionnaireForm from "@/components/QuestionnaireForm";
import { getSurveyQuestions } from "@/lib/content";
import { enforceStudyPath } from "@/lib/guard";

export default async function PostSurveyPage() {
  await enforceStudyPath("/survey/post");
  const questions = getSurveyQuestions("post");

  return (
    <StudyShell>
      <h1>Almost done</h1>
      <QuestionnaireForm
        action="/api/survey"
        questions={questions}
        hiddenFields={{ type: "post" }}
        submitLabel="Continue to completion"
      />
    </StudyShell>
  );
}
