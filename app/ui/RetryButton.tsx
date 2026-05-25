"use client";
import React, { useState } from "react";

export default function RetryButton({
  onRetry,
  children = "Retry",
}: {
  onRetry: (attempt: number) => Promise<any> | void;
  children?: React.ReactNode;
}) {
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    const next = attempt + 1;
    try {
      await onRetry(next);
      setAttempt(next);
    } catch (e: any) {
      setError(String(e?.message || e || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={run}
        disabled={loading}
        className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-60"
        aria-live="polite"
      >
        {loading ? "Retrying..." : children}
      </button>
      {error && <div className="text-sm text-rose-600 mt-2">{error}</div>}
    </div>
  );
}
