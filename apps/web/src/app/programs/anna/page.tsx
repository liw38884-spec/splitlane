import { ArrowUpRight, Bot, CheckCircle2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProgramHeader } from "@/components/program-header";

export const metadata: Metadata = {
  title: "Anna App integration | SplitLane",
  description: "Validate a conversational USDC split and hand it to a wallet-controlled SplitLane transaction.",
};

export default function AnnaProgramPage() {
  return (
    <main className="program-page">
      <ProgramHeader />
      <section className="program-hero">
        <span className="eyebrow">Anna AI App Builder</span>
        <h1>Conversation to settlement draft</h1>
        <p>The Anna bundle validates a group payment plan, saves the draft in Anna, and opens the same participants and exact USDC amounts in SplitLane for wallet-controlled execution.</p>
      </section>
      <section className="program-section integration-checklist">
        <div><CheckCircle2 size={18} /><span><strong>Schema 2 manifest</strong>Installable static SPA with a named default view.</span></div>
        <div><CheckCircle2 size={18} /><span><strong>Bundled Executa</strong>Validates titles, EVM addresses, unique participants, and 6-decimal USDC amounts.</span></div>
        <div><CheckCircle2 size={18} /><span><strong>Wallet handoff</strong>Produces a public SplitLane draft URL; no key or signing request crosses the Anna iframe.</span></div>
        <div><Bot size={18} /><span><strong>Publication boundary</strong>Local strict validation is automated. Store release still requires an Anna verified-developer account.</span></div>
      </section>
      <section className="program-actions">
        <Link className="command-button command-button-primary" href="/">Open SplitLane<ArrowUpRight size={15} /></Link>
        <a className="command-button" href="https://anna.partners/developers/apps/app-quickstart" target="_blank" rel="noreferrer">Anna developer guide<ArrowUpRight size={15} /></a>
      </section>
    </main>
  );
}
