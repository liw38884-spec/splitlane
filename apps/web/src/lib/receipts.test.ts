import { describe, expect, it } from "vitest";
import { assertExpectedReplacement, assertSuccessfulReceipt } from "./receipts";

describe("assertSuccessfulReceipt", () => {
  it("accepts a successful receipt", () => {
    expect(() => assertSuccessfulReceipt({ status: "success" })).not.toThrow();
  });

  it("rejects a reverted receipt", () => {
    expect(() => assertSuccessfulReceipt({ status: "reverted" })).toThrow(
      "Transaction reverted",
    );
  });
});

describe("assertExpectedReplacement", () => {
  it("accepts an unchanged or gas-repriced transaction", () => {
    expect(() => assertExpectedReplacement(undefined)).not.toThrow();
    expect(() => assertExpectedReplacement("repriced")).not.toThrow();
  });

  it("rejects cancellation and content replacement", () => {
    expect(() => assertExpectedReplacement("cancelled")).toThrow("Transaction was cancelled");
    expect(() => assertExpectedReplacement("replaced")).toThrow("Transaction was replaced");
  });
});
