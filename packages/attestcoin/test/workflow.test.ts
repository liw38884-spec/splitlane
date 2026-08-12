import { id, JsonRpcSigner, Network, type TransactionReceipt, type TransactionResponse } from "ethers";
import { describe, expect, it, vi } from "vitest";

import { laneConfigSchema, loadConfig, type LaneConfig } from "../src/config.js";
import { LaneError } from "../src/errors.js";
import { formatProofEvidence } from "../src/evidence.js";
import { runCli } from "../src/cli.js";
import { executeProofLane, type WorkflowDependencies } from "../src/workflow.js";

const TX_BYTES = "0x1234";
const TX_HASH = `0x${"ab".repeat(32)}`;
const BLOCK_HASH = `0x${"cd".repeat(32)}`;
const CC3_TX_HASH = `0x${"ef".repeat(32)}`;
const CONTRACT = "0x1111111111111111111111111111111111111111";
const OTHER_CONTRACT = "0x2222222222222222222222222222222222222222";
const CHAIN_KEY = 7;
const BLOCK_NUMBER = 9_001;
const SELECTOR = id("payShare(uint256)").slice(0, 10).toLowerCase();

const config: LaneConfig = laneConfigSchema.parse({
  sourceRpcUrl: "https://sepolia.example.test",
  creditcoinRpcUrl: "https://cc3.example.test",
  proofBuilderUrl: "https://proof.example.test",
  splitLaneContractAddress: CONTRACT,
  allowedFunctionSignatures: ["payShare(uint256)"],
  minimumConfirmations: 2,
  attestationPollIntervalMs: 100,
  attestationTimeoutMs: 1_000,
  attestationExtraDelayMs: 0,
  proofRequestTimeoutMs: 1_000,
});

function transaction(overrides: Partial<TransactionResponse> = {}): TransactionResponse {
  return {
    hash: TX_HASH,
    to: CONTRACT,
    data: `${SELECTOR}${"00".repeat(32)}`,
    blockNumber: BLOCK_NUMBER,
    blockHash: BLOCK_HASH,
    ...overrides,
  } as TransactionResponse;
}

function receipt(overrides: Partial<TransactionReceipt> = {}): TransactionReceipt {
  return {
    hash: TX_HASH,
    status: 1,
    blockNumber: BLOCK_NUMBER,
    blockHash: BLOCK_HASH,
    ...overrides,
  } as TransactionReceipt;
}

function proof(overrides: Record<string, unknown> = {}) {
  return {
    chainKey: CHAIN_KEY,
    headerNumber: BLOCK_NUMBER,
    txIndex: 3,
    txHash: TX_HASH,
    txBytes: TX_BYTES,
    continuityProof: {
      lowerEndpointDigest: `0x${"01".repeat(32)}`,
      roots: [`0x${"02".repeat(32)}`],
    },
    merkleProof: {
      root: `0x${"03".repeat(32)}`,
      siblings: [{ hash: `0x${"04".repeat(32)}`, isLeft: true }],
    },
    cached: false,
    generatedAt: new Date("2026-08-11T00:00:00Z"),
    ...overrides,
  };
}

function dependencies(options: {
  sourceChainId?: number;
  supportedChains?: Array<{ chainKey: number; chainId: number; chainName: string; chainEncoding: number }>;
  transaction?: TransactionResponse | null;
  receipt?: TransactionReceipt | null;
  proofData?: ReturnType<typeof proof>;
  proofSuccess?: boolean;
  verificationResult?: boolean;
  encodedTransaction?: TransactionResponse;
  encodedTxBytes?: string;
} = {}) {
  const waitUntilHeightAttested = vi.fn().mockResolvedValue(undefined);
  const getProof = vi.fn().mockResolvedValue(
    options.proofSuccess === false
      ? { success: false, error: "not available" }
      : { success: true, data: options.proofData ?? proof() },
  );
  const verifySingle = vi.fn().mockResolvedValue(options.verificationResult ?? true);
  const verifyAndEmitSingle = vi.fn();
  const encodeTransaction = vi.fn().mockResolvedValue({
    transaction: options.encodedTransaction ?? options.transaction ?? transaction(),
    txBytes: options.encodedTxBytes ?? TX_BYTES,
  });

  const value = {
    sourceProvider: {
      getNetwork: vi.fn().mockResolvedValue(Network.from(options.sourceChainId ?? 11_155_111)),
      getTransaction: vi.fn().mockResolvedValue(options.transaction === undefined ? transaction() : options.transaction),
      getTransactionReceipt: vi.fn().mockResolvedValue(options.receipt === undefined ? receipt() : options.receipt),
      getBlockNumber: vi.fn().mockResolvedValue(BLOCK_NUMBER + 1),
    },
    creditcoinNetworkProvider: {
      getNetwork: vi.fn().mockResolvedValue(Network.from(102_031)),
    },
    chainInfoProvider: {
      getSupportedChains: vi.fn().mockResolvedValue(
        options.supportedChains ?? [
          { chainKey: CHAIN_KEY, chainId: 11_155_111, chainName: "Ethereum Sepolia", chainEncoding: 1 },
        ],
      ),
    },
    proofBuilderFactory: vi.fn().mockReturnValue({ waitUntilHeightAttested, getProof }),
    encodeTransaction,
    blockProver: { verifySingle, verifyAndEmitSingle },
  } as unknown as WorkflowDependencies;

  return { value, waitUntilHeightAttested, getProof, encodeTransaction, verifySingle, verifyAndEmitSingle };
}

