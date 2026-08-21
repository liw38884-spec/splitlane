import { describe, expect, it } from "vitest";
import { baseSepolia } from "viem/chains";
import type { TabRecord } from "./types";
import { createSettlementAuditArtifact, verifySettlementAuditArtifact } from "./audit-record";

const contractAddress = "0x1EE8dCEE85c5bD8bA8D21B599D08Acc3E80C0d6c";

const tab: TabRecord = {
  chainId: baseSepolia.id,
  id: 42n,
  title: "Lisbon house",
  recipient: "0x1111111111111111111111111111111111111111",
  metadataHash: `0x${"ab".repeat(32)}`,
  createdAt: 1_725_000_000n,
  closedAt: 0n,
  status: "open",
  totalAmount: 30_000_001n,
  remainingAmount: 20_000_001n,
  shares: [
    {
      participant: "0x2222222222222222222222222222222222222222",
      amount: 10_000_000n,
      paid: true,
    },
    {
      participant: "0x3333333333333333333333333333333333333333",
      amount: 20_000_001n,
      paid: false,
    },
  ],
};

describe("settlement audit artifact", () => {
  it("serializes a deterministic, bigint-free legal audit record", () => {
    const artifact = createSettlementAuditArtifact(tab, contractAddress);

    expect(artifact.record).toMatchObject({
      schemaVersion: "splitlane.settlement-audit.v1",
      chain: { id: "84532", name: "Base Sepolia" },
      contracts: {
        splitLane: contractAddress,
        usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      },
      settlement: {
        tabId: "42",
        totalAmount: { asset: "USDC", decimals: 6, atomicUnits: "30000001" },
        remainingAmount: { asset: "USDC", decimals: 6, atomicUnits: "20000001" },
      },
    });
    expect(artifact.record.participants.map((participant) => participant.amount.atomicUnits)).toEqual([
      "10000000",
      "20000001",
    ]);
    expect(() => JSON.stringify(artifact)).not.toThrow();
    expect(createSettlementAuditArtifact(tab, contractAddress)).toEqual(artifact);
    expect(verifySettlementAuditArtifact(artifact)).toBe(true);
  });

  it("detects any mutation of the record covered by the verification hash", () => {
    const artifact = createSettlementAuditArtifact(tab, contractAddress);
    const changed = structuredClone(artifact);
    changed.record.settlement.title = "Changed after export";

    expect(changed.verification.recordHash).toBe(artifact.verification.recordHash);
    expect(verifySettlementAuditArtifact(changed)).toBe(false);
  });

  it("rejects a missing deployment instead of presenting demo data as legal evidence", () => {
    expect(() =>
      createSettlementAuditArtifact(tab, "0x0000000000000000000000000000000000000000"),
    ).toThrow("deployed SplitLane contract");
  });
});
