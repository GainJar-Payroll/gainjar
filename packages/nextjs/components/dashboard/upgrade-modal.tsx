"use client";

import { useState } from "react";
import { parseUnits } from "viem";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { Badge } from "~~/components/ui/badge";
import { Button } from "~~/components/ui/button";
import { Input } from "~~/components/ui/input";
import { cn } from "~~/lib/utils";

export const UpgradeModal = ({
  employee,
  currentRate,
  streamType,
  onClose,
}: {
  employee: string;
  currentRate: number;
  streamType: number;
  onClose: () => void;
}) => {
  // Common states
  const { writeContractAsync: writeContract, isPending } = useScaffoldWriteContract("GainJar");

  // Infinite Stream states (streamType === 0)
  const [newRateAmount, setNewRateAmount] = useState(currentRate.toString());
  const [newRatePeriod, setNewRatePeriod] = useState("30"); // Default 30 days

  // Finite Stream states (streamType === 1)
  const [newFeeBasisPoints, setNewFeeBasisPoints] = useState("0");

  const handleUpgrade = async () => {
    try {
      if (Number(streamType) === 0) {
        // updateInfiniteRate(address _employee, uint256 _newRateAmount, uint256 _newRatePeriod)
        await writeContract({
          functionName: "updateInfiniteRate",
          args: [
            employee as `0x${string}`,
            parseUnits(newRateAmount, 6),
            BigInt(newRatePeriod) * 86400n // Convert days to seconds
          ],
        });
      } else {
        // updateFee(uint256 _newFeeBasisPoints)
        await writeContract({
          functionName: "updateFee",
          args: [BigInt(newFeeBasisPoints)],
        });
      }
      onClose();
    } catch (e) {
      console.error("Error upgrading:", e);
    }
  };

  const isInfinite = Number(streamType) === 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-white border border-gray-100 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {isInfinite ? "Update Infinite Rate" : "Update Platform Fee"}
            </h3>
            <Badge variant="secondary" className={cn(
              "rounded-full px-4 py-1.5 uppercase text-[10px] font-black tracking-widest border-0!",
              isInfinite ? "bg-purple-50 text-purple-600" : "bg-orange-50 text-orange-600"
            )}>
              {isInfinite ? "Infinite" : "Finite"}
            </Badge>
          </div>

          {isInfinite && (
            <div className="bg-gray-50 rounded-2xl p-5 mb-8 border border-gray-100 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-black">
                @
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-0.5">
                  Target Employee
                </p>
                <p className="text-sm font-mono text-gray-700 truncate font-bold">{employee}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {isInfinite ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">Current Rate</p>
                    <p className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                      ${currentRate.toFixed(2)}
                      <span className="text-[10px] font-black text-gray-300 ml-1">/HR</span>
                    </p>
                  </div>
                  <div className="bg-blue-50/30 p-5 rounded-2xl border border-blue-100">
                    <p className="text-[10px] text-blue-500 uppercase font-black tracking-widest mb-2">New Rate</p>
                    <p className="text-2xl font-black text-blue-600 tracking-tight font-mono">
                      ${newRateAmount || "0"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Rate Amount (USDC)
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={newRateAmount}
                        onChange={(e) => setNewRateAmount(e.target.value)}
                        className="h-14 pl-10 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-blue-500! focus:bg-white transition-all text-lg font-mono font-bold"
                        placeholder="0.00"
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 font-mono text-lg">$</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                      Rate Period (Days)
                    </label>
                    <Input
                      type="number"
                      value={newRatePeriod}
                      onChange={(e) => setNewRatePeriod(e.target.value)}
                      className="h-14 rounded-xl bg-gray-50 border-2 border-gray-100 focus:border-blue-500! focus:bg-white transition-all text-lg font-mono font-bold"
                      placeholder="30"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 ml-1 lowercase">
                      1 = 24 hours, 30 = 1 month
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-orange-50/30 p-5 rounded-2xl border border-orange-100 mb-4">
                  <p className="text-[10px] text-orange-500 uppercase font-black tracking-widest mb-2">Platform Context</p>
                  <p className="text-sm text-gray-600 font-medium leading-tight">
                    This will update the platform fee basis points for finite streams. 
                    <span className="block mt-1 font-bold">100 BPS = 1%</span>
                  </p>
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                    New Fee (Basis Points)
                  </label>
                  <Input
                    type="number"
                    value={newFeeBasisPoints}
                    onChange={(e) => setNewFeeBasisPoints(e.target.value)}
                    className="h-16 rounded-2xl bg-gray-50 border-2 border-gray-100 focus:border-blue-500! focus:bg-white transition-all text-xl font-mono font-bold"
                    placeholder="0"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-gray-50 flex gap-4 border-t border-gray-100">
          <Button
            onClick={onClose}
            variant="ghost"
            className="flex-1 h-14 text-gray-400 font-black hover:text-gray-600 hover:bg-gray-100 transition-all rounded-xl uppercase tracking-widest text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpgrade}
            disabled={isPending}
            className="flex-[2] h-14 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-xl shadow-blue-500/30 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none transition-all uppercase tracking-widest text-xs"
          >
            {isPending ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              "Confirm Update"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
