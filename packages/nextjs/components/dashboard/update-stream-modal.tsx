"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { formatUnits, parseUnits } from "viem";
import * as z from "zod";
import { AmountInput } from "~~/components/amount-input";
import { PreviewBox } from "~~/components/preview-box";
import { TransactionAlert } from "~~/components/transaction-alert";
import { TransactionProgress } from "~~/components/transaction-progress";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~~/components/ui/card";
import { Dialog, DialogContent } from "~~/components/ui/dialog";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useTransactionFlow } from "~~/hooks/useTransactionFlow";

const infiniteSchema = z.object({
  newMonthlyRate: z.number().positive("Rate must be positive"),
});

const finiteSchema = z.object({
  additionalAmount: z.number().positive("Amount must be positive"),
  additionalDays: z.number().positive("Days must be positive"),
});

type InfiniteFormData = z.infer<typeof infiniteSchema>;
type FiniteFormData = z.infer<typeof finiteSchema>;

interface UpdateStreamModalProps {
  employer: string;
  employee: string;
  currentRate: number; // USDC per second
  streamType: number; // 0 = infinite, 1 = finite
  onClose: () => void;
}

export function UpdateStreamModal({ employee, currentRate, streamType, onClose }: UpdateStreamModalProps) {
  const isInfinite = streamType === 0;

  const { step, isLoading, handleTransaction, reset } = useTransactionFlow({
    successMessage: isInfinite ? "Rate Updated!" : "Stream Extended!",
    onSuccess: () => setTimeout(() => onClose(), 2000),
  });

  const infiniteForm = useForm<InfiniteFormData>({
    resolver: zodResolver(infiniteSchema),
    defaultValues: {
      newMonthlyRate: (currentRate * 2592000).toFixed(2) as any,
    },
  });

  const finiteForm = useForm<FiniteFormData>({
    resolver: zodResolver(finiteSchema),
    defaultValues: {
      additionalAmount: 0,
      additionalDays: 30,
    },
  });

  const { writeContractAsync } = useScaffoldWriteContract({
    contractName: "GainJar",
  });

  const watchNewMonthlyRate = infiniteForm.watch("newMonthlyRate");
  const watchAdditionalAmount = finiteForm.watch("additionalAmount");
  const watchAdditionalDays = finiteForm.watch("additionalDays");

  // ========================================
  // ✅ FIX: Calculate actual rates with precision loss detection
  // ========================================
  const infinitePreview = React.useMemo(() => {
    if (!watchNewMonthlyRate || Number(watchNewMonthlyRate) === 0) return null;

    const newMonthlyInput = Number(watchNewMonthlyRate);
    const newMonthlyRaw = parseUnits(newMonthlyInput.toString(), 6);
    const monthSeconds = BigInt(30 * 24 * 60 * 60);

    // Calculate actual rate per second (what contract will store)
    const newRatePerSecond = newMonthlyRaw / monthSeconds;

    // Calculate actual amounts based on truncated rate
    const actualMonthlyAmount = newRatePerSecond * monthSeconds;
    const actualMonthly = Number(formatUnits(actualMonthlyAmount, 6));

    const actualDailyAmount = newRatePerSecond * BigInt(24 * 60 * 60);
    const actualDaily = Number(formatUnits(actualDailyAmount, 6));

    const actualHourlyAmount = newRatePerSecond * BigInt(60 * 60);
    const actualHourly = Number(formatUnits(actualHourlyAmount, 6));

    const newPerSecond = Number(formatUnits(newRatePerSecond, 6));

    // Calculate precision loss
    const precisionLoss = newMonthlyInput - actualMonthly;
    const precisionLossPercent = (precisionLoss / newMonthlyInput) * 100;

    const oldMonthly = currentRate * 2592000;
    const oldDaily = currentRate * 86400;

    return {
      // Old values
      oldMonthly: oldMonthly.toFixed(6),
      oldDaily: oldDaily.toFixed(6),

      // Input (what user typed)
      inputMonthly: newMonthlyInput.toFixed(6),

      // Actual (what contract will pay)
      actualMonthly: actualMonthly.toFixed(6),
      actualDaily: actualDaily.toFixed(6),
      actualHourly: actualHourly.toFixed(6),
      actualPerSecond: newPerSecond.toFixed(6),

      // Precision loss
      precisionLoss: Math.abs(precisionLoss).toFixed(6),
      precisionLossPercent: Math.abs(precisionLossPercent).toFixed(2),
      hasPrecisionLoss: Math.abs(precisionLossPercent) > 0.01,
      isCriticalLoss: Math.abs(precisionLossPercent) > 1,

      // Change from old rate
      change: (((actualMonthly - oldMonthly) / oldMonthly) * 100).toFixed(1),
    };
  }, [watchNewMonthlyRate, currentRate]);

  // Preview for finite stream extension
  const finitePreview = React.useMemo(() => {
    if (!watchAdditionalAmount || Number(watchAdditionalAmount) === 0) return null;

    const additional = Number(watchAdditionalAmount);
    const days = Number(watchAdditionalDays) || 1;

    const additionalRaw = parseUnits(additional.toString(), 6);
    const durationSeconds = BigInt(days * 24 * 60 * 60);

    // Calculate actual rate
    const ratePerSecond = additionalRaw / durationSeconds;
    const actualTotalAmount = ratePerSecond * durationSeconds;
    const actualTotal = Number(formatUnits(actualTotalAmount, 6));

    // Calculate rates
    const dailyRate = actualTotal / days;
    const hourlyRate = dailyRate / 24;

    // Final payout
    const finalPayoutAmount = additionalRaw - actualTotalAmount;
    const finalPayout = Number(formatUnits(finalPayoutAmount, 6));

    // Precision loss
    const precisionLoss = additional - actualTotal;
    const precisionLossPercent = (precisionLoss / additional) * 100;

    return {
      inputTotal: additional.toFixed(6),
      actualTotal: actualTotal.toFixed(6),
      days: days,
      dailyRate: dailyRate.toFixed(6),
      hourlyRate: hourlyRate.toFixed(6),

      finalPayout: finalPayout,
      hasFinalPayout: finalPayout > 0.000001,

      precisionLoss: Math.abs(precisionLoss).toFixed(6),
      precisionLossPercent: Math.abs(precisionLossPercent).toFixed(2),
      hasPrecisionLoss: Math.abs(precisionLossPercent) > 0.01,
      isCriticalLoss: Math.abs(precisionLossPercent) > 1,
    };
  }, [watchAdditionalAmount, watchAdditionalDays]);

  async function handleInfiniteSubmit(data: InfiniteFormData) {
    const newRateAmount = parseUnits(data.newMonthlyRate.toString(), 6);
    const period = 30 * 24 * 60 * 60;

    await handleTransaction(async () => {
      await writeContractAsync({
        functionName: "updateInfiniteRate",
        args: [employee as `0x${string}`, newRateAmount, BigInt(period)],
      });
    });
  }

  async function handleFiniteSubmit(data: FiniteFormData) {
    const additionalAmount = parseUnits(data.additionalAmount.toString(), 6);
    const additionalSeconds = BigInt(data.additionalDays * 24 * 60 * 60);

    await handleTransaction(async () => {
      await writeContractAsync({
        functionName: "extendFiniteStream",
        args: [employee as `0x${string}`, additionalAmount, additionalSeconds],
      });
    });
  }

  React.useEffect(() => {
    if (!open) {
      reset();
      infiniteForm.reset();
      finiteForm.reset();
    }
  }, [open, infiniteForm, finiteForm, reset]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="font-heading">{isInfinite ? "Update Stream Rate" : "Extend Finite Stream"}</CardTitle>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              Employee: {employee.slice(0, 6)}...{employee.slice(-4)}
            </p>
          </CardHeader>

          <CardContent>
            {isInfinite ? (
              <form id="form-update" onSubmit={infiniteForm.handleSubmit(handleInfiniteSubmit)} className="space-y-6">
                <Controller
                  name="newMonthlyRate"
                  control={infiniteForm.control}
                  render={({ field, fieldState }) => (
                    <AmountInput
                      label="New Monthly Rate (USDC)"
                      value={field?.value === 0 ? "" : (field?.value ?? 0)}
                      onChange={e => field.onChange(e)}
                      error={fieldState.error}
                      disabled={isLoading}
                      helperText="Set new monthly salary amount"
                    />
                  )}
                />

                {infinitePreview && (
                  <PreviewBox
                    title="Actual Rate Change Preview"
                    items={[
                      { label: "Old Monthly", value: `$${infinitePreview.oldMonthly}` },
                      { label: "Old Daily", value: `$${infinitePreview.oldDaily}` },
                      {
                        label: "New Monthly (Actual)",
                        value: `$${infinitePreview.actualMonthly}`,
                      },
                      { label: "New Daily", value: `$${infinitePreview.actualDaily}` },
                      { label: "New Per Second", value: `$${infinitePreview.actualPerSecond}` },
                    ]}
                    footer={
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase tracking-wider font-bold">Change</span>
                        <span
                          className={`font-mono font-bold text-lg ${
                            Number(infinitePreview.change) >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {Number(infinitePreview.change) >= 0 ? "+" : ""}
                          {infinitePreview.change}%
                        </span>
                      </div>
                    }
                  >
                    {infinitePreview.hasPrecisionLoss && (
                      <TransactionAlert
                        type={"warning"}
                        title={infinitePreview.isCriticalLoss ? "Critical Precision Loss" : "Precision Loss Detected"}
                        description={
                          infinitePreview.isCriticalLoss
                            ? `Actual monthly will be $${infinitePreview.actualMonthly} instead of $${infinitePreview.inputMonthly}. Loss: $${infinitePreview.precisionLoss} (${infinitePreview.precisionLossPercent}%). Use $100+ amounts.`
                            : `Actual differs by ${infinitePreview.precisionLossPercent}% ($${infinitePreview.precisionLoss}).`
                        }
                        className="mb-4"
                      />
                    )}

                    <TransactionAlert
                      type="info"
                      title="Employee will be paid current earned amount before rate update"
                      className="mb-4"
                    />
                  </PreviewBox>
                )}

                {isLoading && (
                  <TransactionProgress
                    steps={[
                      {
                        label: step === "creating" ? "Updating..." : step === "success" ? "Updated ✓" : "Update Rate",
                        status: step === "creating" ? "loading" : step === "success" ? "success" : "idle",
                      },
                    ]}
                  />
                )}
              </form>
            ) : (
              <form id="form-extend" onSubmit={finiteForm.handleSubmit(handleFiniteSubmit)} className="space-y-6">
                <Controller
                  name="additionalAmount"
                  control={finiteForm.control}
                  render={({ field, fieldState }) => (
                    <AmountInput
                      label="Additional Amount (USDC)"
                      value={field?.value === 0 ? "" : (field?.value ?? 0)}
                      onChange={e => field.onChange(e)}
                      error={fieldState.error}
                      disabled={isLoading}
                      helperText="Amount to add to the stream"
                    />
                  )}
                />

                <Controller
                  name="additionalDays"
                  control={finiteForm.control}
                  render={({ field, fieldState }) => (
                    <AmountInput
                      label="Additional Days"
                      value={field.value || 0}
                      onChange={e => field.onChange(e)}
                      error={fieldState.error}
                      disabled={isLoading}
                      helperText="Number of days to extend"
                    />
                  )}
                />

                {finitePreview && (
                  <PreviewBox
                    title="Actual Extension Preview"
                    items={[
                      {
                        label: "Actual Additional",
                        value: `$${finitePreview.actualTotal}`,
                      },
                      { label: "Additional Days", value: `${finitePreview.days} days` },
                      { label: "Daily Rate", value: `$${finitePreview.dailyRate}` },
                      { label: "Hourly Rate", value: `$${finitePreview.hourlyRate}` },
                    ]}
                    footer={
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground leading-relaxed">
                          Employee will earn additional{" "}
                          <span className="font-mono font-bold">${finitePreview.actualTotal}</span> over{" "}
                          <span className="font-mono font-bold">{finitePreview.days} days</span>.
                        </div>
                      </div>
                    }
                  >
                    {finitePreview.hasPrecisionLoss && (
                      <TransactionAlert
                        type={"warning"}
                        title={finitePreview.isCriticalLoss ? "Critical Precision Loss" : "Precision Loss Detected"}
                        description={
                          finitePreview.isCriticalLoss
                            ? `Actual total will be $${finitePreview.actualTotal} instead of $${finitePreview.inputTotal}. Loss: $${finitePreview.precisionLoss} (${finitePreview.precisionLossPercent}%). Use larger amounts.`
                            : `Actual differs by ${finitePreview.precisionLossPercent}% ($${finitePreview.precisionLoss}).`
                        }
                        className="mb-4"
                      />
                    )}

                    {finitePreview.hasFinalPayout && (
                      <div className="border-t border-border pt-4 mb-4">
                        <div className="flex flex-col">
                          <div className="text-xs font-bold mb-1 font-mono">
                            Final Payout: ${finitePreview.finalPayout.toFixed(6)}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            This remainder will be paid with the final withdrawal.
                          </p>
                        </div>
                      </div>
                    )}

                    <TransactionAlert
                      type="info"
                      title="Employee will be paid current earned amount before extension"
                      className="mb-4"
                    />
                  </PreviewBox>
                )}

                {isLoading && (
                  <TransactionProgress
                    steps={[
                      {
                        label:
                          step === "creating" ? "Extending..." : step === "success" ? "Extended ✓" : "Extend Stream",
                        status: step === "creating" ? "loading" : step === "success" ? "success" : "idle",
                      },
                    ]}
                  />
                )}
              </form>
            )}
          </CardContent>

          <CardFooter className="flex gap-2">
            <Button
              type="submit"
              form={isInfinite ? "form-update" : "form-extend"}
              className="w-full"
              disabled={isLoading}
            >
              {step === "idle" && (isInfinite ? "Update Rate" : "Extend Stream")}
              {step === "creating" && "Processing..."}
              {step === "success" && "Success ✓"}
            </Button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
