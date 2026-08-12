# DoraHacks submission draft

This is a copy-ready draft for the DoraHacks submission form. Replace every placeholder before use.

## Eligibility note

The event schedule recorded from the official DoraHacks detail page opens on 2026-08-13 and closes on 2026-09-06 at 23:59 ET. DoraHacks may localize these timestamps in the browser, so verify the displayed timezone before the final submission. This repository started on 2026-08-11, so whether the project is eligible under the event's "created during the hackathon" rule must be confirmed by the organizer.

Official event page: https://dorahacks.io/hackathon/buidl-ctc-2026-fall/detail

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
| GitHub repository | `[FILL IN]` |
| Live Base Sepolia URL | `[FILL IN]` |
| Live Ethereum Sepolia URL | `[FILL IN]` |
| Base Sepolia contract address | `[FILL IN]` |
| Ethereum Sepolia contract address | `[FILL IN]` |
| Base deployment tx hash | `[FILL IN]` |
| Ethereum deployment tx hash | `[FILL IN]` |
| Demo video | `[FILL IN]` |
| Slide deck | `[FILL IN]` |
| Team members | `[FILL IN]` |
| Builder Code | `[FILL IN]` |

## Submission copy

> SplitLane is a non-custodial USDC split-payment system for Base and Ethereum Sepolia. The app records a tab, assigns exact shares, and lets each participant pay the recipient directly. The contract never pools funds and never exposes an admin withdrawal path. For proof-of-receipt workflows, SplitLane uses Attestcoin to verify Ethereum Sepolia transactions on Creditcoin CC3 Testnet. Base Sepolia is intentionally excluded from the Attestcoin lane.

## Notes for the form reviewer

- Do not claim deployment, reward eligibility, or award status without real evidence.
- Do not attach placeholder hashes or placeholder videos.
- Do not describe Base Sepolia receipts as Attestcoin-verified.
