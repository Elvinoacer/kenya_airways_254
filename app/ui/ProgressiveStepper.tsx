"use client";
import React, { useState } from "react";

export default function ProgressiveStepper({
  steps,
  onFinish,
}: {
  steps: { id: string; title: string; content: React.ReactNode }[];
  onFinish?: () => void;
}) {
  const [index, setIndex] = useState(0);

  function next() {
    if (index < steps.length - 1) setIndex(index + 1);
    else onFinish?.();
  }
  function prev() {
    if (index > 0) setIndex(index - 1);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {steps.map((s, i) => (
          <div
            key={s.id}
            className={`px-3 py-1 rounded ${i === index ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-700"}`}
          >
            {s.title}
          </div>
        ))}
      </div>
      <div className="mb-4">{steps[index].content}</div>
      <div className="flex justify-end gap-2">
        <button onClick={prev} disabled={index === 0} className="px-3 py-1">
          Back
        </button>
        <button
          onClick={next}
          className="px-3 py-1 bg-blue-600 text-white rounded"
        >
          {index < steps.length - 1 ? "Next" : "Finish"}
        </button>
      </div>
    </div>
  );
}
