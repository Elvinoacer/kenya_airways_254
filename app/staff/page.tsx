import Link from "next/link";
import WorkflowShell from "../components/WorkflowShell";

const staffActions = [
  {
    title: "Passenger Records",
    description: "Create, update, and review passenger travel profiles.",
    href: "/passengers",
    icon: "groups",
  },
  {
    title: "Booking Desk",
    description: "Create booking holds, confirm tickets, and manage inquiries.",
    href: "/bookings",
    icon: "airplane_ticket",
  },
  {
    title: "Passport Details",
    description: "Generate Kenyan-format mock document details for passenger flows.",
    href: "/passport",
    icon: "badge",
  },
  {
    title: "Help Center",
    description: "Open booking and support guidance for passenger-facing work.",
    href: "/help",
    icon: "help",
  },
];

export default function StaffPage() {
  return (
    <WorkflowShell>
      <main className="min-h-screen bg-[#fcf9f8] text-[#1A1A1A]">
        <header className="bg-[#410001] py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="text-sm font-bold uppercase tracking-wide text-white/70">
              Staff workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white">
              Passenger service tools
            </h1>
            <p className="mt-2 max-w-2xl text-white/80">
              A single place for staff workflows that support booking,
              passenger records, and document readiness.
            </p>
          </div>
        </header>

        <section className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:px-6 md:grid-cols-2 lg:px-8 xl:grid-cols-4">
          {staffActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="rounded-xl border border-[#e5e2e1] bg-white p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="material-symbols-outlined text-[22px]">
                  {action.icon}
                </span>
              </span>
              <h2 className="mt-4 text-lg font-black text-[#1A1A1A]">
                {action.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#5e3f3c]">
                {action.description}
              </p>
            </Link>
          ))}
        </section>
      </main>
    </WorkflowShell>
  );
}
