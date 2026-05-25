"use client";
import React, { useState, useRef } from "react";

export default function Tooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: React.ReactNode | string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);
  return (
    <span
      className="relative inline-block"
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
    >
      {children}
      {open && (
        <div
          role="tooltip"
          className="absolute z-40 bg-slate-800 text-white text-sm p-2 rounded shadow mt-2 left-1/2 -translate-x-1/2 w-56"
        >
          {typeof content === "string" ? <div>{content}</div> : content}
        </div>
      )}
    </span>
  );
}
