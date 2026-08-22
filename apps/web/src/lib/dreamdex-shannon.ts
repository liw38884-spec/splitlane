import { z } from "zod";

const SHANNON_RPC_URL = "https://api.infra.testnet.somnia.network/";
const SHANNON_CHAIN_ID = 50312;
const SHANNON_CHAIN_ID_HEX = "0xc488";
const SHANNON_EXPLORER_ADDRESS_URL = "https://shannon-explorer.somnia.network/address/";
const HEX_DATA_PATTERN = /^0x(?:[0-9a-fA-F]{2})*$/;

const rpcEnvelopeSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.number().int(),
});

const rpcErrorSchema = rpcEnvelopeSchema.extend({
  error: z.object({
    code: z.number().int(),
    message: z.string().min(1),
    data: z.unknown().optional(),
  }),
});

const rpcChainIdSchema = rpcEnvelopeSchema.extend({
  result: z.string().regex(/^0x[0-9a-fA-F]+$/),
});

const rpcCodeSchema = rpcEnvelopeSchema.extend({
  result: z.string().regex(HEX_DATA_PATTERN),
});

export const DREAMDEX_SHANNON_CONTRACTS = [
  { name: "BinaryMarketsModule", address: "0x3ecC694Cef705358864a646142ac17A90E29e388" },
  { name: "MarketsCore", address: "0x2802504314685D89bF6C992CA5a8e7cC78bc0294" },
  { name: "BinarySettlement", address: "0xbF4a49e0Dfd092e5FBE8E5761064C49533e6Ed23" },
  { name: "OutcomeToken6909", address: "0xB52c5934113Af5c0Bb20eb3C72290C8215f755b9" },
  { name: "OracleHub", address: "0xe40db387cC98601Dd11bd634fF2f3AD5686dE32b" },
  { name: "CollateralRouter", address: "0xbC0C9834B15ACE38bB50dDaa7d7f7C7CC4DC183C" },
] as const satisfies readonly { name: string; address: `0x${string}` }[];

export type DreamDexShannonContract = (typeof DREAMDEX_SHANNON_CONTRACTS)[number];
export type DreamDexShannonVerificationStatus = "bytecode-present" | "unavailable";

export type DreamDexShannonContractVerification = DreamDexShannonContract & {
  explorerUrl: string;
  status: DreamDexShannonVerificationStatus;
  detail: string;
};

export type DreamDexShannonVerification = {
  network: "Somnia Shannon testnet";
  rpcUrl: string;
  chainId: number;
  chainIdHex: `0x${string}`;
  summary: "all-present" | "partial" | "unavailable";
  detail: string;
  contracts: DreamDexShannonContractVerification[];
};

function describeRpcFailure(method: string, payload: unknown): string {
  const parsed = rpcErrorSchema.safeParse(payload);
  if (parsed.success) {
    return `${method} failed with JSON-RPC ${parsed.data.error.code}: ${parsed.data.error.message}`;
  }
  return `${method} returned an unexpected JSON-RPC payload`;
}

export function parseShannonChainId(payload: unknown): `0x${string}` {
  const parsed = rpcChainIdSchema.safeParse(payload);
  if (!parsed.success) throw new Error(describeRpcFailure("eth_chainId", payload));
  return parsed.data.result.toLowerCase() as `0x${string}`;
}

export function parseShannonContractCode(payload: unknown): `0x${string}` {
  const parsed = rpcCodeSchema.safeParse(payload);
  if (!parsed.success) throw new Error(describeRpcFailure("eth_getCode", payload));
  return parsed.data.result.toLowerCase() as `0x${string}`;
}

function unavailableContracts(detail: string): DreamDexShannonContractVerification[] {
  return DREAMDEX_SHANNON_CONTRACTS.map((contract) => ({
    ...contract,
    explorerUrl: `${SHANNON_EXPLORER_ADDRESS_URL}${contract.address}`,
    status: "unavailable",
    detail,
  }));
}

async function callShannonRpc<T>(
  id: number,
  method: "eth_chainId" | "eth_getCode",
  params: unknown[],
  parser: (payload: unknown) => T,
): Promise<T> {
  const response = await fetch(SHANNON_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(8_000),
  });

  if (!response.ok) {
    throw new Error(`${method} returned HTTP ${response.status}`);
  }

  return parser(await response.json());
}

async function checkShannonContractBytecode(
  contract: DreamDexShannonContract,
  id: number,
): Promise<DreamDexShannonContractVerification> {
  try {
    const code = await callShannonRpc(id, "eth_getCode", [contract.address, "latest"], parseShannonContractCode);
    if (code === "0x") throw new Error("eth_getCode returned empty bytecode");
    return {
      ...contract,
      explorerUrl: `${SHANNON_EXPLORER_ADDRESS_URL}${contract.address}`,
      status: "bytecode-present",
      detail: `Non-empty bytecode returned via read-only RPC (${(code.length - 2) / 2} bytes)`,
    };
  } catch (reason) {
    return {
      ...contract,
      explorerUrl: `${SHANNON_EXPLORER_ADDRESS_URL}${contract.address}`,
      status: "unavailable",
      detail: reason instanceof Error ? reason.message : "eth_getCode verification failed",
    };
  }
}

export async function fetchDreamDexShannonVerification(): Promise<DreamDexShannonVerification> {
  try {
    const chainIdHex = await callShannonRpc(1, "eth_chainId", [], parseShannonChainId);
    if (chainIdHex !== SHANNON_CHAIN_ID_HEX) {
      throw new Error(`Expected Shannon chain ID ${SHANNON_CHAIN_ID_HEX} but received ${chainIdHex}`);
    }

    const contracts = await Promise.all(
      DREAMDEX_SHANNON_CONTRACTS.map((contract, index) => checkShannonContractBytecode(contract, index + 2)),
    );

    const unavailableCount = contracts.filter((contract) => contract.status === "unavailable").length;
    return {
      network: "Somnia Shannon testnet",
      rpcUrl: SHANNON_RPC_URL,
      chainId: SHANNON_CHAIN_ID,
      chainIdHex: SHANNON_CHAIN_ID_HEX,
      summary: unavailableCount ? "partial" : "all-present",
      detail: unavailableCount
        ? `${unavailableCount} bytecode check${unavailableCount === 1 ? "" : "s"} failed closed. This section checks only the listed addresses.`
        : "Non-empty bytecode is present at every listed DreamDEX documentation address. This does not verify implementation identity, version, transaction, or trade activity.",
      contracts,
    };
  } catch (reason) {
    const detail = reason instanceof Error ? reason.message : "Shannon deployment verification failed";
    return {
      network: "Somnia Shannon testnet",
      rpcUrl: SHANNON_RPC_URL,
      chainId: SHANNON_CHAIN_ID,
      chainIdHex: SHANNON_CHAIN_ID_HEX,
      summary: "unavailable",
      detail: `${detail}. This section fails closed and does not imply any trade or settlement activity.`,
      contracts: unavailableContracts(detail),
    };
  }
}
