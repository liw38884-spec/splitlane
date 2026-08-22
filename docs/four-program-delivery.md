# Four-program delivery

SplitLane uses one non-custodial settlement contract and four isolated program adapters. The adapters may enrich, verify, export, or route a settlement, but none can hold funds or sign for a user.

## Shared acceptance boundary

1. A recipient creates a tab with exact USDC shares.
2. Each assigned participant approves and pays only their own share.
3. The contract transfers USDC directly to the recipient.
4. Program adapters consume public tab or transaction evidence; they never replace the wallet transaction.

## BUIDL CTC 2026 Fall — Creditcoin / Attestcoin

Delivered:

- `packages/attestcoin/` validates only Ethereum Sepolia source transactions and fails closed on chain, selector, target, receipt, proof-byte, or BlockProver mismatch.
- `/programs/creditcoin` creates a strict proof-job JSON and the exact repository CLI command.
- Browser output is always labelled `not-executed`; only successful CLI evidence with `verificationResult: true` may be described as verified.

Still required for submission:

- Written organizer confirmation that the pre-opening repository history is eligible. Without it, the public project-creation rule is not met and the entry must not be submitted as eligible.
- A real Ethereum Sepolia `payShare` transaction, RPC configuration, successful Attestcoin evidence, and a recorded demo.
- Team identity and final DoraHacks form entry.

Submission material: `docs/dorahacks-submission-draft.md` and `docs/external-submission-status.md`.

Copy-ready summary:

> SplitLane coordinates exact USDC group payments without pooled custody. Its Attestcoin lane verifies confirmed Ethereum Sepolia `payShare` receipts on Creditcoin CC3 and rejects unsupported chains, contracts, selectors, receipts, and mismatched proof bytes.

## BLI Legal Tech Hackathon 2

Delivered:

- Every live tab exposes a downloadable `splitlane.settlement-audit.v1` JSON artifact.
- Amounts, identifiers, addresses, timestamps, contract provenance, and state are represented without JavaScript `bigint` leakage.
- A lexicographically canonical JSON payload is hashed with Keccak-256; the repository includes independent verification tests.
- Demo data cannot be exported as legal evidence.

Still required for submission:

- Export one artifact from a real tab and include the corresponding chain explorer links in the demo.
- Add team information and a short legal-use narrative; the artifact is technical evidence, not a legal opinion or identity attestation.
- Obtain the organizer's submission route. The current DoraHacks event metadata does not expose an enabled submission form.

Submission material: `docs/legaltech-submission-draft.md`.

Copy-ready summary:

> SplitLane turns a public non-custodial USDC tab into portable settlement evidence. Reviewers can independently reproduce the canonical record hash and compare every party, amount, status, token, and contract address with the public chain state.

## Anna AI App Builder

Delivered:

- `integrations/anna/manifest.json` is a schema-2 installable App declaration.
- The static SPA calls a bundled `tool-dev-splitlane` Executa inside the official Anna harness.
- The Executa validates 1–20 unique EVM participants, an 80-byte title, positive USDC amounts with at most 6 decimals, and a supported target network.
- The result is a draft-only URL. SplitLane parses the same participants and amounts into its create-tab dialog; Anna never receives a private key or signs a transaction.
- Official `anna-app validate --strict` and Executa unit tests pass locally.
- The private Anna working draft is revision 1 with bundle status `ready`; its self-contained static Linux x86-64 artifact has SHA-256 `c5c5b036544f5ddc98d48651854dfb06dda7fa8ec4141087b3d38b2d46407d09`.

Still required for publication:

- Install the current private draft and pass a real Anna Cloud Executa run.
- Cut an immutable version, submit it for Anna review, and supply the final listing assets. Release is a separate public action after approval.
- Submit the DoraHacks Anna entry after its scheduled 2026-08-31 21:00 opening.

Listing material: `docs/anna-listing.md`.

Copy-ready summary:

> Mention SplitLane in Anna to validate an exact group settlement plan, open the review UI, and hand the same participants and USDC amounts to a wallet-controlled onchain flow. The App labels its result as a draft until SplitLane reports public contract state.

## Somnia × DreamDEX Event Contracts

Delivered:

- `/programs/event-contracts` queries the official DreamDEX production onchain indexer.
- The radar filters binary markets and exposes live/recent status, asset, window, expiry, volume, trade count, last price, and exact Somnia market/pool addresses.
- Each card links to the Somnia explorer and the matching DreamDEX BTC/ETH 15-minute or 1-hour venue.
- Upstream data is schema-validated and malformed indexer responses fail closed.
- A separate Shannon testnet check reads chain ID `50312` and confirms non-empty bytecode at the six addresses published in the DreamDEX documentation. It fails closed per address and does not claim implementation identity, version, or a trade.

Still required for submission:

- Record a 2–3 minute demo and keep the radar's read-only evidence distinct from a trade.
- Complete the DoraHacks form after 2026-08-25 00:00 UTC with the required Telegram handle, location, and prize wallet fields.

SDK/documentation feedback: `docs/dreamdex-feedback-report.md`.

Copy-ready summary:

> SplitLane Event Contract Radar is a contract-provenance and decision surface for DreamDEX binary markets on Somnia. It reads the official onchain indexer, exposes the exact market and pool contracts, and routes the user to the matching fixed-window venue without custody or hidden signing.

## Claim discipline

- Do not call a prepared Attestcoin job “verified.”
- Do not export demo state as legal evidence.
- Do not call an Anna draft “paid.”
- Do not call a DreamDEX market view a trade.
- Do not claim hackathon eligibility, acceptance, rewards, or publication until the organizer or platform confirms it.
