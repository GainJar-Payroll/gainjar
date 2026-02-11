import { CreateStreamModal } from "~~/components/dashboard/create-stream-modal";
import { DepositModal } from "~~/components/dashboard/deposit-modal";
import StreamsOverview from "~~/components/dashboard/streams-overview";
import VaultMetrics from "~~/components/dashboard/vault-metrics";
import VaultRecommendations from "~~/components/dashboard/vault-recommendations";

const page = () => {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div className="mb-8">
            <h1 className="text-5xl sm:text-6xl font-heading font-bold text-foreground mb-2">Employer Dashboard</h1>
            <p className="font-mono text-muted-foreground text-sm">Manage your payroll streams and vault health</p>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Main Vault Metrics - Spans 2 columns on large screens */}
          <div className="lg:col-span-2 space-y-4">
            <VaultMetrics />
            <VaultRecommendations />
          </div>

          {/* Right Column */}
          <div className="grid gap-4">
            {/* Actions */}
            <div className="bg-card border border-border p-6">
              <h3 className="text-lg font-heading font-bold text-card-foreground mb-4">Actions</h3>
              <div className="flex flex-col gap-2">
                <DepositModal />
                <CreateStreamModal />
              </div>
            </div>

            {/* Streams Overview */}
            <StreamsOverview limit={2} />
          </div>
        </div>

        <div className="bg-card border border-border p-6 mb-8">Hello</div>

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
    </div>
  );
};

export default page;
