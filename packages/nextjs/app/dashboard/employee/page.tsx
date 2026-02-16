"use client";

import { Briefcase, Users } from "lucide-react";
import { useAccount } from "wagmi";
import { EmployeeStreamCard } from "~~/components/dashboard/employee-stream-card";
import { EmployerVaultCard } from "~~/components/dashboard/employer-vault-card";
import { useEmployersWithStreams } from "~~/hooks/useEmployersWithStreams";

export default function EmployeePage() {
  const { address } = useAccount();

  const { employers, isLoading } = useEmployersWithStreams(address);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="py-4 bg-muted/10 mb-6">
            <h1 className="text-5xl sm:text-6xl font-heading font-bold text-foreground mb-2">Employee Dashboard</h1>
            <p className="font-mono text-muted-foreground text-sm uppercase tracking-wider">Loading your streams...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="py-4 bg-muted/10">
          <h1 className="text-5xl sm:text-6xl font-heading font-bold text-foreground mb-2">Employee Dashboard</h1>
          <p className="font-mono text-muted-foreground text-sm uppercase tracking-wider">
            Track your salary streams and earnings
          </p>
        </div>

        {/* Empty State */}
        {employers.length === 0 && (
          <div className="border-2 border-dashed border-muted-foreground/30 p-16 text-center bg-muted/5">
            <div className="mb-6">
              <svg
                className="mx-auto h-16 w-16 text-muted-foreground/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="font-heading font-bold text-2xl mb-3">No Active Streams</h3>
            <p className="text-sm text-muted-foreground font-mono max-w-md mx-auto leading-relaxed">
              You don't have any salary streams yet. Ask your employer to create a stream for you on GainJar!
            </p>
          </div>
        )}

        {/* Streams by Employer */}
        {employers.length > 0 && (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border bg-card border-border p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                    <Briefcase className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      Total Employers
                    </p>
                    <p className="font-heading font-bold text-3xl text-foreground">{employers.length}</p>
                  </div>
                </div>
              </div>

              <div className="border border-border bg-card p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center border-2 border-green-500/20">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      Active Streams
                    </p>
                    <p className="font-heading font-bold text-3xl text-green-600 dark:text-green-400">
                      {employers.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* List of Employers and Streams */}
            {employers.map((employer, index) => (
              <div key={employer} className="space-y-4">
                {/* Section Header */}
                <div className="border-l-4 border-primary pl-4 py-2 bg-muted/10">
                  <h2 className="text-xl font-heading font-bold text-foreground uppercase tracking-wider">
                    Employer #{index + 1}
                  </h2>
                </div>

                {/* Employer Vault Card */}
                <EmployerVaultCard employer={employer} employee={address as `0x${string}`} />

                {/* Employee Stream Card */}
                <EmployeeStreamCard employer={employer} employee={address as `0x${string}`} mode="employee" />
              </div>
            ))}
          </div>
        )}

        {/* How It Works */}
        <div className="border border-border bg-card p-6">
          <h3 className="text-lg font-heading font-bold text-foreground mb-3">How Salary Streams Work</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoCard
              number={1}
              title="Earn Per Second"
              description="Your salary is streaming to you every second, not waiting for payday"
            />
            <InfoCard
              number={2}
              title="Withdraw Anytime"
              description="Access your earned salary whenever you need it, no questions asked"
            />
            <InfoCard
              number={3}
              title="Protected by Contract"
              description="Your earnings are secured on-chain and can't be taken back by employer"
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="border border-border bg-card p-6">
          <div className="border-l-4 border-primary pl-4 py-2 bg-accent/20 mb-3">
            <h3 className="text-sm font-heading font-bold text-foreground">💡 About Liquidation</h3>
          </div>
          <p className="text-xs font-mono text-muted-foreground leading-relaxed">
            If your employer's vault runs critically low, you can liquidate to protect all employees. This pauses all
            streams and distributes earned amounts. You'll earn a reward for helping maintain the system's safety.
          </p>
        </div>
      </div>
    </div>
  );
}

// Helper Component
function InfoCard({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="p-4 bg-accent/20  border-l-4 border-primary space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
          {number}
        </span>
        <h4 className="font-heading font-bold text-foreground">{title}</h4>
      </div>
      <p className="text-sm font-mono text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
