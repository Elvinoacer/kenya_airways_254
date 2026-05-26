"use client";

import Link from "next/link";
import Header from "@/app/components/Header";
import Footer from "@/app/components/Footer";
import { listHelpArticles } from "@/lib/help";
import { useMemo, useState } from "react";
import { useToast } from "../ClientProviders";

const quickLinks = [
  { label: "Book a Flight", href: "/search", icon: "flight_takeoff" },
  { label: "Manage Booking", href: "/bookings", icon: "confirmation_number" },
  { label: "Booking Tutorial", href: "/help/tutorials/booking", icon: "play_circle" },
  { label: "Travel Guidelines", href: "/help/travel-requirements", icon: "verified_user" },
];

function getCsrfToken() {
  if (typeof document === "undefined") return "";
  return (
    document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("csrfToken="))
      ?.split("=")[1] || ""
  );
}

export default function HelpPage() {
  const articles = listHelpArticles();
  const [q, setQ] = useState("");
  const toast = useToast();

  async function submitContact(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form) as any);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": decodeURIComponent(getCsrfToken()),
        },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.ok) {
        toast.push({ message: `Support request ${json.ticketRef} submitted`, tone: "success" });
        form.reset();
      } else toast.push({ message: "Failed to submit support request", tone: "error" });
    } catch (e) {
      toast.push({ message: "Network error", tone: "error" });
    }
  }

  const filtered = useMemo(
    () =>
      articles.filter((article) =>
        (article.title + " " + (article.tags || []).join(" ") + " " + article.content)
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [articles, q],
  );

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-[#1A1A1A] pt-20">
      <Header />
      <main>
        <section className="relative overflow-hidden bg-[#410001]">
          <img
            src="/images/hero_banner.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-screen"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#410001] via-[#410001]/95 to-[#410001]/60" />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-16 md:grid-cols-[1fr_380px] md:px-20 md:py-20">
            <div className="max-w-3xl">
              <span className="text-sm font-semibold uppercase tracking-widest text-[#ffb4aa]">
                Kenya Airways Support
              </span>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-white md:text-6xl">
                Help that keeps your journey moving
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-white/80">
                Search booking guides, travel requirements, check-in help, refunds, and passenger support from one place.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center justify-between rounded-lg border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20"
                  >
                    <span className="inline-flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#ffb4aa]">{link.icon}</span>
                      {link.label}
                    </span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </Link>
                ))}
              </div>
            </div>
            <form onSubmit={submitContact} className="rounded-xl border border-white/15 bg-white p-6 shadow-lift">
              <h2 className="text-xl font-bold">Contact Support</h2>
              <div className="mt-4 space-y-3">
                <input name="name" placeholder="Your name" className="w-full rounded-lg border border-[#e5e2e1] bg-[#fcf9f8] px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                <input name="email" type="email" required placeholder="Your email" className="w-full rounded-lg border border-[#e5e2e1] bg-[#fcf9f8] px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                <input name="subject" placeholder="Subject" className="w-full rounded-lg border border-[#e5e2e1] bg-[#fcf9f8] px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                <textarea name="message" required placeholder="How can we help?" rows={5} className="w-full rounded-lg border border-[#e5e2e1] bg-[#fcf9f8] px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e71520]">
                  Send Request
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 md:px-20">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="text-sm font-semibold uppercase tracking-widest text-primary">
                Help Center
              </span>
              <h2 className="mt-2 text-3xl font-semibold md:text-4xl">Guides and answers</h2>
            </div>
            <div className="relative w-full md:w-[380px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#936e6a]">
                search
              </span>
              <input
                aria-label="Search help"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search help articles"
                className="w-full rounded-lg border border-[#e5e2e1] bg-white py-3 pl-11 pr-4 text-sm shadow-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((article) => (
              <Link
                key={article.id}
                href={`/help/${article.slug}`}
                className="group rounded-xl border border-[#e5e2e1] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">
                      {article.category}
                    </p>
                    <h3 className="mt-2 text-xl font-bold">{article.title}</h3>
                  </div>
                  <span className="material-symbols-outlined text-primary transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </div>
                <p className="mt-4 text-sm leading-6 text-[#5e3f3c]">
                  {article.content.replace(/[#*]/g, "").trim().slice(0, 170)}...
                </p>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="mt-8 rounded-xl border border-[#e5e2e1] bg-white p-8 text-center text-[#5e3f3c]">
              No articles found.
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
