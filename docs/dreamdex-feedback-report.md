# DreamDEX Event Contracts SDK and documentation feedback

Official event: https://dorahacks.io/hackathon/event-contracts/detail

## Integration tested

SplitLane Event Contract Radar reads DreamDEX's official production onchain indexer and validates binary-market records before rendering them. It exposes the exact market and pool addresses, asset, interval, expiry, status, trade count, volume, and last price, then routes the user to the matching DreamDEX Event Contracts venue.

## What worked well

- Event Contract markets have stable identifiers and explicit market and pool addresses.
- The indexer exposes enough provenance to build a transparent analytics surface.
- Fixed windows map cleanly to a human-readable 15-minute or 1-hour venue.
- Somnia explorer links make it possible to cross-check contract provenance.
- The official bot kit clearly separates Shannon testnet (`50312`) from Somnia mainnet (`5031`).

## Friction encountered

1. The public event page requires a testnet prototype, while the public Event Contract UI and production indexer emphasize mainnet markets. A single event-specific testnet quickstart would reduce ambiguity.
2. Environment-specific Event Contract indexer URLs, market/pool addresses, and sample payloads should be listed together.
3. The documentation should explicitly state whether read-only analytics submissions qualify without placing an order, or whether judges expect a testnet interaction transaction.
4. REST/indexer freshness and finality expectations should be documented for analytics consumers.
5. A versioned JSON schema for Event Contract market responses would make fail-closed clients easier to maintain.

## Recommended documentation additions

- Copy-ready Shannon testnet configuration for Event Contracts.
- One end-to-end example: discover a binary market, inspect it, simulate an order, submit on testnet, and verify the receipt.
- A table of production and testnet API/indexer/RPC/explorer endpoints.
- A changelog for event response fields and contract ABI changes.
- An explicit judging note for analytics-only versus transaction-producing integrations.

## Evidence links

- Live radar: https://splitlane.vercel.app/programs/event-contracts
- Source: https://github.com/liw38884-spec/splitlane/blob/main/apps/web/src/lib/dreamdex-events.ts
- Event page: https://dorahacks.io/hackathon/event-contracts/detail
- Official bot kit: https://github.com/somnia-chain/dreamdex-bot-kit

## Honest execution status

This report describes a production-indexer read integration. It does not claim that SplitLane placed a DreamDEX trade. A permitted Shannon testnet interaction and its transaction hash must be added before claiming transaction-producing integration.

