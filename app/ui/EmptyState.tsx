"use client";
import React from "react";

export default function EmptyState({
  title = "No items",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="py-12 text-center" aria-labelledby="empty-title">
      <div className="mx-auto max-w-lg">
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="mx-auto mb-4"
        >
          <rect
            x="3"
            y="7"
            width="18"
            height="13"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
          />
          <path
            d="M16 3h-8v4"
            stroke="currentColor"
            strokeWidth="1.2"
            fill="none"
          />
        </svg>
        <h2 id="empty-title" className="text-xl font-semibold">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>
        )}
        {action && <div className="mt-4">{action}</div>}
      </div>
    </section>
  );
}
