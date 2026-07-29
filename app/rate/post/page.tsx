import StudyShell from "@/components/StudyShell";
import QuestionnaireForm from "@/components/QuestionnaireForm";
import { getEditorsNote, getRatingsQuestions } from "@/lib/content";
import { enforceStudyPath } from "@/lib/guard";

export default async function PostRatingsPage() {
  const { session } = await enforceStudyPath("/rate/post");
  const note = getEditorsNote(session.assignment.condition);
  const questions = getRatingsQuestions();

  return (
    <StudyShell>
    <h1>Rate the article again</h1>
      <div className="editors-note">
        <div className="editors-note-label">Editor&apos;s note</div>
        <p>{note}</p>
      </div>
      
      <p className="muted">Please rate the article again using the same questions, given the editor's note above.</p>
      <QuestionnaireForm
        action="/api/ratings"
        questions={questions}
        hiddenFields={{ phase: "post" }}
      />
    </StudyShell>
  );
}
