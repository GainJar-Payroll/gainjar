"use client";

import { AlertCircle, Check } from "lucide-react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

interface StreamOverviewProps {
  limit?: number;
}

export default function StreamsOverview({ limit = 5 }: StreamOverviewProps) {
  const { address } = useAccount();

  const { data: activeEmployees, isLoading: loadingActive } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getActiveEmployees",
    args: [address],
  });

  const { data: allEmployees, isLoading: loadingAll } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getAllEmployees",
    args: [address],
  });

  const isLoading = loadingActive || loadingAll;

  if (isLoading) {
    return (
      <div className="bg-card border border-border  p-6 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const activeCount = Array.isArray(activeEmployees) ? activeEmployees.length : 0;
  const allCount = Array.isArray(allEmployees) ? allEmployees.length : 0;
  const pausedCount = allCount - activeCount;

  return (
    <div className="bg-card border border-border  p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-heading font-bold text-card-foreground">Streams Overview</h3>
        <div className="text-xs font-mono text-muted-foreground">
          {activeCount} active • {pausedCount} paused
        </div>
      </div>

      {allCount === 0 ? (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 rounded-r">
          <p className="text-sm font-mono text-blue-900 dark:text-blue-200">
            No payment streams yet. Create your first stream to start paying employees!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3 pb-4 border-b border-border">
            <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg">
              <p className="text-xs font-mono text-muted-foreground mb-1">Active</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</p>
            </div>
            <div className="text-center p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg">
              <p className="text-xs font-mono text-muted-foreground mb-1">Paused</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pausedCount}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-lg">
              <p className="text-xs font-mono text-muted-foreground mb-1">Total</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{allCount}</p>
            </div>
          </div>

          {/* Active Streams */}
          {activeCount > 0 && (
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-2">Recent Streams:</p>
              <div className="space-y-2">
                {Array.isArray(activeEmployees) &&
                  activeEmployees.slice(0, limit).map((employee, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border-l-4 border-emerald-500 rounded-r flex items-center justify-between transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                        <span className="font-mono text-sm text-foreground truncate">
                          {typeof employee === "string"
                            ? employee.slice(0, 6) + "..." + employee.slice(-4)
                            : "Employee"}
                        </span>
                      </div>
                      <span className="text-xs font-mono bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-1 rounded flex-shrink-0">
                        Active
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Paused Streams */}
          {pausedCount > 0 && (
            <div>
              <p className="text-xs font-mono text-muted-foreground mb-2">Paused Streams:</p>
              <div className="space-y-2">
                {Array.isArray(allEmployees) &&
                  allEmployees
                    .slice(-pausedCount)
                    .slice(0, limit)
                    .map((employee, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border-l-4 border-amber-500 rounded-r flex items-center justify-between transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/30"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                          <span className="font-mono text-sm text-foreground truncate">
                            {typeof employee === "string"
                              ? employee.slice(0, 6) + "..." + employee.slice(-4)
                              : "Employee"}
                          </span>
                        </div>
                        <span className="text-xs font-mono bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-1 rounded flex-shrink-0">
                          Paused
                        </span>
                      </div>
                    ))}
              </div>
            </div>
          )}

          {allCount > limit && (
            <div className="pt-4 border-t border-border">
              <p className="text-xs font-mono text-muted-foreground text-center">+{allCount - limit} more streams</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
