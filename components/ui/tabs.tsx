"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Tab = {
  title: string;
  value: string;
  content?: string | React.ReactNode;
};

export const Tabs = ({
  tabs: propTabs,
  containerClassName,
  activeTabClassName,
  tabClassName,
  contentClassName,
  autoAdvance = 0,
}: {
  tabs: Tab[];
  containerClassName?: string;
  activeTabClassName?: string;
  tabClassName?: string;
  contentClassName?: string;
  autoAdvance?: number;
}) => {
  const [active, setActive] = useState<Tab>(propTabs[0]);
  const [tabs, setTabs] = useState<Tab[]>(propTabs);
  const paused = useRef(false);

  const moveSelectedTabToTop = useCallback((idx: number) => {
    const newTabs = [...propTabs];
    const selectedTab = newTabs.splice(idx, 1);
    newTabs.unshift(selectedTab[0]);
    setTabs(newTabs);
    setActive(newTabs[0]);
  }, [propTabs]);

  // Auto-advance through tabs
  useEffect(() => {
    if (!autoAdvance || paused.current) return;
    const timer = setInterval(() => {
      if (paused.current) return;
      const currentIdx = propTabs.findIndex(t => t.value === active.value);
      const nextIdx = (currentIdx + 1) % propTabs.length;
      moveSelectedTabToTop(nextIdx);
    }, autoAdvance);
    return () => clearInterval(timer);
  }, [autoAdvance, active.value, propTabs, moveSelectedTabToTop]);

  function handleClick(idx: number) {
    paused.current = true;
    moveSelectedTabToTop(idx);
  }

  return (
    <>
      <div
        className={cn(
          "flex flex-row items-center justify-start [perspective:1000px] relative overflow-auto sm:overflow-visible no-visible-scrollbar max-w-full w-full",
          containerClassName
        )}
      >
        {propTabs.map((tab, idx) => (
          <button
            key={tab.title}
            onClick={() => handleClick(idx)}
            className={cn(
              "relative px-4 min-h-[44px] inline-flex items-center justify-center rounded-full",
              tabClassName
            )}
            style={{
              transformStyle: "preserve-3d",
            }}
          >
            {active.value === tab.value && (
              <motion.div
                layoutId="clickedbutton"
                transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                className={cn(
                  "absolute inset-0 bg-surface-2 border border-scalpel/30 rounded-full",
                  activeTabClassName
                )}
              />
            )}

            <span className={cn(
              "relative block text-sm font-medium",
              active.value === tab.value ? "text-fg-bright" : "text-fg-muted"
            )}>
              {tab.title}
            </span>
          </button>
        ))}
      </div>
      <FadeInDiv
        tabs={tabs}
        active={active}
        key={active.value}
        className={cn("mt-8", contentClassName)}
      />
    </>
  );
};

export const FadeInDiv = ({
  className,
  tabs,
}: {
  className?: string;
  key?: string;
  tabs: Tab[];
  active: Tab;
  hovering?: boolean;
}) => {
  const activeTab = tabs[0];
  return (
    <div className="relative w-full h-full">
      <motion.div
        key={activeTab.value}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={cn("w-full h-full absolute top-0 left-0", className)}
      >
        {activeTab.content}
      </motion.div>
    </div>
  );
};
