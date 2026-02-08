"use client";

import { useState } from "react";
import { Check, Eye, Info, Plus, ZapOff } from "lucide-react";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { DepositModal } from "~~/components/dashboard/deposit-modal";
import StreamsOverview from "~~/components/dashboard/streams-overview";
import VaultMetrics from "~~/components/dashboard/vault-metrics";
import VaultRecommendations from "~~/components/dashboard/vault-recommendations";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const page = () => {
  const { address } = useAccount();

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  // Ambil saldo USDC milik user
  const { data: userUsdcBalance } = useScaffoldReadContract({
    contractName: "MockERC20", // Pastikan nama kontrak USDC sudah ada di externalContracts atau deployedContracts
    functionName: "balanceOf",
    args: [address],
  });

  const formattedBalance = userUsdcBalance ? Number(formatUnits(userUsdcBalance, 6)).toLocaleString() : "0";
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-5xl sm:text-6xl font-heading font-bold text-foreground mb-2">Employer Dashboard</h1>
          <p className="font-mono text-muted-foreground text-sm">Manage your payroll streams and vault health</p>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Main Vault Metrics - Spans 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-4">
            <VaultMetrics />
            <VaultRecommendations />
          </div>

          {/* Right Column */}
          <div className="grid grid-rows-2 gap-4">
            {/* Quick Alerts */}
            <div className="bg-card border border-border p-6">
              <h3 className="text-lg font-heading font-bold text-card-foreground mb-4">Quick Alerts</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border-l-4 border-emerald-500 rounded-r">
                  <span className="text-xl flex-shrink-0">
                    <Check className="text-emerald-700" />
                  </span>
                  <div className="text-sm space-y-0.5">
                    <p className="font-mono font-semibold text-emerald-900 dark:text-emerald-200">Active Streams</p>
                    <p className="text-emerald-700 dark:text-emerald-300 text-xs font-mono">Running normally</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 rounded-r">
                  <span className="text-xl flex-shrink-0">
                    <Info className="text-blue-700" />
                  </span>
                  <div className="text-sm space-y-0.5">
                    <p className="font-mono font-semibold text-blue-900 dark:text-blue-200">Min Coverage</p>
                    <p className="text-blue-700 dark:text-blue-300 text-xs font-mono">7 days required</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Streams Overview */}
            <StreamsOverview limit={3} />
          </div>
        </div>

        {/* Action Cards - INI YANG PENTING! */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Deposit Card */}
          <button
            onClick={() => setIsDepositModalOpen(true)}
            className="border border-dashed border-border p-6 bg-card hover:bg-accent/20 transition-all duration-200 cursor-pointer group text-left"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30  flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <div>
                <h4 className="font-heading font-bold text-card-foreground">Deposit Funds</h4>
                <p className="text-xs font-mono text-muted-foreground mt-1">Add USDC to your vault</p>
              </div>
            </div>
          </button>

          {/* Create Stream Card */}
          <button className="border border-dashed border-border p-6 bg-card hover:bg-accent/20 transition-all duration-200 cursor-pointer group text-left">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30  flex items-center justify-center group-hover:scale-110 transition-transform">
                <ZapOff className="text-emerald-600 dark:text-emerald-400" size={24} />
              </div>
              <div>
                <h4 className="font-heading font-bold text-card-foreground">Create Stream</h4>
                <p className="text-xs font-mono text-muted-foreground mt-1">Start paying an employee</p>
              </div>
            </div>
          </button>

          {/* View Streams Card */}
          <button className="border border-dashed border-border p-6 bg-card hover:bg-accent/20 transition-all duration-200 cursor-pointer group text-left">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30  flex items-center justify-center group-hover:scale-110 transition-transform">
                <Eye className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <div>
                <h4 className="font-heading font-bold text-card-foreground">View Streams</h4>
                <p className="text-xs font-mono text-muted-foreground mt-1">Manage active streams</p>
              </div>
            </div>
          </button>
        </div>

        {/* How GainJar Works */}
        <div className="bg-card border border-border  p-6 mb-8">
          <h3 className="text-lg font-heading font-bold text-card-foreground mb-4">How GainJar Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-accent/20  border-l-4 border-primary space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  1
                </span>
                <h4 className="font-heading font-bold text-foreground">Deposit</h4>
              </div>
              <p className="text-sm font-mono text-muted-foreground leading-relaxed">
                Fund your vault with USDC to start streaming salaries
              </p>
            </div>

            <div className="p-4 bg-accent/20  border-l-4 border-primary space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  2
                </span>
                <h4 className="font-heading font-bold text-foreground">Create Stream</h4>
              </div>
              <p className="text-sm font-mono text-muted-foreground leading-relaxed">
                Set up infinite or finite payment streams for employees
              </p>
            </div>

            <div className="p-4 bg-accent/20  border-l-4 border-primary space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  3
                </span>
                <h4 className="font-heading font-bold text-foreground">Employees Earn</h4>
              </div>
              <p className="text-sm font-mono text-muted-foreground leading-relaxed">
                Your employees earn salary per second and withdraw anytime
              </p>
            </div>
          </div>
        </div>

        {/* Status Legend */}
        <div className="bg-card border border-border  p-4">
          <p className="text-xs font-mono text-muted-foreground mb-3 font-semibold">Vault Status Legend:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0"></span>
              <span className="font-mono text-foreground">HEALTHY (≥30d)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0"></span>
              <span className="font-mono text-foreground">WARNING (7-29d)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500 flex-shrink-0"></span>
              <span className="font-mono text-foreground">CRITICAL (3-6d)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0"></span>
              <span className="font-mono text-foreground">EMERGENCY (&lt;3d)</span>
            </div>
          </div>
        </div>
      </div>
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        formattedBalance={formattedBalance} // "100.00"
        rawBalance={userUsdcBalance!} // 100000000n (BigInt)
      />
    </div>
  );
};

export default page;
