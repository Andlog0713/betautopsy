"use client";
import { useEffect, useState } from "react";
import { motion, stagger, useAnimate } from "framer-motion";
import { cn } from "@/lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.5,
  startDelay = 0,
  highlight,
  highlightClassName = "text-scalpel",
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
  startDelay?: number;
  highlight?: string;
  highlightClassName?: string;
}) => {
  const [scope, animate] = useAnimate();
  const wordsArray = words.split(" ");
  const [isMobile, setIsMobile] = useState(false);

  // Find the start index of the highlight phrase in wordsArray
  const highlightWordsArr = highlight ? highlight.split(" ") : [];
  let highlightStart = -1;
  if (highlightWordsArr.length > 0) {
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/gi, '');
    for (let i = 0; i <= wordsArray.length - highlightWordsArr.length; i++) {
      if (highlightWordsArr.every((w, j) => norm(wordsArray[i + j]) === norm(w))) {
        highlightStart = i;
        break;
      }
    }
  }
  const highlightEnd = highlightStart >= 0 ? highlightStart + highlightWordsArr.length : -1;

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const useBlur = filter && !isMobile;

  useEffect(() => {
    const timeout = setTimeout(() => {
      animate(
        "span",
        useBlur
          ? { opacity: 1, filter: "blur(0px)" }
          : { opacity: 1, y: 0 },
        {
          duration: useBlur ? duration : 0.35,
          ease: "easeOut",
          delay: stagger(useBlur ? 0.08 : 0.04),
        }
      );
    }, startDelay * 1000);
    return () => clearTimeout(timeout);
  }, [scope, animate, useBlur, duration, startDelay]);

  return (
    <div className={cn("font-bold", className)} ref={scope}>
      <div className="leading-snug tracking-tight">
        {wordsArray.map((word, idx) => {
          const isHighlighted = idx >= highlightStart && idx < highlightEnd;
          return (
            <motion.span
              key={word + idx}
              className={cn("opacity-0 inline-block mr-[0.25em]", isHighlighted && highlightClassName)}
              style={{
                filter: useBlur ? "blur(10px)" : undefined,
                y: useBlur ? undefined : 12,
                willChange: "transform, opacity",
              }}
            >
              {word}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
};
