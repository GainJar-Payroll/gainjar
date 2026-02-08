import { useForm } from "react-hook-form";
import { parseUnits } from "viem";
import { useAccount, usePublicClient } from "wagmi";
import { useDeployedContractInfo, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  formattedBalance: string; // Saldo yang sudah kamu ambil dari hook balance
  rawBalance: bigint; // Saldo dalam bentuk bigint untuk validasi
}

type FormData = {
  amount: string;
};

export const DepositModal = ({ isOpen, onClose, formattedBalance, rawBalance }: DepositModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: gainJarContractData } = useDeployedContractInfo("GainJar");
  const { data: mockERC20Data } = useDeployedContractInfo("MockERC20");
  const { writeContractAsync: depositTokens, isPending } = useScaffoldWriteContract("GainJar");
  const { writeContractAsync: approveTokens } = useScaffoldWriteContract("MockERC20");
  console.log(rawBalance);
  // Ambil nilai input secara real-time untuk validasi tombol
  const amountInput = watch("amount");
  const onSubmit = async (data: FormData) => {
    try {
      if (!address) {
        console.error("Wallet not connected");
        return;
      }

      const amountInWei = parseUnits(data.amount, 6);
      const GAINJAR_ADDRESS = gainJarContractData!.address;
      const TOKEN_ADDRESS = mockERC20Data!.address;
      // Cek decimals token
      const decimals = await publicClient!.readContract({
        address: TOKEN_ADDRESS as `0x${string}`,
        abi: mockERC20Data!.abi,
        functionName: "decimals",
      });

      console.log("Token decimals:", decimals);

      console.log("=== DEBUG INFO ===");
      console.log("Token Address:", TOKEN_ADDRESS);
      console.log("GainJar Address:", GAINJAR_ADDRESS);
      console.log("Amount:", amountInWei.toString());
      console.log("Meminta izin (Approve)...");
      const approveHash = await approveTokens({
        functionName: "approve",
        args: [GAINJAR_ADDRESS, amountInWei],
      });

      if (approveHash && publicClient && address) {
        console.log("Approve tx:", approveHash);

        await publicClient.waitForTransactionReceipt({
          hash: approveHash,
          confirmations: 2,
        });

        console.log("=== AFTER APPROVE ===");

        // ✅ CEK ALLOWANCE
        const allowance = await publicClient.readContract({
          address: TOKEN_ADDRESS as `0x${string}`,
          abi: mockERC20Data!.abi,
          functionName: "allowance",
          args: [address, GAINJAR_ADDRESS], // Perlu import useAccount
        });

        console.log("Allowance set:", allowance.toString());
        console.log("Amount to deposit:", amountInWei.toString());
        console.log("Sufficient?", allowance >= amountInWei);

        // Delay safety
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // LANGKAH 2: DEPOSIT
      console.log("Melakukan Deposit...");
      await depositTokens({
        functionName: "deposit",
        args: [amountInWei],
      });

      onClose();
    } catch (e) {
      console.error("Deposit error:", e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border p-8 rounded-lg max-w-md w-full shadow-2xl">
        <h3 className="text-xl font-bold mb-2">Deposit USDC</h3>

        <div className="flex justify-between items-center mb-6">
          <p className="text-xs font-mono text-muted-foreground">Your Balance</p>
          <p className="text-xs font-mono font-bold text-blue-500">{formattedBalance} USDC</p>
        </div>

        <p className="text-sm text-muted-foreground mb-6 font-mono">
          Enter the amount of USDC you want to add to your vault.
        </p>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-6">
            <input
              type="number"
              step="any"
              placeholder="0.00"
              {...register("amount", {
                required: "Amount is required",
                validate: {
                  positive: v => parseFloat(v) > 0 || "Must be greater than 0",
                  lessThanBalance: v => parseUnits(v, 6) <= rawBalance || "Insufficient balance",
                },
              })}
              className={`w-full p-3 bg-background border rounded font-mono focus:ring-2 outline-none transition-all ${
                errors.amount ? "border-red-500 focus:ring-red-500" : "border-border focus:ring-blue-500"
              }`}
            />
            {errors.amount && <p className="text-red-500 text-xs mt-2 font-mono">{errors.amount.message}</p>}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border hover:bg-accent transition-colors rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !amountInput || !!errors.amount}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? "Confirming..." : "Deposit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
