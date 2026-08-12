import type { Address } from "viem";
import { baseSepolia, sepolia } from "viem/chains";

export const SUPPORTED_CHAIN_IDS = [baseSepolia.id, sepolia.id] as const;

export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

export const USDC_ADDRESSES: Record<SupportedChainId, Address> = {
  [baseSepolia.id]: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  [sepolia.id]: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
};

export const EXPLORER_TX_URLS: Record<SupportedChainId, string> = {
  [baseSepolia.id]: "https://sepolia.basescan.org/tx/",
  [sepolia.id]: "https://sepolia.etherscan.io/tx/",
};

export const NETWORK_LABELS: Record<SupportedChainId, string> = {
  [baseSepolia.id]: "Base",
  [sepolia.id]: "Ethereum",
};

export function isSupportedChainId(chainId: number): chainId is SupportedChainId {
  return SUPPORTED_CHAIN_IDS.includes(chainId as SupportedChainId);
}
