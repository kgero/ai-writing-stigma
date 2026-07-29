import StudyShell from "@/components/StudyShell";
import QuestionnaireForm from "@/components/QuestionnaireForm";
import {
  getPublicAttentionCheck,
  getRatingsQuestions,
} from "@/lib/content";
import { enforceStudyPath } from "@/lib/guard";
import type { Question } from "@/lib/types";

export default async function PreRatingsPage() {
  const { session } = await enforceStudyPath("/rate/pre");
  const attention = getPublicAttentionCheck(session.assignment.article_id);
  const ratings = getRatingsQuestions();

  if (!attention) {
    return (
      <StudyShell>
        <p className="error">Attention check not found.</p>
      </StudyShell>
    );
  }

  const questions: Question[] = [
    {
      id: attention.id,
      type: "multichoice",
      text: attention.text,
      options: attention.options,
    },
    ...ratings,
  ];

  return (
    <StudyShell>
      <h1>Rate the article</h1>
      <p className="muted">Answer the comprehension question, then rate the article.</p>
      <QuestionnaireForm
        action="/api/ratings"
        questions={questions}
        hiddenFields={{ phase: "pre" }}
      />
    </StudyShell>
  );
}
