import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { findArticleBySlug, listHelpArticles } from "@/lib/help";
import Link from "next/link";

function renderContent(content: string) {
  return content
    .trim()
    .split("\n")
    .map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("### ")) {
        return (
          <h2 key={index} className="mt-8 text-2xl font-bold text-[#1A1A1A]">
            {trimmed.replace("### ", "")}
          </h2>
        );
      }
      if (/^\d+\.\s/.test(trimmed) || trimmed.startsWith("- ")) {
        return (
          <li key={index} className="ml-5 list-disc text-[#5e3f3c]">
            {trimmed.replace(/^\d+\.\s/, "").replace("- ", "")}
          </li>
        );
      }
      return (
        <p key={index} className="mt-4 leading-7 text-[#5e3f3c]">
          {trimmed}
        </p>
      );
    });
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = findArticleBySlug(params.slug);
  const related = listHelpArticles()
    .filter((item) => item.slug !== params.slug && item.category === article?.category)
    .slice(0, 3);

  if (!article)
    return (
      <div className="min-h-screen bg-[#fcf9f8] pt-20">
        <Header />
        <main className="mx-auto max-w-4xl px-5 py-20 text-center md:px-20">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
            <span className="material-symbols-outlined text-4xl">travel_explore</span>
          </div>
          <h1 className="mt-6 text-3xl font-bold">Article not found</h1>
          <p className="mt-3 text-[#5e3f3c]">
            We could not find that help article.
          </p>
          <Link
            href="/help"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-[#e71520]"
          >
            Back to Help
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </main>
        <Footer />
      </div>
    );

  return (
    <div className="min-h-screen bg-[#fcf9f8] pt-20">
      <Header />
      <main>
        <section className="bg-[#410001]">
          <div className="mx-auto max-w-5xl px-5 py-14 md:px-20">
            <Link href="/help" className="inline-flex items-center gap-2 text-sm font-semibold text-white/75 hover:text-white">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Help Center
            </Link>
            <p className="mt-8 text-sm font-bold uppercase tracking-widest text-[#ffb4aa]">
              {article.category}
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-tight text-white md:text-5xl">
              {article.title}
            </h1>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl gap-8 px-5 py-12 md:grid-cols-[1fr_280px] md:px-20">
          <article className="rounded-xl border border-[#e5e2e1] bg-white p-6 shadow-sm md:p-8">
            <div>{renderContent(article.content)}</div>
            {article.videoUrl && (
              <div className="mt-8 overflow-hidden rounded-xl border border-[#e5e2e1]">
                <iframe
                  title={article.title}
                  src={article.videoUrl}
                  className="h-64 w-full"
                />
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-2">
              {(article.tags || []).map((tag) => (
                <span key={tag} className="rounded-full bg-[#fcf9f8] px-3 py-1 text-xs font-semibold text-[#5e3f3c]">
                  {tag}
                </span>
              ))}
            </div>
          </article>

          <aside className="space-y-4">
            <Link href="/help/tutorials/booking" className="block rounded-xl border border-[#e5e2e1] bg-white p-5 shadow-sm">
              <span className="material-symbols-outlined text-primary">play_circle</span>
              <h2 className="mt-3 font-bold">Interactive tutorial</h2>
              <p className="mt-2 text-sm leading-6 text-[#5e3f3c]">
                Walk through search, flight selection, passenger details, and payment.
              </p>
            </Link>
            {related.map((item) => (
              <Link key={item.slug} href={`/help/${item.slug}`} className="block rounded-xl border border-[#e5e2e1] bg-white p-5 text-sm font-semibold text-[#1A1A1A] shadow-sm hover:text-primary">
                {item.title}
              </Link>
            ))}
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}
