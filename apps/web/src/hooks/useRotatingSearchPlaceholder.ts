import { useEffect, useState } from "react";

export function useRotatingSearchPlaceholder(
  examples: string[],
  enabled = true,
) {
  const examplesKey = [...new Set(examples.map((example) => example.trim()).filter(Boolean))].join("\u0000");
  const normalizedExamples = examplesKey ? examplesKey.split("\u0000") : [];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!enabled || normalizedExamples.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % normalizedExamples.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, [enabled, examplesKey]);

  if (!normalizedExamples.length) return "Search materials...";
  return `Search "${normalizedExamples[index % normalizedExamples.length]}"`;
}
