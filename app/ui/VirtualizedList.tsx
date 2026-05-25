"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

type Props<T> = {
  items: T[];
  rowHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  onEndReached?: () => void;
  endThresholdRows?: number;
};

export default function VirtualizedList<T>({
  items,
  rowHeight,
  height,
  renderItem,
  overscan = 3,
  onEndReached,
  endThresholdRows = 3,
}: Props<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const endCalledRef = useRef(false);

  const onScroll = useCallback(() => {
    if (!containerRef.current) return;
    setScrollTop(containerRef.current.scrollTop);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const totalHeight = items.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + height) / rowHeight) + overscan,
  );

  const offsetY = startIndex * rowHeight;

  // detect end reached and call callback
  useEffect(() => {
    if (!onEndReached) return;
    const totalHeight = items.length * rowHeight;
    const currentBottom = scrollTop + height;
    const thresholdPx = (endThresholdRows || 3) * rowHeight;
    if (currentBottom >= totalHeight - thresholdPx) {
      if (!endCalledRef.current) {
        endCalledRef.current = true;
        try {
          onEndReached();
        } finally {
          // allow subsequent calls after a short delay
          setTimeout(() => (endCalledRef.current = false), 500);
        }
      }
    }
  }, [
    scrollTop,
    items.length,
    height,
    rowHeight,
    onEndReached,
    endThresholdRows,
  ]);

  return (
    <div ref={containerRef} style={{ height, overflowY: "auto" }}>
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {items.slice(startIndex, endIndex + 1).map((item, idx) => (
            <div
              key={startIndex + idx}
              style={{ height: rowHeight, boxSizing: "border-box" }}
            >
              {renderItem(item, startIndex + idx)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