async function expectLaneError(promise: Promise<unknown>, code: LaneError["code"]): Promise<void> {
  await expect(promise).rejects.toMatchObject({ name: "LaneError", code });
}

describe("executeProofLane", () => {
  it("rejects Base Sepolia before reading a transaction", async () => {
    const mocks = dependencies({ sourceChainId: 84_532 });

    await expectLaneError(
      executeProofLane({ mode: "dry-run", transactionHash: TX_HASH }, config, mocks.value),
      "SOURCE_NETWORK_MISMATCH",
    );
    expect(mocks.value.sourceProvider.getTransaction).not.toHaveBeenCalled();
  });

  it("fails closed when CC3 does not report Ethereum Sepolia", async () => {
    const mocks = dependencies({
      supportedChains: [{ chainKey: 8, chainId: 84_532, chainName: "Base Sepolia", chainEncoding: 1 }],
    });

    await expectLaneError(
      executeProofLane({ mode: "dry-run", transactionHash: TX_HASH }, config, mocks.value),
      "SOURCE_CHAIN_UNSUPPORTED",
    );
    expect(mocks.getProof).not.toHaveBeenCalled();
  });

  it("rejects a transaction without a confirmed receipt", async () => {
    const mocks = dependencies({ receipt: null });

    await expectLaneError(
      executeProofLane({ mode: "dry-run", transactionHash: TX_HASH }, config, mocks.value),
      "TRANSACTION_UNCONFIRMED",
    );
  });

  it("rejects a reverted transaction", async () => {
    const mocks = dependencies({ receipt: receipt({ status: 0 }) });

    await expectLaneError(
      executeProofLane({ mode: "dry-run", transactionHash: TX_HASH }, config, mocks.value),
      "TRANSACTION_REVERTED",
    );
  });

  it("rejects calls to any address other than configured SplitLane", async () => {
    const mocks = dependencies({ transaction: transaction({ to: OTHER_CONTRACT }) });

    await expectLaneError(
      executeProofLane({ mode: "dry-run", transactionHash: TX_HASH }, config, mocks.value),
      "WRONG_CONTRACT",
    );
  });

  it("rejects an unconfigured function selector", async () => {
    const wrongSelector = id("closeTab(uint256)").slice(0, 10);
    const mocks = dependencies({ transaction: transaction({ data: wrongSelector }) });

    await expectLaneError(
      executeProofLane({ mode: "dry-run", transactionHash: TX_HASH }, config, mocks.value),
      "WRONG_FUNCTION",
    );
  });

  it("rejects proof data for another transaction", async () => {
    const mocks = dependencies({ proofData: proof({ txHash: `0x${"99".repeat(32)}` }) });

    await expectLaneError(
      executeProofLane({ mode: "dry-run", transactionHash: TX_HASH }, config, mocks.value),
      "PROOF_MISMATCH",
    );
  });

  it("rejects proof bytes that do not hash to the inspected transaction", async () => {
    const mocks = dependencies({ proofData: proof({ txBytes: "0xabcd" }) });

    await expectLaneError(
      executeProofLane({ mode: "dry-run", transactionHash: TX_HASH }, config, mocks.value),
      "PROOF_MISMATCH",
    );
    expect(mocks.verifySingle).not.toHaveBeenCalled();
  });

  it("rejects a proof that BlockProver does not verify", async () => {
    const mocks = dependencies({ verificationResult: false });

    await expectLaneError(
      executeProofLane({ mode: "dry-run", transactionHash: TX_HASH }, config, mocks.value),
      "PROOF_VERIFICATION_FAILED",
    );
  });

  it("builds and verifies a dry-run without submitting a transaction", async () => {
    const mocks = dependencies();

    const evidence = await executeProofLane(
      { mode: "dry-run", transactionHash: TX_HASH.toUpperCase().replace("0X", "0x") },
      config,
      mocks.value,
    );

    expect(mocks.waitUntilHeightAttested).toHaveBeenCalledWith(CHAIN_KEY, BLOCK_NUMBER, 100, 1_000, 0);
    expect(mocks.getProof).toHaveBeenCalledWith(TX_HASH);
    expect(mocks.verifySingle).toHaveBeenCalledOnce();
    expect(mocks.verifyAndEmitSingle).not.toHaveBeenCalled();
    expect(evidence).toEqual({
      schemaVersion: 1,
      mode: "dry-run",
      sourceChain: { name: "Ethereum Sepolia", chainId: 11_155_111 },
      transactionHash: TX_HASH,
      blockNumber: BLOCK_NUMBER,
      confirmations: 2,
      chainKey: CHAIN_KEY,
      splitLaneContractAddress: CONTRACT,
      functionSelector: SELECTOR,
      verificationResult: true,
      creditcoinTransactionHash: null,
    });
  });

  it("requires a signer before verify mode performs RPC work", async () => {
    const mocks = dependencies();

    await expectLaneError(executeProofLane({ mode: "verify", transactionHash: TX_HASH }, config, mocks.value), "SIGNER_REQUIRED");
    expect(mocks.value.sourceProvider.getNetwork).not.toHaveBeenCalled();
  });

  it("submits only with an injected CC3 JsonRpcSigner and records its receipt hash", async () => {
    const mocks = dependencies();
    const signer = {
      provider: { getNetwork: vi.fn().mockResolvedValue(Network.from(102_031)) },
    } as unknown as JsonRpcSigner;
    mocks.verifyAndEmitSingle.mockResolvedValue({
      hash: CC3_TX_HASH,
      wait: vi.fn().mockResolvedValue({ hash: CC3_TX_HASH, status: 1 }),
    });

    const evidence = await executeProofLane({ mode: "verify", transactionHash: TX_HASH, signer }, config, mocks.value);

    expect(mocks.verifySingle).toHaveBeenCalledBefore(mocks.verifyAndEmitSingle);
    expect(mocks.verifyAndEmitSingle).toHaveBeenCalledWith(
      signer,
      CHAIN_KEY,
      BLOCK_NUMBER,
      TX_BYTES,
      expect.any(Object),
      expect.any(Object),
    );
    expect(evidence.creditcoinTransactionHash).toBe(CC3_TX_HASH);
  });
});

