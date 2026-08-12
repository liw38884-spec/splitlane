import { baseSepolia, sepolia } from "viem/chains";
import type { SupportedChainId } from "./chains";

const CHAIN_SLUGS: Record<SupportedChainId, string> = {
  [baseSepolia.id]: "base-sepolia",
  [sepolia.id]: "ethereum-sepolia",
};

export type TabSelection = {
  chainId?: SupportedChainId;
  tabId?: bigint;
};

export function parseTabSelection(search: string): TabSelection {
  const params = new URLSearchParams(search);
  const chain = params.get("chain");
  const chainId =
    chain === CHAIN_SLUGS[baseSepolia.id]
      ? baseSepolia.id
      : chain === CHAIN_SLUGS[sepolia.id]
        ? sepolia.id
        : undefined;
  const tab = params.get("tab");
  const tabId = tab && /^[1-9]\d*$/.test(tab) ? BigInt(tab) : undefined;
  return { chainId, tabId };
}

export function tabPath(chainId: SupportedChainId, tabId?: bigint): string {
  const params = new URLSearchParams({ chain: CHAIN_SLUGS[chainId] });
  if (tabId !== undefined) params.set("tab", tabId.toString());
  return `/?${params.toString()}`;
}
