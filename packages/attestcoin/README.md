# SplitLane Attestcoin proof lane

This package proves a confirmed SplitLane receipt transaction from **Ethereum Sepolia** on **Creditcoin CC3 Testnet** using `@gluwa/usc-sdk` 0.18.0. It asks CC3's `ChainInfo` precompile which source chains are currently supported and derives the Ethereum Sepolia chain key from that response.

Base Sepolia is intentionally rejected. Attestcoin's current testnet support for Ethereum Sepolia must not be presented as verification of a Base transaction.

## Safety boundary

- `dry-run` reads Ethereum Sepolia and CC3, waits for attestation, builds a proof, and calls the BlockProver's read-only `verifySingle`. It never signs or submits.
- `verify` additionally calls `verifyAndEmitSingle`, but only when the host application injects an ethers v6 `JsonRpcSigner` already connected to CC3 Testnet.
- The package never reads a private key, mnemonic, keystore, or seed phrase. The standalone process cannot construct a signer, so its `verify` command fails closed unless `runCli` is called by a host that injects one.
- Every accepted source transaction must be successful, meet the confirmation threshold, target the configured Ethereum Sepolia SplitLane contract, and use an explicitly allowed function selector.
- Proof-builder `txBytes` must exactly equal the official SDK encoding rebuilt from the inspected transaction and receipt. A claimed hash alone is never trusted.

## Configuration

| Environment variable | Required | Default |
| --- | --- | --- |
| `ETHEREUM_SEPOLIA_RPC_URL` | yes | none |
| `SPLITLANE_ETHEREUM_SEPOLIA_ADDRESS` | yes | none |
| `SPLITLANE_ALLOWED_FUNCTION_SIGNATURES` | no | `payShare(uint256)` |
| `CREDITCOIN_CC3_RPC_URL` | no | `https://rpc.cc3-testnet.creditcoin.network` |
| `CREDITCOIN_CC3_PROOF_BUILDER_URL` | no | `https://prover.cc3-testnet.creditcoin.network/` |
| `ATTESTCOIN_MIN_CONFIRMATIONS` | no | `1` |
| `ATTESTCOIN_POLL_INTERVAL_MS` | no | `15000` |
| `ATTESTCOIN_TIMEOUT_MS` | no | `900000` |
| `ATTESTCOIN_EXTRA_DELAY_MS` | no | `5000` |
| `ATTESTCOIN_PROOF_REQUEST_TIMEOUT_MS` | no | `30000` |

Use a comma-separated signature list only when a deployed SplitLane version has more than one legitimate receipt-producing entry point. Selectors are calculated locally with ethers and compared to the transaction calldata.

## Commands

```sh
npm run start -- chains
npm run start -- dry-run --tx 0x<ethereum-sepolia-transaction-hash>
```

The installed binary exposes the same interface:

```sh
splitlane-attestcoin chains
splitlane-attestcoin dry-run --tx 0x<ethereum-sepolia-transaction-hash>
```

The `chains` command returns the live `ChainInfo` response from CC3. Proof commands emit JSON evidence with the source chain, source transaction hash, block number, confirmation count, discovered chain key, validated contract and selector, verification result, and the Creditcoin transaction hash when an event-emitting verification was submitted.

## Injected verify mode

Use the exported API from an account flow that already owns a CC3 `JsonRpcSigner`. Do not pass raw key material to this package.

```ts
import { executeProofLane, loadConfig, createWorkflowDependencies } from "@splitlane/attestcoin";
import type { JsonRpcSigner } from "ethers";

export async function verifyReceipt(transactionHash: string, signer: JsonRpcSigner) {
  const config = loadConfig();
  return executeProofLane(
    { mode: "verify", transactionHash, signer },
    config,
    createWorkflowDependencies(config),
  );
}
```

This is an explicit state-changing operation on CC3 Testnet. The caller is responsible for presenting the transaction to the wallet and obtaining user approval.

## Development

```sh
npm test
npm run typecheck
npm run build
```
