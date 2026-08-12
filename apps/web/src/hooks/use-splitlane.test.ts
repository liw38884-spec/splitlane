import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { baseSepolia, sepolia } from "viem/chains";
import type { SupportedChainId } from "@/lib/chains";
import { useSplitLane } from "./use-splitlane";

type ReadRequest = {
  functionName: string;
};

type PublicClientMock = {
  readContract: ReturnType<typeof vi.fn>;
  waitForTransactionReceipt: ReturnType<typeof vi.fn>;
};

const mocks = vi.hoisted(() => ({
  clients: new Map<number, PublicClientMock>(),
}));

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: undefined, chainId: undefined, isConnected: false }),
  usePublicClient: ({ chainId }: { chainId: number }) => mocks.clients.get(chainId),
  useSendTransaction: () => ({ sendTransactionAsync: vi.fn() }),
}));

vi.mock("@/lib/contracts", () => ({
  hasLiveContract: () => true,
  SPLITLANE_ADDRESSES: {
    84532: "0x0000000000000000000000000000000000000001",
    11155111: "0x0000000000000000000000000000000000000002",
  },
  splitLaneAbi: [],
  usdcAbi: [],
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function clientFor(title: string, nextTabId: Promise<bigint>): PublicClientMock {
  return {
    readContract: vi.fn((request: ReadRequest) => {
      if (request.functionName === "nextTabId") return nextTabId;
      if (request.functionName === "getTab") {
        return [
          "0x0000000000000000000000000000000000000003",
          title,
          `0x${"1".padStart(64, "0")}`,
          1n,
          0n,
          1,
          100n,
          100n,
        ];
      }
      if (request.functionName === "getParticipants") return [];
      throw new Error(`Unexpected read: ${request.functionName}`);
    }),
    waitForTransactionReceipt: vi.fn(),
  };
}

afterEach(() => {
  mocks.clients.clear();
});

describe("useSplitLane", () => {
  it("ignores an old-chain response that resolves after the current chain", async () => {
    const baseResponse = deferred<bigint>();
    const ethereumResponse = deferred<bigint>();
    const baseClient = clientFor("Base tab", baseResponse.promise);
    const ethereumClient = clientFor("Ethereum tab", ethereumResponse.promise);
    mocks.clients.set(baseSepolia.id, baseClient);
    mocks.clients.set(sepolia.id, ethereumClient);

    const { result, rerender } = renderHook(
      ({ chainId }: { chainId: SupportedChainId }) => useSplitLane(chainId),
      { initialProps: { chainId: baseSepolia.id as SupportedChainId } },
    );

    await waitFor(() => {
      expect(baseClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: "nextTabId" }),
      );
    });

    rerender({ chainId: sepolia.id });
    await waitFor(() => {
      expect(ethereumClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: "nextTabId" }),
      );
    });

    await act(async () => ethereumResponse.resolve(2n));
    await waitFor(() => expect(result.current.tabs[0]?.title).toBe("Ethereum tab"));
    expect(result.current.tabs[0]?.chainId).toBe(sepolia.id);

    await act(async () => baseResponse.resolve(2n));
    await waitFor(() => {
      expect(baseClient.readContract).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: "getTab" }),
      );
    });

    expect(result.current.tabs[0]?.title).toBe("Ethereum tab");
    expect(result.current.tabs[0]?.chainId).toBe(sepolia.id);
  });

  it("rejects a load function captured by an old-chain render", async () => {
    const baseClient = clientFor("Base tab", Promise.resolve(2n));
    const ethereumClient = clientFor("Ethereum tab", Promise.resolve(2n));
    mocks.clients.set(baseSepolia.id, baseClient);
    mocks.clients.set(sepolia.id, ethereumClient);

    const { result, rerender } = renderHook(
      ({ chainId }: { chainId: SupportedChainId }) => useSplitLane(chainId),
      { initialProps: { chainId: baseSepolia.id as SupportedChainId } },
    );

    await waitFor(() => expect(result.current.tabs[0]?.title).toBe("Base tab"));
    const staleBaseLoad = result.current.loadTabs;

    rerender({ chainId: sepolia.id });
    await waitFor(() => expect(result.current.tabs[0]?.title).toBe("Ethereum tab"));
    const baseCallCount = baseClient.readContract.mock.calls.length;

    await act(async () => staleBaseLoad());

    expect(baseClient.readContract).toHaveBeenCalledTimes(baseCallCount);
    expect(result.current.tabs[0]?.title).toBe("Ethereum tab");
    expect(result.current.tabs[0]?.chainId).toBe(sepolia.id);
  });
});
