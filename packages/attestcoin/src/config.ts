import { getAddress, isAddress } from "ethers";
import { z } from "zod";

import { DEFAULT_CC3_PROOF_BUILDER_URL, DEFAULT_CC3_RPC_URL } from "./constants.js";
import { LaneError } from "./errors.js";

const addressSchema = z
  .string()
  .refine(isAddress, "must be a valid EVM address")
  .transform((value) => getAddress(value));

const functionSignatureSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z_$][A-Za-z0-9_$]*\([^\s]*\)$/, "must be a canonical Solidity function signature");

export const laneConfigSchema = z
  .object({
    sourceRpcUrl: z.url(),
    creditcoinRpcUrl: z.url(),
    proofBuilderUrl: z.url(),
    splitLaneContractAddress: addressSchema,
    allowedFunctionSignatures: z.array(functionSignatureSchema).min(1),
    minimumConfirmations: z.number().int().min(1).max(1_000),
    attestationPollIntervalMs: z.number().int().min(100).max(300_000),
    attestationTimeoutMs: z.number().int().min(1_000).max(3_600_000),
    attestationExtraDelayMs: z.number().int().min(0).max(300_000),
    proofRequestTimeoutMs: z.number().int().min(1_000).max(300_000),
  })
  .strict();

export type LaneConfig = z.infer<typeof laneConfigSchema>;

export const creditcoinDiscoveryConfigSchema = z
  .object({
    creditcoinRpcUrl: z.url(),
  })
  .strict();

export type CreditcoinDiscoveryConfig = z.infer<typeof creditcoinDiscoveryConfigSchema>;

const positiveInteger = (name: string, value: string | undefined, fallback: number): number => {
  if (value === undefined || value === "") {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    throw new LaneError("CONFIG_INVALID", `${name} must be a positive integer`);
  }

  return Number(value);
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): LaneConfig {
  const signatures = (env.SPLITLANE_ALLOWED_FUNCTION_SIGNATURES ?? "payShare(uint256)")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const input = {
    sourceRpcUrl: env.ETHEREUM_SEPOLIA_RPC_URL,
    creditcoinRpcUrl: env.CREDITCOIN_CC3_RPC_URL ?? DEFAULT_CC3_RPC_URL,
    proofBuilderUrl: env.CREDITCOIN_CC3_PROOF_BUILDER_URL ?? DEFAULT_CC3_PROOF_BUILDER_URL,
    splitLaneContractAddress: env.SPLITLANE_ETHEREUM_SEPOLIA_ADDRESS,
    allowedFunctionSignatures: signatures,
    minimumConfirmations: positiveInteger("ATTESTCOIN_MIN_CONFIRMATIONS", env.ATTESTCOIN_MIN_CONFIRMATIONS, 1),
    attestationPollIntervalMs: positiveInteger(
      "ATTESTCOIN_POLL_INTERVAL_MS",
      env.ATTESTCOIN_POLL_INTERVAL_MS,
      15_000,
    ),
    attestationTimeoutMs: positiveInteger("ATTESTCOIN_TIMEOUT_MS", env.ATTESTCOIN_TIMEOUT_MS, 900_000),
    attestationExtraDelayMs: positiveInteger(
      "ATTESTCOIN_EXTRA_DELAY_MS",
      env.ATTESTCOIN_EXTRA_DELAY_MS,
      5_000,
    ),
    proofRequestTimeoutMs: positiveInteger(
      "ATTESTCOIN_PROOF_REQUEST_TIMEOUT_MS",
      env.ATTESTCOIN_PROOF_REQUEST_TIMEOUT_MS,
      30_000,
    ),
  };

  const result = laneConfigSchema.safeParse(input);
  if (!result.success) {
    throw new LaneError("CONFIG_INVALID", z.prettifyError(result.error));
  }

  return result.data;
}

export function loadCreditcoinDiscoveryConfig(
  env: NodeJS.ProcessEnv = process.env,
): CreditcoinDiscoveryConfig {
  const result = creditcoinDiscoveryConfigSchema.safeParse({
    creditcoinRpcUrl: env.CREDITCOIN_CC3_RPC_URL ?? DEFAULT_CC3_RPC_URL,
  });
  if (!result.success) {
    throw new LaneError("CONFIG_INVALID", z.prettifyError(result.error));
  }

  return result.data;
}
