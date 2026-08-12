import { z } from "zod";

export const proofEvidenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    mode: z.enum(["dry-run", "verify"]),
    sourceChain: z.object({
      name: z.literal("Ethereum Sepolia"),
      chainId: z.literal(11_155_111),
    }),
    transactionHash: z.string().regex(/^0x[0-9a-f]{64}$/),
    blockNumber: z.number().int().nonnegative(),
    confirmations: z.number().int().positive(),
    chainKey: z.number().int().nonnegative(),
    splitLaneContractAddress: z.string(),
    functionSelector: z.string().regex(/^0x[0-9a-f]{8}$/),
    verificationResult: z.literal(true),
    creditcoinTransactionHash: z.string().regex(/^0x[0-9a-f]{64}$/).nullable(),
  })
  .strict();

export type ProofEvidence = z.infer<typeof proofEvidenceSchema>;

export function formatProofEvidence(evidence: ProofEvidence): string {
  return `${JSON.stringify(proofEvidenceSchema.parse(evidence), null, 2)}\n`;
}
