import StudyShell from "@/components/StudyShell";
import ArticleReader from "@/components/ArticleReader";
import { getConfig, getPublicArticle } from "@/lib/content";
import { enforceStudyPath } from "@/lib/guard";
import { continueReading } from "./actions";

export default async function ReadPage() {
  const { session } = await enforceStudyPath("/read");
  const article = getPublicArticle(session.assignment.article_id);
  const { min_reading_time_sec } = getConfig();

  if (!article) {
    return (
      <StudyShell>
        <p className="error">Article not found.</p>
      </StudyShell>
    );
  }

  return (
    <StudyShell>
      <ArticleReader
        article={article}
        minReadingTimeSec={min_reading_time_sec}
        onContinue={continueReading}
      />
    </StudyShell>
  );
}
