"use client";

import { useMemo } from "react";
import { NumberTicker } from "../number-ticker";
import { AlertCircle, RefreshCw, RotateCcw, TrendingUp } from "lucide-react";
import { formatUnits, maxUint256 } from "viem";
import { useAccount } from "wagmi";
import { Button } from "~~/components/ui/button";
import { ONE_DAY } from "~~/const";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { useLiveBalance } from "~~/hooks/useLiveBalance";
import { cn } from "~~/lib/utils";
import { EVaultStatus, VaultStatusLabel } from "~~/types/type";

type VaultHealthData = readonly [bigint, bigint, bigint, EVaultStatus, boolean, bigint];

interface StatusStyles {
  border: string;
  bg: string;
  text: string;
  bar: string;
  badge: string;
}

function getStatusStyles(status: EVaultStatus): StatusStyles {
  const styleMap: Record<EVaultStatus, StatusStyles> = {
    [EVaultStatus.HEALTHY]: {
      border: "border-emerald-200 dark:border-emerald-900/50",
      bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
      text: "text-emerald-900 dark:text-emerald-100",
      bar: "bg-emerald-500 dark:bg-emerald-400",
      badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
    },
    [EVaultStatus.WARNING]: {
      border: "border-amber-200 dark:border-amber-900/50",
      bg: "bg-amber-50/50 dark:bg-amber-950/20",
      text: "text-amber-900 dark:text-amber-100",
      bar: "bg-amber-500 dark:bg-amber-400",
      badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
    },
    [EVaultStatus.CRITICAL]: {
      border: "border-orange-200 dark:border-orange-900/50",
      bg: "bg-orange-50/50 dark:bg-orange-950/20",
      text: "text-orange-900 dark:text-orange-100",
      bar: "bg-orange-500 dark:bg-orange-400",
      badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300",
    },
    [EVaultStatus.EMERGENCY]: {
      border: "border-destructive",
      bg: "bg-destructive/10",
      text: "text-destructive",
      bar: "bg-destructive",
      badge: "bg-destructive/20 text-destructive",
    },
  };

  return (
    styleMap[status] || {
      border: "border-border",
      bg: "bg-card",
      text: "text-card-foreground",
      bar: "bg-primary",
      badge: "bg-muted text-muted-foreground",
    }
  );
}

function getCoveragePercentage(daysRemaining: number): number {
  if (daysRemaining >= 30) return 100;
  if (daysRemaining >= 7) return ((daysRemaining - 7) / 23) * 100 + 33;
  return (daysRemaining / 7) * 33;
}

function formatDaysRemaining(daysRemaining: bigint): string | number {
  const days = Number(daysRemaining);
  const maxDays = Number(maxUint256) / ONE_DAY;
  return days === maxDays ? "∞" : days;
}

function StatusAlert({ status }: { status: EVaultStatus }) {
  const alerts: Record<1 | 2 | 3, { bg: string; border: string; text: string; message: string }> = {
    [EVaultStatus.WARNING]: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-500",
      text: "text-amber-900 dark:text-amber-200",
      message: "⚠️ Your vault is in WARNING status. Consider depositing more funds to maintain stability.",
    },
    [EVaultStatus.CRITICAL]: {
      bg: "bg-orange-50 dark:bg-orange-950/30",
      border: "border-orange-500",
      text: "text-orange-900 dark:text-orange-200",
      message: "🔶 Your vault is in CRITICAL status. Immediate deposit needed to avoid liquidation.",
    },
    [EVaultStatus.EMERGENCY]: {
      bg: "bg-destructive/10",
      border: "border-destructive",
      text: "text-destructive",
      message: "🚨 Your vault is in EMERGENCY status. Deposit USDC immediately to prevent employee liquidation.",
    },
  };

  const alert = alerts[status as 1 | 2 | 3];
  if (!alert) return null;

  return (
    <div className={`mt-6 p-4 ${alert.bg} border-l-4 ${alert.border} rounded-r`}>
      <p className={`text-sm font-mono ${alert.text}`}>{alert.message}</p>
    </div>
  );
}

