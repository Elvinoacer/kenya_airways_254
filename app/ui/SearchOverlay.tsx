"use client";
import React, { useEffect, useState } from "react";
import { listSearchItems } from "@/lib/searchRegistry";
import { useRouter } from "next/navigation";

export default function SearchOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [items, setItems] = useState(() => listSearchItems());
  const router = useRouter();

  useEffect(() => {
    setItems(listSearchItems());
  }, [open]);
  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  if (!open) return null;
  const filtered = items.filter((it) =>
    (it.title + " " + (it.tags || []).join(" ") + " " + (it.description || ""))
      .toLowerCase()
      .includes(q.toLowerCase()),
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start pt-20 justify-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded shadow p-4 z-10">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          className="w-full p-3 rounded border"
        />
        <div className="mt-2 max-h-64 overflow-auto">
          {filtered.map((it) => (
            <div
              key={it.id}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              onClick={() => {
                if (it.href) router.push(it.href);
                onClose();
              }}
            >
              <div className="font-medium">{it.title}</div>
              {it.description && (
                <div className="text-sm text-slate-500">{it.description}</div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-3 text-sm text-slate-500">No results</div>
          )}
        </div>
      </div>
    </div>
  );
}
