"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigationGroups = [
  {
    label: "Command",
    items: [
      { name: "Operations", href: "/admin/operations", icon: "dashboard" },
      { name: "Metrics", href: "/admin/metrics", icon: "monitoring" },
    ],
  },
  {
    label: "Flights",
    items: [
      { name: "Flights", href: "/admin/flights", icon: "flight" },
      { name: "Schedules", href: "/admin/schedules", icon: "calendar_month" },
      { name: "Assignments", href: "/admin/assignments", icon: "assignment_ind" },
    ],
  },
  {
    label: "Commercial",
    items: [
      { name: "Payments", href: "/admin/payments", icon: "payments" },
      { name: "Refunds", href: "/admin/refunds", icon: "currency_exchange" },
      { name: "Support", href: "/admin/support", icon: "support_agent" },
    ],
  },
  {
    label: "People & Insights",
    items: [
      { name: "Employees", href: "/admin/employees", icon: "badge" },
      { name: "Analytics", href: "/admin/analytics", icon: "analytics" },
      { name: "Reports", href: "/admin/reports", icon: "lab_profile" },
    ],
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fcf9f8] flex flex-col md:flex-row">
      {/* Mobile header */}
      <div className="md:hidden bg-[#410001] text-white flex items-center justify-between p-4 sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#e71520]">admin_panel_settings</span>
          <span className="font-bold text-lg">KA Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-white hover:text-gray-300 transition-colors"
        >
          <span className="material-symbols-outlined text-[28px]">
            {sidebarOpen ? "close" : "menu"}
          </span>
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div
        className={`fixed inset-y-0 left-0 z-10 w-64 bg-[#1A1A1A] text-white shadow-xl transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 hidden md:flex items-center gap-3 mb-4">
          <div className="bg-[#410001] p-2 rounded-xl border border-white/10 shadow-inner">
            <span className="material-symbols-outlined text-[#e71520] text-2xl block">
              admin_panel_settings
            </span>
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight">Admin Portal</div>
            <div className="text-xs text-white/50 tracking-wider uppercase font-semibold">Kenya Airways</div>
          </div>
        </div>

        <nav className="flex-1 px-4 pb-28 space-y-5 overflow-y-auto max-h-[calc(100vh-100px)] custom-scrollbar">
          {navigationGroups.map((group) => (
            <section key={group.label} className="space-y-1">
              <p className="px-3 text-[11px] font-black uppercase tracking-wide text-white/35">
                {group.label}
              </p>
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? "bg-[#e71520] text-white shadow-[0_4px_12px_rgba(231,21,32,0.3)]"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined transition-colors ${
                        isActive ? "text-white" : "text-white/50 group-hover:text-white"
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="font-semibold text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </section>
          ))}
        </nav>
        
        <div className="absolute bottom-0 w-full space-y-2 p-4 border-t border-white/10 bg-[#1A1A1A]">
          <Link
            href="/staff"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-outlined text-white/50 group-hover:text-white">support_agent</span>
            <span className="font-semibold text-sm">Staff Workspace</span>
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-outlined text-white/50 group-hover:text-white">account_circle</span>
            <span className="font-semibold text-sm">Exit Admin</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative min-h-screen">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-0 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
