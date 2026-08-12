import { describe, expect, it } from "vitest";
import { baseSepolia, sepolia } from "viem/chains";
import { parseTabSelection, tabPath } from "./tab-links";

describe("tab links", () => {
  it("builds and parses Base and Ethereum tab links", () => {
    expect(tabPath(baseSepolia.id, 28n)).toBe("/?chain=base-sepolia&tab=28");
    expect(parseTabSelection("?chain=base-sepolia&tab=28")).toEqual({
      chainId: baseSepolia.id,
      tabId: 28n,
    });
    expect(parseTabSelection(tabPath(sepolia.id, 11n).slice(1))).toEqual({
      chainId: sepolia.id,
      tabId: 11n,
    });
  });

  it("rejects unsupported chains and invalid tab IDs", () => {
    expect(parseTabSelection("?chain=base&tab=0")).toEqual({
      chainId: undefined,
      tabId: undefined,
    });
  });
});
