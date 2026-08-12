import { describe, expect, it } from "vitest";
import { formatUsdc, shortenAddress } from "./format";

describe("display formatting", () => {
  it("formats six-decimal USDC", () => {
    expect(formatUsdc(12_345_678n)).toBe("12.345678");
    expect(formatUsdc(12_000_000n)).toBe("12");
    expect(formatUsdc(12_345_678_901_234_567_890n)).toBe("12,345,678,901,234.56789");
  });

  it("shortens valid addresses without changing invalid text", () => {
    expect(shortenAddress("0x0000000000000000000000000000000000000001")).toBe(
      "0x00000...0001",
    );
    expect(shortenAddress("unknown")).toBe("unknown");
  });
});
