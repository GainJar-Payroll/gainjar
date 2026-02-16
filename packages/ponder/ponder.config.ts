import { createConfig } from "ponder";

import { GainJarAbi } from "./abis/GainJarAbi";

export default createConfig({
  chains: {
    arbitrumSepolia: {
      id: 421614,
      rpc: process.env.PONDER_RPC_URL_421614!,
    },
  },
  contracts: {
    GainJar: {
      chain: "arbitrumSepolia",
      abi: GainJarAbi,
      address: "0xBbE9255bFA52585ADE51343aCa6179E422b8695c",
      startBlock: 241942168,
    },
  },
});
