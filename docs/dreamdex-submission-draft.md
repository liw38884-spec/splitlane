# Somnia × DreamDEX Event Contracts submission draft

Official event: https://dorahacks.io/hackathon/event-contracts

Submissions open on 2026-08-25 at 00:00 UTC and close on 2026-09-08 at 18:00 UTC. Do not submit before the form opens.

## Project

**Name:** SplitLane Event Contract Radar

**Category:** Event Contracts analytics / contract provenance

**One-line summary:** SplitLane combines a live DreamDEX Event Contract radar with fail-closed Shannon testnet bytecode checks, so users can inspect market provenance and documented core addresses without hidden signing or custody.

## Prototype

- Live application: https://splitlane.vercel.app/programs/event-contracts
- Repository: https://github.com/liw38884-spec/splitlane
- Feedback report: https://github.com/liw38884-spec/splitlane/blob/main/docs/dreamdex-feedback-report.md
- Deck: https://github.com/liw38884-spec/splitlane/blob/main/docs/splitlane-deck.pdf

The mainnet section reads DreamDEX's official production onchain indexer and displays current binary market state, exact market and pool addresses, volume, trade count, expiry, and last price. A separate Shannon section reads the testnet RPC, checks chain ID `50312`, and confirms non-empty bytecode at the six addresses published in the DreamDEX documentation. Bytecode presence does not prove an implementation's identity or version.

## Trust boundary

- The Shannon check is read-only network and bytecode-presence evidence.
- The mainnet radar is market analytics.
- Neither section places an order, signs a message, or proves that a trade occurred.
- Malformed JSON-RPC and indexer responses fail closed.

## Required form fields

| Field | Value |
| --- | --- |
| Telegram handle | `[PARTICIPANT TO SUPPLY]` |
| Based in | Enter privately in the official form |
| Prize wallet | `[PARTICIPANT TO CONFIRM]` |
| Discord / X | Optional |
| Demo video | `[FILL IN AFTER 2–3 MINUTE RECORDING]` |

## Suggested demo sequence

1. Open the Shannon testnet verification and show chain ID `50312` plus the six explorer-linked contracts.
2. State explicitly that this is read-only deployment evidence, not a trade.
3. Show the live mainnet Event Contract radar and open one market and pool explorer link.
4. Show fail-closed parsing tests and the SDK/documentation feedback report.

## Submission copy

> SplitLane Event Contract Radar makes DreamDEX market provenance inspectable before a user enters a venue. It reads the official production indexer for live binary markets and separately checks the Shannon network and non-empty bytecode at the core addresses published in the DreamDEX documentation. The prototype exposes explorer-linked addresses, validates upstream data, and fails closed without treating bytecode presence or analytics as a trade.
