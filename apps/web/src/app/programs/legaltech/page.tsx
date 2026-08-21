import { ArrowUpRight, FileCheck2, Fingerprint, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProgramHeader } from "@/components/program-header";

export const metadata: Metadata = {
  title: "Settlement audit evidence | SplitLane",
  description: "Export deterministic, independently reproducible settlement audit records from live SplitLane tabs.",
};

export default function LegalTechProgramPage() {
  return (
    <main className="program-page">
      <ProgramHeader />
      <section className="program-hero">
        <span className="eyebrow">BLI Legal Tech Hackathon 2</span>
        <h1>Portable settlement evidence</h1>
        <p>Every tab can export a canonical audit record without exposing private keys or introducing a custodial database.</p>
      </section>
      <section className="program-section integration-checklist">
        <div><FileCheck2 size={18} /><span><strong>Canonical JSON</strong>Amounts and timestamps use deterministic decimal strings, including chain and contract provenance.</span></div>
        <div><Fingerprint size={18} /><span><strong>Reproducible digest</strong>The record includes a Keccak-256 digest over the canonical payload.</span></div>
        <div><ShieldCheck size={18} /><span><strong>Public verification</strong>Recipients, participants, USDC address, metadata hash, and settlement status remain independently readable onchain.</span></div>
      </section>
      <section className="program-actions">
        <Link className="command-button command-button-primary" href="/">Open a tab and export evidence<ArrowUpRight size={15} /></Link>
      </section>
    </main>
  );
}
