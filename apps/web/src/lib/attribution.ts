import { Attribution } from "ox/erc8021";
import type { Hex } from "viem";
import { baseSepolia } from "viem/chains";

const BUILDER_CODE_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export function normalizeBuilderCode(value: string | undefined): string | undefined {
  const code = value?.trim();
  if (!code || !BUILDER_CODE_PATTERN.test(code)) return undefined;
  return code;
}

export function createBuilderDataSuffix(code: string): Hex {
  const normalized = normalizeBuilderCode(code);
  if (!normalized) throw new Error("Builder Code must be 1-64 ASCII code characters");
  return Attribution.toDataSuffix({ codes: [normalized] }) as Hex;
}

export const configuredBuilderCode = normalizeBuilderCode(
  process.env.NEXT_PUBLIC_BASE_BUILDER_CODE,
);

export const configuredDataSuffix = configuredBuilderCode
  ? createBuilderDataSuffix(configuredBuilderCode)
  : undefined;

export function dataSuffixForChain(chainId: number): Hex | undefined {
  return chainId === baseSepolia.id ? configuredDataSuffix : undefined;
}
