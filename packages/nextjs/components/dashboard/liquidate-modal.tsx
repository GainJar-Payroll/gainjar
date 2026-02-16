"use client";

import { AlertTriangle, TrendingUp, Users } from "lucide-react";
import { TransactionAlert } from "~~/components/transaction-alert";
import { TransactionProgress } from "~~/components/transaction-progress";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~~/components/ui/card";
import { Dialog, DialogContent } from "~~/components/ui/dialog";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useTransactionFlow } from "~~/hooks/useTransactionFlow";

interface LiquidateModalProps {
  employer: string;
  estimatedReward: number;
  onClose: () => void;
}

export function LiquidateModal({ employer, estimatedReward, onClose }: LiquidateModalProps) {
  const { step, isLoading, handleTransaction } = useTransactionFlow({
    successMessage: "Liquidation Successful! 💰",
    onSuccess: () => setTimeout(() => onClose(), 2000),
  });

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "GainJar",
  });

  async function handleLiquidate() {
    await handleTransaction(async () => {
      await writeContractAsync({
        functionName: "liquidate",
        args: [employer as `0x${string}`],
      });
    });
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="font-heading flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Liquidate Employer
            </CardTitle>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Employer: {employer.slice(0, 6)}...{employer.slice(-4)}
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Warning */}
            <TransactionAlert
              type="warning"
              title="This action will pause all active streams for this employer"
              description="All employees will receive their earned amounts. This is irreversible."
            />

            {/* Preview */}
            <div className="border-2 border-foreground bg-background p-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4 font-medium">
                Liquidation Preview
              </div>

              <div className="space-y-4">
                {/* Reward */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Your Reward</span>
                  </div>
                  <span className="font-heading font-bold text-2xl text-green-600 dark:text-green-400">
                    ${estimatedReward.toFixed(2)}
                  </span>
                </div>

                {/* Impact */}
                <div className="border-t border-border pt-4">
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs font-bold mb-1">What Happens:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• All active streams will be paused</li>
                        <li>• Employees receive their earned amounts</li>
                        <li>• You receive liquidation reward</li>
                        <li>• Employer can deposit more to continue</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Progress */}
            {isLoading && (
              <TransactionProgress
                steps={[
                  {
                    label: step === "creating" ? "Liquidating..." : step === "success" ? "Liquidated ✓" : "Liquidate",
                    status: step === "creating" ? "loading" : step === "success" ? "success" : "idle",
                  },
                ]}
              />
            )}
          </CardContent>

          <CardFooter className="flex gap-2">
            <Button
              onClick={handleLiquidate}
              variant="destructive"
              className="flex-1 uppercase tracking-wider font-bold"
              disabled={isLoading}
            >
              {step === "idle" && "😈 Liquidate Boss"}
              {step === "creating" && "Liquidating..."}
              {step === "success" && "Success! 💰"}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isLoading} className="uppercase tracking-wider">
              Cancel
            </Button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
