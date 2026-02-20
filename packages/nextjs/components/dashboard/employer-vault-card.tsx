"use client";

import { useState } from "react";
import { LiquidateModal } from "./liquidate-modal";
import { AlertTriangle, Building2, Calendar, TrendingDown } from "lucide-react";
import { formatUnits } from "viem";
import { NumberTicker } from "~~/components/number-ticker";
import { Button } from "~~/components/ui/button";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { cn } from "~~/lib/utils";
import { EVaultStatus, VaultStatusLabel } from "~~/types/type";
import { ZERO_ADDRESS } from "~~/utils/scaffold-eth/common";

interface EmployerVaultCardProps {
  employer: `0x${string}`;
  employee: `0x${string}`;
  index: number;
}

export function EmployerVaultCard({ employer, employee, index }: EmployerVaultCardProps) {
  const [showLiquidateModal, setShowLiquidateModal] = useState(false);

  // Fetch vault health
  const { data: vaultHealth } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getVaultHealth",
    args: [employer],
    watch: true,
  });

  // Fetch liquidation preview
  const { data: liquidationPreview } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getLiquidationPreview",
    args: [employer],
    watch: true,
  });

  // Fetch employee's stream info
  const { data: streamInfo } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getStreamInfo",
    args: [employer, employee],
  });

  if (!vaultHealth || !streamInfo) {
    return null;
  }

  const [balance = 0n, , daysRemaining = 0n, status = 0] =
    (vaultHealth as readonly [bigint, bigint, bigint, EVaultStatus, boolean, bigint]) || [];
  // const [ratePerSecond = 0n, , , , , , , withdrawableNow = 0n] =
  const [, , , , , , , withdrawableNow = 0n] =
    (streamInfo as readonly [bigint, bigint, bigint, bigint, number, bigint, bigint, bigint, boolean, boolean]) || [];

  // const withdrawableLive = useLiveBalance(withdrawableNow, ratePerSecond, true, true);
  const withdrawableLive = withdrawableNow;

  const balanceUSDC = Number(formatUnits(balance, 6));
  const daysRemainingNum = Number(daysRemaining);

  // Liquidation data
  const isEligible = liquidationPreview?.[0] || false;
  const estimatedReward = liquidationPreview?.[3] ? Number(formatUnits(liquidationPreview[3] as bigint, 6)) : 0;

  const statusLabel = VaultStatusLabel[status];

  // Status styling
  const statusStyles = {
    [EVaultStatus.HEALTHY]: {
      border: "border-emerald-200 dark:border-emerald-900/50",
      bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
      text: "text-emerald-900 dark:text-emerald-100",
      badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    },
    [EVaultStatus.WARNING]: {
      border: "border-amber-200 dark:border-amber-900/50",
      bg: "bg-amber-50/50 dark:bg-amber-950/20",
      text: "text-amber-900 dark:text-amber-100",
      badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    },
    [EVaultStatus.CRITICAL]: {
      border: "border-orange-200 dark:border-orange-900/50",
      bg: "bg-orange-50/50 dark:bg-orange-950/20",
      text: "text-orange-900 dark:text-orange-100",
      badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    },
    [EVaultStatus.EMERGENCY]: {
      border: "border-destructive",
      bg: "bg-destructive/10",
      text: "text-destructive",
      badge: "bg-destructive/20 text-destructive",
    },
  };

  const style = statusStyles[status];

  return (
    <>
      <div className={cn("border bg-card p-6 transition-all duration-300", style.border, style.bg)}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <Building2 className={`w-6 h-6 text-primary ${style.text}`} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Employer {index + 1}</p>
              <p className="font-mono text-sm font-bold">
                {employer.slice(0, 6)}...{employer.slice(-4)}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-md", style.badge)}>
            <span className="text-lg">{statusLabel.icon}</span>
            <span className="font-mono font-semibold">{statusLabel.status}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {/* Vault Balance */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
              <TrendingDown className="w-3 h-3" />
              Vault Balance
            </p>
            <p className="font-mono font-bold text-lg text-foreground">${balanceUSDC.toFixed(2)}</p>
          </div>

          {/* Days Remaining */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              Days Left
            </p>
            <p className={cn("font-mono font-bold text-lg", style.text)}>
              {daysRemainingNum === Number.MAX_SAFE_INTEGER ? "∞" : `${daysRemainingNum}d`}
            </p>
          </div>

          {/* Your Earned */}
          {employee !== ZERO_ADDRESS ? (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                <TrendingDown className="w-3 h-3" />
                You Earned
              </p>
              <p className="font-mono font-bold text-lg text-green-600 dark:text-green-400">
                <NumberTicker value={formatUnits(withdrawableLive ?? 0, 6)} decimalPlaces={2} prefix="$" />
              </p>
            </div>
          ) : null}
        </div>

        {/* Liquidation Section */}
        {isEligible && (
          <div className="border-t border-border pt-4">
            <div className="bg-destructive/5 border border-destructive/20 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <p className="text-xs uppercase tracking-wider font-bold text-destructive">Liquidation Available</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    Your employer&apos;s vault is critically low. You can liquidate to protect employees and earn a
                    reward.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Estimated Reward:</span>
                    <span className="font-mono font-bold text-sm text-destructive">${estimatedReward.toFixed(2)}</span>
                  </div>
                </div>
                <Button
                  onClick={() => setShowLiquidateModal(true)}
                  variant="destructive"
                  size="lg"
                  className="uppercase tracking-wider font-bold flex-shrink-0"
                >
                  {employee !== ZERO_ADDRESS ? "😈 Liquidate Your Boss" : "Liquidate"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showLiquidateModal && (
        <LiquidateModal
          employer={employer}
          estimatedReward={estimatedReward}
          onClose={() => setShowLiquidateModal(false)}
        />
      )}
    </>
  );
}
