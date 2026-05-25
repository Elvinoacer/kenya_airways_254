"use client";
import React from "react";
import Tooltip from "./Tooltip";
import Link from "next/link";
import { findArticleBySlug } from "@/lib/help";

export default function HelpMarker({
  slug,
  label = "Help",
}: {
  slug: string;
  label?: string;
}) {
  const article = findArticleBySlug(slug);
  const content = article ? (
    <div>
      <div className="font-semibold">{article.title}</div>
      <div className="text-sm mt-1 text-slate-200">
        {article.content.substring(0, 120)}...
      </div>
      <div className="mt-2">
        <Link href={`/help/${article.slug}`} className="underline">
          Read more
        </Link>
      </div>
    </div>
  ) : (
    <div>No help available</div>
  );

  return (
    <Tooltip content={content}>
      <button
        aria-label={`Help for ${slug}`}
        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:underline"
      >
        {label}?
      </button>
    </Tooltip>
  );
}
