"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  encodeFunctionData,
  getAddress,
  keccak256,
  stringToHex,
  zeroAddress,
  type Address,
  type Hash,
} from "viem";
import { useAccount, usePublicClient, useSendTransaction } from "wagmi";
import type { SupportedChainId } from "@/lib/chains";
import { USDC_ADDRESSES } from "@/lib/chains";
import { dataSuffixForChain } from "@/lib/attribution";
import {
  assertExpectedReplacement,
  assertSuccessfulReceipt,
  type TransactionReplacementReason,
} from "@/lib/receipts";
import {
  hasLiveContract,
  SPLITLANE_ADDRESSES,
  splitLaneAbi,
  usdcAbi,
} from "@/lib/contracts";
import { DEMO_CONNECTED_ADDRESS, getDemoTabs } from "@/lib/demo-data";
import type { NewTabInput, TabRecord, TabStatus, TransactionState } from "@/lib/types";

const IDLE_TRANSACTION: TransactionState = { stage: "idle", message: "" };

function statusFromContract(value: number): TabStatus {
  if (value === 2) return "settled";
  if (value === 3) return "closed";
  return "open";
}

function transactionArgs(chainId: SupportedChainId) {
  const dataSuffix = dataSuffixForChain(chainId);
  return dataSuffix ? { dataSuffix } : {};
}

