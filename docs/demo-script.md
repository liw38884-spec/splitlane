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
