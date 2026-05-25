import { findArticleBySlug } from "@/lib/help";
import Link from "next/link";

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = findArticleBySlug(params.slug);
  if (!article)
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Article not found</h1>
        <p className="mt-2">
          We couldn't find that help article.{" "}
          <Link href="/help">Back to Help</Link>
        </p>
      </main>
    );

  return (
    <main className="p-6">
      <Link href="/help" className="text-sm text-slate-500">
        ← Back to Help
      </Link>
      <h1 className="text-2xl font-semibold mt-2">{article.title}</h1>
      <div
        className="mt-4 prose max-w-none"
        dangerouslySetInnerHTML={{
          __html: article.content.replace(/\n/g, "<br/>"),
        }}
      />
      {article.videoUrl && (
        <div className="mt-4">
          <iframe
            title="video"
            src={article.videoUrl}
            className="w-full h-64"
          />
        </div>
      )}
    </main>
  );
}
