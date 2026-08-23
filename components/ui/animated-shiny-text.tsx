"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface AnimatedShinyTextProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedShinyText({
  children,
  className,
}: AnimatedShinyTextProps) {
  return (
    <p
      className={cn(
        "mx-auto max-w-md text-fg-dim",
        className,
      )}
    >
      {children}
    </p>
  );
}
