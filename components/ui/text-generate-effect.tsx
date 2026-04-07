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
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
  startDelay?: number;
}) => {
  const [scope, animate] = useAnimate();
  const wordsArray = words.split(" ");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  const useBlur = filter && !isMobile;

  useEffect(() => {
    const timeout = setTimeout(() => {
      animate(
        "span",
        {
          opacity: 1,
          filter: useBlur ? "blur(0px)" : "none",
        },
        {
          duration: duration,
          delay: stagger(0.08),
        }
      );
    }, startDelay * 1000);
    return () => clearTimeout(timeout);
  }, [scope, animate, useBlur, duration, startDelay]);

  return (
    <div className={cn("font-bold", className)} ref={scope}>
      <div className="leading-snug tracking-tight">
        {wordsArray.map((word, idx) => (
          <motion.span
            key={word + idx}
            className="opacity-0 inline-block mr-[0.25em]"
            style={{
              filter: useBlur ? "blur(10px)" : "none",
            }}
          >
            {word}
          </motion.span>
        ))}
      </div>
    </div>
  );
};
