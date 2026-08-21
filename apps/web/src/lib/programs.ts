export const PROGRAMS = [
  {
    slug: "creditcoin",
    name: "BUIDL CTC 2026",
    ecosystem: "Creditcoin · Attestcoin",
    summary: "Verify an Ethereum Sepolia settlement transaction through the existing fail-closed Attestcoin proof lane.",
    deliverable: "Proof job + SDK evidence",
  },
  {
    slug: "legaltech",
    name: "BLI Legal Tech Hackathon 2",
    ecosystem: "LegalTech · RegTech",
    summary: "Export a deterministic settlement record whose digest can be independently reproduced from the public tab state.",
    deliverable: "Audit JSON + content hash",
  },
  {
    slug: "anna",
    name: "Anna AI App Builder",
    ecosystem: "Anna App · Executa",
    summary: "Turn a conversational split plan into a validated draft and hand it to the wallet-controlled SplitLane flow.",
    deliverable: "Installable App bundle",
  },
  {
    slug: "event-contracts",
    name: "Somnia × DreamDEX",
    ecosystem: "Event Contracts",
    summary: "Track live and resolved DreamDEX binary markets from the official onchain indexer with contract-level provenance.",
    deliverable: "Live event market radar",
  },
] as const;

export type ProgramSlug = (typeof PROGRAMS)[number]["slug"];