export default function VaultMetrics() {
  const { address } = useAccount();

  const { data, isLoading, isError, refetch, isFetching } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getVaultHealth",
    args: [address],
    watch: true,
  });

  // Type-safe vault data
  const vaultData = data as VaultHealthData | undefined;

  // Extract vault data
  const [
    balance = 0n,
    flowRate = 0n,
    daysRemaining = 0n,
    status = EVaultStatus.HEALTHY,
    canCreateNewStream = false,
    maxAdditionalFlowRate = 0n,
  ] = vaultData || [];

  // Live streaming balance
  const liveBalance = useLiveBalance(balance, flowRate);

  // Computed values
  const balanceInUSDC = useMemo(() => Number(liveBalance) / 1e6, [liveBalance]);
  const flowRateInUSDC = useMemo(() => Number(flowRate) / 1e6, [flowRate]);
  const maxFlowInUSDC = useMemo(() => Number(maxAdditionalFlowRate) / 1e6, [maxAdditionalFlowRate]);
  const daysRemainingNum = useMemo(() => Number(daysRemaining), [daysRemaining]);

  const formattedDays = useMemo(() => formatDaysRemaining(daysRemaining), [daysRemaining]);
  const coveragePercentage = useMemo(() => getCoveragePercentage(daysRemainingNum), [daysRemainingNum]);
  const styles = useMemo(() => getStatusStyles(status), [status]);
  const statusLabel = useMemo(() => VaultStatusLabel[status], [status]);

  // Loading & error states
  if (isError)
    return (
      <div className="border border-destructive bg-destructive/10 p-6 flex gap-2 items-center justify-between">
        <p className="text-destructive font-mono text-sm">Error loading vault metrics</p>
        <Button size="icon" variant="destructive" onClick={() => refetch()}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    );

  if (isLoading)
    return (
      <div className="bg-card border border-border p-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-4" />
        <div className="h-8 bg-muted rounded w-1/2" />
      </div>
    );

  if (!vaultData)
    return (
      <div className="bg-card border border-border p-6">
        <p className="text-muted-foreground font-mono text-sm">No vault data available</p>
      </div>
    );

  return (
    <div className={cn("relative bg-card border p-6 transition-all duration-300", styles.border, styles.bg)}>
      {/* Refresh Button */}
      <Button size="icon" onClick={() => refetch()} className="absolute top-5 right-5">
        <RefreshCw className={cn("text-base", isFetching && "animate-spin")} />
      </Button>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Left Column - Balance & Coverage */}
        <div className="space-y-4">
          {/* Current Balance */}
          <div>
            <p className="text-sm font-mono text-muted-foreground mb-2">Available Balance</p>
            <h2 className={cn("text-4xl font-serif font-bold", styles.text)}>
              <NumberTicker
                value={formatUnits(liveBalance ?? 0, 6)}
                decimalPlaces={2}
                prefix="$"
                className={styles.text}
              />
            </h2>
            <NumberTicker
              value={liveBalance ?? 0}
              decimalPlaces={0}
              suffix=" wei"
              className={"text-xs font-mono text-muted-foreground mt-1"}
            />
            {/*<p className="text-xs font-mono text-muted-foreground mt-1">{Number(liveBalance).toLocaleString()} wei</p>*/}
          </div>

          {/* Coverage Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-medium text-muted-foreground">Coverage</span>
              <span className="text-sm font-mono font-semibold text-foreground">{formattedDays} days</span>
            </div>
            <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500", styles.bar)}
                style={{ width: `${Math.min(coveragePercentage, 100)}%` }}
              />
            </div>
            <p className="text-xs font-mono text-muted-foreground mt-2">
              {formattedDays} days remaining at current flow rate
            </p>
          </div>
        </div>

        {/* Right Column - Status & Flow */}
        <div className="flex flex-col justify-between space-y-4">
          {/* Status Badge */}
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-2">Status</p>
            <div className={cn("inline-flex items-center gap-2 px-4 py-2 rounded-md", styles.badge)}>
              <span className="text-lg">{statusLabel.icon}</span>
              <span className="font-mono font-semibold">{statusLabel.status}</span>
            </div>
          </div>

          {/* Flow Rate */}
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-2">Total Flow Rate</p>
            <p className={cn("text-2xl font-mono font-bold", styles.text)}>${flowRateInUSDC.toFixed(6)}/s</p>
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
          <p className="font-mono font-semibold text-sm text-foreground">${maxFlowInUSDC.toFixed(6)}/s</p>
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
            {daysRemainingNum > 0 ? `$${(balanceInUSDC / daysRemainingNum).toFixed(2)}/d` : "∞"}
          </p>
        </div>
      </div>

      {/* Status Alerts */}
      <StatusAlert status={status} />
    </div>
  );
}
