import type { Address } from "viem";
import type { SupportedChainId } from "./chains";

export type TabStatus = "open" | "settled" | "closed";

export type ShareRecord = {
  participant: Address;
  amount: bigint;
  paid: boolean;
};

export type TabRecord = {
  chainId: SupportedChainId;
  id: bigint;
  title: string;
  recipient: Address;
  metadataHash: `0x${string}`;
  createdAt: bigint;
  closedAt: bigint;
  status: TabStatus;
  totalAmount: bigint;
  remainingAmount: bigint;
  shares: ShareRecord[];
};

export type NewTabInput = {
  title: string;
  participants: Address[];
  amounts: bigint[];
};

export type TransactionState = {
  stage: "idle" | "approving" | "submitting" | "confirming" | "success" | "error";
  message: string;
  hash?: `0x${string}`;
  chainId?: SupportedChainId;
};
