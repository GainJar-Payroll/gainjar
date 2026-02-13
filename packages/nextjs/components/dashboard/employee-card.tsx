"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import {
  useScaffoldReadContract,
  useScaffoldWriteContract,
} from "~~/hooks/scaffold-eth";
import { UpgradeModal } from "~~/components/dashboard/upgrade-modal"
import { Button } from '~~/components/ui/button'
import { Badge } from "~~/components/ui/badge";
import { UpgradeModal } from "~~/components/dashboard/upgrade-modal"
import { Button } from '~~/components/ui/button'
import { Badge } from "~~/components/ui/badge";

export const EmployeeCard = ({
  employer,
  employee,
}: {
  employer: string;
  employee: string;
}) => {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: streamInfo } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getStreamInfo",
    args: [employer, employee],
  });
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

  const hourlyRate = Number(formatUnits(ratePerSecond * 3600n, 6));
  const available = Number(formatUnits(withdrawableNow, 6));

  return (
    <>
      <div
        onClick={() => setShowDetailModal(true)}
        className="group bg-card border border-border rounded-xl p-6 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer relative overflow-hidden"
      >
        {/* Dekorasi Background */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-10 -mt-10 group-hover:bg-blue-500/10 transition-colors" />

        <div className="flex justify-between items-start mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <p className="truncate font-bold text-lg text-foreground font-mono">
                {employee}
              </p>
              <StatusBadge active={isActive} expired={isExpired} />
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${streamType === 0 ? "bg-purple-500/10 text-purple-400" : "bg-orange-500/10 text-orange-400"}`}
            >
              {streamType === 0 ? "∞ Infinite" : "⌛ Finite"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Stat
            label="Hourly Rate"
            value={`$${hourlyRate.toFixed(2)}`}
            color="text-blue-400"
          />
          <Stat
            label="Available"
            value={`$${available.toFixed(2)}`}
            color="text-green-400"
          />
        </div>

        {/* Action area hint */}
        <div className="mt-4 pt-4 border-t border-border/50 flex justify-between items-center">
          <p className="text-[10px] text-muted-foreground font-mono">
            Click for details & actions
          </p>
          <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          employee={employee}
          currentRate={hourlyRate}
          streamType={streamType}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </>
  );
};

// --- Sub-Components ---

const Stat = ({ label, value, color }: any) => (
  <div>
    <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">
      {label}
    </p>
    <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
  </div>
);

const StatusBadge = ({ active, expired }: any) => {
  if (expired)
    return (
      <span className="badge badge-error text-[10px] py-0 px-2">EXPIRED</span>
    );
  if (active)
    return (
      <span className="badge badge-success text-[10px] py-0 px-2">ACTIVE</span>
    );
  return (
    <span className="badge badge-ghost text-[10px] py-0 px-2">PAUSED</span>
  );
};



const DetailModal = ({
  employer,
  employee,
  streamInfo,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white border border-gray-100 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
        {/* Tab Header */}
        <div className="flex border-b border-gray-100 bg-gray-50">
          <button
            onClick={() => setActiveTab("info")}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all ${activeTab === "info" ? "bg-white text-blue-600 border-b-2 border-blue-600" : "text-gray-400 hover:bg-gray-100"}`}
          >
            Cancel
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all ${activeTab === "security" ? "bg-white text-green-600 border-b-2 border-green-600" : "text-gray-400 hover:bg-gray-100"}`}
          >
            {isPending ? "Upgrading..." : "Upgrade"}
          </button>
        </div>
      </div>
    </div>
  );
};