describe("configuration and evidence", () => {
  it("discovers CC3 chains without requiring source-lane configuration", async () => {
    const mocks = dependencies();
    const write = vi.fn();

    await runCli(["chains"], {
      env: {},
      dependencies: mocks.value,
      stdout: { write },
    });

    expect(write).toHaveBeenCalledOnce();
    expect(JSON.parse(String(write.mock.calls[0]![0]))).toMatchObject({
      creditcoinNetwork: "CC3 Testnet",
      supportedSourceChains: [{ chainKey: CHAIN_KEY, chainId: 11_155_111 }],
    });
    expect(mocks.value.sourceProvider.getNetwork).not.toHaveBeenCalled();
  });

  it("does not read or expose raw private-key environment variables", () => {
    const loaded = loadConfig({
      ETHEREUM_SEPOLIA_RPC_URL: "https://sepolia.example.test",
      SPLITLANE_ETHEREUM_SEPOLIA_ADDRESS: CONTRACT,
      PRIVATE_KEY: "must-not-be-read",
    });

    expect(loaded).not.toHaveProperty("privateKey");
    expect(JSON.stringify(loaded)).not.toContain("must-not-be-read");
  });

  it("formats stable structured JSON proof evidence", () => {
    const formatted = formatProofEvidence({
      schemaVersion: 1,
      mode: "dry-run",
      sourceChain: { name: "Ethereum Sepolia", chainId: 11_155_111 },
      transactionHash: TX_HASH,
      blockNumber: BLOCK_NUMBER,
      confirmations: 2,
      chainKey: CHAIN_KEY,
      splitLaneContractAddress: CONTRACT,
      functionSelector: SELECTOR,
      verificationResult: true,
      creditcoinTransactionHash: null,
    });

    expect(formatted).toBe(`${JSON.stringify(JSON.parse(formatted), null, 2)}\n`);
    expect(JSON.parse(formatted)).toMatchObject({
      sourceChain: { name: "Ethereum Sepolia", chainId: 11_155_111 },
      transactionHash: TX_HASH,
      blockNumber: BLOCK_NUMBER,
      chainKey: CHAIN_KEY,
      verificationResult: true,
      creditcoinTransactionHash: null,
    });
  });
});
