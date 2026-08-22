import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchDreamDexShannonVerification,
  parseShannonChainId,
  parseShannonContractCode,
} from "./dreamdex-shannon";

afterEach(() => vi.unstubAllGlobals());

describe("DreamDEX Shannon deployment verification", () => {
  it("accepts the official Shannon chain id response", () => {
    expect(parseShannonChainId({ jsonrpc: "2.0", id: 1, result: "0xc488" })).toBe("0xc488");
  });

  it("accepts non-empty bytecode responses", () => {
    expect(
      parseShannonContractCode({
        jsonrpc: "2.0",
        id: 2,
        result: "0x6080604052",
      }),
    ).toBe("0x6080604052");
  });

  it("fails closed on malformed or error JSON-RPC payloads", () => {
    expect(() => parseShannonChainId({ jsonrpc: "2.0", id: 1, result: "50312" })).toThrow(/eth_chainId/);
    expect(() =>
      parseShannonContractCode({
        jsonrpc: "2.0",
        id: 4,
        error: { code: -32602, message: "invalid params" },
      }),
    ).toThrow(/eth_getCode failed/);
    expect(() =>
      parseShannonContractCode({
        jsonrpc: "2.0",
        id: 5,
        result: "0x123",
      }),
    ).toThrow(/unexpected JSON-RPC payload/);
  });

  it("marks the entire deployment unavailable when the RPC chain id is wrong", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1" }))));

    const verification = await fetchDreamDexShannonVerification();

    expect(verification.summary).toBe("unavailable");
    expect(verification.contracts).toHaveLength(6);
    expect(verification.contracts.every((contract) => contract.status === "unavailable")).toBe(true);
    expect(verification.detail).toMatch(/Expected Shannon chain ID/);
  });

  it("marks empty contract bytecode unavailable without treating it as deployment evidence", async () => {
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { id: number; method: string };
      const result = body.method === "eth_chainId" ? "0xc488" : "0x";
      return new Response(JSON.stringify({ jsonrpc: "2.0", id: body.id, result }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const verification = await fetchDreamDexShannonVerification();

    expect(verification.summary).toBe("partial");
    expect(verification.contracts.every((contract) => contract.status === "unavailable")).toBe(true);
    expect(verification.contracts[0]?.detail).toMatch(/empty bytecode/);
    expect(fetchMock).toHaveBeenCalledTimes(7);
  });
});
