"use client";

import * as React from "react";
import { AmountInput } from "../amount-input";
import { TransactionAlert } from "../transaction-alert";
import { TransactionProgress } from "../transaction-progress";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { formatUnits, parseUnits } from "viem";
import { useAccount } from "wagmi";
import * as z from "zod";
import { Button } from "~~/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~~/components/ui/card";
import {
  useDeployedContractInfo,
  useScaffoldReadContract,
  useScaffoldWriteContract,
} from "~~/hooks/scaffold-eth";
import { useTransactionFlow } from "~~/hooks/useTransactionFlow";

const formSchema = z.object({
  amount: z.coerce.number().positive().min(1, "Minimum 1 USDC"),
});

type FormData = z.infer<typeof formSchema>;

export function DepositModal() {
  const [open, setOpen] = React.useState(false);
  const { address } = useAccount();

  const { step, isLoading, handleApprove, handleTransaction, reset } =
    useTransactionFlow({
      successMessage: "Deposit Successful!",
      onSuccess: () => setTimeout(() => setOpen(false), 1500),
    });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: 0 },
  });

  const { data: gainjar } = useDeployedContractInfo({
    contractName: "GainJar",
  });

  const { data: usdcBalance } = useScaffoldReadContract({
    contractName: "USDC",
    functionName: "balanceOf",
    args: [address],
  });

  const { data: currentAllowance, refetch: refetchAllowance } =
    useScaffoldReadContract({
      contractName: "USDC",
      functionName: "allowance",
      args: [address, gainjar?.address as `0x${string}`],
    });

  const { writeContractAsync: writeUSDC } = useScaffoldWriteContract({
    contractName: "USDC",
  });
  const { writeContractAsync: writeGainJar } = useScaffoldWriteContract({
    contractName: "GainJar",
  });

  const watchAmount = form.watch("amount");
  const formattedBalance = formatUnits(usdcBalance || 0n, 6);

  const needsApproval = React.useMemo(() => {
    if (!watchAmount || !currentAllowance) return true;
    return currentAllowance < parseUnits(watchAmount.toString(), 6);
  }, [watchAmount, currentAllowance]);

  React.useEffect(() => {
    if (!open) {
      reset();
      form.reset();
    }
  }, [open, form, reset]);

  async function onSubmit(data: FormData) {
    const amount = parseUnits(data.amount.toString(), 6);

    if (needsApproval) {
      await handleApprove(async () => {
        await writeUSDC({
          functionName: "approve",
          args: [gainjar?.address as `0x${string}`, amount],
        });
        await refetchAllowance();
      });
    }

    await handleTransaction(async () => {
      await writeGainJar({
        functionName: "deposit",
        args: [amount],
      });
    }, needsApproval);
  }

  const isApproved =
    step === "approved" || step === "depositing" || step === "success";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="lg" className="uppercase tracking-wider">
            Deposit
          </Button>
        }
      ></DialogTrigger>

      <DialogContent className="sm:max-w-sm p-0">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle className="font-heading">Deposit to Vault</CardTitle>
          </CardHeader>

          <CardContent>
            <form
              id="form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <Controller
                name="amount"
                control={form.control}
                render={({ field, fieldState }) => (
                  <AmountInput
                    label="Amount USDC"
                    value={field.value === 0 ? "" : field.value}
                    onChange={(e) => {
                      const val = e.target ? e.target.value : e;
                      if (val === "") {
                        field.onChange("");
                        return;
                      }
                      const cleanVal = val.toString().replace(/^0+(?=\d)/, "");
                      field.onChange(cleanVal);
                    }}
                    error={fieldState.error}
                    maxBalance={formattedBalance}
                    onMaxClick={() => field.onChange(Number(formattedBalance))}
                    disabled={isLoading}
                    helperText={
                      needsApproval
                        ? "⚠️ Approval required"
                        : currentAllowance
                          ? "✓ Already approved"
                          : undefined
                    }
                  />
                )}
              />

              {isLoading && (
                <TransactionProgress
                  steps={[
                    ...(needsApproval
                      ? [
                          {
                            label:
                              step === "approving"
                                ? "Approving..."
                                : isApproved
                                  ? "Approved ✓"
                                  : "Approve USDC",
                            status: (step === "approving"
                              ? "loading"
                              : isApproved
                                ? "success"
                                : "idle") as any,
                          },
                        ]
                      : []),
                    {
                      label:
                        step === "depositing"
                          ? "Depositing..."
                          : step === "success"
                            ? "Deposited ✓"
                            : "Deposit to Vault",
                      status: (step === "depositing"
                        ? "loading"
                        : step === "success"
                          ? "success"
                          : "idle") as any,
                    },
                  ]}
                />
              )}
            </form>
          </CardContent>

          <CardFooter className="flex-col gap-2">
            <Button
              type="submit"
              form="form"
              className="w-full uppercase tracking-wider"
              disabled={isLoading}
            >
              {step === "idle" &&
                (needsApproval ? "Approve & Deposit" : "Deposit")}
              {step === "approving" && "Approving..."}
              {step === "approved" && "Depositing..."}
              {step === "depositing" && "Depositing..."}
              {step === "success" && "Success ✓"}
            </Button>

            {needsApproval && step === "idle" && (
              <TransactionAlert
                type="info"
                title="Requires 2 transactions: Approve + Deposit"
              />
            )}
          </CardFooter>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
