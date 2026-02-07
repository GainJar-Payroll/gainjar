import { PropsWithChildren } from "react";
import TopBar from "~~/components/dashboard/top-bar";
import { WalletGate } from "~~/provider/wallet-gate";

export default function layout({ children }: PropsWithChildren) {
  return (
    <WalletGate>
      <TopBar />
      {children}
    </WalletGate>
  );
}
