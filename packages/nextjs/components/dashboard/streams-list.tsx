"use client";

import { useMemo, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { EmployeeStreamCard } from "./employee-stream-card";
import { useAccount } from "wagmi";
import { Button } from "~~/components/ui/button";
import { Input } from "~~/components/ui/input";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { cn } from "~~/lib/utils";

type FilterType = "all" | "active" | "paused" | "expired";

interface StreamsListProps {
  limit?: number;
  showFilters?: boolean;
}

export function StreamsList({ limit, showFilters = true }: StreamsListProps) {
  const { address } = useAccount();
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  // Fetch active employees
  const { data: allEmployees, isLoading } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getAllEmployees",
    args: [address],
    watch: true,
  });

  // Filter and search logic
  const filteredEmployees = useMemo(() => {
    if (!allEmployees) return [];

    let result = [...(allEmployees as string[])];

    // Search filter
    if (search) {
      result = result.filter(emp => emp.toLowerCase().includes(search.toLowerCase()));
    }

    // Apply limit if specified
    if (limit) {
      result = result.slice(0, limit);
    }

    return result;
  }, [allEmployees, filter, search, limit]);

  // Loading state
  if (isLoading) {
    return (
      <div className="mb-8 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="border p-6 bg-card">
            <Skeleton className="h-4 bg-muted rounded w-1/3 mb-4 animate-pulse" />
            <Skeleton className="h-8 bg-muted rounded w-1/2 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!allEmployees || (allEmployees as string[]).length === 0) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/30 p-12 mb-8 text-center bg-muted/5">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h3 className="font-heading font-bold text-lg mb-2">No Active Streams</h3>
        <p className="text-sm text-muted-foreground font-mono mb-4">Create your first salary stream to get started</p>
      </div>
    );
  }

  return (
    <div className="mb-8 flex flex-col gap-4">
      {/* Filters & Search */}
      {showFilters && (
        <div className="bg-card border border-border p-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="font-bold block font-heading text-lg">Search Employee by Address</label>
              <Input
                type="text"
                placeholder="0x..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            {/* Filter Buttons */}
            {/* <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2 block">
                Filter by Status
              </label>
              <div className="flex flex-wrap gap-2">
                <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>
                  All ({(allEmployees as string[]).length})
                </FilterButton>
                <FilterButton active={filter === "active"} onClick={() => setFilter("active")}>
                  Active
                </FilterButton>
                <FilterButton active={filter === "paused"} onClick={() => setFilter("paused")}>
                  Paused
                </FilterButton>
                <FilterButton active={filter === "expired"} onClick={() => setFilter("expired")}>
                  Expired
                </FilterButton>
              </div>
            </div> */}

            {search && (
              <div className="text-xs font-mono text-muted-foreground">
                Found {filteredEmployees.length} result{filteredEmployees.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stream Cards */}
      {filteredEmployees.length === 0 ? (
        <div className="border-2 border-dashed border-muted-foreground/30 p-8 text-center bg-muted/5">
          <p className="text-sm text-muted-foreground font-mono">No employees found matching your search</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 justify-center items-center">
          {filteredEmployees.map(employee => (
            <EmployeeStreamCard key={employee} employer={address as string} employee={employee} />
          ))}
        </div>
      )}

      {/* Show More (if limited) */}
      {limit && (allEmployees as string[]).length > limit && (
        <div className="text-center pt-4">
          <Button variant="outline" className="uppercase tracking-wider text-xs font-bold">
            View All {(allEmployees as string[]).length} Streams
          </Button>
        </div>
      )}
    </div>
  );
}

// Filter Button Component
function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={cn(
        "uppercase tracking-wider text-[10px] font-bold hover:bg-primary hover:text-primary-foreground",
        active && "border-foreground",
        !active && "border-transparent",
      )}
    >
      {children}
    </Button>
  );
}
