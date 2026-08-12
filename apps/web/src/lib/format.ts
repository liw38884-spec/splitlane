import { formatUnits, getAddress, isAddress } from "viem";

export function formatUsdc(value: bigint): string {
  const [whole, fraction] = formatUnits(value, 6).split(".");
  const groupedWhole = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${groupedWhole}.${fraction}` : groupedWhole;
}

export function shortenAddress(address: string, lead = 5, tail = 4): string {
  if (!isAddress(address)) return address;
  const checksummed = getAddress(address);
  return `${checksummed.slice(0, lead + 2)}...${checksummed.slice(-tail)}`;
}

export function formatDate(timestampSeconds: bigint | number): string {
  const milliseconds = Number(timestampSeconds) * 1000;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(milliseconds));
}
