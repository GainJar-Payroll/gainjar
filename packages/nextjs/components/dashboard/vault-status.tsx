"use client";

import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { EVaultStatus, VaultStatusLabel } from "~~/types/type";

export default function VaultStatus() {
  const { address } = useAccount();

  const { data, isLoading } = useScaffoldReadContract({
    contractName: "GainJar",
    functionName: "getVaultHealth",
    args: [address],
  });
  console.log("🚀 ~ VaultStatus ~ data:", data);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  const status = data?.[0] !== undefined ? (Number(data[0]) as EVaultStatus) : EVaultStatus.HEALTHY;

  return (
    <div className="border border-foreground bg-foreground/10 p-10">
      <p>{VaultStatusLabel[status]}</p>
    </div>
  );
}
