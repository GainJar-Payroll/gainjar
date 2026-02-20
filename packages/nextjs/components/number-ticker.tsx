"use client";

import { ComponentPropsWithoutRef, useEffect, useRef, useState } from "react";
import { useMotionValue, useSpring } from "motion/react";
import { cn } from "~~/lib/utils";

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: bigint | string;
  decimalPlaces?: number;
  continuous?: boolean;
  prefix?: string;
  suffix?: string;
}

export function NumberTicker({
  value = 0n,
  className,
  decimalPlaces = 0,
  prefix = "",
  suffix = "",
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);

  const motionValue = useMotionValue(Number(value));

  const springValue = useSpring(motionValue, {
    damping: 80,
    stiffness: 120,
  });

  useEffect(() => {
    if (!mounted) {
      setMounted(true);
      // Jump to initial value without animation
      motionValue.jump(Number(value));
    } else {
      // Animate to new value
      motionValue.set(Number(value));
    }
  }, [value, mounted, motionValue]);

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
