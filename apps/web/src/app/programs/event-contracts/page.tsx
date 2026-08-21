import { ArrowUpRight, Clock3, Radar } from "lucide-react";
import type { Metadata } from "next";
import { ProgramHeader } from "@/components/program-header";
import { eventTradingUrl, fetchDreamDexEventMarkets, type DreamDexEventMarket } from "@/lib/dreamdex-events";
import { shortenAddress } from "@/lib/format";

export const revalidate = 10;

export const metadata: Metadata = {
  title: "DreamDEX Event Contract Radar | SplitLane",
  description: "Inspect live DreamDEX binary markets and their Somnia market and pool contracts.",
};

const SOMNIA_EXPLORER = "https://explorer.somnia.network/address/";

function intervalLabel(seconds: number): string {
  if (seconds === 900) return "15 min";
  if (seconds === 3600) return "1 hour";
  return `${Math.round(seconds / 60)} min`;
}

function expiryLabel(timestamp: number): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(timestamp * 1000));
}

function EventMarketCard({ market }: { market: DreamDexEventMarket }) {
  return (
    <article className="event-card">
      <div className="event-card-heading">
        <span className={`event-status event-status-${market.status}`}>{market.status}</span>
        <span>{market.asset} · {intervalLabel(market.intervalSeconds)}</span>
      </div>
      <h2>{market.question}</h2>
      <dl className="event-stats">
        <div><dt>Expiry</dt><dd>{expiryLabel(market.expiresAt)}</dd></div>
        <div><dt>Trades</dt><dd>{market.tradeCount}</dd></div>
        <div><dt>USDso volume</dt><dd>{market.volumeUsdso}</dd></div>
        <div><dt>Last price</dt><dd>{market.lastPrice ?? "—"}</dd></div>
      </dl>
      <div className="event-contract-links">
        <a href={`${SOMNIA_EXPLORER}${market.marketAddress}`} target="_blank" rel="noreferrer">Market {shortenAddress(market.marketAddress)}<ArrowUpRight size={13} /></a>
        <a href={`${SOMNIA_EXPLORER}${market.poolAddress}`} target="_blank" rel="noreferrer">Pool {shortenAddress(market.poolAddress)}<ArrowUpRight size={13} /></a>
      </div>
      <a className="command-button command-button-primary event-trade-link" href={eventTradingUrl(market.asset, market.intervalSeconds)} target="_blank" rel="noreferrer">Open on DreamDEX<ArrowUpRight size={15} /></a>
    </article>
  );
}

export default async function EventContractsPage() {
  let markets: DreamDexEventMarket[] = [];
  let error: string | undefined;
  try {
    markets = await fetchDreamDexEventMarkets();
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "DreamDEX indexer is unavailable";
  }

  const liveMarkets = markets.filter((market) => market.status === "live").slice(0, 8);
  const recentResults = markets.filter((market) => market.status !== "live").slice(0, 4);

  return (
    <main className="program-page">
      <ProgramHeader />
      <section className="program-hero event-hero">
        <span className="eyebrow">Somnia mainnet · Official DreamDEX onchain indexer</span>
        <h1>Event Contract Radar</h1>
        <p>Follow the current BTC and ETH fixed-window binary markets, then inspect the exact market and pool contracts before trading.</p>
        <div className="provenance-line"><Radar size={16} /><span>Live GraphQL provenance</span><Clock3 size={16} /><span>10-second refresh cache</span></div>
      </section>

      {error ? <section className="program-notice"><strong>Live source temporarily unavailable.</strong><span>{error}</span></section> : null}

      <section className="program-section">
        <div className="section-heading"><div><span className="eyebrow">Open now</span><h2>Live markets</h2></div><span>{liveMarkets.length} indexed</span></div>
        <div className="event-grid">
          {liveMarkets.length ? liveMarkets.map((market) => <EventMarketCard market={market} key={market.id} />) : <p className="program-empty">No live event window is indexed right now. DreamDEX opens a new market each interval.</p>}
        </div>
      </section>

      {recentResults.length ? (
        <section className="program-section program-section-muted">
          <div className="section-heading"><div><span className="eyebrow">Onchain history</span><h2>Recent outcomes</h2></div></div>
          <div className="event-grid event-grid-compact">{recentResults.map((market) => <EventMarketCard market={market} key={market.id} />)}</div>
        </section>
      ) : null}
    </main>
  );
}
