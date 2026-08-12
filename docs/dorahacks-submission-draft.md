# DoraHacks submission draft

This is a copy-ready draft for the DoraHacks submission form. Replace the remaining team and video placeholders before use.

## Eligibility note

The official DoraHacks page opens submissions on 2026-08-13 and closes on 2026-09-06 at 23:59 ET. The repository started on 2026-08-11, two days before submissions open. Obtain written organizer confirmation before submitting because the published rules require original work created during the hackathon.

Official event page: https://dorahacks.io/hackathon/buidl-ctc-2026-fall/detail

### Organizer eligibility question

Send this question to `team@creditcoin.org` or the official `#buidl-ctc-qna` channel before submitting:

> SplitLane's repository was initialized on August 11, 2026, two days before BUIDL CTC 2026 Fall submissions open. The testnet deployments, production configuration, connected-wallet demo flow, and Attestcoin verification work are being completed during the event window. Does this satisfy the rule that projects must be original work created during the hackathon, or must we submit a new event-only project? Repository: https://github.com/liw38884-spec/splitlane

## Project title

SplitLane

## One-line summary

SplitLane is a non-custodial USDC split-payment app for Base and Ethereum Sepolia, with an Attestcoin proof lane for Ethereum Sepolia receipts on Creditcoin CC3 Testnet.

## Problem

Group payments are often hard to coordinate, and many flows rely on pooled custody or manual reconciliation.

## Solution

SplitLane records a tab with exact shares. Each participant pays their own share directly to the recipient, and the contract never pools funds or exposes an admin withdrawal path.

## Why Base

- The app supports Base Sepolia.
- The UI can display a Base Builder Code badge when configured.
- The web app uses the Base Sepolia USDC address and explorer links.

## Why Creditcoin / Attestcoin

- The proof lane validates Ethereum Sepolia receipt transactions.
- Base Sepolia is intentionally rejected by the Attestcoin lane.
- Proof evidence is emitted only after source-transaction inspection, proof building, and BlockProver verification.

## How it works

1. The recipient creates a tab.
2. Participants receive their exact share assignments.
3. Each participant settles their own share with USDC.
4. The recipient can close any tab that still has unpaid shares.
5. Ethereum Sepolia receipts can be proven through Attestcoin dry-run or verify mode.

## Security summary

- No pooled custody.
- No owner withdrawal.
- No native-currency payment path.
- Reentrancy protection on contract writes.
- Strict source-chain filtering in Attestcoin.

## Demo assets

| Asset | Placeholder |
| --- | --- |
| GitHub repository | `https://github.com/liw38884-spec/splitlane` |
| Live Base Sepolia URL | `https://splitlane.vercel.app/?chain=base-sepolia` |
| Live Ethereum Sepolia URL | `https://splitlane.vercel.app/?chain=ethereum-sepolia` |
| Base Sepolia contract address | `0x1EE8dCEE85c5bD8bA8D21B599D08Acc3E80C0d6c` |
| Ethereum Sepolia contract address | `0x1EE8dCEE85c5bD8bA8D21B599D08Acc3E80C0d6c` |
| Base deployment tx hash | `0xa2b4e8edc7c29865535adc6c6e221762efe2416231dc5807b4404596d6d2070e` |
| Ethereum deployment tx hash | `0x1e0095247e4abcdb355e5e9e079572dd1fb0c4835db6d70abd28f1f077adfabd` |
| Demo video | `[FILL IN]` |
| Slide deck / whitepaper | `https://github.com/liw38884-spec/splitlane/blob/main/docs/splitlane-deck.pdf` |
| Team members | `[FILL IN]` |
| Builder Code | `bc_qgmgm02h` |

## Submission copy

> SplitLane is a non-custodial USDC split-payment system for Base and Ethereum Sepolia. The app records a tab, assigns exact shares, and lets each participant pay the recipient directly. The contract never pools funds and never exposes an admin withdrawal path. For proof-of-receipt workflows, SplitLane uses Attestcoin to verify Ethereum Sepolia transactions on Creditcoin CC3 Testnet. Base Sepolia is intentionally excluded from the Attestcoin lane.

## Notes for the form reviewer

- Do not claim deployment, reward eligibility, or award status without real evidence.
- Do not attach placeholder hashes or placeholder videos.
- Do not describe Base Sepolia receipts as Attestcoin-verified.
