import { blockProver, chainInfo, encoding, proofProvider } from "@gluwa/usc-sdk";
import {
  getAddress,
  id,
  isHexString,
  JsonRpcProvider,
  type JsonRpcSigner,
  type TransactionReceipt,
  type TransactionResponse,
} from "ethers";
import { z } from "zod";

import {
  BASE_SEPOLIA_CHAIN_ID,
  CREDITCOIN_CC3_CHAIN_ID,
  ETHEREUM_SEPOLIA_CHAIN_ID,
} from "./constants.js";
import type { CreditcoinDiscoveryConfig, LaneConfig } from "./config.js";
import { LaneError, errorMessage } from "./errors.js";
import { proofEvidenceSchema, type ProofEvidence } from "./evidence.js";

export type ProofMode = "dry-run" | "verify";

type SourceProvider = Pick<
  JsonRpcProvider,
  "getNetwork" | "getTransaction" | "getTransactionReceipt" | "getBlockNumber"
>;

type NetworkProvider = Pick<JsonRpcProvider, "getNetwork">;

export interface WorkflowDependencies {
  sourceProvider: SourceProvider;
  creditcoinNetworkProvider: NetworkProvider;
  chainInfoProvider: Pick<chainInfo.ChainInfoProvider, "getSupportedChains">;
  proofBuilderFactory: (
    chainKey: number,
  ) => Pick<proofProvider.service.ProofBuilder, "waitUntilHeightAttested" | "getProof">;
  encodeTransaction: (
    transactionHash: string,
    receipt: TransactionReceipt,
  ) => Promise<{ transaction: TransactionResponse; txBytes: string }>;
  blockProver: Pick<blockProver.BlockProvingProvider, "verifySingle" | "verifyAndEmitSingle">;
}

export type ChainDiscoveryDependencies = Pick<
  WorkflowDependencies,
  "creditcoinNetworkProvider" | "chainInfoProvider"
>;

export interface ProofLaneInput {
  mode: ProofMode;
  transactionHash: string;
  signer?: JsonRpcSigner;
}

interface InspectedTransaction {
  transaction: TransactionResponse;
  receipt: TransactionReceipt;
  blockNumber: number;
  confirmations: number;
  functionSelector: string;
}

const proofSchema = z
  .object({
    chainKey: z.number().int().nonnegative(),
    headerNumber: z.number().int().nonnegative(),
    txIndex: z.number().int().nonnegative(),
    txHash: z.string(),
    txBytes: z.string(),
    continuityProof: z.object({
      lowerEndpointDigest: z.string(),
      roots: z.array(z.string()),
    }),
    merkleProof: z.object({
      root: z.string(),
      siblings: z.array(
        z.object({
          hash: z.string(),
          isLeft: z.boolean(),
        }),
      ),
    }),
  })
  .passthrough();

export function createWorkflowDependencies(config: LaneConfig): WorkflowDependencies {
  const sourceProvider = new JsonRpcProvider(config.sourceRpcUrl);
  const creditcoinProvider = new JsonRpcProvider(config.creditcoinRpcUrl);

  return {
    sourceProvider,
    creditcoinNetworkProvider: creditcoinProvider,
    chainInfoProvider: new chainInfo.PrecompileChainInfoProvider(creditcoinProvider),
    proofBuilderFactory: (chainKey) =>
      new proofProvider.service.ProofBuilder(chainKey, config.proofBuilderUrl, config.proofRequestTimeoutMs),
    encodeTransaction: async (transactionHash, receipt) => {
      const transaction = await encoding.getTransactionWithRaw(sourceProvider, transactionHash);
      if (transaction === null) {
        throw new LaneError("TRANSACTION_NOT_FOUND", `Transaction ${transactionHash} was not found during encoding`);
      }
      return {
        transaction: transaction.formatted,
        txBytes: encoding.abiEncode(transaction, receipt).abi,
      };
    },
    blockProver: new blockProver.PrecompileBlockProver(creditcoinProvider),
  };
}

export function createChainDiscoveryDependencies(
  config: CreditcoinDiscoveryConfig,
): ChainDiscoveryDependencies {
  const creditcoinProvider = new JsonRpcProvider(config.creditcoinRpcUrl);
  return {
    creditcoinNetworkProvider: creditcoinProvider,
    chainInfoProvider: new chainInfo.PrecompileChainInfoProvider(creditcoinProvider),
  };
}

export async function discoverSupportedChains(
  dependencies: ChainDiscoveryDependencies,
): Promise<chainInfo.ChainInfo[]> {
  const network = await dependencies.creditcoinNetworkProvider.getNetwork();
  if (network.chainId !== BigInt(CREDITCOIN_CC3_CHAIN_ID)) {
    throw new LaneError(
      "CC3_NETWORK_MISMATCH",
      `Creditcoin RPC must be CC3 Testnet (${CREDITCOIN_CC3_CHAIN_ID}); received chain ${network.chainId}`,
    );
  }

  return dependencies.chainInfoProvider.getSupportedChains();
}

