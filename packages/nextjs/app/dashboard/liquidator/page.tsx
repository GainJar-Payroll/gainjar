"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Shield } from "lucide-react";
import { EmployerVaultCard } from "~~/components/dashboard/employer-vault-card";
import { Button } from "~~/components/ui/button";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { ZERO_ADDRESS } from "~~/utils/scaffold-eth/common";

const ITEMS_PER_PAGE = 12;

/**
 * Liquidator Dashboard - Simple view of all employers and their vault health
 */
export default function LiquidatorPage() {
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch all employers
  const {
    data: employerListData,
    isLoading: isLoadingList,
    refetch: refetchEmployers,
  } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getEmployerList",
    watch: false,
  });

  // Filter and validate employers
  const employers = useMemo(() => {
    if (!Array.isArray(employerListData)) return [];
    return employerListData.filter(
      (addr): addr is `0x${string}` => addr !== undefined && addr !== null && addr !== "0x",
    );
  }, [employerListData]);

  // Pagination
  const totalPages = Math.ceil(employers.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const currentPageEmployers = employers.slice(startIdx, endIdx);

  // Reset page when data changes
  useMemo(() => {
    setCurrentPage(1);
  }, [employers.length]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex gap-4 items-center">
                <h1 className="text-5xl sm:text-6xl font-heading font-bold text-foreground">Liquidator Dashboard</h1>
                {isLoadingList && <RefreshCw className="w-12 h-12 text-muted-foreground/50 animate-spin" />}
              </div>
              <p className="font-mono text-muted-foreground text-sm uppercase tracking-wider mt-2">
                Monitor vault health and identify liquidation opportunities
              </p>
            </div>

            {/* Refresh Button */}
            <Button
              onClick={() => refetchEmployers?.()}
              variant="default"
              size="xl"
              className="flex items-center gap-2"
              disabled={isLoadingList}
            >
              <RefreshCw className={`size-8 ${isLoadingList ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Empty State */}
        {employers.length === 0 && !isLoadingList && (
          <div className="border-2 border-dashed border-muted-foreground/30 p-16 text-center bg-muted/5">
            <div className="mb-6">
              <Shield className="mx-auto h-16 w-16 text-muted-foreground/50" />
            </div>
            <h3 className="font-heading font-bold text-2xl mb-3">No Employers Found</h3>
            <p className="text-sm text-muted-foreground font-mono max-w-md mx-auto leading-relaxed">
              No employers have created streams yet. Check back later to monitor vault health and liquidation
              opportunities.
            </p>
          </div>
        )}

        {/* Employer Cards Grid */}
        {employers.length > 0 && (
          <>
            {/* Pagination Info */}
            {totalPages > 1 && (
              <div className="text-xs font-mono text-muted-foreground text-right px-4">
                Showing {startIdx + 1}-{Math.min(endIdx, employers.length)} of {employers.length}
              </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {currentPageEmployers.map((employer, idx) => (
                <EmployerVaultCard key={employer} employer={employer} employee={ZERO_ADDRESS} index={startIdx + idx} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 px-4 py-6">
                <Button
                  onClick={() => setCurrentPage(1)}
                  variant={currentPage === 1 ? "default" : "ghost"}
                  size="sm"
                  disabled={currentPage === 1}
                >
                  {"<<"}
                </Button>

                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === 1}
                >
                  Prev
                </Button>

                <div className="mx-2 text-sm font-mono text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>

                <Button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  variant="ghost"
                  size="sm"
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>

                <Button
                  onClick={() => setCurrentPage(totalPages)}
                  variant={currentPage === totalPages ? "default" : "ghost"}
                  size="sm"
                  disabled={currentPage === totalPages}
                >
                  {">>"}
                </Button>
              </div>
            )}

            {/* Info Section */}
            <div className="border border-border bg-card p-6 font-mono">
              <h3 className="text-lg font-heading font-bold text-foreground mb-4">About Liquidation</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="font-mono text-muted-foreground font-bold uppercase tracking-wider">
                    When to Liquidate
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Vault reaches CRITICAL status (3-7 days remaining)</li>
                    <li>Vault reaches EMERGENCY status (&lt;3 days remaining)</li>
                    <li>Employer cannot maintain minimum coverage</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-mono text-muted-foreground font-bold uppercase tracking-wider">Your Reward</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Base rate: 5% of employee earnings</li>
                    <li>Emergency bonus: 2x multiplier for EMERGENCY status</li>
                    <li>Min: $1 USDC, Max: $50 USDC</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Loading State */}
        {isLoadingList && employers.length === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border bg-card p-6 animate-pulse">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-muted" />
                      <div className="space-y-2">
                        <div className="h-3 w-24 bg-muted rounded" />
                        <div className="h-4 w-32 bg-muted rounded" />
                      </div>
                    </div>
                    <div className="h-8 w-20 bg-muted rounded" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="space-y-2">
                        <div className="h-3 w-16 bg-muted rounded" />
                        <div className="h-6 w-20 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
