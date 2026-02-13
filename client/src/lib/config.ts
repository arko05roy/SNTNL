/**
 * Wagmi + RainbowKit Configuration for SKALE Base Sepolia (BITE enabled)
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { defineChain } from 'viem';

// Define SKALE Base Sepolia Testnet (BITE enabled)
export const skaleBaseSepolia = defineChain({
  id: 324705682,
  name: 'SKALE Base Sepolia',
  nativeCurrency: {
    name: 'CREDIT',
    symbol: 'CREDIT',
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: ['https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha']
    },
    public: {
      http: ['https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha']
    }
  },
  blockExplorers: {
    default: {
      name: 'SKALE Explorer',
      url: 'https://base-sepolia-testnet-explorer.skalenodes.com'
    }
  },
  testnet: true
});

export const config = getDefaultConfig({
  appName: 'SENTINEL - Private Agent Procurement',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo',
  chains: [skaleBaseSepolia],
  transports: {
    [skaleBaseSepolia.id]: http()
  },
  ssr: true
});
