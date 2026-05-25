"use client";
import { useEffect, useRef, useState } from "react";

export default function useInfiniteScroll(
  options: {
    root?: Element | null;
    rootMargin?: string;
    threshold?: number;
    enabled?: boolean;
  } = {},
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const [isIntersecting, setIntersecting] = useState(false);

  useEffect(() => {
    if (!sentinelRef.current || options.enabled === false) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => setIntersecting(e.isIntersecting));
      },
      {
        root: options.root ?? null,
        rootMargin: options.rootMargin ?? "0px",
        threshold: options.threshold ?? 0.1,
      },
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [sentinelRef, options.enabled]);

  return { sentinelRef, isIntersecting };
}
