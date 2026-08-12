# SplitLane contracts

`SplitLane` records immutable USDC tabs. Each participant's exact share moves from that participant
directly to the tab recipient; the contract does not pool funds, charge fees, or expose an owner,
upgrade, withdrawal, recovery, or payable path.

The recipient cannot also be a participant, preventing self-transfers from being recorded as settlement.

## Development

The project uses Foundry 1.7.1, Solidity 0.8.30, forge-std 1.16.2, and OpenZeppelin Contracts 5.7.0.

```console
forge fmt --check
forge build
forge test
forge lint
```

## Supported testnet deployments

Only the official Circle USDC contracts below are accepted by the deployment script:

| Network | Chain ID | `USDC_ADDRESS` |
| --- | ---: | --- |
| Base Sepolia | 84532 | `0x036CBD53842c5426634e7929541ec2318F3DCF7C` |
| Ethereum Sepolia | 11155111 | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |

Deployment is an external, signing action and is not performed by the test suite. Import the deployer
once into Foundry's encrypted keystore; the interactive command prompts for the key and keystore
password without putting either value in a project environment variable:

```console
cast wallet import splitlane-deployer --interactive
```

Set the RPC URL and documented token address for the selected network, then select that encrypted
account at the CLI. Foundry prompts for the keystore password when it signs:

```powershell
$env:BASE_SEPOLIA_RPC_URL = "https://your-base-sepolia-rpc"
$env:USDC_ADDRESS = "0x036CBD53842c5426634e7929541ec2318F3DCF7C"
$env:DEPLOYER_ADDRESS = (cast wallet address --account splitlane-deployer)
forge script script/DeploySplitLane.s.sol:DeploySplitLane --rpc-url base_sepolia --account splitlane-deployer --sender $env:DEPLOYER_ADDRESS --broadcast
```

For Ethereum Sepolia, set `ETHEREUM_SEPOLIA_RPC_URL`, use the documented Ethereum Sepolia USDC
address, and pass `--rpc-url ethereum_sepolia`. The script rejects every other chain and token address.
Do not commit RPC credentials, keystore files, passwords, deployment artifacts, or transaction claims.
