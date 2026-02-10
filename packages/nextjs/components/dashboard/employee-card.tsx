"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import {
  useScaffoldReadContract,
  useScaffoldWriteContract,
} from "~~/hooks/scaffold-eth";

export const EmployeeCard = ({
  employer,
  employee,
}: {
  employer: string;
  employee: string;
}) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Read stream info
  const { data: streamInfo } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getStreamInfo",
    args: [employer, employee],
  });

  // Write functions
  const { writeContractAsync: pauseStream, isPending: isPausing } =
    useScaffoldWriteContract({
      contractName: "GainJar",
    });
  const { writeContractAsync: activateStream, isPending: isActivating } =
    useScaffoldWriteContract({
      contractName: "GainJar",
    });

  if (!streamInfo) return null;

  const [
    ratePerSecond,
    startTime,
    endTime,
    totalAmount,
    streamType,
    totalEarned,
    totalWithdrawn,
    withdrawableNow,
    isActive,
    isExpired,
  ] = streamInfo;

  const handlePause = async () => {
    try {
      await pauseStream({
        functionName: "pauseStream",
        args: [employee],
      });
    } catch (e) {
      console.error("Error pausing stream:", e);
    }
  };

  const handleActivate = async () => {
    try {
      await activateStream({
        functionName: "activateStream",
        args: [employee],
      });
    } catch (e) {
      console.error("Error activating stream:", e);
    }
  };

  // Calculate hourly rate for display
  const hourlyRate = Number(formatUnits(ratePerSecond * 3600n, 6));
  const earned = Number(formatUnits(totalEarned, 6));
  const withdrawn = Number(formatUnits(totalWithdrawn, 6));
  const available = Number(formatUnits(withdrawableNow, 6));

  return (
    <>
      <div className="bg-card border border-border rounded-lg p-6 hover:border-blue-500 transition-all">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <p>{employee}</p>
              {isActive ? (
                <span className="px-2 py-1 bg-green-500/10 text-green-500 text-xs font-mono rounded">
                  ACTIVE
                </span>
              ) : (
                <span className="px-2 py-1 bg-gray-500/10 text-gray-500 text-xs font-mono rounded">
                  PAUSED
                </span>
              )}
              {isExpired && (
                <span className="px-2 py-1 bg-red-500/10 text-red-500 text-xs font-mono rounded">
                  EXPIRED
                </span>
              )}
            </div>
            <div className="flex gap-2 text-xs font-mono text-muted-foreground">
              <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded">
                {streamType === 0 ? "INFINITE" : "FINITE"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1">
              Hourly Rate
            </p>
            <p className="text-lg font-bold font-mono text-blue-500">
              ${hourlyRate.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1">
              Available
            </p>
            <p className="text-lg font-bold font-mono text-green-500">
              ${available.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1">
              Total Earned
            </p>
            <p className="text-sm font-mono">${earned.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-1">
              Withdrawn
            </p>
            <p className="text-sm font-mono">${withdrawn.toFixed(2)}</p>
          </div>
        </div>

        {/* Progress Bar (for finite streams) */}
        {streamType === 1 && totalAmount > 0n && (
          <div className="mb-4">
            <div className="flex justify-between text-xs font-mono text-muted-foreground mb-1">
              <span>Progress</span>
              <span>
                {(
                  (Number(totalWithdrawn) /
                    Number(formatUnits(totalAmount, 6))) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.min((Number(totalWithdrawn) / Number(formatUnits(totalAmount, 6))) * 100, 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isActive ? (
            <button
              onClick={handlePause}
              disabled={isPausing || isExpired}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-mono"
            >
              {isPausing ? "Pausing..." : "Pause"}
            </button>
          ) : (
            <button
              onClick={handleActivate}
              disabled={isActivating || isExpired}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-mono"
            >
              {isActivating ? "Activating..." : "Activate"}
            </button>
          )}
          <button
            onClick={() => setShowUpgradeModal(true)}
            disabled={!isActive || isExpired || streamType === 1}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-mono"
          >
            Upgrade Rate
          </button>
        </div>

        {/* Info Footer */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-mono text-muted-foreground">
            Started: {new Date(Number(startTime) * 1000).toLocaleDateString()}
            {streamType === 1 && endTime > 0n && (
              <>
                {" "}
                • Ends: {new Date(Number(endTime) * 1000).toLocaleDateString()}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          employee={employee}
          currentRate={hourlyRate}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </>
  );
};

const UpgradeModal = ({
  employee,
  currentRate,
  onClose,
}: {
  employee: string;
  currentRate: number;
  onClose: () => void;
}) => {
  const [newRate, setNewRate] = useState(currentRate.toString());
  const { writeContractAsync: upgradeRate, isPending } =
    useScaffoldWriteContract("GainJar");

  const handleUpgrade = async () => {
    try {
      const newRateWei = BigInt(Math.floor(parseFloat(newRate) * 1e6));
      await upgradeRate({
        functionName: "updateInfiniteRate",
        args: [employee, newRateWei * 3600n, 3600n], // hourly rate
      });
      onClose();
    } catch (e) {
      console.error("Error upgrading rate:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border p-8 rounded-lg max-w-md w-full shadow-2xl">
        <h3 className="text-xl font-bold mb-4">Upgrade Hourly Rate</h3>
        <div className="mb-4">
          <p className="text-sm font-mono text-muted-foreground mb-2">
            Current Rate: ${currentRate.toFixed(2)}/hr
          </p>
          <input
            type="number"
            step="0.01"
            value={newRate}
            onChange={(e) => setNewRate(e.target.value)}
            placeholder="New hourly rate"
            className="w-full p-3 bg-background border border-border rounded font-mono focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-border hover:bg-accent transition-colors rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleUpgrade}
            disabled={isPending || !newRate || parseFloat(newRate) <= 0}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Upgrading..." : "Upgrade"}
          </button>
        </div>
      </div>
    </div>
  );
};
