"use client";

import { ComponentPropsWithoutRef, useEffect, useRef } from "react";
import { useMotionValue, useSpring } from "motion/react";
import { cn } from "~~/lib/utils";

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number;
  direction?: "up" | "down";
  decimalPlaces?: number;
  // Add continuous mode for live streaming
  continuous?: boolean;
  // Custom formatting
  prefix?: string;
  suffix?: string;
  // From 0 to value
  instantOnMount?: boolean;
}

export function NumberTicker({
  value,
  className,
  decimalPlaces = 0,
  continuous = false,
  prefix = "",
  suffix = "",
  instantOnMount = false,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const hasMounted = useRef(false);

  // IMPORTANT: init with 0
  const motionValue = useMotionValue(0);

  const springValue = useSpring(motionValue, {
    damping: continuous ? 80 : 60,
    stiffness: continuous ? 120 : 100,
  });

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;

      if (instantOnMount) {
        // Direct set without visible animation
        motionValue.jump(value);
        return;
      }
    }

    motionValue.set(value);
  }, [value, motionValue, instantOnMount]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", latest => {
      if (!ref.current) return;

      const formatted = Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(Number(latest.toFixed(decimalPlaces)));

      ref.current.textContent = `${prefix}${formatted}${suffix}`;
    });

    return unsubscribe;
  }, [springValue, decimalPlaces, prefix, suffix]);

  return <span ref={ref} className={cn("inline-block tracking-wider tabular-nums", className)} {...props} />;
}
