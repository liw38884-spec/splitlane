import { formatUnits, getAddress, isAddress, parseUnits } from "viem";

const MAX_PARTICIPANTS = 20;

export type TabDraftParticipant = {
  address: string;
  amount: string;
};

export type TabDraft = {
  title: string;
  participants: TabDraftParticipant[];
};

function normalizeAmount(value: string): string | undefined {
  try {
    const amount = parseUnits(value, 6);
    return amount > 0n ? formatUnits(amount, 6) : undefined;
  } catch {
    return undefined;
  }
}

export function parseTabDraft(search: string): TabDraft | undefined {
  const params = new URLSearchParams(search.startsWith("?") ? search : search.split("?")[1]);
  if (params.get("draft") !== "1") return undefined;

  const title = params.get("title")?.trim() ?? "";
  if (!title || new TextEncoder().encode(title).length > 80) return undefined;

  const addresses = params.getAll("participant");
  const amounts = params.getAll("amount");
  if (
    addresses.length === 0 ||
    addresses.length > MAX_PARTICIPANTS ||
    addresses.length !== amounts.length
  ) {
    return undefined;
  }

  const seen = new Set<string>();
  const participants: TabDraftParticipant[] = [];
  for (let index = 0; index < addresses.length; index += 1) {
    const address = addresses[index];
    const amount = normalizeAmount(amounts[index]);
    if (!isAddress(address) || !amount) return undefined;
    const normalizedAddress = getAddress(address);
    const addressKey = normalizedAddress.toLowerCase();
    if (seen.has(addressKey)) return undefined;
    seen.add(addressKey);
    participants.push({ address: normalizedAddress, amount });
  }

  return { title, participants };
}

export function draftPath(draft: TabDraft): string {
  const params = new URLSearchParams({ draft: "1", source: "anna", title: draft.title.trim() });
  for (const participant of draft.participants) {
    params.append("participant", participant.address);
    params.append("amount", participant.amount);
  }
  return `/?${params.toString()}`;
}
