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

      {showDetailModal && (
        <DetailModal
          employer={employer}
          employee={employee}
          startTime={startTime}
          endTime={endTime}
          streamType={streamType}
          totalAmount={totalAmount}
          streamInfo={streamInfo}
          onClose={() => setShowDetailModal(false)}
          onUpgrade={() => {
            setShowDetailModal(false);
            setShowUpgradeModal(true);
          }}
        />
      )}

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
  streamType,
  startTime,
  endTime,
  onUpgrade,
}: any) => {
  const [activeTab, setActiveTab] = useState("info");
  // Ambil data safe withdrawable
  const { data: safeData } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getSafeWithdrawableAmount",
    args: [employer, employee],
  });


  const { writeContractAsync: withdraw } = useScaffoldWriteContract({
    contractName: "GainJar",
  });

  const handleWithdraw = async () => {
    await withdraw({ functionName: "withdraw", args: [employer] });
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
            Info
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-widest transition-all ${activeTab === "security" ? "bg-white text-green-600 border-b-2 border-green-600" : "text-gray-400 hover:bg-gray-100"}`}
          >
            Withdraw
          </button>
        </div>

        <div className="p-8">
          {activeTab === "info" ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Stat
                  label="Rate Per Second"
                  value={`$${Number(formatUnits(streamInfo[0], 6)).toFixed(6)}`}
                />
                 <Stat
                  label="Rate Per Day"
                  value={`$${Number(formatUnits(streamInfo[0] * BigInt(24 * 60 * 60), 6)).toFixed(2)}`}
                />
                <Stat
                  label="Rate Per Month"
                  value={`$${Number(formatUnits(streamInfo[0] * BigInt(30 * 24 * 60 * 60), 6)).toFixed(2)}`}
                />
                 {streamType !== 0 && 
                 <Stat
                  label="Total salary"
                  value={`$${Number(formatUnits(streamInfo[0] * BigInt(24 * 60 * 60), 6)).toFixed(2)}`}
                />
                }

                <Stat
                  label="Total Earned"
                  value={`$${Number(formatUnits(streamInfo[5], 6)).toFixed(2)}`}
                />
                <Stat
                  label="Withdrawn"
                  value={`$${Number(formatUnits(streamInfo[6], 6)).toFixed(2)}`}
                />
               
              </div>
              <div className="bg-gray-50 p-4 rounded-xl font-mono text-xs space-y-2 border border-gray-100">
                <p className="text-gray-600">
                  <span className="text-gray-400 font-bold uppercase text-[10px] mr-2">Start:</span>
                  {new Date(Number(streamInfo[1]) * 1000).toLocaleString()}
                </p>
                {streamInfo[4] === 1 && (
                  <p className="text-gray-600">
                    <span className="text-gray-400 font-bold uppercase text-[10px] mr-2">End:</span>
                    {new Date(Number(streamInfo[2]) * 1000).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6 text-center">
              <div className="p-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2">
                  Safe to Withdraw Now
                </p>
                <p className="text-4xl font-black text-green-600 font-mono">
                  $
                  {safeData
                    ? Number(formatUnits(safeData[1], 6)).toFixed(2)
                    : "0.00"}
                </p>
                {safeData?.[2] && (
                  <div className="mt-2 flex justify-center">
                    <Badge variant="default" className="bg-green-50 text-green-700 hover:bg-green-50! border-green-100! rounded-full uppercase text-[10px] font-black tracking-widest ring-0!">
                      Fully Secured
                    </Badge>
                  </div>
                )}
              </div>
              <Button
                onClick={handleWithdraw}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-7 rounded-2xl shadow-xl shadow-blue-500/30 transition-all text-lg h-auto"
              >
                Withdraw
              </Button>
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 flex gap-3 border-t border-gray-100">
          <Button 
            onClick={onUpgrade} 
            variant="outline"
            className="flex-1 py-6 bg-white border-2 border-gray-200 hover:bg-white hover:border-gray-400 text-gray-700 font-bold rounded-2xl transition-all shadow-none"
          >
            {Number(streamType) === 0 ? "Update Rate": "Update Fee"}
          </Button>
          <Button 
            onClick={onClose} 
            variant="ghost" 
            className="px-8 py-6 text-gray-400 hover:text-gray-600 font-bold transition-all rounded-2xl hover:bg-gray-100"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
