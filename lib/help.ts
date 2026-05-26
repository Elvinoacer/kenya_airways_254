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
2. Choose Class A Executive, Class B Middle class, or Class C Low class
3. Check the available capacity shown for each class
4. Enter passenger details
5. Create the booking hold and complete payment to print the ticket

If you need help, contact support.
    `,
    category: "Booking",
    tags: ["booking", "tickets", "purchase"],
  },
  {
    id: "classes-capacity",
    slug: "classes-capacity",
    title: "Classes and seat capacity",
    content: `
Class A is Executive, Class B is Middle class, and Class C is Low class.

Every booking screen shows capacity for all three classes. If the class is full, the system shows the next available flight date and time for the same route where possible.
    `,
    category: "Booking",
    tags: ["class a", "class b", "class c", "capacity", "full"],
  },
  {
    id: "booking-inquiry",
    slug: "booking-inquiry",
    title: "Booking inquiry: add, change, and delete",
    content: `
Use Booking Inquiry to search by booking reference or booking ID.

After loading a booking, you can add the inquiry record by viewing it, change the booking class, or delete the booking by cancelling it.
    `,
    category: "Booking inquiry",
    tags: ["change booking", "delete booking", "booking inquiry"],
  },
  {
    id: "usability-evaluation",
    slug: "usability-evaluation",
    title: "Usability evaluation process",
    content: `
The system is evaluated with five task-based tests: booking a ticket, changing a booking, deleting a booking, finding a full class next-available time, and printing reports.

Reviewers score effectiveness, efficiency, and satisfaction. Issues are recorded with severity and fixed before release. Accessibility checks cover color contrast, keyboard navigation, visible focus, readable text, and touch target size.
    `,
    category: "HCI",
    tags: ["usability", "evaluation", "hci", "accessibility"],
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
    id: "travel-requirements",
    slug: "travel-requirements",
    title: "Travel requirements and booking guidelines",
    content: `
Before you fly, confirm the requirements for your destination and connection points.

1. Check passport validity and visa rules for every country in your journey.
2. Review passenger names before payment; names should match the travel document.
3. Add baggage, accessibility needs, and meal requests before confirming the booking.
4. Keep your booking reference available for check-in, changes, refunds, and support.

For booking help, open the interactive booking tutorial from the Help Center.
    `,
    category: "Travel requirements",
    tags: ["requirements", "guidelines", "visa", "passport", "booking"],
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
