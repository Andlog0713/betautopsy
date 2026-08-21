"use client";
import { Fragment, useEffect, useState } from "react";
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
  as: Tag = "div",
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
  startDelay?: number;
  highlight?: string;
  highlightClassName?: string;
  /**
   * Element to render as. Defaults to `div`, but callers that use this as a
   * page headline MUST pass the real heading level — the animated words are
   * the only copy at that position, so a `div` leaves the page with no
   * heading in the hydrated DOM even when the pre-hydration fallback emitted
   * one. See `HeroABTest`.
   */
  as?: "div" | "h1" | "h2" | "h3";
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
          duration: useBlur ? duration : 0.25,
          ease: "easeOut",
          delay: stagger(useBlur ? 0.08 : 0.02),
        }
      );
    }, startDelay * 1000);
    return () => clearTimeout(timeout);
  }, [scope, animate, useBlur, duration, startDelay]);

  return (
    // Inner wrapper is a `span.block` rather than a `div` so the markup stays
    // valid when `Tag` is a heading (headings take phrasing content only).
    // `block` reproduces the previous div's layout exactly.
    <Tag className={cn("font-bold", className)} ref={scope}>
      <span className="block leading-snug tracking-tight">
        {wordsArray.map((word, idx) => {
          const isHighlighted = idx >= highlightStart && idx < highlightEnd;
          return (
            // A real space text node separates the words instead of the
            // previous `mr-[0.25em]`. The margin spaced them visually but left
            // no whitespace in the DOM, so the accessible name and the text a
            // crawler extracts read as one run-on token
            // ("Seewhatyourbettingdata…"). That was cosmetic while this
            // rendered a div; as a page `h1` it is the heading's actual text.
            // Adjacent inline-blocks collapse the newline to a single space,
            // which matches the old 0.25em gap.
            <Fragment key={word + idx}>
              <motion.span
                className={cn("opacity-0 inline-block", isHighlighted && highlightClassName)}
                style={{
                  filter: useBlur ? "blur(10px)" : undefined,
                  y: useBlur ? undefined : 12,
                  willChange: "transform, opacity",
                }}
              >
                {word}
              </motion.span>
              {idx < wordsArray.length - 1 ? " " : null}
            </Fragment>
          );
        })}
      </span>
    </Tag>
  );
};
