import "@nomicfoundation/hardhat-toolbox";

// SKALE Nebula Testnet configuration
const SKALE_RPC_URL = "https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha";
const SKALE_CHAIN_ID = 324705682;

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    skaleNebula: {
      url: SKALE_RPC_URL,
      accounts: [], // Add deployer private key when deploying
      gasPrice: 0, // Zero gas on SKALE!
      chainId: SKALE_CHAIN_ID
    }
  }
};
