"use client";

import { Button } from "../ui/button";
import { AlertCircle, RotateCcw, TrendingUp } from "lucide-react";
import { maxUint256 } from "viem";
import { useAccount } from "wagmi";
import { ONE_DAY } from "~~/const";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { EVaultStatus, VaultStatusLabel } from "~~/types/type";

export default function VaultMetrics() {
  const { address } = useAccount();

  const { data, isLoading, isError, refetch } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getVaultHealth",
    args: [address],
  });

  if (isError) {
    return (
      <div className="border border-destructive bg-destructive/10 p-6 flex gap-2 items-center justify-between">
        <p className="text-destructive font-mono text-sm">Error loading vault metrics</p>
        <Button size="icon" variant="destructive" onClick={() => refetch()}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-border p-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-muted rounded w-1/2"></div>
      </div>
    );
  }

  const vaultData = data as unknown as readonly [bigint, bigint, bigint, EVaultStatus, boolean, bigint] | undefined;

  if (!vaultData) {
    return (
      <div className="bg-card border border-border p-6">
        <p className="text-muted-foreground font-mono text-sm">No vault data available</p>
      </div>
    );
  }

  const [balance, flowRate, daysRemaining, status, canCreateNewStream, maxAdditionalFlowRate] = vaultData;

  const balanceInUSDC = Number(balance) / 1e6;
  const flowRateInUSDC = Number(flowRate) / 1e6;
  const maxFlowInUSDC = Number(maxAdditionalFlowRate) / 1e6;
  const daysRemainingNum = Number(daysRemaining);

  const formatDay = Number(maxUint256) / ONE_DAY === daysRemainingNum ? "Infinity" : daysRemainingNum;

  const statusLabel = VaultStatusLabel[status];

  // Calculate coverage percentage for visual indicator
  const getCoveragePercentage = () => {
    if (daysRemainingNum >= 30) return 100;
    if (daysRemainingNum >= 7) return ((daysRemainingNum - 7) / 23) * 100 + 33;
    return (daysRemainingNum / 7) * 33;
  };

  const coveragePercentage = getCoveragePercentage();

  const getStatusStyles = () => {
    switch (status) {
      case EVaultStatus.HEALTHY:
        return {
          border: "border-emerald-200 dark:border-emerald-900/50",
          bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
          text: "text-emerald-900 dark:text-emerald-100",
          bar: "bg-emerald-500 dark:bg-emerald-400",
          badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
        };
      case EVaultStatus.WARNING:
        return {
          border: "border-amber-200 dark:border-amber-900/50",
          bg: "bg-amber-50/50 dark:bg-amber-950/20",
          text: "text-amber-900 dark:text-amber-100",
          bar: "bg-amber-500 dark:bg-amber-400",
          badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
        };
      case EVaultStatus.CRITICAL:
        return {
          border: "border-orange-200 dark:border-orange-900/50",
          bg: "bg-orange-50/50 dark:bg-orange-950/20",
          text: "text-orange-900 dark:text-orange-100",
          bar: "bg-orange-500 dark:bg-orange-400",
          badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
        };
      case EVaultStatus.EMERGENCY:
        return {
          border: "border-destructive",
          bg: "bg-destructive/10",
          text: "text-destructive",
          bar: "bg-destructive",
          badge: "bg-destructive/20 text-destructive",
        };
      default:
        return {
          border: "border-border",
          bg: "bg-card",
          text: "text-card-foreground",
          bar: "bg-primary",
          badge: "bg-muted text-muted-foreground",
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className={`bg-card border p-6 transition-all duration-300 ${styles.border} ${styles.bg}`}>
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Left Column - Primary Info */}
        <div className="space-y-4">
          <div>
            <p className="text-sm font-mono text-muted-foreground mb-2">Current Balance</p>
            <div>
              <h2 className={`text-4xl font-serif font-bold ${styles.text}`}>
                ${balanceInUSDC.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </h2>
              <p className="text-xs font-mono text-muted-foreground mt-1">{Number(balance).toLocaleString()} wei</p>
            </div>
          </div>

          {/* Coverage Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-medium text-muted-foreground">Coverage</span>
              <span className="text-sm font-mono font-semibold text-foreground">{formatDay} days</span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${styles.bar}`}
                style={{ width: `${Math.min(coveragePercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-2">
              {formatDay} days remaining at current flow rate
            </p>
          </div>
        </div>

        {/* Right Column - Status & Flow Info */}
        <div className="flex flex-col justify-between space-y-4">
          {/* Status Badge */}
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-2">Status</p>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-md ${styles.badge}`}>
              <span className="text-lg">{statusLabel.icon}</span>
              <span className="font-mono font-semibold">{statusLabel.status}</span>
            </div>
          </div>

          {/* Flow Rate Info */}
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-2">Total Flow Rate</p>
            <p className={`text-2xl font-mono font-bold ${styles.text}`}>${flowRateInUSDC.toFixed(6)}/s</p>
            <p className="text-xs font-mono text-muted-foreground mt-1">≈ ${(flowRateInUSDC * 86400).toFixed(2)}/day</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border my-6" />

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center space-y-1">
          <p className="text-xs font-mono text-muted-foreground">Can Create Stream</p>
          <div className="flex items-center justify-center gap-1.5">
            {canCreateNewStream ? (
              <>
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">Yes</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="font-mono font-semibold text-destructive">No</span>
              </>
            )}
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs font-mono text-muted-foreground">Max Flow Rate</p>
          <p className="font-mono font-semibold text-sm text-foreground">${maxFlowInUSDC.toFixed(2)}/s</p>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs font-mono text-muted-foreground">Daily Cost</p>
          <p className="font-mono font-semibold text-sm text-foreground break-words">
            ${(flowRateInUSDC * 86400).toLocaleString("en-US", { maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs font-mono text-muted-foreground">Burndown Rate</p>
          <p className="font-mono font-semibold text-sm text-foreground">
            {daysRemainingNum > 0 ? `${(balanceInUSDC / daysRemainingNum).toFixed(2)}/d` : "∞"}
          </p>
        </div>
      </div>

      {/* Status Alert Messages */}
      {status === EVaultStatus.WARNING && (
        <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 rounded-r">
          <p className="text-sm font-mono text-amber-900 dark:text-amber-200">
            ⚠️ Your vault is in WARNING status. Consider depositing more funds to maintain stability.
          </p>
        </div>
      )}

      {status === EVaultStatus.CRITICAL && (
        <div className="mt-6 p-4 bg-orange-50 dark:bg-orange-950/30 border-l-4 border-orange-500 rounded-r">
          <p className="text-sm font-mono text-orange-900 dark:text-orange-200">
            🔶 Your vault is in CRITICAL status. Immediate deposit needed to avoid liquidation.
          </p>
        </div>
      )}

      {status === EVaultStatus.EMERGENCY && (
        <div className="mt-6 p-4 bg-destructive/10 border-l-4 border-destructive rounded-r">
          <p className="text-sm font-mono text-destructive">
            🚨 Your vault is in EMERGENCY status. Deposit USDC immediately to prevent employee liquidation.
          </p>
        </div>
      )}
    </div>
  );
}
