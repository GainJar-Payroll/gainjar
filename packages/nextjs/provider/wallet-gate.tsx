"use client";

import { useAccount } from "wagmi";
import { RainbowKitConnectButton } from "~~/components/rainbow-kit-connect-button";

export function WalletGate({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  console.log("🚀 ~ WalletGate ~ isConnected:", isConnected);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p>Connect wallet to continue</p>
        <RainbowKitConnectButton />
      </div>
    );
  }

  return <>{children}</>;
}
