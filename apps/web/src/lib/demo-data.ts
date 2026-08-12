import type { SupportedChainId } from "./chains";
import type { TabRecord } from "./types";
import { baseSepolia } from "viem/chains";

const RECIPIENT = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8" as const;
const MAYA = "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc" as const;
const LEO = "0x90f79bf6eb2c4f870365e785982e1f101e93b906" as const;
const NIA = "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65" as const;
const NOW = BigInt(Math.floor(Date.now() / 1000));

const baseTabs: TabRecord[] = [
  {
    chainId: baseSepolia.id,
    id: 28n,
    title: "Lisbon house",
    recipient: RECIPIENT,
    metadataHash: `0x${"28".padStart(64, "0")}`,
    createdAt: NOW - 60n * 60n * 8n,
    closedAt: 0n,
    status: "open",
    totalAmount: 186_500_000n,
    remainingAmount: 62_500_000n,
    shares: [
      { participant: MAYA, amount: 62_000_000n, paid: true },
      { participant: LEO, amount: 62_000_000n, paid: true },
      { participant: NIA, amount: 62_500_000n, paid: false },
    ],
  },
  {
    chainId: baseSepolia.id,
    id: 27n,
    title: "Studio dinner",
    recipient: MAYA,
    metadataHash: `0x${"27".padStart(64, "0")}`,
    createdAt: NOW - 60n * 60n * 30n,
    closedAt: NOW - 60n * 60n * 26n,
    status: "settled",
    totalAmount: 84_000_000n,
    remainingAmount: 0n,
    shares: [
      { participant: RECIPIENT, amount: 42_000_000n, paid: true },
      { participant: NIA, amount: 42_000_000n, paid: true },
    ],
  },
  {
    chainId: baseSepolia.id,
    id: 24n,
    title: "Design sprint",
    recipient: RECIPIENT,
    metadataHash: `0x${"24".padStart(64, "0")}`,
    createdAt: NOW - 60n * 60n * 72n,
    closedAt: NOW - 60n * 60n * 48n,
    status: "closed",
    totalAmount: 120_000_000n,
    remainingAmount: 40_000_000n,
    shares: [
      { participant: MAYA, amount: 40_000_000n, paid: true },
      { participant: LEO, amount: 40_000_000n, paid: false },
      { participant: NIA, amount: 40_000_000n, paid: true },
    ],
  },
];

export function getDemoTabs(chainId: SupportedChainId): TabRecord[] {
  if (chainId === baseSepolia.id) return structuredClone(baseTabs);
  return structuredClone(
    baseTabs.map((tab, index) => ({
      ...tab,
      chainId,
      id: BigInt(11 - index),
      title: index === 0 ? "Research cohort" : tab.title,
    })),
  );
}

export const DEMO_CONNECTED_ADDRESS = NIA satisfies `0x${string}`;
