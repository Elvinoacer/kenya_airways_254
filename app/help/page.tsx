"use client";

import Link from "next/link";
import { listHelpArticles } from "@/lib/help";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../ClientProviders";

export default function HelpPage() {
  const articles = listHelpArticles();
  const [q, setQ] = useState("");
  const router = useRouter();
  const toast = useToast();

  async function submitContact(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form) as any);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.ok) {
        toast.push({ message: "Support request submitted", tone: "success" });
        form.reset();
      } else toast.push({ message: "Failed to submit", tone: "error" });
    } catch (e) {
      toast.push({ message: "Network error", tone: "error" });
    }
  }

  const filtered = articles.filter((a) =>
    (a.title + " " + (a.tags || []).join(" ") + " " + a.content)
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Help Center</h1>
      <p className="mt-2 text-sm text-slate-600">
        Search guides, FAQs, and tutorials.
      </p>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-2">
          <div className="mb-4">
            <input
              aria-label="Search help"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search help articles..."
              className="w-full p-3 rounded border"
            />
          </div>
          <div className="space-y-4">
            {filtered.map((a) => (
              <article key={a.id} className="p-4 border rounded">
                <h3 className="font-semibold text-lg">
                  <Link href={`/help/${a.slug}`}>{a.title}</Link>
                </h3>
                <p className="text-sm text-slate-500">{a.category}</p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                  {a.content.substring(0, 200)}...
                </p>
              </article>
            ))}
            {filtered.length === 0 && (
              <div className="p-4 text-sm text-slate-500">
                No articles found.
              </div>
            )}
          </div>
        </section>
        <aside className="p-4 border rounded">
          <h4 className="font-semibold">Contact Support</h4>
          <form onSubmit={submitContact} className="mt-2 space-y-2">
            <input
              name="name"
              placeholder="Your name"
              className="w-full p-2 rounded border"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="Your email"
              className="w-full p-2 rounded border"
            />
            <input
              name="subject"
              placeholder="Subject"
              className="w-full p-2 rounded border"
            />
            <textarea
              name="message"
              required
              placeholder="How can we help?"
              className="w-full p-2 rounded border"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white rounded"
            >
              Send
            </button>
          </form>
          <div className="mt-4">
            <h5 className="font-semibold">Video Tutorials</h5>
            <div className="mt-2">
              <iframe
                title="Tutorial"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                className="w-full h-40"
              />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
