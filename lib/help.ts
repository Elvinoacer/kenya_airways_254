export type HelpArticle = {
  id: string;
  slug: string;
  title: string;
  content: string; // markdown or HTML
  category?: string;
  videoUrl?: string;
  tags?: string[];
};

const articles: HelpArticle[] = [
  {
    id: "getting-started",
    slug: "getting-started",
    title: "Booking a flight: Getting started",
    content: `
### How to book

1. Search for flights
2. Select seats
3. Enter passenger details
4. Complete payment

If you need help, contact support.
    `,
    category: "Booking",
    tags: ["booking", "tickets", "purchase"],
  },
  {
    id: "booking-tutorial",
    slug: "booking-tutorial",
    title: "Booking tutorial: step-by-step",
    content: `
This tutorial walks you through booking a flight using the site.

Step 1: Search for flights
Step 2: Choose a seat and fare
Step 3: Enter passenger details
Step 4: Make payment

Use the interactive tutorial for screenshots and videos.
    `,
    category: "Tutorial",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    tags: ["booking", "tutorial"],
  },
  {
    id: "faq-cancellations",
    slug: "faq-cancellations",
    title: "Cancellations and refunds (FAQ)",
    content: `
Common questions about cancellations and refunds.
    `,
    category: "FAQ",
    tags: ["refund", "cancel"],
  },
  {
    id: "troubleshooting-checkin",
    slug: "troubleshooting-checkin",
    title: "Troubleshooting check-in issues",
    content: `
If you cannot check-in, try these steps:
- Clear browser cache
- Ensure passport details match
- Contact support if problems persist
    `,
    category: "Troubleshooting",
    tags: ["check-in", "errors"],
  },
];

export function listHelpArticles() {
  return articles.slice();
}

export function findArticleBySlug(slug: string) {
  return articles.find((a) => a.slug === slug) || null;
}

export function searchHelp(query: string) {
  const q = (query || "").toLowerCase().trim();
  if (!q) return articles.slice();
  return articles.filter((a) =>
    (a.title + " " + (a.tags || []).join(" ") + " " + a.content)
      .toLowerCase()
      .includes(q),
  );
}

export default { listHelpArticles, findArticleBySlug, searchHelp };
