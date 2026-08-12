import { getAddress, isAddress, zeroAddress, type Address } from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import type { SupportedChainId } from "./chains";

export const splitLaneAbi = [
  {
    type: "function",
    name: "nextTabId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "createTab",
    stateMutability: "nonpayable",
    inputs: [
      { name: "title", type: "string" },
      { name: "metadataHash", type: "bytes32" },
      { name: "participants", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    outputs: [{ name: "tabId", type: "uint256" }],
  },
  {
    type: "function",
    name: "payShare",
    stateMutability: "nonpayable",
    inputs: [{ name: "tabId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "closeTab",
    stateMutability: "nonpayable",
    inputs: [{ name: "tabId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getTab",
    stateMutability: "view",
    inputs: [{ name: "tabId", type: "uint256" }],
    outputs: [
      { name: "recipient", type: "address" },
      { name: "title", type: "string" },
      { name: "metadataHash", type: "bytes32" },
      { name: "createdAt", type: "uint256" },
      { name: "closedAt", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "totalAmount", type: "uint256" },
      { name: "remainingAmount", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "getParticipants",
    stateMutability: "view",
    inputs: [{ name: "tabId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "getShare",
    stateMutability: "view",
    inputs: [
      { name: "tabId", type: "uint256" },
      { name: "participant", type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint256" },
      { name: "paid", type: "bool" },
    ],
  },
] as const;

export const usdcAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

function envAddress(value: string | undefined): Address {
  return value && isAddress(value) ? getAddress(value) : zeroAddress;
}

export const SPLITLANE_ADDRESSES: Record<SupportedChainId, Address> = {
  [baseSepolia.id]: envAddress(process.env.NEXT_PUBLIC_SPLITLANE_BASE_SEPOLIA_ADDRESS),
  [sepolia.id]: envAddress(process.env.NEXT_PUBLIC_SPLITLANE_ETHEREUM_SEPOLIA_ADDRESS),
};

export function hasLiveContract(chainId: SupportedChainId): boolean {
  return SPLITLANE_ADDRESSES[chainId] !== zeroAddress;
}
