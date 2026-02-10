"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import * as z from "zod";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~~/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "~~/components/ui/field";
import { Input } from "~~/components/ui/input";
import { Label } from "~~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~~/components/ui/radio-group";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const formSchema = z
  .object({
    receiver: z.string().startsWith("0x", "Invalid wallet address").length(42, "Must be 42 characters"),
    streamType: z.enum(["monthly", "project"], {
      required_error: "Please select a stream type",
    }),
    monthlySalary: z.coerce.number().optional(),
    totalPayment: z.coerce.number().optional(),
    projectDuration: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.streamType === "monthly") {
      if (!data.monthlySalary || data.monthlySalary <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Monthly salary must be greater than 0",
          path: ["monthlySalary"],
        });
      }
    }

    if (data.streamType === "project") {
      if (!data.totalPayment || data.totalPayment <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Total payment must be greater than 0",
          path: ["totalPayment"],
        });
      }
      if (!data.projectDuration || data.projectDuration <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Duration must be at least 1 day",
          path: ["projectDuration"],
        });
      }
    }
  });

type FormData = z.infer<typeof formSchema>;
type TransactionStep = "idle" | "approving" | "approved" | "creating" | "success";

export function CreateStreamModal() {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<TransactionStep>("idle");
  const { address: userAddress } = useAccount();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      receiver: "",
      streamType: "monthly",
      monthlySalary: 0,
      totalPayment: 0,
      projectDuration: 14,
    },
  });

  const { writeContractAsync: writeUSDC, isPending: isApprovePending } = useScaffoldWriteContract({
    contractName: "USDC",
  });

  const { writeContractAsync: writeGainJar, isPending: isCreatePending } = useScaffoldWriteContract({
    contractName: "GainJar",
  });

  const { data: usdcBalance } = useScaffoldReadContract({
    contractName: "USDC",
    functionName: "balanceOf",
    args: [userAddress],
  });

  const { data: gainjarContract } = useDeployedContractInfo({ contractName: "GainJar" });

  const { data: currentAllowance, refetch: refetchAllowance } = useScaffoldReadContract({
    contractName: "USDC",
    functionName: "allowance",
    args: [userAddress, gainjarContract?.address as `0x${string}`],
  });

  const watchStreamType = form.watch("streamType");
  const watchMonthlySalary = form.watch("monthlySalary");
  const watchTotalPayment = form.watch("totalPayment");
  const watchDuration = form.watch("projectDuration");

  // Calculate stream preview with final payout details
  const streamPreview = React.useMemo(() => {
    if (watchStreamType === "monthly") {
      const monthly = Number(watchMonthlySalary) || 0;

      if (monthly === 0) {
        return {
          mode: "Monthly Salary",
          monthly: "0",
          daily: "0",
          hourly: "0",
          perSecond: "0",
          totalRequired: "0",
          duration: "Ongoing",
          finalPayout: "0",
          hasFinalPayout: false,
          description: "Enter monthly salary to see breakdown",
        };
      }

      const daily = monthly / 30;
      const hourly = daily / 24;

      // Calculate exact wei amounts
      const monthlyWei = Math.floor(monthly * 1e6); // USDC has 6 decimals
      const thirtyDaysSeconds = 30 * 24 * 60 * 60;
      const ratePerSecond = Math.floor(monthlyWei / thirtyDaysSeconds);
      const perSecond = ratePerSecond / 1e6;

      return {
        mode: "Monthly Salary (Infinite Stream)",
        monthly: monthly.toFixed(2),
        daily: daily.toFixed(2),
        hourly: hourly.toFixed(4),
        perSecond: perSecond.toFixed(8),
        totalRequired: monthly.toFixed(2),
        duration: "Ongoing until manually stopped",
        finalPayout: "0",
        hasFinalPayout: false,
        description: `Employee earns continuously. You must maintain vault balance for ongoing payments.`,
      };
    } else {
      const total = Number(watchTotalPayment) || 0;
      const duration = Number(watchDuration) || 1;

      if (total === 0) {
        return {
          mode: "Project Payment",
          monthly: "0",
          daily: "0",
          hourly: "0",
          perSecond: "0",
          totalRequired: "0",
          duration: `${duration} days`,
          finalPayout: "0",
          hasFinalPayout: false,
          description: "Enter total payment to see breakdown",
        };
      }

      const daily = total / duration;
      const hourly = daily / 24;

      // Calculate exact wei amounts and final payout
      const totalWei = Math.floor(total * 1e6);
      const durationSeconds = duration * 24 * 60 * 60;
      const ratePerSecond = Math.floor(totalWei / durationSeconds);
      const finalPayoutWei = totalWei % durationSeconds;

      const perSecond = ratePerSecond / 1e6;
      const finalPayoutUSDC = finalPayoutWei / 1e6;
      const monthlyEquivalent = (total / duration) * 30;

      return {
        mode: "Project Payment (Finite Stream)",
        monthly: monthlyEquivalent.toFixed(2),
        daily: daily.toFixed(2),
        hourly: hourly.toFixed(4),
        perSecond: perSecond.toFixed(8),
        totalRequired: total.toFixed(2),
        duration: `Exactly ${duration} days`,
        finalPayout: finalPayoutUSDC.toFixed(6),
        hasFinalPayout: finalPayoutWei > 0,
        description: `Employee earns for ${duration} days. Stream ends automatically.`,
      };
    }
  }, [watchStreamType, watchMonthlySalary, watchTotalPayment, watchDuration]);

  const needsApproval = React.useMemo(() => {
    if (!streamPreview.totalRequired || !currentAllowance) return true;
    const requiredWei = parseUnits(streamPreview.totalRequired, 6);
    return currentAllowance < requiredWei;
  }, [streamPreview.totalRequired, currentAllowance]);

  const formattedBalance = React.useMemo(() => {
    if (!usdcBalance) return "0";
    return formatUnits(usdcBalance, 6);
  }, [usdcBalance]);

  const hasEnoughBalance = React.useMemo(() => {
    if (!usdcBalance || !streamPreview.totalRequired) return false;
    const requiredWei = parseUnits(streamPreview.totalRequired, 6);
    return usdcBalance >= requiredWei;
  }, [usdcBalance, streamPreview.totalRequired]);

  React.useEffect(() => {
    if (!open) {
      setStep("idle");
      form.reset();
    }
  }, [open, form]);

  const setMaxBalance = () => {
    if (usdcBalance) {
      const maxAmount = formatUnits(usdcBalance, 6);
      if (watchStreamType === "monthly") {
        form.setValue("monthlySalary", Number(maxAmount));
      } else {
        form.setValue("totalPayment", Number(maxAmount));
      }
    }
  };

  async function onSubmit(data: FormData) {
    try {
      let totalAmountWei: bigint;
      let isInfinite: boolean;

      if (data.streamType === "monthly") {
        isInfinite = true;
        totalAmountWei = parseUnits(data.monthlySalary!.toString(), 6);
      } else {
        isInfinite = false;
        totalAmountWei = parseUnits(data.totalPayment!.toString(), 6);
      }

      if (usdcBalance && totalAmountWei > usdcBalance) {
        toast.error("Insufficient Balance", {
          description: `Need ${formatUnits(totalAmountWei, 6)} USDC, have ${formattedBalance} USDC`,
        });
        return;
      }

      if (needsApproval) {
        setStep("approving");
        toast.info("Step 1/2: Approving USDC...", {
          description: "Confirm in your wallet",
        });

        await writeUSDC({
          functionName: "approve",
          args: [gainjarContract?.address as `0x${string}`, totalAmountWei],
        });

        await refetchAllowance();

        setStep("approved");
        toast.success("USDC Approved!");
      } else {
        setStep("approved");
      }

      setStep("creating");
      toast.info(needsApproval ? "Step 2/2: Creating stream..." : "Creating stream...", {
        description: "Confirm in your wallet",
      });

      if (isInfinite) {
        await writeGainJar({
          functionName: "createMonthlyStream",
          args: [data.receiver as `0x${string}`, totalAmountWei],
        });
      } else {
        await writeGainJar({
          functionName: "createFiniteStreamDays",
          args: [data.receiver as `0x${string}`, totalAmountWei, BigInt(data.projectDuration!)],
        });
      }

      setStep("success");
      toast.success("Stream Created!", {
        description: `${isInfinite ? "Monthly salary" : "Project payment"} stream is active`,
      });

      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      console.error("Transaction error:", error);
      setStep("idle");

      if (error?.message?.includes("User rejected") || error?.message?.includes("User denied")) {
        toast.error("Transaction Cancelled");
        return;
      }

      toast.error("Transaction Failed", {
        description: error?.shortMessage || error?.message,
      });
    }
  }

  const isLoading = isApprovePending || isCreatePending || step === "approving" || step === "creating";
  const isApproved = step === "approved" || step === "creating" || step === "success";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="lg" className="uppercase tracking-wider">
            Create Stream
          </Button>
        }
      ></DialogTrigger>

      <DialogContent className="sm:max-w-lg p-0 max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="font-heading">Create Salary Stream</CardTitle>
            <CardDescription className="font-mono text-xs">Balance: {formattedBalance} USDC</CardDescription>
          </CardHeader>

          <CardContent>
            <form id="form-create-stream" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Employee Address */}
              <FieldGroup>
                <Controller
                  name="receiver"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs uppercase tracking-wider">Employee Wallet Address</FieldLabel>
                      <Input {...field} placeholder="0x..." disabled={isLoading} className="font-mono text-sm" />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      {!fieldState.invalid && field.value && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          → {field.value.slice(0, 6)}...{field.value.slice(-4)}
                        </p>
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>

              {/* Stream Type Selection */}
              <div className="border-2 border-foreground p-6 bg-muted/10">
                <FieldLabel className="mb-4 block">Payment Type</FieldLabel>
                <Controller
                  name="streamType"
                  control={form.control}
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isLoading}
                      className="space-y-3"
                    >
                      {/* Monthly Salary Option */}
                      <div className="flex items-start space-x-3 border-l-4 border-foreground pl-4 py-3 bg-background hover:bg-muted/20 transition-colors">
                        <RadioGroupItem value="monthly" id="monthly" className="mt-1" />
                        <Label htmlFor="monthly" className="cursor-pointer flex-1 flex flex-col items-start gap-0">
                          <p className="font-heading font-bold">Monthly Salary</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            For full-time employees. Streams indefinitely until you stop it.
                          </p>
                        </Label>
                      </div>

                      {/* Project Payment Option */}
                      <div className="flex items-start space-x-3 border-l-4 border-foreground pl-4 py-3 bg-background hover:bg-muted/20 transition-colors">
                        <RadioGroupItem value="project" id="project" className="mt-1" />
                        <Label htmlFor="project" className="cursor-pointer flex-1 flex flex-col items-start gap-0">
                          <p className="font-heading font-bold">Project Payment</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            For fixed-term contracts. Automatically ends after duration.
                          </p>
                        </Label>
                      </div>
                    </RadioGroup>
                  )}
                />
              </div>

              {/* Monthly Salary Input */}
              {watchStreamType === "monthly" && (
                <FieldGroup>
                  <Controller
                    name="monthlySalary"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <div className="flex items-center justify-between">
                          <FieldLabel className="text-xs uppercase tracking-wider">Monthly Salary</FieldLabel>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-auto p-0 text-xs uppercase tracking-wider"
                            onClick={setMaxBalance}
                            disabled={isLoading}
                          >
                            Max
                          </Button>
                        </div>
                        <Input
                          {...field}
                          type="number"
                          step="0.000001"
                          min="0"
                          placeholder="0.00"
                          disabled={isLoading}
                          className="font-mono"
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        <p className="text-xs text-muted-foreground mt-1">
                          Employee earns this amount every 30 days, continuously
                        </p>
                      </Field>
                    )}
                  />
                </FieldGroup>
              )}

              {/* Project Payment Inputs */}
              {watchStreamType === "project" && (
                <>
                  <FieldGroup>
                    <Controller
                      name="totalPayment"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <div className="flex items-center justify-between">
                            <FieldLabel className="text-xs uppercase tracking-wider">Total Payment</FieldLabel>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 text-xs uppercase tracking-wider"
                              onClick={setMaxBalance}
                              disabled={isLoading}
                            >
                              Max
                            </Button>
                          </div>
                          <Input
                            {...field}
                            type="number"
                            step="0.000001"
                            min="0"
                            placeholder="0.00"
                            disabled={isLoading}
                            className="font-mono"
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          <p className="text-xs text-muted-foreground mt-1">
                            Total amount employee receives for this project
                          </p>
                        </Field>
                      )}
                    />
                  </FieldGroup>

                  <FieldGroup>
                    <Controller
                      name="projectDuration"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel className="text-xs uppercase tracking-wider">Duration (Days)</FieldLabel>
                          <Input
                            {...field}
                            type="number"
                            min="1"
                            placeholder="14"
                            disabled={isLoading}
                            className="font-mono"
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          <p className="text-xs text-muted-foreground mt-1">
                            Stream automatically ends after this many days
                          </p>
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </>
              )}

              {/* Stream Preview */}
              {Number(streamPreview.totalRequired) > 0 && (
                <div className="border-2 border-foreground p-6 bg-background">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-4 font-medium">
                    {streamPreview.mode}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Per Month</span>
                      <span className="font-mono font-bold">${streamPreview.monthly}</span>
                    </div>

                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Per Day</span>
                      <span className="font-mono">${streamPreview.daily}</span>
                    </div>

                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Per Hour</span>
                      <span className="font-mono text-sm">${streamPreview.hourly}</span>
                    </div>

                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Per Second</span>
                      <span className="font-mono text-xs">${streamPreview.perSecond}</span>
                    </div>
                  </div>

                  <div className="border-t-2 border-foreground pt-4 mb-4">
                    <div className="flex justify-between items-baseline gap-4 mb-2">
                      <span className="text-xs uppercase tracking-wider font-bold">You Will Deposit</span>
                      <span className="font-heading font-bold text-2xl">${streamPreview.totalRequired}</span>
                    </div>

                    <div className="flex justify-between items-baseline gap-4">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Duration</span>
                      <span className="text-xs font-mono">{streamPreview.duration}</span>
                    </div>
                  </div>

                  {/* Final Payout Explanation (only for project) */}
                  {streamPreview.hasFinalPayout && (
                    <div className="border-t border-border pt-4 mb-4">
                      <div className="flex items-start gap-2 mb-2">
                        <div className="text-xs text-muted-foreground">ℹ️</div>
                        <div>
                          <div className="text-xs font-bold mb-1">Final Payout</div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Due to per-second streaming precision, a small remainder of{" "}
                            <span className="font-mono font-bold">${streamPreview.finalPayout}</span> will be paid with
                            the last withdrawal to ensure the employee receives exactly{" "}
                            <span className="font-mono">${streamPreview.totalRequired}</span>.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">
                    {streamPreview.description}
                  </div>

                  {/* Warnings */}
                  {!hasEnoughBalance && (
                    <div className="mt-4 p-3 bg-destructive/10 border-l-4 border-destructive">
                      <p className="text-xs text-destructive font-medium">⚠️ Insufficient Balance</p>
                      <p className="text-xs text-destructive/80 mt-1 font-mono">
                        Need ${streamPreview.totalRequired} • Have ${formattedBalance}
                      </p>
                    </div>
                  )}

                  {hasEnoughBalance && needsApproval && step === "idle" && (
                    <div className="mt-4 p-3 bg-muted/50 border-l-4 border-muted-foreground">
                      <p className="text-xs text-muted-foreground">
                        ℹ️ Requires 2 transactions: Approve USDC + Create Stream
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Progress Indicator */}
              {isLoading && (
                <div className="border-l-4 border-foreground pl-6 py-4 bg-muted/20">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 font-medium">
                    Transaction Progress
                  </div>

                  {needsApproval && (
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          step === "approving"
                            ? "bg-primary animate-pulse"
                            : isApproved
                              ? "bg-green-500"
                              : "bg-muted-foreground/30"
                        }`}
                      />
                      <span
                        className={`text-xs uppercase tracking-wider ${isApproved ? "text-green-500 font-medium" : "text-muted-foreground"}`}
                      >
                        {step === "approving" ? "Approving..." : isApproved ? "Approved ✓" : "Approve USDC"}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        step === "creating"
                          ? "bg-primary animate-pulse"
                          : step === "success"
                            ? "bg-green-500"
                            : "bg-muted-foreground/30"
                      }`}
                    />
                    <span
                      className={`text-xs uppercase tracking-wider ${step === "success" ? "text-green-500 font-medium" : "text-muted-foreground"}`}
                    >
                      {step === "creating" ? "Creating..." : step === "success" ? "Created ✓" : "Create Stream"}
                    </span>
                  </div>
                </div>
              )}
            </form>
          </CardContent>

          <CardFooter className="flex-col gap-2">
            <Button
              type="submit"
              form="form-create-stream"
              className="w-full uppercase tracking-wider font-medium"
              disabled={isLoading || !hasEnoughBalance || step === "success"}
            >
              {step === "idle" && (needsApproval ? "Approve & Create" : "Create Stream")}
              {step === "approving" && "Approving..."}
              {step === "approved" && "Creating..."}
              {step === "creating" && "Creating..."}
              {step === "success" && "Success ✓"}
            </Button>

            {!hasEnoughBalance && Number(streamPreview.totalRequired) > 0 && (
              <p className="text-xs text-center text-destructive uppercase tracking-wider">Insufficient Balance</p>
            )}
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
