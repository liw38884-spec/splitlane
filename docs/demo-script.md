# SplitLane demo script

This script is for a short live demo or a recorded walkthrough.

## Demo outline

1. Open the dashboard.
2. Switch between Base Sepolia and Ethereum Sepolia.
3. Create a tab.
4. Open the chain-aware tab permalink and show that refresh restores it.
5. Show one participant paying their share.
6. Show the recipient closing the tab if any balance remains.
7. Show the Attestcoin proof lane for Ethereum Sepolia only.

Use that settlement flow as the shared recording source, then cut a separate 2–3 minute video for each program. Do not submit one long video that spends most of its time on another sponsor's feature.

## Program-specific cuts

### Creditcoin / Attestcoin

1. Show the confirmed Ethereum Sepolia `payShare` transaction.
2. Generate the strict proof job from `/programs/creditcoin`.
3. Run the repository `dry-run` command and show `verificationResult: true`.
4. State the repository-date eligibility caveat; do not claim organizer approval.

### BLI LegalTech

1. Open the same real tab and export `splitlane.settlement-audit.v1`.
2. Recompute the record hash and compare parties, token, contract, amounts, and status with the explorer.
3. State that the artifact is technical evidence, not legal advice or identity proof.

### Anna AI App Builder

1. Open the installed SplitLane draft in Anna.
2. Validate two participants and show the exact handoff URL.
3. Open the prefilled SplitLane review screen and state that Anna never signs or receives a key.

### Somnia × DreamDEX

1. Show the Shannon chain ID and non-empty bytecode at the six explorer-linked documented addresses.
2. State that this is read-only testnet deployment verification, not trade evidence.
3. Show one live production-indexer market and its exact market/pool provenance.

## Suggested talk track

### 1. Problem

"SplitLane records a group tab and lets each participant pay their own share directly to the recipient."

### 2. Contract behavior

- The contract stores a recipient, title, metadata hash, participants, and fixed share amounts.
- The contract never pools funds.
- The contract never exposes an owner withdrawal path.
- Payment happens with the participant's own USDC approval and transfer.

### 3. Web flow

- Connect a wallet.
- Select the chain.
- Create a tab.
- Select a participant.
- Settle that participant's share.
- Open the explorer link for the resulting transaction.

### 4. Attestcoin flow

- Use an Ethereum Sepolia transaction hash only.
- Run the dry-run proof lane first.
- If a live CC3 verification is required, use the injected-signer verify path.
- Do not present Base Sepolia as Attestcoin-verified.

## Live demo commands

### Web app

```powershell
cd apps/web
npm run dev
```

### Attestcoin dry run

```powershell
cd packages/attestcoin
npm run start -- dry-run --tx 0x<ethereum-sepolia-transaction-hash>
```

### Attestcoin chain discovery

```powershell
cd packages/attestcoin
npm run start -- chains
```

## Placeholders to fill before recording

| Item | Placeholder |
| --- | --- |
| Base Sepolia contract address | `0x1EE8dCEE85c5bD8bA8D21B599D08Acc3E80C0d6c` |
| Ethereum Sepolia contract address | `0x1EE8dCEE85c5bD8bA8D21B599D08Acc3E80C0d6c` |
| Ethereum Sepolia deployment transaction hash | `0x1e0095247e4abcdb355e5e9e079572dd1fb0c4835db6d70abd28f1f077adfabd` |
| Ethereum Sepolia settlement transaction hash | `[FILL IN]` |
| CC3 verification transaction hash | `[FILL IN]` |
| Demo wallet address | `[FILL IN]` |
| Demo video link | `[FILL IN]` |

## Do not say

- "Attestcoin works on Base Sepolia."
- "The project is eligible" unless the organizer confirms the hackathon policy.
