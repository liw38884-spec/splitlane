import { getAddress, isAddress, zeroAddress } from "viem";
import { z } from "zod";

const transactionHashSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{64}$/, "Enter a 32-byte transaction hash")
  .transform((value) => value.toLowerCase() as `0x${string}`);

const deployedAddressSchema = z
  .string()
  .refine(isAddress, "A valid SplitLane contract address is required")
  .transform((value) => getAddress(value))
  .refine((value) => value !== zeroAddress, "A deployed SplitLane contract is required");

export const attestcoinProofJobSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("splitlane.attestcoin-proof"),
    status: z.literal("not-executed"),
    mode: z.literal("dry-run"),
    sourceChain: z
      .object({
        name: z.literal("Ethereum Sepolia"),
        chainId: z.literal(11_155_111),
      })
      .strict(),
    transactionHash: transactionHashSchema,
    splitLaneContractAddress: deployedAddressSchema,
    allowedFunctionSignatures: z.tuple([z.literal("payShare(uint256)")]),
    requiredEnvironment: z.tuple([
      z.literal("ETHEREUM_SEPOLIA_RPC_URL"),
      z.literal("SPLITLANE_ETHEREUM_SEPOLIA_ADDRESS"),
    ]),
    execution: z
      .object({
        workingDirectory: z.literal("repository-root"),
        argv: z.tuple([
          z.literal("npm"),
          z.literal("--prefix"),
          z.literal("packages/attestcoin"),
          z.literal("run"),
          z.literal("start"),
          z.literal("--"),
          z.literal("dry-run"),
          z.literal("--tx"),
          transactionHashSchema,
        ]),
      })
      .strict(),
    outputPolicy: z
      .object({
        evidenceSchemaVersion: z.literal(1),
        requireReadOnlyVerification: z.literal(true),
        submitsCreditcoinTransaction: z.literal(false),
      })
      .strict(),
  })
  .strict()
  .superRefine((job, context) => {
    if (job.execution.argv[8] !== job.transactionHash) {
      context.addIssue({
        code: "custom",
        message: "CLI transaction hash must match the proof job transaction hash",
        path: ["execution", "argv", 8],
      });
    }
  });

export type AttestcoinProofJob = z.infer<typeof attestcoinProofJobSchema>;

export function createAttestcoinProofJob(
  transactionHash: string,
  splitLaneContractAddress: string,
): AttestcoinProofJob {
  const normalizedHash = transactionHashSchema.parse(transactionHash);
  return attestcoinProofJobSchema.parse({
    schemaVersion: 1,
    kind: "splitlane.attestcoin-proof",
    status: "not-executed",
    mode: "dry-run",
    sourceChain: { name: "Ethereum Sepolia", chainId: 11_155_111 },
    transactionHash: normalizedHash,
    splitLaneContractAddress,
    allowedFunctionSignatures: ["payShare(uint256)"],
    requiredEnvironment: [
      "ETHEREUM_SEPOLIA_RPC_URL",
      "SPLITLANE_ETHEREUM_SEPOLIA_ADDRESS",
    ],
    execution: {
      workingDirectory: "repository-root",
      argv: [
        "npm",
        "--prefix",
        "packages/attestcoin",
        "run",
        "start",
        "--",
        "dry-run",
        "--tx",
        normalizedHash,
      ],
    },
    outputPolicy: {
      evidenceSchemaVersion: 1,
      requireReadOnlyVerification: true,
      submitsCreditcoinTransaction: false,
    },
  });
}

export function parseAttestcoinProofJob(value: unknown): AttestcoinProofJob {
  return attestcoinProofJobSchema.parse(value);
}

export function formatAttestcoinCommand(job: AttestcoinProofJob): string {
  return job.execution.argv.join(" ");
}
