import { createConfig, http } from "wagmi";
import { baseSepolia, sepolia } from "wagmi/chains";
import { baseAccount, injected } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [baseSepolia, sepolia],
  connectors: [
    injected(),
    baseAccount({
      appName: "SplitLane",
    }),
  ],
  ssr: true,
  transports: {
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    ),
    [sepolia.id]: http(
      process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_RPC_URL ||
        "https://ethereum-sepolia-rpc.publicnode.com",
    ),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