export function useSplitLane(chainId: SupportedChainId, requestedTabId?: bigint) {
  const publicClient = usePublicClient({ chainId });
  const { address, chainId: walletChainId, isConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const [tabs, setTabs] = useState<TabRecord[]>(() => getDemoTabs(chainId));
  const [isLoading, setIsLoading] = useState(false);
  const [transaction, setTransaction] = useState<TransactionState>(IDLE_TRANSACTION);
  const loadGeneration = useRef(0);
  const isLive = hasLiveContract(chainId);
  const contractAddress = SPLITLANE_ADDRESSES[chainId];
  const loadScope = `${chainId}:${contractAddress}:${requestedTabId?.toString() ?? ""}`;
  const activeLoadScope = useRef(loadScope);

  useLayoutEffect(() => {
    activeLoadScope.current = loadScope;
  }, [loadScope]);

  const actorAddress = useMemo(
    () => address ?? (!isLive ? DEMO_CONNECTED_ADDRESS : undefined),
    [address, isLive],
  );

  const waitForExpectedReceipt = useCallback(
    async (hash: Hash) => {
      if (!publicClient) throw new Error("RPC client is unavailable");
      let replacementReason: TransactionReplacementReason | undefined;
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        onReplaced: ({ reason }) => {
          replacementReason = reason;
        },
      });
      assertExpectedReplacement(replacementReason);
      assertSuccessfulReceipt(receipt);
      return receipt;
    },
    [publicClient],
  );

  const loadTabs = useCallback(async () => {
    if (activeLoadScope.current !== loadScope) return;
    const generation = ++loadGeneration.current;
    const isCurrentLoad = () =>
      generation === loadGeneration.current && activeLoadScope.current === loadScope;
    if (!isLive || !publicClient) {
      if (isCurrentLoad()) {
        setTabs(getDemoTabs(chainId));
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    try {
      const nextTabId = await publicClient.readContract({
        address: contractAddress,
        abi: splitLaneAbi,
        functionName: "nextTabId",
      });
      const first = nextTabId > 9n ? nextTabId - 8n : 1n;
      const ids: bigint[] = [];
      for (let id = first; id < nextTabId; id += 1n) ids.push(id);
      if (requestedTabId && requestedTabId < nextTabId && requestedTabId >= 1n) {
        ids.push(requestedTabId);
      }
      const uniqueIds = [...new Set(ids)].sort((left, right) =>
        left === right ? 0 : left > right ? -1 : 1,
      );

      const records = await Promise.all(
        uniqueIds.map(async (id): Promise<TabRecord> => {
          const [tab, participants] = await Promise.all([
            publicClient.readContract({
              address: contractAddress,
              abi: splitLaneAbi,
              functionName: "getTab",
              args: [id],
            }),
            publicClient.readContract({
              address: contractAddress,
              abi: splitLaneAbi,
              functionName: "getParticipants",
              args: [id],
            }),
          ]);

          const shares = await Promise.all(
            participants.map(async (participant) => {
              const [amount, paid] = await publicClient.readContract({
                address: contractAddress,
                abi: splitLaneAbi,
                functionName: "getShare",
                args: [id, participant],
              });
              return { participant, amount, paid };
            }),
          );

          return {
            chainId,
            id,
            recipient: tab[0],
            title: tab[1],
            metadataHash: tab[2],
            createdAt: tab[3],
            closedAt: tab[4],
            status: statusFromContract(tab[5]),
            totalAmount: tab[6],
            remainingAmount: tab[7],
            shares,
          };
        }),
      );
      if (isCurrentLoad()) setTabs(records);
    } finally {
      if (isCurrentLoad()) setIsLoading(false);
    }
  }, [chainId, contractAddress, isLive, loadScope, publicClient, requestedTabId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadTabs(), 0);
    return () => {
      window.clearTimeout(timeoutId);
      loadGeneration.current += 1;
    };
  }, [loadTabs]);

  const createTab = useCallback(
    async (input: NewTabInput) => {
      setTransaction({ stage: "submitting", message: "Creating tab" });
      const metadataHash = keccak256(
        stringToHex(JSON.stringify({ version: 1, title: input.title.trim() })),
      );

      if (!isLive) {
        const totalAmount = input.amounts.reduce((sum, amount) => sum + amount, 0n);
        const nextId = tabs.reduce((max, tab) => (tab.id > max ? tab.id : max), 0n) + 1n;
        const newTab: TabRecord = {
          chainId,
          id: nextId,
          title: input.title.trim(),
          recipient: actorAddress ?? zeroAddress,
          metadataHash,
          createdAt: BigInt(Math.floor(Date.now() / 1000)),
          closedAt: 0n,
          status: "open",
          totalAmount,
          remainingAmount: totalAmount,
          shares: input.participants.map((participant, index) => ({
            participant,
            amount: input.amounts[index],
            paid: false,
          })),
        };
        setTabs((current) => [newTab, ...current]);
        setTransaction({ stage: "success", message: "Tab created in demo" });
        return;
      }

      if (!isConnected || !address || !publicClient) throw new Error("Connect a wallet");
      if (walletChainId !== chainId) throw new Error("Switch the wallet to the selected network");
      const data = encodeFunctionData({
        abi: splitLaneAbi,
        functionName: "createTab",
        args: [input.title.trim(), metadataHash, input.participants, input.amounts],
      });
      const hash = await sendTransactionAsync({
        to: contractAddress,
        data,
        chainId,
        ...transactionArgs(chainId),
      });
      setTransaction({ stage: "confirming", message: "Confirming tab", hash, chainId });
      const receipt = await waitForExpectedReceipt(hash);
      setTransaction({ stage: "success", message: "Tab created", hash: receipt.transactionHash, chainId });
      await loadTabs();
    }, [
      actorAddress,
      address,
      chainId,
      contractAddress,
      isConnected,
      isLive,
      loadTabs,
      publicClient,
      sendTransactionAsync,
      tabs,
      waitForExpectedReceipt,
      walletChainId,
    ],
  );

  const settleShare = useCallback(
    async (tab: TabRecord, participant: Address) => {
      if (tab.chainId !== chainId) throw new Error("Tab data belongs to another network; refresh and try again");
      const share = tab.shares.find(
        (item) => item.participant.toLowerCase() === participant.toLowerCase(),
      );
      if (!share || share.paid) return;

      if (!isLive) {
        setTabs((current) =>
          current.map((item) => {
            if (item.id !== tab.id) return item;
            const remainingAmount = item.remainingAmount - share.amount;
            return {
              ...item,
              remainingAmount,
              status: remainingAmount === 0n ? "settled" : item.status,
              closedAt:
                remainingAmount === 0n ? BigInt(Math.floor(Date.now() / 1000)) : item.closedAt,
              shares: item.shares.map((candidate) =>
                candidate.participant.toLowerCase() === participant.toLowerCase()
                  ? { ...candidate, paid: true }
                  : candidate,
              ),
            };
          }),
        );
        setTransaction({ stage: "success", message: "Share settled in demo" });
        return;
      }

      if (!address || !isConnected || !publicClient) throw new Error("Connect a wallet");
      if (walletChainId !== chainId) throw new Error("Switch the wallet to the selected network");
      if (getAddress(address) !== getAddress(participant)) {
        throw new Error("Only the assigned participant can settle this share");
      }

      const allowance = await publicClient.readContract({
        address: USDC_ADDRESSES[chainId],
        abi: usdcAbi,
        functionName: "allowance",
        args: [address, contractAddress],
      });

      if (allowance < share.amount) {
        setTransaction({ stage: "approving", message: "Approving exact USDC share" });
        const approvalHash = await sendTransactionAsync({
          to: USDC_ADDRESSES[chainId],
          data: encodeFunctionData({
            abi: usdcAbi,
            functionName: "approve",
            args: [contractAddress, share.amount],
          }),
          chainId,
          ...transactionArgs(chainId),
        });
        await waitForExpectedReceipt(approvalHash);
      }

      setTransaction({ stage: "submitting", message: "Settling share" });
      const hash = await sendTransactionAsync({
        to: contractAddress,
        data: encodeFunctionData({
          abi: splitLaneAbi,
          functionName: "payShare",
          args: [tab.id],
        }),
        chainId,
        ...transactionArgs(chainId),
      });
      setTransaction({ stage: "confirming", message: "Confirming settlement", hash, chainId });
      const receipt = await waitForExpectedReceipt(hash);
      setTransaction({ stage: "success", message: "Share settled", hash: receipt.transactionHash, chainId });
      await loadTabs();
    }, [
      address,
      chainId,
      contractAddress,
      isConnected,
      isLive,
      loadTabs,
      publicClient,
      sendTransactionAsync,
      waitForExpectedReceipt,
      walletChainId,
    ],
  );

  const closeTab = useCallback(
    async (tab: TabRecord) => {
      if (tab.chainId !== chainId) throw new Error("Tab data belongs to another network; refresh and try again");
      if (!isLive) {
        setTabs((current) =>
          current.map((item) =>
            item.id === tab.id
              ? {
                  ...item,
                  status: "closed",
                  closedAt: BigInt(Math.floor(Date.now() / 1000)),
                }
              : item,
          ),
        );
        setTransaction({ stage: "success", message: "Tab closed in demo" });
        return;
      }
      if (!address || !publicClient) throw new Error("Connect a wallet");
      if (walletChainId !== chainId) throw new Error("Switch the wallet to the selected network");
      setTransaction({ stage: "submitting", message: "Closing tab" });
      const hash = await sendTransactionAsync({
        to: contractAddress,
        data: encodeFunctionData({
          abi: splitLaneAbi,
          functionName: "closeTab",
          args: [tab.id],
        }),
        chainId,
        ...transactionArgs(chainId),
      });
      setTransaction({ stage: "confirming", message: "Confirming closure", hash, chainId });
      const receipt = await waitForExpectedReceipt(hash);
      setTransaction({ stage: "success", message: "Tab closed", hash: receipt.transactionHash, chainId });
      await loadTabs();
    }, [address, chainId, contractAddress, isLive, loadTabs, publicClient, sendTransactionAsync, waitForExpectedReceipt, walletChainId],
  );

  const runAction = useCallback(async (action: () => Promise<void>): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch (error) {
      setTransaction({
        stage: "error",
        message: error instanceof Error ? error.message : "Transaction failed",
      });
      return false;
    }
  }, []);

  return {
    actorAddress,
    closeTab: (tab: TabRecord) => runAction(() => closeTab(tab)),
    contractAddress,
    createTab: (input: NewTabInput) => runAction(() => createTab(input)),
    isLive,
    isLoading,
    loadTabs,
    settleShare: (tab: TabRecord, participant: Address) =>
      runAction(() => settleShare(tab, participant)),
    tabs,
    transaction,
    resetTransaction: () => setTransaction(IDLE_TRANSACTION),
  };
}
