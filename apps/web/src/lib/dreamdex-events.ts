import { z } from "zod";

const DREAMDEX_INDEXER_URL = "https://prd.smk.somnia.host/v1/graphql";
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export const DREAMDEX_EVENTS_QUERY = `
  query SplitLaneEventMarkets {
    Market(
      limit: 32
      order_by: { createdAtTimestamp: desc }
      where: { marketType: { _eq: "BINARY" } }
    ) {
      id
      marketType
      asset
      intervalSec
      question
      expiry
      clobStatus
      finalized
      voided
      winningOutcome
      marketAddress
      poolAddress
      cumulativeQuoteVolume
      tradeCount
      lastPrice
    }
  }
`;

const upstreamMarketSchema = z.object({
  id: z.string().min(1),
  marketType: z.literal("BINARY"),
  asset: z.string().min(1),
  intervalSec: z.string().regex(/^\d+$/),
  question: z.string().min(1),
  expiry: z.string().regex(/^\d+$/),
  clobStatus: z.string().min(1),
  finalized: z.boolean(),
  voided: z.boolean(),
  winningOutcome: z.number().int().nullable(),
  marketAddress: z.string().regex(ADDRESS_PATTERN),
  poolAddress: z.string().regex(ADDRESS_PATTERN),
  cumulativeQuoteVolume: z.string().regex(/^\d+(?:\.\d+)?$/),
  tradeCount: z.string().regex(/^\d+$/),
  lastPrice: z.string().regex(/^\d+(?:\.\d+)?$/).nullable(),
});

const upstreamResponseSchema = z.object({
  data: z.object({ Market: z.array(upstreamMarketSchema) }),
});

export type EventMarketStatus = "live" | "resolved" | "voided" | "scheduled";

export type DreamDexEventMarket = {
  id: string;
  asset: string;
  intervalSeconds: number;
  question: string;
  expiresAt: number;
  status: EventMarketStatus;
  winningOutcome: number | null;
  marketAddress: `0x${string}`;
  poolAddress: `0x${string}`;
  volumeUsdso: string;
  tradeCount: number;
  lastPrice: string | null;
};

function marketStatus(market: z.infer<typeof upstreamMarketSchema>): EventMarketStatus {
  if (market.voided) return "voided";
  if (market.finalized) return "resolved";
  return market.clobStatus.toLowerCase() === "trading" ? "live" : "scheduled";
}

export function parseDreamDexMarkets(payload: unknown): DreamDexEventMarket[] {
  const response = upstreamResponseSchema.parse(payload);
  return response.data.Market.map((market) => ({
    id: market.id,
    asset: market.asset,
    intervalSeconds: Number(market.intervalSec),
    question: market.question,
    expiresAt: Number(market.expiry),
    status: marketStatus(market),
    winningOutcome: market.winningOutcome,
    marketAddress: market.marketAddress as `0x${string}`,
    poolAddress: market.poolAddress as `0x${string}`,
    volumeUsdso: market.cumulativeQuoteVolume,
    tradeCount: Number(market.tradeCount),
    lastPrice: market.lastPrice,
  }));
}

export function eventTradingUrl(asset: string, intervalSeconds: number): string {
  const symbol = asset.toUpperCase() === "BTC" ? "WBTC:USDso" : asset.toUpperCase() === "ETH" ? "WETH:USDso" : undefined;
  const interval = intervalSeconds === 900 ? "15m" : intervalSeconds === 3600 ? "1h" : undefined;
  if (!symbol || !interval) return "https://app.dreamdex.io/event-contracts";
  return `https://app.dreamdex.io/event-contracts/${encodeURIComponent(symbol)}/${interval}`;
}

export async function fetchDreamDexEventMarkets(): Promise<DreamDexEventMarket[]> {
  const response = await fetch(DREAMDEX_INDEXER_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: DREAMDEX_EVENTS_QUERY }),
    next: { revalidate: 10 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`DreamDEX indexer returned HTTP ${response.status}`);
  return parseDreamDexMarkets(await response.json());
}
