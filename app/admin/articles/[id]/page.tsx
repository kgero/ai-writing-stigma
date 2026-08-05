import Link from "next/link";
import { notFound } from "next/navigation";
import StudyShell from "@/components/StudyShell";
import AdminLogin from "@/components/AdminLogin";
import { getArticleById } from "@/lib/content";
import { isAdminAuthenticated } from "@/lib/cookies";
import { ensureSchema } from "@/lib/db";

export default async function AdminArticleTextPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await ensureSchema();
  const authed = await isAdminAuthenticated();

  if (!authed) {
    return (
      <StudyShell>
        <h1>Admin</h1>
        <AdminLogin />
      </StudyShell>
    );
  }

  const { id } = await params;
  const article = getArticleById(id);
  if (!article) notFound();

  const paragraphs = article.body.split(/\n\n+/).filter(Boolean);

  return (
    <StudyShell>
      <p className="muted">
        <Link href="/admin/articles">← Articles</Link>
      </p>
      <h1 style={{ fontSize: "1.5rem" }}>{article.headline}</h1>
      <p className="muted">
        <code>{article.id}</code> · author {article.author} ·{" "}
        <code>{article.authorship_type}</code>
      </p>
      <div className="article-body" style={{ marginTop: "1.5rem" }}>
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </StudyShell>
  );
}
