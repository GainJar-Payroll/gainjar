"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { formatUnits, parseUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import * as z from "zod";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~~/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "~~/components/ui/field";
import { Input } from "~~/components/ui/input";
import { Switch } from "~~/components/ui/switch";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

// Schema: Ditambah Receiver (alamat karyawan)
const formSchema = z.object({
  receiver: z.string().startsWith("0x", "Invalid wallet address").length(42, "Address too short"),
  durationDays: z.coerce.number().min(1, "Minimal 1 hari"),
  isInfinite: z.boolean().default(false),
  amount: z.coerce.number().positive("Must be greater than 0"),
});

type FormData = z.infer<typeof formSchema>;

const CreateStreamModal = () => {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<"idle" | "approving" | "depositing" | "success">("idle");
  const { address: userAddress } = useAccount();
  const publicClient = usePublicClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { receiver: "", amount: 0, durationDays: 30, isInfinite: false },
  });

  // 1. Ambil Data Kontrak (Ganti nama kontrak sesuai projectmu)
  const { writeContractAsync: writeGainJar } = useScaffoldWriteContract("GainJar");
  const { writeContractAsync: writeUSDC } = useScaffoldWriteContract("MockERC20");

  // 2. Baca Balance & Allowance
  const { data: rawBalance } = useScaffoldReadContract({
    contractName: "MockERC20",
    functionName: "balanceOf",
    args: [userAddress],
  });

  const { data: gainjar } = useDeployedContractInfo({ contractName: "GainJar" });
  const { data: currentAllowance } = useScaffoldReadContract({
    contractName: "MockERC20",
    functionName: "allowance",
    args: [userAddress, gainjar?.address as `0x${string}`],
  });

  const isLoading = step === "approving" || step === "depositing";
  const amountInWei = parseUnits(form.getValues("amount")?.toString() || "0", 6);
  const needsApproval = currentAllowance !== undefined && currentAllowance < amountInWei;

  const watchAmount = form.watch("amount") || 0;
  const watchDuration = form.watch("durationDays") || 0;
  const isInfinite = form.watch("isInfinite");

  const calculatePreview = () => {
    const amount = Number(form.watch("amount")) || 0;
    const duration = Number(form.watch("durationDays")) || 1;
    const isInfinite = form.watch("isInfinite");
    if (isInfinite) {
      return {
        monthly: amount.toFixed(2),
        daily: (amount / 30).toFixed(4),
        total: "∞",
        note: "Streams indefinitely based on monthly budget.",
      };
    }

    // Mode Finite: Kita asumsikan inputAmount adalah jatah PER BULAN
    // Jadi total yang akan dikirim adalah (inputAmount / 30) * durasi
    const dailyRate = amount / 30;
    const totalToSent = dailyRate * duration;

    return {
      monthly: amount.toFixed(2),
      daily: dailyRate.toFixed(4),
      total: totalToSent.toFixed(2),
      note: `Stream will stop after reaching ${totalToSent.toFixed(2)} USDC (${duration} days).`,
    };
  };
  const preview = calculatePreview();

  const setMaxBalance = () => {
    if (rawBalance) {
      form.setValue("amount", Number(formatUnits(rawBalance, 6)));
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      setStep("approving");
      const isInfinite = data.isInfinite;

      const amountInWei = parseUnits(data.amount.toString(), 6);
      // Kita hitung flowRate berdasarkan jatah bulanan (30 hari)
      const thirtyDaysInSeconds = BigInt(30 * 24 * 60 * 60);

      let finalAmountToLock: bigint;

      if (isInfinite) {
        finalAmountToLock = amountInWei;
      } else {
        const durationInSeconds = BigInt(data.durationDays || 1) * 86400n;
        finalAmountToLock = flowRate * durationInSeconds;
      }

      console.log("Flow Rate (per sec):", flowRate);
      console.log("Total to Deposit:", finalAmountToLock);
      // // LANGKAH 1: APPROVE (Jika perlu)
      // if (needsApproval) {
      //   const hash = await writeUSDC({
      //     functionName: "approve",
      //     args: ["0xYOUR_GAINJAR_ADDRESS", weiValue],
      //   });
      //   if (publicClient && hash) {
      //     await publicClient.waitForTransactionReceipt({ hash });
      //   }
      //   toast.success("USDC Approved!");
      // }
      //
      // // LANGKAH 2: START STREAM / DEPOSIT
      // setStep("depositing");
      // await writeGainJar({
      //   functionName: "createStream", // Pastikan nama fungsi di kontrak sama
      //   args: [data.receiver, weiValue],
      // });
      //
      setStep("success");
      toast.success("Stream Created Successfully!");
      setTimeout(() => {
        setOpen(false);
        setStep("idle");
      }, 2000);
    } catch (e) {
      console.error(e);
      setStep("idle");
      toast.error("Transaction Failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg">Create Stream</Button>}></DialogTrigger>

      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>Stream USDC to your employee</CardTitle>
          </CardHeader>
          <CardContent>
            <form id="form-stream" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* INPUT RECEIVER */}
              <FieldGroup>
                <Controller
                  name="receiver"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <FieldLabel>Receiver Address</FieldLabel>
                      <Input {...field} placeholder="0x..." disabled={isLoading} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {/* INPUT AMOUNT */}
                <Controller
                  name="amount"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field>
                      <div className="flex justify-between items-center">
                        <FieldLabel>Total Amount / month</FieldLabel>
                        <Button type="button" variant="link" size="sm" onClick={setMaxBalance} className="h-0 px-0">
                          Max: {rawBalance ? formatUnits(rawBalance, 6) : "0"}
                        </Button>
                      </div>
                      <Input {...field} type="number" step="any" placeholder="0.00" disabled={isLoading} />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                {watchAmount > 0 && (
                  <div className="mt-4 border border-foreground/20 bg-muted/30 p-3 font-mono text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground uppercase">Budget_Monthly:</span>
                      <span className="font-bold">{preview.monthly} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground uppercase">Rate_Daily:</span>
                      <span>{preview.daily} USDC</span>
                    </div>
                    <div className="flex justify-between border-t border-dashed border-foreground/20 mt-2 pt-2">
                      <span className="text-muted-foreground uppercase font-bold">Total_Commitment:</span>
                      <span className="text-primary font-bold">{preview.total} USDC</span>
                    </div>

                    <div className="flex justify-between mb-1">
                      <span className="uppercase text-muted-foreground">Flow_Type:</span>
                      <span className="font-bold">{isInfinite ? "♾ INFINITE" : "⏳ FINITE"}</span>
                    </div>

                    <div className="mt-2 pt-2 border-t border-dashed border-foreground/20 italic text-muted-foreground">
                      {preview.note}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between p-2 border rounded-md bg-secondary/20">
                  <FieldLabel className="mb-0">
                    Inifinite Stream
                  </FieldLabel>
                  <Switch
                    checked={form.watch("isInfinite")}
                    onCheckedChange={val => form.setValue("isInfinite", val)}
                  />
                </div>

                {!form.watch("isInfinite") && (
                  <Controller
                    name="durationDays"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Duration (Days)</FieldLabel>
                        <Input {...field} type="number" placeholder="30" />
                      </Field>
                    )}
                  />
                )}
              </FieldGroup>

              {/* Progress Tracker (Hanya muncul saat loading) */}
              {isLoading && (
                <div className="p-3 bg-secondary/50 rounded-lg text-xs space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${step === "approving" ? "bg-orange-500 animate-pulse" : "bg-green-500"}`}
                    />
                    <span>Step 1: Approve USDC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${step === "depositing" ? "bg-blue-500 animate-pulse" : "bg-gray-400"}`}
                    />
                    <span>Step 2: Create Stream</span>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button type="submit" form="form-stream" className="w-full" disabled={isLoading || step === "success"}>
              {step === "idle" ? (needsApproval ? "Approve & Start" : "Start Stream") : "Processing..."}
            </Button>
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStreamModal;
