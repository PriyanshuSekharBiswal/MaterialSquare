import { useEffect, useState } from "react";

export function useRotatingSearchPlaceholder(
  examples: string[],
  enabled = true,
) {
  const examplesKey = [...new Set(examples.map((example) => example.trim()).filter(Boolean))].join("\u0000");
  const normalizedExamples = examplesKey ? examplesKey.split("\u0000") : [];
  const [typedExample, setTypedExample] = useState("");

  useEffect(() => {
    if (!normalizedExamples.length) {
      setTypedExample("");
      return;
    }
    if (!enabled || normalizedExamples.length < 2) {
      setTypedExample(normalizedExamples[0]);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTypedExample(normalizedExamples[0]);
      return;
    }

    let exampleIndex = 0;
    let characterIndex = 0;
    let isErasing = false;
    let timer = 0;
    setTypedExample("");

    const animate = () => {
      const currentExample = normalizedExamples[exampleIndex];
      if (isErasing) {
        characterIndex -= 1;
        setTypedExample(currentExample.slice(0, characterIndex));
        if (characterIndex === 0) {
          isErasing = false;
          exampleIndex = (exampleIndex + 1) % normalizedExamples.length;
          timer = window.setTimeout(animate, 320);
        } else {
          timer = window.setTimeout(animate, 42);
        }
        return;
      }

      characterIndex += 1;
      setTypedExample(currentExample.slice(0, characterIndex));
      if (characterIndex === currentExample.length) {
        isErasing = true;
        timer = window.setTimeout(animate, 1050);
      } else {
        timer = window.setTimeout(animate, 78);
      }
    };

    timer = window.setTimeout(animate, 120);

    return () => window.clearTimeout(timer);
  }, [enabled, examplesKey]);

  if (!normalizedExamples.length) return "Search materials...";
  return `Search "${typedExample}"`;
}
