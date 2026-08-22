# Anna App Store listing

## Listing

**Name:** SplitLane

**Tagline:** Turn a group plan into an exact USDC settlement

**Category:** Productivity

**Pricing:** Free

**Homepage:** https://splitlane.vercel.app/programs/anna

**Support / source:** https://github.com/liw38884-spec/splitlane

**Logo:** https://cdn.anna.partners/production/app-logos/191-splitlane/20260822022548_60c22b21.webp

## Short description

Validate a non-custodial group payment plan in Anna, then hand the exact participants and USDC amounts to SplitLane for wallet-controlled settlement on Base or Ethereum testnet.

## Full description

SplitLane helps a group turn a payment plan into an exact onchain settlement draft. The Anna App validates the title, destination network, participant addresses, unique membership, positive USDC amounts, and six-decimal precision before producing a review URL.

The Anna App never receives a private key, signs a transaction, or labels a draft as paid. Wallet connection, token approval, and settlement remain in the public SplitLane application, where the user reviews every field before signing.

## Review notes

- The bundled Executa method is `create_settlement_draft`.
- Inputs support 1–20 unique EVM participant addresses.
- Supported targets are Base Sepolia and Ethereum Sepolia.
- The result is deliberately labelled as a draft.
- The UI bundle only invokes its declared Executa, storage, and window capabilities.
- Local strict manifest validation and Executa unit tests pass.
- The Cloud artifact is a self-contained static Linux x86-64 ELF; it does not depend on a host Python or shell runtime.
- Mutable listing metadata and the 256×256 SplitLane logo are synchronized to the private draft.

## Suggested screenshots

1. Anna settlement planner with two participant rows.
2. Successful draft validation and handoff link.
3. SplitLane create-tab dialog prefilled from the Anna URL.
4. The public `/programs/anna` trust-boundary explanation.
