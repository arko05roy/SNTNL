import { defineConfig } from "hardhat/config";

export default defineConfig({
  solidity: "0.8.20",
  networks: {
    skaleBaseSepolia: {
      type: "http",
      url: "https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha",
    },
  },
});
