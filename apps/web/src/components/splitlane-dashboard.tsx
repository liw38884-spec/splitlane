"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, Check, CircleDollarSign, FileCheck2, Link2, Plus, RefreshCw, ShieldCheck, Users, X } from "lucide-react";
import { getAddress, type Address } from "viem";
import { baseSepolia, sepolia } from "viem/chains";
import { useAccount, useSwitchChain } from "wagmi";
import { configuredBuilderCode } from "@/lib/attribution";
import { EXPLORER_TX_URLS, NETWORK_LABELS, type SupportedChainId } from "@/lib/chains";
import { formatDate, formatUsdc, shortenAddress } from "@/lib/format";
import { parseTabDraft, type TabDraft } from "@/lib/tab-draft";
import { parseTabSelection, tabPath } from "@/lib/tab-links";
import type { ShareRecord, TabRecord } from "@/lib/types";
import { useSplitLane } from "@/hooks/use-splitlane";
import { CreateTabDialog } from "./create-tab-dialog";
import { SettlementEvidence } from "./settlement-evidence";
import { WalletControl } from "./wallet-control";

const STATUS_LABELS = { open: "Open", settled: "Settled", closed: "Closed" } as const;

export function SplitLaneDashboard() {
  const [chainId, setChainId] = useState<SupportedChainId>(baseSepolia.id);
  const [selectedId, setSelectedId] = useState<bigint | null>(null);
  const [requestedTabId, setRequestedTabId] = useState<bigint | undefined>();
  const [initialDraft, setInitialDraft] = useState<TabDraft | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { isConnected } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const app = useSplitLane(chainId, requestedTabId);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const selection = parseTabSelection(window.location.search);
      if (selection.chainId) setChainId(selection.chainId);
      if (selection.tabId) {
        setSelectedId(selection.tabId);
        setRequestedTabId(selection.tabId);
      }
      const draft = parseTabDraft(window.location.search);
      if (draft) {
        setInitialDraft(draft);
        setIsCreateOpen(true);
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const selectedTab = useMemo(
    () => selectedId === null ? app.tabs[0] : app.tabs.find((tab) => tab.id === selectedId),
    [app.tabs, selectedId],
  );

  const openCount = app.tabs.filter((tab) => tab.status === "open").length;
  const settledVolume = app.tabs.filter((tab) => tab.status === "settled").reduce((total, tab) => total + tab.totalAmount, 0n);
  const participantCount = new Set(app.tabs.flatMap((tab) => tab.shares.map((share) => share.participant))).size;

  async function selectNetwork(nextChainId: SupportedChainId) {
    if (isConnected) {
      try {
        await switchChainAsync({ chainId: nextChainId });
      } catch {
        return;
      }
    }
    setChainId(nextChainId);
    setSelectedId(null);
    setRequestedTabId(undefined);
    window.history.replaceState(null, "", tabPath(nextChainId));
  }

  function selectTab(tabId: bigint) {
    setSelectedId(tabId);
    setRequestedTabId(tabId);
    window.history.replaceState(null, "", tabPath(chainId, tabId));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <Image src="/splitlane-mark.png" alt="" width={34} height={34} priority />
          <span>SplitLane</span>
        </div>
        <div className="topbar-actions">
          <a className="topbar-program-link" href="/programs">Programs</a>
          <div className="network-segment" aria-label="Settlement network">
            <button type="button" aria-pressed={chainId === baseSepolia.id} onClick={() => void selectNetwork(baseSepolia.id)}>Base</button>
            <button type="button" aria-pressed={chainId === sepolia.id} onClick={() => void selectNetwork(sepolia.id)}>Ethereum</button>
          </div>
          <WalletControl chainId={chainId} />
        </div>
      </header>

      <section className="workspace">
        <aside className="tab-sidebar">
          <div className="sidebar-title-row">
            <div><span className="eyebrow">{NETWORK_LABELS[chainId]} Sepolia</span><h1>Tabs</h1></div>
            <button className="icon-button icon-button-accent" type="button" title="Create tab" aria-label="Create tab" onClick={() => setIsCreateOpen(true)}>
              <Plus size={18} aria-hidden="true" />
            </button>
          </div>

          <div className="mode-line">
            <span className={`status-dot ${app.isLive ? "status-dot-live" : ""}`} />
            {app.isLive ? "Live contract" : "Demo data"}
            <button className="icon-button refresh-button" type="button" title="Refresh tabs" aria-label="Refresh tabs" onClick={() => void app.loadTabs()}>
              <RefreshCw size={14} aria-hidden="true" />
            </button>
          </div>

          <nav className="tab-list" aria-label="Payment tabs">
            {app.tabs.map((tab) => (
              <button className="tab-list-item" type="button" key={tab.id.toString()} aria-current={selectedTab?.id === tab.id ? "page" : undefined} onClick={() => selectTab(tab.id)}>
                <span className="tab-list-main"><strong>{tab.title}</strong><span>#{tab.id.toString()} · {formatDate(tab.createdAt)}</span></span>
                <span className="tab-list-value"><strong>{formatUsdc(tab.totalAmount)}</strong><span className={`status-pill status-${tab.status}`}>{STATUS_LABELS[tab.status]}</span></span>
              </button>
            ))}
          </nav>

          <button className="command-button new-tab-wide" type="button" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} aria-hidden="true" /> New tab
          </button>
        </aside>

        <section className="main-panel">
          <div className="summary-band">
            <SummaryItem icon={<FileCheck2 size={17} />} label="Open tabs" value={String(openCount)} />
            <SummaryItem icon={<CircleDollarSign size={17} />} label="Settled volume" value={`${formatUsdc(settledVolume)} USDC`} />
            <SummaryItem icon={<Users size={17} />} label="Participants" value={String(participantCount)} />
          </div>
          {selectedTab ? (
            <TabDetail tab={selectedTab} actor={app.actorAddress} chainId={chainId} isLive={app.isLive} permalink={tabPath(chainId, selectedTab.id)} onClose={() => app.closeTab(selectedTab)} onSettle={(share) => app.settleShare(selectedTab, share.participant)} />
          ) : (
            <div className="empty-state"><FileCheck2 size={28} aria-hidden="true" /><h2>{selectedId === null ? "No tabs yet" : "Tab not found"}</h2><button className="command-button command-button-primary" type="button" onClick={() => setIsCreateOpen(true)}><Plus size={16} /> Create tab</button></div>
          )}
        </section>
      </section>

      <CreateTabDialog key={initialDraft ? JSON.stringify(initialDraft) : "blank-draft"} actor={app.actorAddress} initialDraft={initialDraft} isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); setInitialDraft(undefined); }} onSubmit={app.createTab} />

      {app.transaction.stage !== "idle" ? (
        <div className={`transaction-toast toast-${app.transaction.stage}`} role="status">
          <span className="toast-icon">{app.transaction.stage === "success" ? <Check size={16} /> : <RefreshCw size={16} />}</span>
          <div><strong>{app.transaction.message}</strong><span>{app.transaction.hash ? shortenAddress(app.transaction.hash, 8, 6) : ""}</span></div>
          {app.transaction.hash && app.transaction.chainId ? <a className="icon-button" href={`${EXPLORER_TX_URLS[app.transaction.chainId]}${app.transaction.hash}`} target="_blank" rel="noreferrer" title="Open transaction" aria-label="Open transaction"><ArrowUpRight size={16} /></a> : null}
          <button className="icon-button" type="button" title="Dismiss" aria-label="Dismiss" onClick={app.resetTransaction}><X size={16} /></button>
        </div>
      ) : null}
    </main>
  );
}

function SummaryItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="summary-item"><span className="summary-icon">{icon}</span><span><small>{label}</small><strong>{value}</strong></span></div>;
}

function TabDetail({ tab, actor, chainId, isLive, permalink, onClose, onSettle }: { tab: TabRecord; actor?: Address; chainId: SupportedChainId; isLive: boolean; permalink: string; onClose: () => void; onSettle: (share: ShareRecord) => void }) {
  const paidAmount = tab.totalAmount - tab.remainingAmount;
  const progress = tab.totalAmount === 0n ? 0 : Number((paidAmount * 100n) / tab.totalAmount);
  const isRecipient = actor ? getAddress(actor) === getAddress(tab.recipient) : false;

  return (
    <div className="tab-detail">
      <header className="detail-header">
        <div>
          <div className="detail-kicker"><span className={`status-pill status-${tab.status}`}>{STATUS_LABELS[tab.status]}</span><span>Tab #{tab.id.toString()}</span></div>
          <h2>{tab.title}</h2>
          <p>Recipient <strong>{shortenAddress(tab.recipient, 7, 5)}</strong></p>
        </div>
        <div className="detail-header-actions">
          {chainId === sepolia.id ? <a className="proof-badge proof-link" href="/programs/creditcoin"><ShieldCheck size={15} />Attestcoin proof center</a> : <span className={`proof-badge ${configuredBuilderCode ? "proof-badge-active" : ""}`}><FileCheck2 size={15} />{configuredBuilderCode ? "Builder Code active" : "Builder Code pending"}</span>}
          <a className="icon-button" href={permalink} title="Open shareable tab link" aria-label="Open shareable tab link"><Link2 size={17} aria-hidden="true" /></a>
        </div>
      </header>

      <section className="settlement-progress" aria-label={`${progress}% settled`}>
        <div className="progress-copy"><span><strong>{formatUsdc(paidAmount)}</strong> of {formatUsdc(tab.totalAmount)} USDC</span><span>{progress}%</span></div>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
      </section>

      <section className="participant-section">
        <div className="section-heading"><div><span className="eyebrow">Settlement</span><h3>Participants</h3></div><span>{tab.shares.filter((share) => share.paid).length}/{tab.shares.length} paid</span></div>
        <div className="participant-table" role="table" aria-label="Participant shares">
          <div className="participant-row participant-row-head" role="row"><span role="columnheader">Wallet</span><span role="columnheader">Share</span><span role="columnheader">Status</span><span role="columnheader">Action</span></div>
          {tab.shares.map((share, index) => {
            const isActor = actor ? share.participant.toLowerCase() === actor.toLowerCase() : false;
            return (
              <div className="participant-row" role="row" key={share.participant}>
                <span className="wallet-cell" role="cell"><span className={`avatar avatar-${index % 4}`}>{index + 1}</span><span><strong>{shortenAddress(share.participant, 7, 5)}</strong>{isActor ? <small>You</small> : null}</span></span>
                <strong role="cell">{formatUsdc(share.amount)} USDC</strong>
                <span role="cell"><span className={`payment-state ${share.paid ? "payment-state-paid" : ""}`}>{share.paid ? <Check size={13} /> : null}{share.paid ? "Paid" : "Pending"}</span></span>
                <span className="participant-action" role="cell">{!share.paid && isActor && tab.status === "open" ? <button className="command-button command-button-primary command-button-small" type="button" onClick={() => onSettle(share)}><CircleDollarSign size={15} />Settle</button> : <span className="action-placeholder">-</span>}</span>
              </div>
            );
          })}
        </div>
      </section>

      <SettlementEvidence tab={tab} isLive={isLive} />

      <footer className="detail-footer">
        <div><span>Created</span><strong>{formatDate(tab.createdAt)}</strong></div>
        <div><span>Unpaid</span><strong>{formatUsdc(tab.remainingAmount)} USDC</strong></div>
        {isRecipient && tab.status === "open" ? <button className="command-button command-button-danger" type="button" onClick={onClose}><X size={15} />Close tab</button> : null}
      </footer>
    </div>
  );
}
