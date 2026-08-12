"use client";

import { useState } from "react";
import { ChevronDown, LogOut, Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import type { SupportedChainId } from "@/lib/chains";
import { shortenAddress } from "@/lib/format";

export function WalletControl({ chainId }: { chainId: SupportedChainId }) {
  const [isOpen, setIsOpen] = useState(false);
  const { address, chainId: walletChainId, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { isPending: isSwitching, switchChain } = useSwitchChain();

  if (isConnected && address) {
    return (
      <div className="wallet-connected">
        <span className="wallet-address">{shortenAddress(address)}</span>
        {walletChainId !== chainId ? (
          <button className="command-button command-button-primary command-button-small" type="button" onClick={() => switchChain({ chainId })}>
            {isSwitching ? "Switching" : "Switch network"}
          </button>
        ) : null}
        <button className="icon-button" type="button" title="Disconnect wallet" aria-label="Disconnect wallet" onClick={() => disconnect()}>
          <LogOut size={16} aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-menu">
      <button className="command-button command-button-dark" type="button" aria-expanded={isOpen} onClick={() => setIsOpen((value) => !value)}>
        <Wallet size={16} aria-hidden="true" />
        {isPending ? "Connecting" : "Connect"}
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {isOpen ? (
        <div className="wallet-options" role="menu">
          {connectors.map((connector) => (
            <button key={connector.uid} type="button" role="menuitem" onClick={() => { connect({ connector, chainId }); setIsOpen(false); }}>
              {connector.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
