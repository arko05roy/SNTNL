# SENTINEL - Private Agent Procurement

**SF Agentic Commerce x402 Hackathon Submission**
**Tracks:** Track 5 (Encrypted Agents) + Track 1 (Best Agentic App)

## Overview

SENTINEL is a privacy-first procurement platform for enterprise AI agents. Using SKALE's BITE Protocol for sealed-bid auctions and x402 for instant on-chain settlements, agents can buy services without revealing their strategies.

**Deployed Contracts (SKALE Base Sepolia Testnet — Chain ID: 324705682):**
- ServiceRegistry: `0x5754C71c2474FE8F2B83C43432Faf0AC94cc24A5`
- SealedBidAuction: `0x98eFA762eDa5FB0C3BA02296c583A5a542c66c8b`
- AgentRegistry (ERC-721): `0x31DA867c6C12eCEBbb738d97198792901431e228`
- SentinelUSDC (EIP-3009): `0x6bc10d034D0824ee67EaC1e4E66047b723a8D873`

---

## Problem

Enterprise agents spend billions on cloud compute, data feeds, and API services. Public bidding leads to:
- **Price manipulation** by sellers
- **Strategy leakage** to competitors
- **Front-running attacks**
- **Loss of competitive advantage**

## Solution

SENTINEL implements sealed-bid auctions with three key technologies:

### 1. BITE Phase 2 (Blockchain Integrated Threshold Encryption)
- Bids encrypted before submission using BLS threshold encryption
- Conditional decryption triggered by auction deadline
- Losers' bids never revealed (permanent privacy)
- Prevents front-running and price manipulation

### 2. x402 Payment Protocol (Real On-Chain Settlement)
- HTTP 402 Payment Required standard for agent-to-agent payments
- EIP-3009 `transferWithAuthorization` for gasless signed transfers
- Self-hosted facilitator executes settlements directly on SKALE
- Real transaction hashes — no mocks
- **Zero gas fees** on SKALE

### 3. Agent Identity (ERC-721 / ERC-8004)
- On-chain agent registration with URI-based profiles
- Wallet binding for autonomous agent operations
- Metadata storage for service capabilities
- Coinbase CDP SDK for autonomous agent wallets

---

## Demo Flow

1. **Discovery:** AI agents discover GPU/Data/API providers on-chain
2. **Bidding:** Agents submit BITE-encrypted bids (sealed, private)
3. **Deadline:** 30-second sealed-bid period
4. **Reveal:** BITE conditional decryption triggered
5. **Settlement:** Winner pays via x402 — real on-chain tx on SKALE
6. **Receipt:** Full audit trail with verifiable transaction hash

---

## Tech Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS, RainbowKit
- **Wallet:** Wagmi 2.x, Viem 2.x, CDP SDK (Coinbase)
- **Blockchain:** SKALE Base Sepolia Testnet (Chain ID: 324705682, zero gas)
- **Privacy:** `@skalenetwork/bite` (real BITE SDK integration)
- **Payments:** `@x402/fetch` + `@x402/evm` (EIP-3009 signed transfers)
- **Smart Contracts:** Solidity 0.8.20 (4 contracts)
- **Agent Wallets:** `@coinbase/coinbase-sdk` for autonomous key management

---

## Project Structure

```
SNTNL/
├── client/                    # Next.js frontend + API routes
│   ├── src/
│   │   ├── app/              # Pages + API routes
│   │   │   ├── api/auction/  # Auction lifecycle API
│   │   │   ├── api/settle/   # x402 settlement (self-hosted facilitator)
│   │   │   ├── api/agents/   # Agent management
│   │   │   ├── api/providers/# Provider registry
│   │   │   ├── agents/       # Agent management page
│   │   │   └── providers/    # Provider registry page
│   │   ├── components/       # React components (11)
│   │   ├── lib/              # Core logic
│   │   │   ├── x402.ts       # x402 payment client (@x402/evm + @x402/fetch)
│   │   │   ├── bite.ts       # BITE encryption layer
│   │   │   ├── cdp-agents.ts # Coinbase CDP agent wallets
│   │   │   ├── contracts.ts  # ABIs & addresses
│   │   │   ├── agents.ts     # Agent state & strategies
│   │   │   └── config.ts     # Wagmi + RainbowKit config
│   │   └── types/            # TypeScript type definitions
│   └── package.json
├── contracts-hardhat/         # Smart contracts
│   ├── contracts/
│   │   ├── SealedBidAuction.sol   # Sealed-bid auction with BITE
│   │   ├── ServiceRegistry.sol     # Provider directory
│   │   ├── AgentRegistry.sol       # ERC-721 agent identity
│   │   └── SentinelUSDC.sol        # EIP-3009 payment token
│   ├── deployment.json             # Deployed addresses
│   └── hardhat.config.ts
└── README.md
```

