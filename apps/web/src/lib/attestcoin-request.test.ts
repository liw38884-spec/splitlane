import { describe, expect, it } from "vitest";
import {
  createAttestcoinProofJob,
  formatAttestcoinCommand,
  parseAttestcoinProofJob,
} from "./attestcoin-request";

const contractAddress = "0x1EE8dCEE85c5bD8bA8D21B599D08Acc3E80C0d6c";
const transactionHash = `0x${"12".repeat(32)}`;

describe("Attestcoin proof job", () => {
  it("creates a fail-closed dry-run job for the real package CLI", () => {
    const job = createAttestcoinProofJob(transactionHash.toUpperCase().replace("0X", "0x"), contractAddress);

    expect(job).toMatchObject({
      schemaVersion: 1,
      kind: "splitlane.attestcoin-proof",
      status: "not-executed",
      mode: "dry-run",
      sourceChain: { name: "Ethereum Sepolia", chainId: 11_155_111 },
      transactionHash,
      splitLaneContractAddress: contractAddress,
      allowedFunctionSignatures: ["payShare(uint256)"],
      requiredEnvironment: [
        "ETHEREUM_SEPOLIA_RPC_URL",
        "SPLITLANE_ETHEREUM_SEPOLIA_ADDRESS",
      ],
    });
    expect(job.execution.argv.at(-1)).toBe(transactionHash);
    expect(formatAttestcoinCommand(job)).toBe(
      `npm --prefix packages/attestcoin run start -- dry-run --tx ${transactionHash}`,
    );
    expect(parseAttestcoinProofJob(JSON.parse(JSON.stringify(job)))).toEqual(job);
  });

  it.each([
    "0x1234",
    `0x${"gg".repeat(32)}`,
    `${"12".repeat(32)}`,
  ])("rejects an invalid transaction hash: %s", (value) => {
    expect(() => createAttestcoinProofJob(value, contractAddress)).toThrow("32-byte transaction hash");
  });

  it("rejects zero contract addresses and extra job fields", () => {
    expect(() =>
      createAttestcoinProofJob(transactionHash, "0x0000000000000000000000000000000000000000"),
    ).toThrow("deployed SplitLane contract");

    const job = createAttestcoinProofJob(transactionHash, contractAddress);
    expect(() => parseAttestcoinProofJob({ ...job, verificationResult: true })).toThrow();
  });
});
