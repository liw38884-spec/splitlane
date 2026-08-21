import { ArrowRight, Bot, FileCheck2, Radar, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ProgramHeader } from "@/components/program-header";
import { PROGRAMS } from "@/lib/programs";

const ICONS = {
  creditcoin: ShieldCheck,
  legaltech: FileCheck2,
  anna: Bot,
  "event-contracts": Radar,
} as const;

export const metadata: Metadata = {
  title: "Program workbench | SplitLane",
  description: "Review SplitLane integrations for Creditcoin, BLI LegalTech, Anna, and DreamDEX Event Contracts.",
};

export default function ProgramsPage() {
  return (
    <main className="program-page">
      <ProgramHeader />
      <section className="program-hero">
        <span className="eyebrow">One settlement core · four verifiable adapters</span>
        <h1>Program workbench</h1>
        <p>Each submission path exposes a real, reviewable capability while the USDC contract remains non-custodial and unchanged.</p>
      </section>
      <section className="program-grid" aria-label="Active program integrations">
        {PROGRAMS.map((program) => {
          const Icon = ICONS[program.slug];
          return (
            <Link className="program-card" href={`/programs/${program.slug}`} key={program.slug}>
              <span className="program-card-icon"><Icon size={20} aria-hidden="true" /></span>
              <span className="eyebrow">{program.ecosystem}</span>
              <h2>{program.name}</h2>
              <p>{program.summary}</p>
              <span className="program-deliverable">{program.deliverable}<ArrowRight size={15} aria-hidden="true" /></span>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
