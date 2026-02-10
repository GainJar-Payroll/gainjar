import { useCallback, useState } from "react";
import { toast } from "sonner";

export type TransactionStep = "idle" | "approving" | "approved" | "depositing" | "creating" | "success";

interface UseTransactionFlowOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useTransactionFlow(options: UseTransactionFlowOptions = {}) {
  const [step, setStep] = useState<TransactionStep>("idle");
  const [isLoading, setIsLoading] = useState(false);

  const startTransaction = useCallback(() => {
    setStep("idle");
    setIsLoading(false);
  }, []);

  const handleApprove = useCallback(async (approvalFn: () => Promise<void>) => {
    try {
      setStep("approving");
      setIsLoading(true);

      toast.info("Step 1/2: Approving...", {
        description: "Confirm in your wallet",
      });

      await approvalFn();

      setStep("approved");
      toast.success("Approved!");
    } catch (error) {
      setStep("idle");
      setIsLoading(false);
      throw error;
    }
  }, []);

  const handleTransaction = useCallback(
    async (transactionFn: () => Promise<void>, needsApproval = false) => {
      try {
        setStep(needsApproval ? "depositing" : "creating");
        setIsLoading(true);

        const stepText = needsApproval ? "Step 2/2" : "";
        toast.info(`${stepText} Processing...`, {
          description: "Confirm in your wallet",
        });

        await transactionFn();

        setStep("success");
        setIsLoading(false);

        toast.success(options.successMessage || "Transaction Successful!");

        if (options.onSuccess) {
          options.onSuccess();
        }
      } catch (error: any) {
        setStep("idle");
        setIsLoading(false);

        if (error?.message?.includes("User rejected") || error?.message?.includes("User denied")) {
          toast.error("Transaction Cancelled");
          return;
        }

        toast.error(options.errorMessage || "Transaction Failed", {
          description: error?.shortMessage || error?.message,
        });

        if (options.onError) {
          options.onError(error);
        }

        throw error;
      }
    },
    [options],
  );

  const reset = useCallback(() => {
    setStep("idle");
    setIsLoading(false);
  }, []);

  return {
    step,
    isLoading,
    handleApprove,
    handleTransaction,
    startTransaction,
    reset,
  };
}
