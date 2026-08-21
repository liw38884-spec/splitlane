# BLI Legal Tech Hackathon 2 submission draft

Official event: https://dorahacks.io/hackathon/legal-hack-2026/detail

## Project

**Name:** SplitLane

**Category:** LegalTech / RegTech / blockchain settlement evidence

**One-line summary:** SplitLane turns a non-custodial USDC group tab into independently verifiable settlement evidence without holding participant funds.

## Problem

Shared payments are commonly reconciled through screenshots, spreadsheets, or a custodial intermediary. Those records are difficult to verify and can omit the token, contract, participants, exact shares, or final state.

## Solution

SplitLane records an exact group-payment obligation on a public EVM testnet. Each participant pays the recipient directly. A live tab can export a `splitlane.settlement-audit.v1` JSON record containing the chain, contract, USDC token, recipient, participants, decimal-string amounts, status, metadata hash, and a deterministic Keccak-256 record hash.

The export is technical evidence, not a legal opinion, identity attestation, or representation that an unpaid obligation has been satisfied.

## Verification model

1. Open a live SplitLane tab and download its audit record.
2. Canonicalize the record fields in lexicographic order.
3. Recompute the Keccak-256 record hash.
4. Compare parties, amounts, token, contract, and status with the public testnet state.
5. Follow the explorer links to inspect the originating transactions.

Demo tabs are deliberately ineligible for evidence export.

## Links

- Live application: https://splitlane.vercel.app
- LegalTech workbench: https://splitlane.vercel.app/programs/legaltech
- Repository: https://github.com/liw38884-spec/splitlane
- Deck: https://github.com/liw38884-spec/splitlane/blob/main/docs/splitlane-deck.pdf
- Base Sepolia contract: https://sepolia.basescan.org/address/0x1EE8dCEE85c5bD8bA8D21B599D08Acc3E80C0d6c
- Ethereum Sepolia contract: https://sepolia.etherscan.io/address/0x1EE8dCEE85c5bD8bA8D21B599D08Acc3E80C0d6c

## Submission boundary

- Do not attach an audit record until it was exported from a real tab.
- Do not call the record legal advice or proof of identity.
- Do not call an unpaid or closed-with-balance tab settled.
- Add the real team identity and demo-video URL only in the official form.

