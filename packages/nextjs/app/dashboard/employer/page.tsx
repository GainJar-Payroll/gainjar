import { CreateStreamModal } from "~~/components/dashboard/create-stream-modal";
import { DepositModal } from "~~/components/dashboard/deposit-modal";
import InfoCard from "~~/components/dashboard/info-card";
import { StreamsList } from "~~/components/dashboard/streams-list";
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

        <StreamsList />

        {/* How GainJar Works */}
        <div className="bg-card border border-border p-6 mb-8">
          <h3 className="text-lg font-heading font-bold text-card-foreground mb-4">How GainJar Works</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <InfoCard number={1} title="Deposit" description="Fund your vault with USDC to start streaming salaries" />
            <InfoCard
              number={2}
              title="Create Stream"
              description="Set up infinite or finite payment streams for employees"
            />
            <InfoCard
              number={3}
              title="Employees Earn"
              description="Your employees earn salary per second and withdraw anytime"
            />
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
