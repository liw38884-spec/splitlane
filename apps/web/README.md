# SplitLane web app

The web app is a Next.js 16 dashboard for SplitLane.

## What it does

- Shows split-payment tabs for Base Sepolia and Ethereum Sepolia.
- Lets a connected wallet create a tab, settle the caller's share, and close a tab as the recipient.
- Falls back to deterministic demo data when live contract addresses are not configured.
- Shows a Builder Code badge on Base Sepolia when `NEXT_PUBLIC_BASE_BUILDER_CODE` is set.
- Keeps the selected chain and tab ID in a shareable URL, including direct reads for tabs older than the recent list.

## Important chain rules

- Base Sepolia uses the official Circle USDC address configured in `apps/web/src/lib/chains.ts`.
- Ethereum Sepolia uses the official Circle USDC address configured in `apps/web/src/lib/chains.ts`.
- Attestcoin proof generation is not available for Base Sepolia.

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SPLITLANE_BASE_SEPOLIA_ADDRESS` | Live Base Sepolia SplitLane address |
| `NEXT_PUBLIC_SPLITLANE_ETHEREUM_SEPOLIA_ADDRESS` | Live Ethereum Sepolia SplitLane address |
| `NEXT_PUBLIC_BASE_BUILDER_CODE` | Optional Base Builder Code badge |

## Development

Run these commands from `apps/web`:

```powershell
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
```

Tab links use `/?chain=base-sepolia&tab=<id>` or `/?chain=ethereum-sepolia&tab=<id>`.

## Notes

- Demo mode is intentional and visible in the UI.
- The app must not claim Attestcoin proof support for Base Sepolia.
- The app should only link to the matching explorer for the selected network.
