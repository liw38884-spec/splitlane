export type TransactionReplacementReason = "cancelled" | "replaced" | "repriced";

export function assertExpectedReplacement(reason: TransactionReplacementReason | undefined): void {
  if (reason && reason !== "repriced") {
    throw new Error(`Transaction was ${reason}`);
  }
}

export function assertSuccessfulReceipt(receipt: { status: "success" | "reverted" }): void {
  if (receipt.status !== "success") {
    throw new Error("Transaction reverted");
  }
}