async function resolveEthereumSepoliaChainKey(dependencies: WorkflowDependencies): Promise<number> {
  const supportedChains = await discoverSupportedChains(dependencies);
  const matches = supportedChains.filter((entry) => entry.chainId === ETHEREUM_SEPOLIA_CHAIN_ID);

  if (matches.length === 0) {
    throw new LaneError(
      "SOURCE_CHAIN_UNSUPPORTED",
      "CC3 ChainInfo does not currently report Ethereum Sepolia as a supported source chain",
    );
  }

  if (matches.length !== 1) {
    throw new LaneError(
      "SOURCE_CHAIN_AMBIGUOUS",
      `CC3 ChainInfo returned ${matches.length} entries for Ethereum Sepolia`,
    );
  }

  return matches[0]!.chainKey;
}

async function inspectTransaction(
  transactionHash: string,
  config: LaneConfig,
  sourceProvider: SourceProvider,
): Promise<InspectedTransaction> {
  const normalizedHash = transactionHash.toLowerCase();
  if (!isHexString(normalizedHash, 32)) {
    throw new LaneError("TRANSACTION_NOT_FOUND", "Transaction hash must be a 32-byte hex value");
  }

  const network = await sourceProvider.getNetwork();
  if (network.chainId === BigInt(BASE_SEPOLIA_CHAIN_ID)) {
    throw new LaneError(
      "SOURCE_NETWORK_MISMATCH",
      "Base Sepolia transactions are not accepted by the Attestcoin proof lane",
    );
  }
  if (network.chainId !== BigInt(ETHEREUM_SEPOLIA_CHAIN_ID)) {
    throw new LaneError(
      "SOURCE_NETWORK_MISMATCH",
      `Source RPC must be Ethereum Sepolia (${ETHEREUM_SEPOLIA_CHAIN_ID}); received chain ${network.chainId}`,
    );
  }

  const [transaction, receipt] = await Promise.all([
    sourceProvider.getTransaction(normalizedHash),
    sourceProvider.getTransactionReceipt(normalizedHash),
  ]);

  if (transaction === null) {
    throw new LaneError("TRANSACTION_NOT_FOUND", `Transaction ${normalizedHash} was not found`);
  }
  if (receipt === null || transaction.blockNumber === null || transaction.blockHash === null) {
    throw new LaneError("TRANSACTION_UNCONFIRMED", `Transaction ${normalizedHash} is not confirmed`);
  }
  if (receipt.status !== 1) {
    throw new LaneError("TRANSACTION_REVERTED", `Transaction ${normalizedHash} did not succeed`);
  }
  if (
    transaction.hash.toLowerCase() !== normalizedHash ||
    receipt.hash.toLowerCase() !== normalizedHash ||
    transaction.blockNumber !== receipt.blockNumber ||
    transaction.blockHash.toLowerCase() !== receipt.blockHash.toLowerCase()
  ) {
    throw new LaneError("TRANSACTION_MISMATCH", "RPC transaction and receipt data do not match");
  }
  if (transaction.to === null || getAddress(transaction.to) !== config.splitLaneContractAddress) {
    throw new LaneError(
      "WRONG_CONTRACT",
      `Transaction destination is not configured SplitLane contract ${config.splitLaneContractAddress}`,
    );
  }

  const functionSelector = transaction.data.slice(0, 10).toLowerCase();
  const allowedSelectors = new Set(
    config.allowedFunctionSignatures.map((signature) => id(signature).slice(0, 10).toLowerCase()),
  );
  if (transaction.data.length < 10 || !allowedSelectors.has(functionSelector)) {
    throw new LaneError("WRONG_FUNCTION", `Transaction selector ${functionSelector || "<missing>"} is not allowed`);
  }

  const latestBlock = await sourceProvider.getBlockNumber();
  const confirmations = latestBlock - receipt.blockNumber + 1;
  if (confirmations < config.minimumConfirmations) {
    throw new LaneError(
      "TRANSACTION_UNCONFIRMED",
      `Transaction has ${Math.max(confirmations, 0)} confirmation(s); ${config.minimumConfirmations} required`,
    );
  }

  return {
    transaction,
    receipt,
    blockNumber: receipt.blockNumber,
    confirmations,
    functionSelector,
  };
}

async function assertSignerOnCc3(signer: JsonRpcSigner): Promise<void> {
  if (signer.provider === null) {
    throw new LaneError("SIGNER_REQUIRED", "Verify mode requires an externally injected JsonRpcSigner with a provider");
  }

  const network = await signer.provider.getNetwork();
  if (network.chainId !== BigInt(CREDITCOIN_CC3_CHAIN_ID)) {
    throw new LaneError(
      "SIGNER_NETWORK_MISMATCH",
      `Injected signer must use CC3 Testnet (${CREDITCOIN_CC3_CHAIN_ID}); received chain ${network.chainId}`,
    );
  }
}

