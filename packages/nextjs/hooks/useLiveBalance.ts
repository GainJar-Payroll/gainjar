"use client";

import { useEffect, useState } from "react";

export function useLiveBalance(initialBalance: bigint, flowRate: bigint): bigint {
  const [liveBalance, setLiveBalance] = useState(initialBalance);

  useEffect(() => {
    // Reset when initial balance changes
    setLiveBalance(initialBalance);

    // If no flow, no need to stream
    if (flowRate === 0n) return;

    const startBalance = initialBalance;
    const startTime = Math.floor(Date.now() / 1000);
    const controller = new AbortController();

    const updateBalance = () => {
      if (controller.signal.aborted) return;

      const now = Math.floor(Date.now() / 1000);
      const elapsed = BigInt(now - startTime);
      const streamed = flowRate * elapsed;

      const newBalance = streamed >= startBalance ? 0n : startBalance - streamed;
      setLiveBalance(newBalance);
    };

    // Initial update
    updateBalance();

    // Update every second
    const interval = setInterval(updateBalance, 1000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [initialBalance, flowRate]);

  return liveBalance;
}
