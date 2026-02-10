"use client";

import * as React from "react";
import { AmountInput } from "../amount-input";
import { PreviewBox } from "../preview-box";
import { TransactionAlert } from "../transaction-alert";
import { TransactionProgress } from "../transaction-progress";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import * as z from "zod";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~~/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "~~/components/ui/field";
import { Label } from "~~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~~/components/ui/radio-group";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useTransactionFlow } from "~~/hooks/useTransactionFlow";

const formSchema = z
  .object({
    receiver: z.string().startsWith("0x").length(42),
    streamType: z.enum(["monthly", "project"]),
    monthlySalary: z.coerce.number().optional(),
    totalPayment: z.coerce.number().optional(),
    projectDuration: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.streamType === "monthly" && (!data.monthlySalary || data.monthlySalary <= 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["monthlySalary"] });
    }
    if (data.streamType === "project") {
      if (!data.totalPayment || data.totalPayment <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["totalPayment"] });
      }
      if (!data.projectDuration || data.projectDuration <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["projectDuration"] });
      }
    }
  });

type FormData = z.infer<typeof formSchema>;

export function CreateStreamModal() {
  const [open, setOpen] = React.useState(false);
  const { address } = useAccount();

  const { step, isLoading, handleTransaction, reset } = useTransactionFlow({
    successMessage: "Stream Created!",
    onSuccess: () => setTimeout(() => setOpen(false), 2000),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { receiver: "", streamType: "monthly", monthlySalary: 0, totalPayment: 0, projectDuration: 14 },
  });

  const { data: vaultData } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getVaultHealth",
    args: [address],
  });

  const vaultBalance = vaultData ? (vaultData as readonly [bigint, bigint, bigint, number, boolean, bigint])[0] : 0n;
  const formattedBalance = formatUnits(vaultBalance, 6);

  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "GainJar" });

  const watchType = form.watch("streamType");
  const watchMonthlySalary = form.watch("monthlySalary");
  const watchTotalPayment = form.watch("totalPayment");
  const watchDuration = form.watch("projectDuration");

  const preview = React.useMemo(() => {
    const isMonthly = watchType === "monthly";
    const amount = isMonthly ? Number(watchMonthlySalary) : Number(watchTotalPayment);
    const duration = Number(watchDuration) || 1;

    if (amount === 0) return null;

    const daily = isMonthly ? amount / 30 : amount / duration;
    const hourly = daily / 24;
    const perSecond = isMonthly ? amount / (30 * 24 * 60 * 60) : amount / (duration * 24 * 60 * 60);

    return {
      monthly: isMonthly ? amount.toFixed(2) : ((amount / duration) * 30).toFixed(2),
      daily: daily.toFixed(2),
      hourly: hourly.toFixed(4),
      perSecond: perSecond.toFixed(8),
      total: amount.toFixed(2),
      duration: isMonthly ? "Ongoing" : `${duration} days`,
      finalPayout: isMonthly ? 0 : ((amount * 1e6) % (duration * 24 * 60 * 60)) / 1e6,
    };
  }, [watchType, watchMonthlySalary, watchTotalPayment, watchDuration]);

  const hasEnoughBalance = preview ? vaultBalance >= parseUnits(preview.total, 6) : false;

  React.useEffect(() => {
    if (!open) {
      reset();
      form.reset();
    }
  }, [open, form, reset]);

  async function onSubmit(data: FormData) {
    const amount = parseUnits((data.streamType === "monthly" ? data.monthlySalary! : data.totalPayment!).toString(), 6);

    await handleTransaction(async () => {
      if (data.streamType === "monthly") {
        await writeContractAsync({
          functionName: "createMonthlyStream",
          args: [data.receiver as `0x${string}`, amount],
        });
      } else {
        await writeContractAsync({
          functionName: "createFiniteStreamDays",
          args: [data.receiver as `0x${string}`, amount, BigInt(data.projectDuration!)],
        });
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="lg" className="uppercase tracking-wider">
            Create Stream
          </Button>
        }
      />

      <DialogContent className="sm:max-w-lg p-0 max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="font-heading">Create Salary Stream</CardTitle>
          </CardHeader>

          <CardContent>
            <form id="form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

              {/* Stream Type */}
              <div className="border-l-4 border-foreground pl-6 py-4 bg-muted/10">
                <FieldLabel className="text-xs uppercase tracking-wider mb-4 block">Payment Type</FieldLabel>
                <Controller
                  name="streamType"
                  control={form.control}
                  render={({ field }) => (
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="space-y-4">
                      <Label htmlFor="monthly" className="flex items-start space-x-3 cursor-pointer">
                        <RadioGroupItem value="monthly" id="monthly" className="mt-1" />
                        <div>
                          <p className="font-heading font-bold text-lg">Monthly Salary</p>
                          <p className="text-xs text-muted-foreground mt-1">Streams indefinitely</p>
                        </div>
                      </Label>
                      <Label htmlFor="project" className="flex items-start space-x-3 cursor-pointer">
                        <RadioGroupItem value="project" id="project" className="mt-1" />
                        <div>
                          <p className="font-heading font-bold text-lg">Project Payment</p>
                          <p className="text-xs text-muted-foreground mt-1">Fixed duration</p>
                        </div>
                      </Label>
                    </RadioGroup>
                  )}
                />
              </div>

              {/* Amount Input */}
              {watchType === "monthly" ? (
                <Controller
                  name="monthlySalary"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <AmountInput
                      label="Monthly Salary"
                      value={field.value || 0}
                      onChange={field.onChange}
                      error={fieldState.error}
                      maxBalance={formattedBalance}
                      onMaxClick={() => field.onChange(Number(formattedBalance))}
                      disabled={isLoading}
                      helperText="Employee earns this every 30 days"
                    />
                  )}
                />
              ) : (
                <FieldGroup>
                  <Controller
                    name="totalPayment"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <AmountInput
                        label="Total Payment"
                        value={field.value || 0}
                        onChange={field.onChange}
                        error={fieldState.error}
                        maxBalance={formattedBalance}
                        onMaxClick={() => field.onChange(Number(formattedBalance))}
                        disabled={isLoading}
                        helperText="Total project payment"
                      />
                    )}
                  />
                  <Controller
                    name="projectDuration"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <AmountInput
                        label="Duration (Days)"
                        value={field.value || 0}
                        onChange={field.onChange}
                        error={fieldState.error}
                        disabled={isLoading}
                        helperText="Stream ends automatically"
                      />
                    )}
                  />
                </FieldGroup>
              )}

              {/* Preview */}
              {preview && (
                <PreviewBox
                  title={watchType === "monthly" ? "Monthly Salary" : "Project Payment"}
                  items={[
                    { label: "Per Month", value: `$${preview.monthly}`, highlight: true },
                    { label: "Per Day", value: `$${preview.daily}` },
                    { label: "Per Hour", value: `$${preview.hourly}`, small: true },
                    { label: "Per Second", value: `$${preview.perSecond}`, small: true },
                  ]}
                  footer={
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-xs uppercase tracking-wider font-bold">Total Required</span>
                        <span className="font-heading font-bold text-2xl">${preview.total}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Duration</span>
                        <span className="text-xs font-mono">{preview.duration}</span>
                      </div>
                    </div>
                  }
                >
                  {!hasEnoughBalance && (
                    <TransactionAlert
                      type="error"
                      title="Insufficient Vault Balance"
                      description={`Need $${preview.total} • Vault has $${formattedBalance}`}
                      className="mb-4"
                    />
                  )}

                  {preview.finalPayout !== 0 && (
                    <div className="border-t border-border pt-4 mb-4">
                      <div className="flex flex-col">
                        <div className="text-xs font-bold mb-1 font-mono">Final Payout</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Due to per-second streaming precision, a small remainder of{" "}
                          <span className="font-mono font-bold">${preview.finalPayout}</span> will be paid with the last
                          withdrawal to ensure the employee receives exactly{" "}
                          <span className="font-mono font-bold">${preview.total}</span>.
                        </p>
                      </div>
                    </div>
                  )}
                </PreviewBox>
              )}

              {/* Progress */}
              {isLoading && (
                <TransactionProgress
                  steps={[
                    {
                      label: step === "creating" ? "Creating..." : step === "success" ? "Created ✓" : "Create Stream",
                      status: step === "creating" ? "loading" : step === "success" ? "success" : "idle",
                    },
                  ]}
                />
              )}
            </form>
          </CardContent>

          <CardFooter>
            <Button
              type="submit"
              form="form"
              className="w-full uppercase tracking-wider"
              disabled={isLoading || !hasEnoughBalance}
            >
              {step === "idle" && "Create Stream"}
              {step === "creating" && "Creating..."}
              {step === "success" && "Success ✓"}
            </Button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
