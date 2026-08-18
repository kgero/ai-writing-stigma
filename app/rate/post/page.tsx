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
      <p>The publication included the following note about how this piece was written:</p>
      <div className="editors-note">
        <div className="editors-note-label">Publication note</div>
        <p>{note}</p>
      </div>
      
      <p>Please rate the article again using the same questions, given the publication note above.</p>
      <QuestionnaireForm
        action="/api/ratings"
        questions={questions}
        hiddenFields={{ phase: "post" }}
      />
    </StudyShell>
  );
}
