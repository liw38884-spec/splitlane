import { describe, expect, it } from "vitest";
import { Attribution } from "ox/erc8021";
import { baseSepolia, sepolia } from "viem/chains";
import {
  createBuilderDataSuffix,
  dataSuffixForChain,
  normalizeBuilderCode,
} from "./attribution";

describe("Builder Code attribution", () => {
  it("round-trips a valid ERC-8021 code", () => {
    const suffix = createBuilderDataSuffix("splitlane");
    expect(Attribution.fromData(suffix)).toMatchObject({
      codes: ["splitlane"],
      id: 0,
    });
  });

  it("rejects malformed codes", () => {
    expect(normalizeBuilderCode("contains spaces")).toBeUndefined();
    expect(() => createBuilderDataSuffix("")).toThrow();
  });

  it("never applies configured attribution to Ethereum Sepolia", () => {
    expect(dataSuffixForChain(sepolia.id)).toBeUndefined();
    if (process.env.NEXT_PUBLIC_BASE_BUILDER_CODE) {
      expect(dataSuffixForChain(baseSepolia.id)).toBeDefined();
    }
  });
});
