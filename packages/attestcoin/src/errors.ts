export type LaneErrorCode =
  | "CONFIG_INVALID"
  | "CC3_NETWORK_MISMATCH"
  | "SOURCE_NETWORK_MISMATCH"
  | "SOURCE_CHAIN_UNSUPPORTED"
  | "SOURCE_CHAIN_AMBIGUOUS"
  | "TRANSACTION_NOT_FOUND"
  | "TRANSACTION_UNCONFIRMED"
  | "TRANSACTION_REVERTED"
  | "TRANSACTION_MISMATCH"
  | "WRONG_CONTRACT"
  | "WRONG_FUNCTION"
  | "PROOF_BUILD_FAILED"
  | "PROOF_MISMATCH"
  | "PROOF_VERIFICATION_FAILED"
  | "SIGNER_REQUIRED"
  | "SIGNER_NETWORK_MISMATCH"
  | "VERIFICATION_SUBMISSION_FAILED"
  | "CLI_USAGE";

export class LaneError extends Error {
  public readonly code: LaneErrorCode;

  public constructor(code: LaneErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LaneError";
    this.code = code;
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
