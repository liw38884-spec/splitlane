import { describe, expect, it } from "vitest";
import { eventTradingUrl, parseDreamDexMarkets } from "./dreamdex-events";

describe("DreamDEX event markets", () => {
  it("normalizes live and resolved binary markets from the official indexer", () => {
    const markets = parseDreamDexMarkets({
      data: {
        Market: [
          {
            id: "0x01",
            marketType: "BINARY",
            asset: "BTC",
            intervalSec: "900",
            question: "BTC closes at or above its opening price",
            expiry: "1787282100",
            clobStatus: "Trading",
            finalized: false,
            voided: false,
            winningOutcome: null,
            marketAddress: "0x1111111111111111111111111111111111111111",
            poolAddress: "0x2222222222222222222222222222222222222222",
            cumulativeQuoteVolume: "12.5",
            tradeCount: "3",
            lastPrice: "0.54",
          },
          {
            id: "0x02",
            marketType: "BINARY",
            asset: "ETH",
            intervalSec: "3600",
            question: "ETH closes at or above its opening price",
            expiry: "1787281200",
            clobStatus: "Finalized",
            finalized: true,
            voided: false,
            winningOutcome: 1,
            marketAddress: "0x3333333333333333333333333333333333333333",
            poolAddress: "0x4444444444444444444444444444444444444444",
            cumulativeQuoteVolume: "8",
            tradeCount: "2",
            lastPrice: null,
          },
        ],
      },
    });

    expect(markets).toHaveLength(2);
    expect(markets[0]).toMatchObject({ asset: "BTC", intervalSeconds: 900, status: "live", tradeCount: 3 });
    expect(markets[1]).toMatchObject({ asset: "ETH", intervalSeconds: 3600, status: "resolved", winningOutcome: 1 });
  });

  it("fails closed on malformed upstream data", () => {
    expect(() => parseDreamDexMarkets({ data: { Market: [{ id: "bad" }] } })).toThrow();
  });

  it("builds official BTC and ETH event-contract trading links", () => {
    expect(eventTradingUrl("BTC", 900)).toBe("https://app.dreamdex.io/event-contracts/WBTC%3AUSDso/15m");
    expect(eventTradingUrl("ETH", 3600)).toBe("https://app.dreamdex.io/event-contracts/WETH%3AUSDso/1h");
  });
});
