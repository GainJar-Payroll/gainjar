"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { parseUnits } from "viem";
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
  newMonthlyRate: z.coerce.number().positive("Rate must be positive"),
});

const finiteSchema = z.object({
  additionalAmount: z.coerce.number().positive("Amount must be positive"),
  additionalDays: z.coerce.number().positive("Days must be positive"),
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

export function UpdateStreamModal({ employer, employee, currentRate, streamType, onClose }: UpdateStreamModalProps) {
  const isInfinite = streamType === 0;

  const { step, isLoading, handleTransaction, reset } = useTransactionFlow({
    successMessage: isInfinite ? "Rate Updated!" : "Stream Extended!",
    onSuccess: () => setTimeout(() => onClose(), 2000),
  });

  const infiniteForm = useForm<InfiniteFormData>({
    resolver: zodResolver(infiniteSchema),
    defaultValues: {
      newMonthlyRate: (currentRate * 2592000).toFixed(2) as any, // Current monthly rate
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

  // Watch values for preview
  const watchNewMonthlyRate = infiniteForm.watch("newMonthlyRate");
  const watchAdditionalAmount = finiteForm.watch("additionalAmount");
  const watchAdditionalDays = finiteForm.watch("additionalDays");

  // Preview for infinite stream update
  const infinitePreview = React.useMemo(() => {
    if (!watchNewMonthlyRate || Number(watchNewMonthlyRate) === 0) return null;

    const newMonthly = Number(watchNewMonthlyRate);
    const newDaily = newMonthly / 30;
    const newHourly = newDaily / 24;
    const newPerSecond = newMonthly / 2592000;

    const oldMonthly = currentRate * 2592000;
    const oldDaily = currentRate * 86400;

    return {
      oldMonthly: oldMonthly.toFixed(2),
      oldDaily: oldDaily.toFixed(2),
      newMonthly: newMonthly.toFixed(2),
      newDaily: newDaily.toFixed(2),
      newHourly: newHourly.toFixed(4),
      newPerSecond: newPerSecond.toFixed(8),
      change: (((newMonthly - oldMonthly) / oldMonthly) * 100).toFixed(1),
    };
  }, [watchNewMonthlyRate, currentRate]);

  // Preview for finite stream extension
  const finitePreview = React.useMemo(() => {
    if (!watchAdditionalAmount || Number(watchAdditionalAmount) === 0) return null;

    const additional = Number(watchAdditionalAmount);
    const days = Number(watchAdditionalDays) || 1;
    const dailyRate = additional / days;
    const hourlyRate = dailyRate / 24;

    return {
      totalAdditional: additional.toFixed(2),
      days: days,
      dailyRate: dailyRate.toFixed(2),
      hourlyRate: hourlyRate.toFixed(4),
    };
  }, [watchAdditionalAmount, watchAdditionalDays]);

  async function handleInfiniteSubmit(data: InfiniteFormData) {
    const newRateAmount = parseUnits(data.newMonthlyRate.toString(), 6);
    const period = 30 * 24 * 60 * 60; // 30 days in seconds

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
              // INFINITE STREAM FORM
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
                    title="Rate Change Preview"
                    items={[
                      { label: "Old Monthly", value: `$${infinitePreview.oldMonthly}` },
                      { label: "Old Daily", value: `$${infinitePreview.oldDaily}` },
                      { label: "New Monthly", value: `$${infinitePreview.newMonthly}` },
                      { label: "New Daily", value: `$${infinitePreview.newDaily}` },
                      // { label: "New Hourly", value: `$${infinitePreview.newHourly}`, small: true },
                      { label: "New Per Second", value: `$${infinitePreview.newPerSecond}` },
                    ]}
                    footer={
                      <div className="flex justify-between items-center">
                        <span className="text-xs uppercase tracking-wider font-bold">Change</span>
                        <span
                          className={`font-mono font-bold text-lg ${Number(infinitePreview.change) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                        >
                          {Number(infinitePreview.change) >= 0 ? "+" : ""}
                          {infinitePreview.change}%
                        </span>
                      </div>
                    }
                  >
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
              // FINITE STREAM FORM
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
                    title="Extension Preview"
                    items={[
                      { label: "Additional Amount", value: `$${finitePreview.totalAdditional}`, highlight: true },
                      { label: "Additional Days", value: `${finitePreview.days} days` },
                      { label: "Daily Rate", value: `$${finitePreview.dailyRate}` },
                      { label: "Hourly Rate", value: `$${finitePreview.hourlyRate}`, small: true },
                    ]}
                    footer={
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground leading-relaxed">
                          Employee will earn additional{" "}
                          <span className="font-mono font-bold">${finitePreview.totalAdditional}</span> over{" "}
                          <span className="font-mono font-bold">{finitePreview.days} days</span>.
                        </div>
                      </div>
                    }
                  >
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
              className={"w-full"}
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
