"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type WorkflowShellProps = {
  children: React.ReactNode;
};

const workflowLinks = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Search", href: "/search", icon: "search" },
  { label: "Book", href: "/bookings", icon: "airplane_ticket" },
  { label: "Passengers", href: "/passengers", icon: "groups" },
  { label: "Passport", href: "/passport", icon: "badge" },
  { label: "Help", href: "/help", icon: "help" },
];

export default function WorkflowShell({ children }: WorkflowShellProps) {
  const pathname = usePathname();
  const links = pathname?.startsWith("/staff")
    ? [
        { label: "Staff", href: "/staff", icon: "support_agent" },
        ...workflowLinks,
      ]
    : workflowLinks;

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-[#1A1A1A]">
      <div className="border-b border-[#e5e2e1] bg-white">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
              <span className="material-symbols-outlined text-[22px]">flight</span>
            </span>
            <span>
              <span className="block text-sm font-black uppercase tracking-wide">
                Kenya Airways
              </span>
              <span className="block text-xs font-semibold text-[#5e3f3c]">
                Travel workspace
              </span>
            </span>
          </Link>

          <nav className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {links.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                    active
                      ? "bg-primary text-white"
                      : "border border-[#e5e2e1] bg-white text-[#5e3f3c] hover:bg-[#f6f3f2] hover:text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px]">{children}</div>
    </div>
  );
}
