"use client";

import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { cn } from "~~/lib/utils";
import { EVaultStatus, VaultStatusLabel } from "~~/types/type";

export default function VaultStatus() {
  const { address } = useAccount();

  const { data, isLoading, isError } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getVaultHealth",
    args: [address],
  });

  if (isError) {
    return (
      <div className="bg-card border border-border  p-6">
        <p className="text-sm font-mono text-destructive">Error loading vault status</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-card border border-border  p-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
        <div className="h-8 bg-muted rounded w-1/2"></div>
      </div>
    );
  }

  const vaultData = data as unknown as readonly [bigint, bigint, bigint, EVaultStatus, boolean, bigint] | undefined;

  if (!vaultData) {
    return (
      <div className="bg-card border border-border  p-6">
        <p className="text-sm font-mono text-muted-foreground">No vault data available</p>
      </div>
    );
  }

  const [balance, flowRate, daysRemaining, status, canCreateNewStream, maxAdditionalFlowRate] = vaultData;
  const vaultStatus = VaultStatusLabel[status];
  const balanceInUSDC = Number(balance) / 1e6;

  // Get status-specific styling
  const getStatusStyles = () => {
    switch (status) {
      case EVaultStatus.HEALTHY:
        return {
          border: "border-emerald-200 dark:border-emerald-900/50",
          bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
          text: "text-emerald-900 dark:text-emerald-100",
          divider: "border-emerald-300 dark:border-emerald-800",
        };
      case EVaultStatus.WARNING:
        return {
          border: "border-amber-200 dark:border-amber-900/50",
          bg: "bg-amber-50/50 dark:bg-amber-950/20",
          text: "text-amber-900 dark:text-amber-100",
          divider: "border-amber-300 dark:border-amber-800",
        };
      case EVaultStatus.CRITICAL:
        return {
          border: "border-orange-200 dark:border-orange-900/50",
          bg: "bg-orange-50/50 dark:bg-orange-950/20",
          text: "text-orange-900 dark:text-orange-100",
          divider: "border-orange-300 dark:border-orange-800",
        };
      case EVaultStatus.EMERGENCY:
        return {
          border: "border-destructive",
          bg: "bg-destructive/10",
          text: "text-destructive",
          divider: "border-destructive/30",
        };
      default:
        return {
          border: "border-border",
          bg: "bg-card",
          text: "text-card-foreground",
          divider: "border-border",
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className={cn("border  p-6 transition-all duration-300", styles.border, styles.bg)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-mono text-muted-foreground">Vault Status</p>
          <h3 className={cn("text-3xl font-serif font-bold flex items-center gap-2", styles.text)}>
            <span>{vaultStatus.icon}</span>
            <span>{vaultStatus.status}</span>
          </h3>
        </div>
        <div className="text-right space-y-1">
          <p className="text-sm font-mono text-muted-foreground">Balance</p>
          <p className={cn("text-2xl font-mono font-bold", styles.text)}>${balanceInUSDC.toFixed(2)}</p>
        </div>
      </div>

      <div className={cn("mt-4 pt-4 border-t", styles.divider)}>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="font-mono text-xs text-muted-foreground">Flow Rate</p>
            <p className={cn("font-mono font-semibold text-sm", styles.text)}>
              ${(Number(flowRate) / 1e6).toFixed(2)}/s
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-mono text-xs text-muted-foreground">Days Remaining</p>
            <p className={cn("font-mono font-semibold text-sm", styles.text)}>{Number(daysRemaining)}d</p>
          </div>
          <div className="space-y-1">
            <p className="font-mono text-xs text-muted-foreground">Create Stream</p>
            <p className={cn("font-mono font-semibold text-sm", styles.text)}>
              {canCreateNewStream ? "✓ Yes" : "✗ No"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
