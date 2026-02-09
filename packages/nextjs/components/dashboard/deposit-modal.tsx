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
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const formSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0").min(1, "Minimum amount is 1 USDC"),
});

type FormData = z.infer<typeof formSchema>;

type TransactionStep = "idle" | "approving" | "approved" | "depositing" | "success";

export function DepositModal() {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<TransactionStep>("idle");
  const { address: userAddress } = useAccount();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
    },
  });

  const watchAmount = form.watch("amount");

  const { data: gainjar } = useDeployedContractInfo({ contractName: "GainJar" });

  const { data: usdcBalance } = useScaffoldReadContract({
    contractName: "USDC",
    functionName: "balanceOf",
    args: [userAddress],
  });

  const { data: currentAllowance, refetch: refetchAllowance } = useScaffoldReadContract({
    contractName: "USDC",
    functionName: "allowance",
    args: [userAddress, gainjar?.address as `0x${string}`],
  });

  const { writeContractAsync: writeUSDCAsync, isPending: isApprovePending } = useScaffoldWriteContract({
    contractName: "USDC",
  });

  const { writeContractAsync: writeGainjarAsync, isPending: isDepositPending } = useScaffoldWriteContract({
    contractName: "GainJar",
  });

  React.useEffect(() => {
    if (!open) {
      setStep("idle");
      form.reset();
    }
  }, [open, form]);

  const needsApproval = React.useMemo(() => {
    if (!watchAmount || !currentAllowance) return true;
    const amountInWei = parseUnits(watchAmount.toString(), 6);
    return currentAllowance < amountInWei;
  }, [watchAmount, currentAllowance]);

  const formattedBalance = React.useMemo(() => {
    if (!usdcBalance) return "0";
    return formatUnits(usdcBalance, 6);
  }, [usdcBalance]);

  async function onSubmit(data: FormData) {
    try {
      const amountInWei = parseUnits(data.amount.toString(), 6);

      if (usdcBalance && amountInWei > usdcBalance) {
        toast.error("Insufficient Balance", {
          description: `You only have ${formattedBalance} USDC`,
        });
        return;
      }

      if (needsApproval) {
        setStep("approving");
        toast.info("Step 1/2: Approving USDC...", {
          description: "Please confirm the transaction in your wallet",
        });

        await writeUSDCAsync({
          functionName: "approve",
          args: [gainjar?.address as `0x${string}`, amountInWei],
        });

        await refetchAllowance();

        setStep("approved");
        toast.success("USDC Approved!", {
          description: "Now depositing to your vault...",
        });
      } else {
        setStep("approved");
      }

      setStep("depositing");
      toast.info(needsApproval ? "Step 2/2: Depositing to vault..." : "Depositing to vault...", {
        description: "Please confirm the transaction in your wallet",
      });

      await writeGainjarAsync({
        functionName: "deposit",
        args: [amountInWei],
      });

      setStep("success");
      toast.success("Deposit Successful!", {
        description: `Successfully deposited ${data.amount} USDC to your vault`,
      });

      setTimeout(() => {
        setOpen(false);
      }, 1500);
    } catch (error: any) {
      console.error("Transaction error:", error);
      setStep("idle");

      if (error?.message?.includes("User rejected") || error?.message?.includes("User denied")) {
        toast.error("Transaction Cancelled", {
          description: "You rejected the transaction",
        });
        return;
      }

      toast.error("Transaction Failed", {
        description: error?.shortMessage || error?.message || "Something went wrong. Please try again.",
      });
    }
  }

  const isLoading = isApprovePending || isDepositPending || step === "approving" || step === "depositing";
  const isApproved = step === "approved" || step === "depositing" || step === "success";

  // Auto-fill max balance helper
  const setMaxBalance = () => {
    if (usdcBalance) {
      const maxAmount = formatUnits(usdcBalance, 6);
      form.setValue("amount", Number(maxAmount));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg">Deposit</Button>}></DialogTrigger>

      <DialogContent className="sm:max-w-sm p-0">
        <Card className="w-full sm:max-w-md">
          <CardHeader>
            <CardTitle>Deposit to your vault</CardTitle>
            <CardDescription>Balance: {formattedBalance} USDC</CardDescription>
          </CardHeader>
          <CardContent>
            <form id="form-deposit" onSubmit={form.handleSubmit(onSubmit)}>
              <FieldGroup>
                <Controller
                  name="amount"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <div className="flex items-center justify-between">
                        <FieldLabel htmlFor="form-deposit-amount">Amount USDC</FieldLabel>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto text-xs"
                          onClick={setMaxBalance}
                          disabled={isLoading}
                        >
                          Max
                        </Button>
                      </div>
                      <Input
                        {...field}
                        id="form-deposit-amount"
                        aria-invalid={fieldState.invalid}
                        placeholder="0.00"
                        type="number"
                        step="0.000001"
                        min="0"
                        disabled={isLoading}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}

                      {/* Show current allowance info */}
                      {!fieldState.invalid && currentAllowance !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {needsApproval ? (
                            <span className="text-orange-500">⚠️ Approval required</span>
                          ) : (
                            <span className="text-green-500">✓ Already approved</span>
                          )}
                        </p>
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>

              {/* Progress Indicator */}
              {isLoading && (
                <div className="mt-4 space-y-2 p-4 bg-muted/30 rounded-md">
                  <div className="text-xs font-medium mb-2 text-muted-foreground">Transaction Progress</div>

                  {needsApproval && (
                    <div className="flex items-center gap-2 text-sm">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          step === "approving" ? "bg-primary animate-pulse" : isApproved ? "bg-green-500" : "bg-muted"
                        }`}
                      />
                      <span className={isApproved ? "text-green-500 font-medium" : ""}>
                        {step === "approving" ? "Approving USDC..." : isApproved ? "USDC Approved ✓" : "Approve USDC"}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        step === "depositing"
                          ? "bg-primary animate-pulse"
                          : step === "success"
                            ? "bg-green-500"
                            : "bg-muted"
                      }`}
                    />
                    <span className={step === "success" ? "text-green-500 font-medium" : ""}>
                      {step === "depositing"
                        ? "Depositing to vault..."
                        : step === "success"
                          ? "Deposit Complete ✓"
                          : "Deposit to vault"}
                    </span>
                  </div>
                </div>
              )}
            </form>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button type="submit" form="form-deposit" className="w-full" disabled={isLoading}>
              {step === "idle" && (needsApproval ? "Approve & Deposit" : "Deposit")}
              {step === "approving" && "Approving..."}
              {step === "approved" && "Proceed to Deposit"}
              {step === "depositing" && "Depositing..."}
              {step === "success" && "Success! ✓"}
            </Button>

            {needsApproval && step === "idle" && (
              <p className="text-xs text-muted-foreground text-center">
                This will require 2 transactions: Approve + Deposit
              </p>
            )}
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
