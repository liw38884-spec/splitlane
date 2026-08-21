# SplitLane

SplitLane is a non-custodial USDC split-payment system.

It records a tab with a recipient and per-participant shares, then lets each participant pay their own share directly to the recipient. The contract never pools user funds, never exposes an owner or withdrawal path, and never accepts native currency.

Recipients cannot assign a share to themselves. Every settled share represents a transfer between two different addresses.

## Repository layout

| Path | Purpose |
| --- | --- |
| `contracts/` | Foundry contracts, tests, and deployment script |
| `apps/web/` | Next.js dashboard for Base Sepolia and Ethereum Sepolia |
| `packages/attestcoin/` | CC3 proof lane for Ethereum Sepolia receipts |
| `integrations/anna/` | Anna schema-2 App bundle and settlement-draft Executa |
| `docs/` | Delivery docs, threat model, demo script, and submission draft |

## Current chain support

| Surface | Supported chain(s) | Notes |
| --- | --- | --- |
| SplitLane contract | Base Sepolia, Ethereum Sepolia | Uses the official Circle USDC address on each chain |
| Web dashboard | Base Sepolia, Ethereum Sepolia | Demo mode is available when a live contract address is not configured |
| Attestcoin proof lane | Ethereum Sepolia only | Base Sepolia transactions are intentionally rejected |
| DreamDEX event radar | Somnia mainnet | Reads binary markets and contract provenance from the official DreamDEX indexer |

## Program workbench

The web app exposes one reviewable route per active program:

| Route | Program capability |
| --- | --- |
| `/programs/creditcoin` | Creates a strict, explicitly unexecuted Attestcoin proof job for a confirmed Ethereum Sepolia `payShare` transaction |
| `/programs/legaltech` | Explains the deterministic audit record available from every live settlement tab |
| `/programs/anna` | Documents the Anna App draft-to-wallet handoff and publication boundary |
| `/programs/event-contracts` | Displays current and recently resolved DreamDEX binary markets with their Somnia contracts |

The program adapters do not change the settlement contract. They reuse the same non-custodial tab state while keeping proof, audit, conversational planning, and event-market analytics in separate boundaries.

## Testnet deployments

| Network | SplitLane contract | Deployment transaction |
| --- | --- | --- |
| Base Sepolia | [`0x1EE8dCEE85c5bD8bA8D21B599D08Acc3E80C0d6c`](https://sepolia.basescan.org/address/0x1EE8dCEE85c5bD8bA8D21B599D08Acc3E80C0d6c) | [`0xa2b4e8ed...6d2070e`](https://sepolia.basescan.org/tx/0xa2b4e8edc7c29865535adc6c6e221762efe2416231dc5807b4404596d6d2070e) |
| Ethereum Sepolia | [`0x1EE8dCEE85c5bD8bA8D21B599D08Acc3E80C0d6c`](https://sepolia.etherscan.io/address/0x1EE8dCEE85c5bD8bA8D21B599D08Acc3E80C0d6c) | [`0x1e009524...77adfabd`](https://sepolia.etherscan.io/tx/0x1e0095247e4abcdb355e5e9e079572dd1fb0c4835db6d70abd28f1f077adfabd) |

Both deployments were confirmed onchain and bind `USDC()` to Circle's documented token address for that network.

## Local development

Install dependencies in the package you want to work on, then use the package scripts.

### Web app

```powershell
cd apps/web
npm install
npm run dev
```

### Attestcoin lane

```powershell
cd packages/attestcoin
npm install
npm run test
npm run typecheck
npm run build
```

### Anna App bundle

```powershell
cd integrations/anna
python -m unittest discover -s executas/splitlane -p "test_*.py"
npx -y @anna-ai/cli@0.1.49 validate --strict --manifest manifest.json --bundle ./bundle
```

The Anna UI can prepare a draft, but the user still connects and signs in the SplitLane web app. Publishing requires a verified Anna developer account and is not performed by the local check.

### Contracts

```powershell
cd contracts
forge fmt --check
forge build --sizes
forge test
forge lint
```

## Verification commands

The root package exposes combined checks:

```powershell
npm run check:web
npm run check:attestcoin
npm run check:contracts
```

`npm run check` runs all three checks in sequence from the repository root.

## Documentation

- [Architecture](docs/architecture.md)
- [Threat model](docs/threat-model.md)
- [Base.dev and Base Rewards checklist](docs/base-dev-and-rewards-checklist.md)
- [Demo script](docs/demo-script.md)
- [DoraHacks submission draft](docs/dorahacks-submission-draft.md)
- [Four-program delivery and submission notes](docs/four-program-delivery.md)

## Status notes

- Both supported testnet deployments and their transaction hashes are recorded above.
- No demo video or submission URL is embedded here yet.
- DoraHacks eligibility for pre-existing work must be confirmed by the organizer before submission.