---

## Running Locally

```bash
# Clone
git clone https://github.com/arko05roy/SNTNL.git
cd SNTNL

# Install client dependencies
cd client
npm install

# Configure environment
cp .env.example .env.local
# Fill in SKALE RPC URL, contract addresses, and keys

# Run development server
npm run dev
# Open http://localhost:3000
```

### Smart Contract Development
```bash
cd contracts-hardhat
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network skaleBaseSepolia
```

---

## Smart Contracts

### SealedBidAuction.sol
Sealed-bid auction lifecycle with BITE encryption:
- `createAuction(serviceType, duration, minBid, maxBid)` — Start auction
- `submitBid(auctionId, encryptedBid)` — Submit BITE-encrypted bid
- `revealBid(auctionId, bidIndex, amount)` — Reveal after deadline
- `finalizeAuction(auctionId)` — Determine winner

### AgentRegistry.sol (ERC-721)
On-chain agent identity aligned with ERC-8004:
- `register(agentURI, metadata[])` — Mint agent NFT with profile
- `setAgentWallet(agentId, wallet)` — Bind autonomous wallet
- `getAgentsByOwner(owner)` — Lookup agents by owner

### ServiceRegistry.sol
Provider directory for GPU, Data, and API services:
- `registerProvider(name, serviceType, basePrice)` — Onboard provider
- `getAllProviders()` — List all active providers

### SentinelUSDC.sol (EIP-3009)
Payment token with gasless authorized transfers:
- `transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s)`
- EIP-712 typed data signing for x402 settlement
- Owner-only minting, 6 decimals

---

## x402 Settlement Architecture

```
Client (Agent)                    Server (/api/settle)              SKALE Chain
     |                                    |                              |
     |-- POST /api/settle ------------>   |                              |
     |                                    |-- 402 + payment requirements |
     |<-- 402 {accepts: [...]} ------     |                              |
     |                                    |                              |
     |-- Sign EIP-3009 (off-chain) --     |                              |
     |-- POST + X-PAYMENT header ---->    |                              |
     |                                    |-- Decode authorization       |
     |                                    |-- Mint sUSDC if needed       |
     |                                    |-- transferWithAuthorization ->|
     |                                    |<-- tx receipt (success) -----|
     |<-- {success, txHash} ----------    |                              |
```

No external facilitator needed — the server acts as its own facilitator, calling `transferWithAuthorization` directly on-chain.

---

## Track Submissions

### Track 5: Encrypted Agents (BITE v2)
- Real `@skalenetwork/bite` SDK — not mocked
- BLS threshold encryption for sealed bids
- Conditional decryption triggered by deadline
- Losers' bids permanently private

### Track 1: Best Agentic App
- Full lifecycle: discover → bid → reveal → settle → receipt
- Autonomous agent wallets via Coinbase CDP
- Real on-chain payments via x402 + EIP-3009
- Zero gas fees on SKALE
- Agent identity as ERC-721 NFTs

---

## Key Achievements

- 4 smart contracts deployed on SKALE Base Sepolia
- Real x402 settlement with verifiable on-chain transaction hashes
- BITE threshold encryption for bid privacy
- CDP-backed autonomous agent wallets
- Self-hosted x402 facilitator (bypasses external dependency)
- Zero gas fees — all transactions free on SKALE
- ERC-8004 aligned agent identity standard

---

## Resources

- [SKALE Docs](https://docs.skale.space)
- [BITE SDK](https://github.com/skalenetwork/bite-ts)
- [x402 Protocol](https://docs.cdp.coinbase.com/x402/welcome)
- [CDP SDK](https://docs.cdp.coinbase.com)
- [Block Explorer](https://base-sepolia-testnet-explorer.skalenodes.com)

---

Built for SF Agentic Commerce x402 Hackathon (Feb 11-13, 2026)

**Powered by SKALE | Secured by BITE | Settled by x402**
