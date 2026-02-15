"use client";

import { useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { UpdateStreamModal } from "./update-stream-modal";
import { Clock, DollarSign, TrendingUp, Wallet } from "lucide-react";
import { formatUnits } from "viem";
import { NumberTicker } from "~~/components/number-ticker";
import { Button } from "~~/components/ui/button";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useLiveBalance } from "~~/hooks/useLiveBalance";
import { useTransactionFlow } from "~~/hooks/useTransactionFlow";
import { cn } from "~~/lib/utils";
import { EStreamType } from "~~/types/type";

type StreamInfoData = readonly [bigint, bigint, bigint, bigint, EStreamType, bigint, bigint, bigint, boolean, boolean];

interface EmployeeStreamCardProps {
  employer: string;
  employee: string;
}

export function EmployeeStreamCard({ employer, employee }: EmployeeStreamCardProps) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getStreamInfo",
    args: [employer, employee],
  });

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "GainJar" });

  const { isLoading: streamPauseLoading, handleTransaction: handlePauseStreamTransaction } = useTransactionFlow({
    successMessage: "Stream Paused!",
    onSuccess: () => setTimeout(() => setShowUpdateModal(false), 2000),
  });

  const streamInfo = data as StreamInfoData | undefined;

  const [
    ratePerSecond = 0n,
    startTime = 0n,
    endTime = 0n,
    totalAmount = 0n,
    streamType = 0,
    totalEarned = 0n,
    totalWithdrawn = 0n,
    withdrawableNow = 0n,
    isActive = false,
    isExpired = false,
  ] = streamInfo || [];

  const totalEarnedLive = useLiveBalance(totalEarned, ratePerSecond, true, isActive);
  const withdrawableLive = useLiveBalance(withdrawableNow, ratePerSecond, true, isActive);

  // Calculate rates
  const ratePerSecondUSDC = Number(formatUnits(ratePerSecond, 6));
  const hourlyRate = ratePerSecondUSDC * 3600;
  const dailyRate = ratePerSecondUSDC * 86400;
  const monthlyRate = ratePerSecondUSDC * 2592000;

  // Amounts
  const totalWithdrawnUSDC = Number(formatUnits(totalWithdrawn, 6));

  // Status
  const isInfinite = streamType === 0;

  const handlePauseActivate = async () => {
    if (isProcessing) return;

    try {
      setIsProcessing(true);

      if (isActive) {
        await handlePauseStreamTransaction(async () => {
          await writeContractAsync({
            functionName: "pauseStream",
            args: [employee as `0x${string}`],
          });
        });
      } else {
        await handlePauseStreamTransaction(async () => {
          await writeContractAsync({
            functionName: "activateStream",
            args: [employee as `0x${string}`],
          });
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!streamInfo) {
    return (
      <div className="relative bg-card border border-border duration-300 overflow-hidden w-full min-w-lg md:w-[calc(50%_-_8px)] p-4 flex flex-col gap-5">
        <Skeleton className="h-12" />
        <div className="flex gap-3 justify-center items-center">
          <Skeleton className="h-[71px] w-1/3" />
          <Skeleton className="h-[71px] w-1/3" />
          <Skeleton className="h-[71px] w-1/3" />
        </div>
        <Skeleton className="h-36" />
        <div className="flex gap-3 justify-center items-center">
          <Skeleton className="h-[90px] w-1/2" />
          <Skeleton className="h-[90px] w-1/2" />
        </div>
      </div>
    );
  }

  // Status styling
  const statusStyles = isExpired
    ? {
        badge: "bg-destructive/10 text-destructive border-destructive",
        dot: "bg-destructive",
        label: "EXPIRED",
      }
    : isActive
      ? {
          badge: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/50",
          dot: "bg-green-500",
          label: "ACTIVE",
        }
      : {
          badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/50",
          dot: "bg-amber-500",
          label: "PAUSED",
        };

  return (
    <>
      <div className="group relative bg-card border border-border hover:border-primary/50 transition-all duration-300 overflow-hidden w-full min-w-lg lg:w-[calc(50%_-_8px)]">
        {/* Gradient Background Decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Content */}
        <div className="relative p-6 space-y-6">
          {/* Header Section */}
          <div className="flex items-start justify-between gap-4">
            {/* Left: Employee Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Employee</p>
                  <p className="font-mono text-sm font-bold truncate">{employee}</p>
                </div>
              </div>
            </div>

            {/* Right: Type & Status */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span
                className={cn(
                  "text-[10px] font-bold px-3 py-1.5 rounded-full border uppercase tracking-wider",
                  isInfinite
                    ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                    : "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
                )}
              >
                {isInfinite ? "∞ INFINITE" : "⌛ FINITE"}
              </span>
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider",
                  statusStyles.badge,
                )}
              >
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", statusStyles.dot)} />
                {statusStyles.label}
              </div>
            </div>
          </div>

          {/* Rate Cards Grid */}
          <div className="grid grid-cols-3 gap-3">
            <RateCard icon={Clock} label="Hourly" value={hourlyRate} />
            <RateCard icon={DollarSign} label="Daily" value={dailyRate} />
            <RateCard icon={TrendingUp} label="Monthly" value={monthlyRate} highlight />
          </div>

          {/* Earnings Section */}
          <div className="space-y-4">
            {/* Total Earned - Big Display */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <span className="text-xs uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Total Earned
                </span>
                <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
                    Live
                  </span>
                </div>
              </div>

              <div className="flex items-end justify-between gap-4">
                {/* Left: Main Display */}
                <div className="flex-1 min-w-0">
                  <div className="font-heading font-bold text-4xl text-foreground mb-2">
                    <NumberTicker value={formatUnits(totalEarnedLive, 6)} decimalPlaces={2} prefix="$" />
                  </div>
                  <div className="font-mono text-xs text-muted-foreground">
                    <NumberTicker value={totalEarnedLive} suffix=" wei" />
                  </div>
                </div>

                {/* Right: Rate Display */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="bg-background/80 border border-primary/20 rounded-md px-3 py-2">
                    <p className="font-mono font-bold text-sm text-primary">
                      ${ratePerSecondUSDC.toFixed(6)}
                      <span className="text-xs text-muted-foreground">/s</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Withdrawn */}
              <div className="bg-muted/30 border border-border  p-4">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-2">Withdrawn</p>
                <p className="font-mono font-bold text-2xl text-foreground">${totalWithdrawnUSDC.toFixed(2)}</p>
              </div>

              {/* Available to Withdraw */}
              <div className="bg-green-500/5 border border-green-500/20  p-4">
                <p className="text-[10px] uppercase tracking-wider text-green-600 dark:text-green-400 font-bold mb-2">
                  Available
                </p>
                <p className="font-mono font-bold text-2xl text-green-600 dark:text-green-400">
                  <NumberTicker value={formatUnits(withdrawableLive, 6)} decimalPlaces={2} prefix="$" />
                </p>
              </div>
            </div>
          </div>

          {/* Finite Stream Timeline */}
          {!isInfinite && (
            <div className="bg-muted/20 border border-border  p-4">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-3">
                Stream Timeline
              </p>
              <div className="space-y-2 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start:</span>
                  <span className="font-bold">{new Date(Number(startTime) * 1000).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End:</span>
                  <span className="font-bold">{new Date(Number(endTime) * 1000).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 mt-2">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-bold text-primary">${Number(formatUnits(totalAmount, 6)).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-border space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Employer Actions</p>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setShowUpdateModal(true)} size={"lg"} disabled={isExpired}>
                {isInfinite ? "Update Rate" : "Extend Stream"}
              </Button>

              <Button
                onClick={handlePauseActivate}
                variant="outline"
                size={"lg"}
                isLoading={isProcessing}
                disabled={isExpired || isProcessing}
              >
                {isActive ? (
                  <span className="flex items-center gap-2">Pause</span>
                ) : (
                  <span className="flex items-center gap-2">Activate</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {showUpdateModal && (
        <UpdateStreamModal
          employer={employer}
          employee={employee}
          currentRate={ratePerSecondUSDC}
          streamType={streamType}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </>
  );
}

// Rate Card Component
function RateCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: any;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        " p-3 border transition-all duration-300",
        highlight
          ? "bg-primary/5 border-primary/30 hover:bg-primary/10"
          : "bg-muted/20 border-border hover:bg-muted/30",
      )}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className={cn("w-3 h-3", highlight ? "text-primary" : "text-muted-foreground")} />
        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{label}</p>
      </div>
      <p className={cn("font-mono font-bold text-base", highlight ? "text-primary" : "text-foreground")}>
        ${value.toFixed(2)}
      </p>
    </div>
  );
}
