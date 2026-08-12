import type { JsonRpcSigner } from "ethers";

import {
  loadConfig,
  loadCreditcoinDiscoveryConfig,
  type LaneConfig,
} from "./config.js";
import { LaneError } from "./errors.js";
import { formatProofEvidence } from "./evidence.js";
import {
  createChainDiscoveryDependencies,
  createWorkflowDependencies,
  discoverSupportedChains,
  executeProofLane,
  type ProofLaneInput,
  type ProofMode,
  type WorkflowDependencies,
} from "./workflow.js";

interface CliOptions {
  env?: NodeJS.ProcessEnv;
  stdout?: Pick<NodeJS.WriteStream, "write">;
  signer?: JsonRpcSigner;
  config?: LaneConfig;
  dependencies?: WorkflowDependencies;
}

interface ParsedProofCommand {
  command: ProofMode;
  transactionHash: string;
}

function parseProofCommand(args: string[]): ParsedProofCommand {
  const command = args[0];
  if (command !== "dry-run" && command !== "verify") {
    throw new LaneError("CLI_USAGE", "Usage: splitlane-attestcoin <chains|dry-run|verify> [--tx <hash>]");
  }

  const transactionIndex = args.indexOf("--tx");
  const transactionHash = transactionIndex >= 0 ? args[transactionIndex + 1] : undefined;
  if (transactionHash === undefined || transactionHash.startsWith("--")) {
    throw new LaneError("CLI_USAGE", `${command} requires --tx <Ethereum Sepolia transaction hash>`);
  }
  if (args.length !== 3 || transactionIndex !== 1) {
    throw new LaneError("CLI_USAGE", `Unexpected arguments for ${command}`);
  }

  return { command, transactionHash };
}

export async function runCli(args: string[], options: CliOptions = {}): Promise<void> {
  const stdout = options.stdout ?? process.stdout;

  if (args[0] === "chains") {
    if (args.length !== 1) {
      throw new LaneError("CLI_USAGE", "chains does not accept additional arguments");
    }
    const discoveryConfig = options.config ?? loadCreditcoinDiscoveryConfig(options.env);
    const discoveryDependencies =
      options.dependencies ?? createChainDiscoveryDependencies(discoveryConfig);
    const chains = await discoverSupportedChains(discoveryDependencies);
    stdout.write(`${JSON.stringify({ creditcoinNetwork: "CC3 Testnet", supportedSourceChains: chains }, null, 2)}\n`);
    return;
  }

  const config = options.config ?? loadConfig(options.env);
  const dependencies = options.dependencies ?? createWorkflowDependencies(config);
  const parsed = parseProofCommand(args);
  const input: ProofLaneInput =
    parsed.command === "verify" && options.signer !== undefined
      ? { mode: parsed.command, transactionHash: parsed.transactionHash, signer: options.signer }
      : { mode: parsed.command, transactionHash: parsed.transactionHash };
  const evidence = await executeProofLane(input, config, dependencies);
  stdout.write(formatProofEvidence(evidence));
}
