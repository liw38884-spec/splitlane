import {
  getAddress,
  isAddress,
  keccak256,
  stringToHex,
  zeroAddress,
  type Address,
  type Hex,
} from "viem";
import { baseSepolia } from "viem/chains";
import { USDC_ADDRESSES } from "./chains";
import type { TabRecord } from "./types";

type AuditAmount = {
  asset: "USDC";
  decimals: 6;
  atomicUnits: string;
};

export type SettlementAuditRecord = {
  schemaVersion: "splitlane.settlement-audit.v1";
  chain: {
    id: string;
    name: "Base Sepolia" | "Ethereum Sepolia";
    environment: "testnet";
  };
  contracts: {
    splitLane: Address;
    usdc: Address;
  };
  settlement: {
    tabId: string;
    title: string;
    metadataHash: Hex;
    recipient: Address;
    status: TabRecord["status"];
    createdAtUnixSeconds: string;
    closedAtUnixSeconds: string;
    totalAmount: AuditAmount;
    remainingAmount: AuditAmount;
  };
  participants: Array<{
    wallet: Address;
    amount: AuditAmount;
    paid: boolean;
  }>;
};

export type SettlementAuditArtifact = {
  record: SettlementAuditRecord;
  verification: {
    algorithm: "keccak256";
    canonicalization: "splitlane-lexicographic-json-v1";
    hashScope: "record";
    recordHash: Hex;
  };
};

function auditAmount(value: bigint): AuditAmount {
  return { asset: "USDC", decimals: 6, atomicUnits: value.toString(10) };
}

function deployedAddress(value: string): Address {
  if (!isAddress(value) || getAddress(value) === zeroAddress) {
    throw new Error("A deployed SplitLane contract is required to create legal audit evidence");
  }
  return getAddress(value);
}

function chainName(chainId: TabRecord["chainId"]): SettlementAuditRecord["chain"]["name"] {
  return chainId === baseSepolia.id ? "Base Sepolia" : "Ethereum Sepolia";
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Canonical JSON does not support non-finite numbers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    );
    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`).join(",")}}`;
  }
  throw new Error(`Canonical JSON cannot encode ${typeof value}`);
}

export function settlementAuditRecordHash(record: SettlementAuditRecord): Hex {
  return keccak256(stringToHex(canonicalJson(record)));
}

export function createSettlementAuditArtifact(
  tab: TabRecord,
  splitLaneContractAddress: string,
): SettlementAuditArtifact {
  const record: SettlementAuditRecord = {
    schemaVersion: "splitlane.settlement-audit.v1",
    chain: {
      id: tab.chainId.toString(10),
      name: chainName(tab.chainId),
      environment: "testnet",
    },
    contracts: {
      splitLane: deployedAddress(splitLaneContractAddress),
      usdc: getAddress(USDC_ADDRESSES[tab.chainId]),
    },
    settlement: {
      tabId: tab.id.toString(10),
      title: tab.title,
      metadataHash: tab.metadataHash.toLowerCase() as Hex,
      recipient: getAddress(tab.recipient),
      status: tab.status,
      createdAtUnixSeconds: tab.createdAt.toString(10),
      closedAtUnixSeconds: tab.closedAt.toString(10),
      totalAmount: auditAmount(tab.totalAmount),
      remainingAmount: auditAmount(tab.remainingAmount),
    },
    participants: tab.shares.map((share) => ({
      wallet: getAddress(share.participant),
      amount: auditAmount(share.amount),
      paid: share.paid,
    })),
  };

  return {
    record,
    verification: {
      algorithm: "keccak256",
      canonicalization: "splitlane-lexicographic-json-v1",
      hashScope: "record",
      recordHash: settlementAuditRecordHash(record),
    },
  };
}

export function verifySettlementAuditArtifact(artifact: SettlementAuditArtifact): boolean {
  return settlementAuditRecordHash(artifact.record) === artifact.verification.recordHash;
}

export function formatSettlementAuditArtifact(artifact: SettlementAuditArtifact): string {
  return `${JSON.stringify(artifact, null, 2)}\n`;
}
