import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, TerminalSquare } from "lucide-react";
import { AttestcoinProofCenter } from "@/components/attestcoin-proof-center";

export const metadata: Metadata = {
  title: "Attestcoin Proof Center | SplitLane",
  description: "Prepare fail-closed Creditcoin Attestcoin proof jobs for Ethereum Sepolia SplitLane settlements.",
};

export default function CreditcoinProgramPage() {
  return (
    <main className="program-page">
      <header className="program-header">
        <Link className="program-back" href="/"><ArrowLeft size={16} />Back to SplitLane</Link>
        <span className="proof-badge"><TerminalSquare size={15} />Developer proof lane</span>
      </header>

      <section className="program-hero">
        <span className="eyebrow">BUIDL CTC 2026 Fall</span>
        <h1>Prove a SplitLane settlement through Attestcoin</h1>
        <p>
          This lane accepts only successful calls to the configured SplitLane contract on Ethereum Sepolia.
          Base transactions, wrong selectors, mismatched proof bytes, and unconfirmed receipts fail closed.
        </p>
        <div className="program-links">
          <a href="https://github.com/liw38884-spec/splitlane/tree/main/packages/attestcoin" target="_blank" rel="noreferrer">
            Review package source <ExternalLink size={14} />
          </a>
          <a href="https://dorahacks.io/hackathon/buidl-ctc-2026-fall/detail" target="_blank" rel="noreferrer">
            Event details <ExternalLink size={14} />
          </a>
        </div>
      </section>

      <AttestcoinProofCenter />

      <section className="program-disclosure">
        <h2>What the browser does not do</h2>
        <p>
          It does not contact the proof builder, store an RPC credential, sign a CC3 transaction, or label a job as
          verified. The downloaded job is reproducible input for <code>@splitlane/attestcoin</code>. Only successful
          CLI JSON with <code>verificationResult: true</code> is proof evidence.
        </p>
      </section>
    </main>
  );
}
