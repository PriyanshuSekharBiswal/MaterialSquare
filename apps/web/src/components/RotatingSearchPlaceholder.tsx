import { useEffect, useState } from "react";

export default function RotatingSearchPlaceholder({
  examples,
  visible,
}: {
  examples: string[];
  visible: boolean;
}) {
  const normalizedExamples = [...new Set(examples.map((example) => example.trim()).filter(Boolean))];
  const examplesKey = normalizedExamples.join("\u0000");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!visible || normalizedExamples.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % normalizedExamples.length);
    }, 1700);

    return () => window.clearInterval(timer);
  }, [visible, examplesKey]);

  if (!normalizedExamples.length) return null;
  const activeIndex = index % normalizedExamples.length;

  return (
    <span className={`search-animated-hint${visible ? "" : " is-hidden"}`} aria-hidden="true">
      <span>Search &quot;</span>
      <span className="search-animated-hint-window">
        <span className="search-animated-hint-word" key={`${examplesKey}-${activeIndex}`}>
          {normalizedExamples[activeIndex]}
        </span>
      </span>
      <span>&quot;</span>
    </span>
  );
}
