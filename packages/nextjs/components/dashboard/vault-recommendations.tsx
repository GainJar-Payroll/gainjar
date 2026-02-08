"use client";

import { Lightbulb } from "lucide-react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { EVaultStatus } from "~~/types/type";

export default function VaultRecommendations() {
  const { address } = useAccount();

  const { data, isLoading, isError } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getVaultHealth",
    args: [address],
  });

  if (isError || isLoading) {
    return null;
  }

  const vaultData = data as unknown as readonly [bigint, bigint, bigint, EVaultStatus, boolean, bigint] | undefined;

  if (!vaultData) {
    return null;
  }

  const [balance, flowRate, daysRemaining, status] = vaultData;

  const flowRateInUSDC = Number(flowRate) / 1e6;
  const daysRemainingNum = Number(daysRemaining);

  const recommendations = {
    [EVaultStatus.HEALTHY]: [
      `Your vault has ≈${daysRemainingNum} days of coverage - excellent position!`,
      `You can create new streams with current balance.`,
      `Consider depositing when days remaining drop below 14 to maintain buffer.`,
    ],
    [EVaultStatus.WARNING]: [
      `Your vault is in WARNING status (7-29 days remaining).`,
      `Consider depositing additional funds to avoid CRITICAL status.`,
      `Current daily burn rate: $${(flowRateInUSDC * 86400).toFixed(2)}/day`,
      `To reach HEALTHY status (30+ days), deposit ~$${Math.ceil(flowRateInUSDC * 86400 * 20).toLocaleString()} USD.`,
    ],
    [EVaultStatus.CRITICAL]: [
      `⚠️ Your vault is in CRITICAL status (3-6 days remaining)!`,
      `Immediate deposit strongly recommended to prevent liquidation.`,
      `Daily burn rate: $${(flowRateInUSDC * 86400).toFixed(2)}/day`,
      `At current rate, vault depletes in ${daysRemainingNum} days.`,
      `Deposit at least $${Math.ceil(flowRateInUSDC * 86400 * 7).toLocaleString()} to reach WARNING status.`,
    ],
    [EVaultStatus.EMERGENCY]: [
      `🚨 EMERGENCY STATUS - Liquidation Risk Active!`,
      `Your vault will be depleted in less than 3 days at current burn rate.`,
      `Deposit IMMEDIATELY to prevent employee liquidation.`,
      `If liquidated, all active streams will be paused and employees will receive their earned funds.`,
      `Minimum deposit needed: $${Math.ceil(flowRateInUSDC * 86400 * 3).toLocaleString()}`,
    ],
  };

  const tips = recommendations[status] || [];

  // Get status-specific styling
  const getStatusStyles = () => {
    switch (status) {
      case EVaultStatus.HEALTHY:
        return {
          border: "border-emerald-200 dark:border-emerald-900/50",
          bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
          text: "text-emerald-900 dark:text-emerald-100",
          icon: "text-emerald-600 dark:text-emerald-400",
          note: "bg-emerald-100/50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200",
        };
      case EVaultStatus.WARNING:
        return {
          border: "border-amber-200 dark:border-amber-900/50",
          bg: "bg-amber-50/50 dark:bg-amber-950/20",
          text: "text-amber-900 dark:text-amber-100",
          icon: "text-amber-600 dark:text-amber-400",
          note: "bg-amber-100/50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200",
        };
      case EVaultStatus.CRITICAL:
        return {
          border: "border-orange-200 dark:border-orange-900/50",
          bg: "bg-orange-50/50 dark:bg-orange-950/20",
          text: "text-orange-900 dark:text-orange-100",
          icon: "text-orange-600 dark:text-orange-400",
          note: "bg-orange-100/50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200",
        };
      case EVaultStatus.EMERGENCY:
        return {
          border: "border-destructive",
          bg: "bg-destructive/10",
          text: "text-destructive",
          icon: "text-destructive",
          note: "bg-destructive/20 text-destructive",
        };
      default:
        return {
          border: "border-border",
          bg: "bg-card",
          text: "text-card-foreground",
          icon: "text-muted-foreground",
          note: "bg-muted text-muted-foreground",
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className={`border  p-6 transition-all duration-300 ${styles.border} ${styles.bg}`}>
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className={`h-5 w-5 ${styles.icon}`} />
        <h3 className={`text-lg font-serif font-bold ${styles.text}`}>Recommendations</h3>
      </div>

      <ul className="space-y-2.5">
        {tips.map((tip, idx) => (
          <li key={idx} className={`flex gap-3 text-sm font-mono ${styles.text}`}>
            <span className="flex-shrink-0 font-bold">→</span>
            <span className="leading-relaxed">{tip}</span>
          </li>
        ))}
      </ul>

      {status === EVaultStatus.HEALTHY && (
        <div className={`mt-4 p-3  text-xs font-mono ${styles.note}`}>
          Your vault health is strong. Continue monitoring and maintain regular deposits to ensure smooth operations.
        </div>
      )}
    </div>
  );
}
