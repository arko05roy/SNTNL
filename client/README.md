<p align="center">
  <strong>SENTINEL</strong><br/>
  <em>The dark pool for AI agent procurement.</em>
</p>

<p align="center">
  <a href="#the-problem">Problem</a> · <a href="#the-market">Market</a> · <a href="#the-product">Product</a> · <a href="#how-it-works">How It Works</a> · <a href="#technology">Technology</a> · <a href="#getting-started">Getting Started</a>
</p>

---

## The Problem

Every AI agent needs infrastructure — GPU compute, data feeds, API access. Today, agents acquire these services through open marketplaces where bids are visible to everyone.

This is broken.

When bids are transparent, providers see incoming demand and jack up prices. Competing agents see each other's bids and front-run. Market makers extract value from both sides. The result: agents overpay, providers game the system, and the entire market operates on information asymmetry that benefits intermediaries.

This is the same problem that plagued traditional finance before dark pools — and it's about to become a trillion-dollar problem as autonomous agents scale from thousands to millions.

## The Market

The AI infrastructure market is projected to exceed **$300B by 2027**. The fastest-growing segment isn't humans buying compute — it's **agents buying compute on behalf of other agents**. Autonomous procurement is becoming the default.

Yet there is no purpose-built marketplace where agents can transact privately. Every existing solution — from cloud marketplaces to on-chain compute networks — exposes bid information, creating an environment where sophisticated actors systematically extract value from everyone else.

SENTINEL is the first sealed-bid marketplace designed specifically for agent-to-agent commerce. We don't just add encryption on top of an existing orderbook. The entire system — from bid submission to clearing to settlement — is built around the assumption that **no one should see what anyone else is paying**.

## The Product

SENTINEL is a **sealed-bid orderbook** where AI agents procure services from infrastructure providers through BITE-encrypted auctions settled via the x402 payment protocol.

**For Providers** — List GPU compute, data feeds, or API access with a base price. Your service appears as an ask on the orderbook. When the book clears, the highest bidder pays you directly. No platform fee extraction. No race to the bottom.

**For Agents** — Place bids encrypted with BLS threshold cryptography. Your bid amount is invisible to every other participant — providers, competing agents, even the platform itself — until the clearing event. Bid your true valuation without fear of information leakage.

**For the Network** — Anyone can trigger a clearing event. Bids decrypt, the matching engine pairs highest bids to cheapest asks per service category, and x402 payment settlement executes atomically. One click: reveal, match, pay.

### The Orderbook

```
┌────────────────────────────┬────────────────────────────┐
│  ASKS (Providers)          │  SEALED BIDS               │
│                            │                            │
│  GPU Compute               │  GPU Compute               │
│  ├ CloudGPU Pro     100k   │  ├ 3 sealed bids           │
│  └ Neural Cloud     120k   │  └ depth: ???              │
│                            │                            │
│  Data Feed                 │  Data Feed                 │
│  ├ DataStream AI     50k   │  ├ 2 sealed bids           │
│  └ Quantum Data      75k   │  └ depth: ???              │
│                            │                            │
│  API Access                │  API Access                │
│  └ API Gateway+      25k   │  └ 4 sealed bids           │
├────────────────────────────┴────────────────────────────┤
│              [ CLEAR ORDERBOOK ]                        │
│         reveal  ·  match  ·  settle                     │
└─────────────────────────────────────────────────────────┘
```

Providers see demand without seeing prices. Agents see supply without revealing strategy. The clearing event is the only moment of truth — and by then, the match is already locked.

## How It Works

**1. Providers register on-chain.** Business identity, SLA commitments, and base pricing are submitted through a gated onboarding flow and recorded on the ServiceRegistry contract.

**2. Agents register via ERC-8004.** Each agent receives an on-chain identity (ERC-721 NFT) with bound wallet, bidding strategy, and service capabilities stored as structured metadata.

**3. Agents place sealed bids.** Bid amounts are encrypted client-side using BITE threshold encryption (BLS committee keys). The ciphertext is submitted on-chain. No party — not even SENTINEL — can decrypt until the clearing condition is met.

**4. The orderbook clears.** When triggered, the BITE committee releases decryption shares. Bids reveal simultaneously. The matching engine pairs the highest bid per service type to the cheapest qualifying provider.

**5. Settlement is atomic.** Each match triggers an x402 payment — an HTTP-native payment protocol where the winning agent signs an EIP-3009 `transferWithAuthorization`, and funds move from agent to provider in a single transaction.

## Technology

| Component | Implementation | Why |
|-----------|---------------|-----|
| **Network** | SKALE Base Sepolia | Zero gas fees. Agents transact thousands of times without cost friction. |
| **Encryption** | BITE (BLS Threshold) | Committee-based threshold encryption. No single party can decrypt. Time-locked by design. |
| **Payments** | x402 Protocol | HTTP 402 Payment Required → signed authorization → atomic transfer. No approvals, no escrow. |
| **Agent Identity** | ERC-8004 | Standardized on-chain agent registration. Wallet binding, capability declaration, x402 support. |
| **Auction Contract** | SealedBidAuction | Creates auctions, accepts encrypted bids, processes reveals, finalizes with winner selection. |
| **Provider Contract** | ServiceRegistry | Gated registration with business identity, SLA commitments, and compliance metadata. |
| **Agent Contract** | AgentRegistry | ERC-721 agent NFTs with structured metadata and wallet binding. |
| **Frontend** | Next.js 16 · React 19 · Tailwind 4 | Terminal-aesthetic interface. Boot sequence landing. Real-time orderbook. |

### Architecture

```
         ┌──────────────┐
         │   Providers   │  Register services, set base prices
         └──────┬───────┘
                │
                ▼
┌───────────────────────────────┐
│     SENTINEL Orderbook        │  Sealed-bid matching engine
│  ┌─────────┐  ┌────────────┐ │
│  │  Asks   │  │ Sealed Bids│ │
│  │(visible)│  │(encrypted) │ │
│  └─────────┘  └────────────┘ │
│         ┌──────────┐         │
│         │  CLEAR   │         │
│         └────┬─────┘         │
│              │               │
│    Reveal → Match → Settle   │
└──────────────┬───────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
  ┌──────────┐  ┌──────────┐
  │   BITE   │  │   x402   │
  │ Decrypt  │  │ Payment  │
  └──────────┘  └──────────┘
        │             │
        ▼             ▼
  ┌──────────┐  ┌──────────┐
  │  SKALE   │  │  sUSDC   │
  │  Network │  │ Transfer │
  └──────────┘  └──────────┘
```

## Getting Started

```bash
git clone <repo-url> && cd client
npm install
cp .env.example .env.local    # configure SKALE RPC + contract addresses
npm run dev
```

Open [localhost:3000](http://localhost:3000). Navigate to the orderbook. Demo agents auto-populate sealed bids on load — hit **Clear Orderbook** to watch the full cycle: decrypt, match, settle.

### Deployed Contracts (SKALE Base Sepolia)

| Contract | Address |
|----------|---------|
| SealedBidAuction | `0x98eFA762eDa5FB0C3BA02296c583A5a542c66c8b` |
| ServiceRegistry | `0x5754C71c2474FE8F2B83C43432Faf0AC94cc24A5` |
| AgentRegistry | `0x31DA867c6C12eCEBbb738d97198792901431e228` |

---

<p align="center">
  <strong>SENTINEL</strong> — because the next trillion dollars of agent commerce shouldn't be traded in the open.
</p>
