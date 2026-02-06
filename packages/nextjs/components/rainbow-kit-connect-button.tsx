"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "~~/components/ui/button";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

/**
 * Custom Wagmi Connect Button (watch balance + custom design)
 */
export const RainbowKitConnectButton = () => {
  const { targetNetwork } = useTargetNetwork();

  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, mounted, openChainModal, openAccountModal }) => {
        const connected = mounted && account && chain;

        return (
          <>
            {(() => {
              if (!connected) {
                return <Button onClick={openConnectModal}>Connect Wallet</Button>;
              }

              if (chain.unsupported || chain.id !== targetNetwork.id) {
                return (
                  <Button onClick={openChainModal} variant={"destructive"}>
                    Wrong Network
                  </Button>
                );
              }

              return (
                <div className={"text-white flex gap-1"}>
                  <Button onClick={openAccountModal}>
                    {account.displayName}
                    {account.displayBalance ? ` (${account.displayBalance})` : ""}
                  </Button>

                  <Button onClick={openChainModal} className={"flex items-center"}>
                    {chain.hasIcon && (
                      <div
                        className="size-3 rounded-full overflow-hidden"
                        style={{
                          background: chain.iconBackground,
                        }}
                      >
                        {chain.iconUrl && (
                          <img alt={chain.name ?? "Chain icon"} src={chain.iconUrl} style={{ width: 12, height: 12 }} />
                        )}
                      </div>
                    )}
                  </Button>
                </div>
              );
            })()}
          </>
        );
      }}
    </ConnectButton.Custom>
  );
};
