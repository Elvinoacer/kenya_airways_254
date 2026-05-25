"use client";
import { useEffect } from "react";

export default function RumMetrics() {
  useEffect(() => {
    if (typeof window === "undefined" || !("PerformanceObserver" in window))
      return;

    const entries: any[] = [];

    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) entries.push(entry.toJSON());
    });
    try {
      po.observe({ type: "largest-contentful-paint", buffered: true });
      po.observe({ type: "first-contentful-paint", buffered: true });
      po.observe({ type: "layout-shift", buffered: true });
    } catch (e) {
      // some browsers restrict types — ignore
    }

    const send = () => {
      if (entries.length === 0) return;
      navigator.sendBeacon
        ? navigator.sendBeacon(
            "/api/metrics",
            JSON.stringify({ entries, url: location.href }),
          )
        : fetch("/api/metrics", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ entries, url: location.href }),
          }).catch(() => {});
    };

    window.addEventListener("pagehide", send);
    window.addEventListener("beforeunload", send);

    // also send after 10s as fallback
    const t = setTimeout(send, 10000);

    return () => {
      clearTimeout(t);
      window.removeEventListener("pagehide", send);
      window.removeEventListener("beforeunload", send);
      try {
        po.disconnect();
      } catch (e) {}
    };
  }, []);

  return null;
}