export async function executeProofLane(
  input: ProofLaneInput,
  config: LaneConfig,
  dependencies: WorkflowDependencies = createWorkflowDependencies(config),
): Promise<ProofEvidence> {
  if (input.mode === "verify" && input.signer === undefined) {
    throw new LaneError(
      "SIGNER_REQUIRED",
      "Verify mode requires an externally injected JsonRpcSigner; raw private keys are not accepted",
    );
  }

  const inspected = await inspectTransaction(input.transactionHash, config, dependencies.sourceProvider);
  const chainKey = await resolveEthereumSepoliaChainKey(dependencies);
  const proofBuilder = dependencies.proofBuilderFactory(chainKey);

  await proofBuilder.waitUntilHeightAttested(
    chainKey,
    inspected.blockNumber,
    config.attestationPollIntervalMs,
    config.attestationTimeoutMs,
    config.attestationExtraDelayMs,
  );

  const proofResult = await proofBuilder.getProof(input.transactionHash.toLowerCase());
  if (!proofResult.success || proofResult.data === undefined) {
    throw new LaneError("PROOF_BUILD_FAILED", proofResult.error ?? "Proof builder returned no proof data");
  }

  const parsedProof = proofSchema.safeParse(proofResult.data);
  if (!parsedProof.success) {
    throw new LaneError("PROOF_MISMATCH", "Proof builder returned malformed proof data");
  }
  const proof = parsedProof.data;
  const encoded = await dependencies.encodeTransaction(input.transactionHash.toLowerCase(), inspected.receipt);
  if (
    proof.chainKey !== chainKey ||
    proof.headerNumber !== inspected.blockNumber ||
    proof.txHash.toLowerCase() !== input.transactionHash.toLowerCase() ||
    !isHexString(proof.txBytes) ||
    proof.txBytes === "0x" ||
    encoded.transaction.hash.toLowerCase() !== inspected.transaction.hash.toLowerCase() ||
    encoded.transaction.blockNumber !== inspected.transaction.blockNumber ||
    encoded.transaction.blockHash?.toLowerCase() !== inspected.transaction.blockHash?.toLowerCase() ||
    encoded.transaction.to?.toLowerCase() !== inspected.transaction.to?.toLowerCase() ||
    encoded.transaction.data.toLowerCase() !== inspected.transaction.data.toLowerCase() ||
    encoded.txBytes.toLowerCase() !== proof.txBytes.toLowerCase()
  ) {
    throw new LaneError("PROOF_MISMATCH", "Proof data does not match the inspected Ethereum Sepolia transaction");
  }

  let verificationResult: boolean;
  try {
    verificationResult = await dependencies.blockProver.verifySingle(
      proof.chainKey,
      proof.headerNumber,
      proof.txBytes,
      proof.merkleProof,
      proof.continuityProof,
    );
  } catch (error) {
    throw new LaneError("PROOF_VERIFICATION_FAILED", `Read-only proof verification failed: ${errorMessage(error)}`, {
      cause: error,
    });
  }
  if (!verificationResult) {
    throw new LaneError("PROOF_VERIFICATION_FAILED", "Creditcoin BlockProver rejected the inclusion proof");
  }

  let creditcoinTransactionHash: string | null = null;
  if (input.mode === "verify") {
    const signer = input.signer!;
    await assertSignerOnCc3(signer);

    try {
      const submitted = await dependencies.blockProver.verifyAndEmitSingle(
        signer,
        proof.chainKey,
        proof.headerNumber,
        proof.txBytes,
        proof.merkleProof,
        proof.continuityProof,
      );
      const receipt = await submitted.wait();
      if (receipt === null || receipt.status !== 1 || receipt.hash.toLowerCase() !== submitted.hash.toLowerCase()) {
        throw new Error("Creditcoin verification transaction was not confirmed successfully");
      }
      creditcoinTransactionHash = receipt.hash.toLowerCase();
    } catch (error) {
      throw new LaneError(
        "VERIFICATION_SUBMISSION_FAILED",
        `Creditcoin verification submission failed: ${errorMessage(error)}`,
        { cause: error },
      );
    }
  }

  return proofEvidenceSchema.parse({
    schemaVersion: 1,
    mode: input.mode,
    sourceChain: {
      name: "Ethereum Sepolia",
      chainId: ETHEREUM_SEPOLIA_CHAIN_ID,
    },
    transactionHash: input.transactionHash.toLowerCase(),
    blockNumber: inspected.blockNumber,
    confirmations: inspected.confirmations,
    chainKey,
    splitLaneContractAddress: config.splitLaneContractAddress,
    functionSelector: inspected.functionSelector,
    verificationResult: true,
    creditcoinTransactionHash,
  });
}
