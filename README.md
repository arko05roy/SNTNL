# SENTINEL

## When AI Agents Go Shopping, Who's Watching?

Every day, enterprise AI agents spend billions on compute, data feeds, and API access. Every purchase broadcasts their strategy to the world. Every bid reveals their valuation. Every transaction leaks competitive intelligence.

**SENTINEL changes that.**

---

## The Problem: AI Agents Can't Shop Privately

Imagine your trading algorithm broadcasting its data source purchases. Your research agent revealing which APIs it values most. Your procurement bot announcing budget constraints to every seller.

In today's transparent blockchain world:
- **Sellers manipulate prices** when they see your valuation
- **Competitors steal strategy** by watching your purchases
- **Front-runners exploit** your transaction intent
- **Every failed bid** becomes public knowledge

Autonomous agents need to transact like enterprises do: **privately, conditionally, and with authorization controls.**

---

## The Solution: Sealed Commerce with Cryptographic Guarantees

SENTINEL is the first private procurement marketplace where AI agents can buy and sell services without exposing strategy, budget, or intent until the deal is done.

### 🔒 Sealed-Bid Auctions with BITE
Agents submit **encrypted bids** that remain sealed until the auction deadline. When time's up, only the winner is revealed—losing bids stay private forever. Sellers can't see who bid what. Competitors can't extract valuations. Front-runners can't exploit intent.

**How it works:**
Blockchain Integrated Threshold Encryption (BITE) uses BLS threshold cryptography to encrypt bids on-chain. The encryption is conditional—it only unlocks when the auction timer expires. No central decryption authority. No trusted third party. Just pure cryptographic enforcement.

### ⚡ Instant Settlement with Authorization Flow
When an agent wins, payment happens instantly—but only after explicit authorization. SENTINEL implements a clean **intent → authorize → settle → receipt** flow that keeps humans in control when needed and enables full autonomy when safe.

**How it works:**
AP2 (Authorization Protocol 2) handles the authorization layer. x402 (HTTP 402 Payment Required) executes the settlement on-chain using EIP-3009 signed transfers. The agent creates payment intent, gets authorization (human or programmatic), executes settlement via x402, and receives a cryptographic receipt with full audit trail. All on SKALE's zero-gas infrastructure.

### 🤖 Agent Identity & Autonomous Wallets
Every agent is an on-chain identity with its own wallet, spending limits, and service credentials. Agents register once, transact autonomously, and maintain verifiable reputation across all interactions.

**How it works:**
ERC-721 agent registry with ERC-8004-aligned metadata. Each agent gets a unique NFT identity bound to an autonomous wallet powered by Coinbase CDP SDK. Agents can be permissioned with spending policies, allowlists, and conditional execution rules—all enforced cryptographically.

---

## Demo Flow: GPU Procurement in 60 Seconds

**1. Discovery** → Agent browses on-chain provider registry (GPU/Data/API services)
**2. Auction Start** → Agent creates sealed-bid auction for H100 GPU access
**3. Provider Bidding** → Multiple providers submit BITE-encrypted bids (sealed, private)
**4. Deadline Hits** → 30-second auction period ends
**5. Conditional Reveal** → BITE decrypts bids automatically (losers stay private)
**6. Authorization** → Winning agent approves payment with AP2 authorization
**7. Settlement** → x402 executes on-chain transfer via EIP-3009 signed authorization
**8. Receipt** → Both parties receive cryptographic proof with transaction hash

**Every step is auditable. Every payment is authorized. Every strategy stays private.**

---

## Why This Matters

### For AI Agents
- **Strategic Privacy:** Buy without revealing budget or valuation strategy
- **Anti-Manipulation:** Sellers can't adjust prices based on your willingness to pay
- **Front-Run Protection:** Encrypted intent prevents MEV extraction
- **Authorization Control:** Never spend without explicit approval (human or programmatic)
- **Zero Gas:** All transactions free on SKALE—no ETH needed

### For Providers
- **Fair Competition:** Win on value, not information asymmetry
- **Instant Payment:** x402 settlement happens immediately on-chain
- **Reputation Tracking:** Build verifiable service history with on-chain receipts
- **Access Control:** Serve only authorized, registered agents

### For Enterprises
- **Audit Trail:** Every authorization and settlement is cryptographically logged
- **Conditional Execution:** Set policies that trigger automatically (spend caps, SLA requirements)
- **Human Override:** Keep humans in the loop for high-value decisions
- **Compliance Ready:** Authorization records prove who approved what, when, and why

---

## Architecture: Three Layers of Control

```
┌─────────────────────────────────────────────────────────────┐
│                    SENTINEL MARKETPLACE                      │
├─────────────────────────────────────────────────────────────┤
│  Agent Registration    Provider Registry    Auction Engine   │
│  (ERC-721 Identity)    (Service Directory)  (Order Matching) │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   PRIVACY & AUTHORIZATION                    │
├─────────────────────────────────────────────────────────────┤
│  BITE Encryption       AP2 Authorization    Conditional      │
│  (Sealed Bids)         (Intent → Approve)   Execution        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   SETTLEMENT & IDENTITY                      │
├─────────────────────────────────────────────────────────────┤
│  x402 Protocol         EIP-3009 Transfers   SKALE (Zero Gas) │
│  (Payment Standard)    (Signed Settlement)  (Instant Final)  │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Stack: Production-Grade Infrastructure

**Frontend**
Next.js 16, TypeScript, Tailwind CSS, RainbowKit
Wagmi 2.x + Viem 2.x for wallet interactions

**Privacy Layer**
`@skalenetwork/bite` — Real BITE SDK for threshold encryption
BLS signatures, conditional decryption, zero-knowledge proofs

**Authorization & Settlement**
`@x402/fetch` + `@x402/evm` — x402 payment protocol implementation
EIP-3009 `transferWithAuthorization` for gasless signed transfers
AP2-compliant authorization flow with audit receipts

**Blockchain Infrastructure**
SKALE Base Sepolia Testnet (Chain ID: 324705682)
Zero gas fees, instant finality, EVM-compatible
4 deployed smart contracts with verified source code

**Agent Wallets**
`@coinbase/coinbase-sdk` for autonomous key management
Non-custodial, agent-owned wallets with spending policies

---

## Smart Contracts: On-Chain Guarantees

**Deployed on SKALE Base Sepolia Testnet:**

**ServiceRegistry** → `0x5754C71c2474FE8F2B83C43432Faf0AC94cc24A5`
Provider directory for GPU, data, and API services. Register once, visible forever.

**SealedBidAuction** → `0x98eFA762eDa5FB0C3BA02296c583A5a542c66c8b`
Sealed-bid auction engine with BITE encryption lifecycle. Submit encrypted, reveal conditionally, settle instantly.

**AgentRegistry (ERC-721)** → `0x31DA867c6C12eCEBbb738d97198792901431e228`
On-chain agent identity with ERC-8004 alignment. Mint agent NFT, bind wallet, set policies.

**SentinelUSDC (EIP-3009)** → `0x6bc10d034D0824ee67EaC1e4E66047b723a8D873`
Payment token with signed authorization transfers. Gasless, instant, auditable.

---

## Key Innovations

### 1. Real BITE Integration, Not Mocked
Most hackathon projects simulate encryption. SENTINEL uses production `@skalenetwork/bite` SDK with real BLS threshold signatures. Bids are encrypted on-chain, decrypted conditionally by smart contract logic, and losing bids remain permanently private.

### 2. Self-Hosted x402 Facilitator
No external payment gateway. No third-party dependencies. SENTINEL's API acts as its own x402 facilitator, executing `transferWithAuthorization` directly on-chain. Full control, zero intermediaries.

### 3. Authorization-First Design
Every payment requires explicit authorization—whether human approval or programmatic policy. AP2 flow ensures clean separation: intent creation → authorization check → settlement execution → receipt generation. Nothing executes without approval.

### 4. Zero-Gas Economics
Every transaction on SKALE is free. Agents can bid, authorize, and settle without holding ETH. Removes friction from autonomous agent operations.

### 5. Conditional Privacy at Scale
BITE's conditional decryption means privacy isn't binary. Auction winners get revealed (transparency). Losers stay private (strategy protection). Best of both worlds.

---

## Running SENTINEL Locally

```bash
# Clone repository
git clone <repository-url>
cd SNTNL

# Install client dependencies
cd client
npm install

# Configure environment
cp .env.example .env.local
# Add: SKALE RPC, contract addresses, CDP API keys

# Run development server
npm run dev
# Open http://localhost:3000
```

### Deploy Smart Contracts
```bash
cd contracts-hardhat
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network skaleBaseSepolia
```

---

## Project Structure

```
SNTNL/
├── client/                     # Next.js application
│   ├── src/
│   │   ├── app/               # Pages & API routes
│   │   │   ├── api/auction/   # Auction lifecycle
│   │   │   ├── api/settle/    # x402 settlement facilitator
│   │   │   ├── api/agents/    # Agent management
│   │   │   ├── api/providers/ # Provider registry
│   │   │   ├── agents/        # Agent UI
│   │   │   └── providers/     # Provider UI
│   │   ├── components/        # React components
│   │   ├── lib/
│   │   │   ├── x402.ts        # x402 payment client
│   │   │   ├── bite.ts        # BITE encryption
│   │   │   ├── cdp-agents.ts  # CDP agent wallets
│   │   │   ├── contracts.ts   # ABIs & addresses
│   │   │   └── agents.ts      # Agent logic
│   │   └── types/             # TypeScript definitions
│   └── package.json
└── contracts-hardhat/          # Solidity contracts
    ├── contracts/
    │   ├── SealedBidAuction.sol
    │   ├── ServiceRegistry.sol
    │   ├── AgentRegistry.sol
    │   └── SentinelUSDC.sol
    └── hardhat.config.ts
```

---

## What Makes This Real

**Verifiable On-Chain Activity**
Every bid, authorization, and settlement has a transaction hash. Check the SKALE block explorer—these aren't mock transactions.

**Production SDKs**
`@skalenetwork/bite`, `@x402/evm`, `@coinbase/coinbase-sdk`—all official, production-grade libraries. No custom crypto implementations.

**Authorization Audit Trail**
Every payment logs: who authorized, when it was approved, what was executed, and the resulting transaction hash. Full accountability.

**Conditional Execution**
Bids only decrypt when the auction deadline passes. Payments only execute when authorization is granted. Policies enforce themselves cryptographically.

---

## Why SKALE, Why Now

SKALE is purpose-built for this use case:
- **Zero gas fees** remove friction from autonomous agent transactions
- **Instant finality** enables real-time settlement without waiting for confirmations
- **Native BITE support** makes private conditional transactions a first-class primitive
- **EVM compatibility** allows standard Solidity patterns and tooling
- **Horizontal scalability** means the network grows as agent commerce scales

As AI agents become economic actors, they need infrastructure designed for their workflows—not infrastructure retrofitted from human-centric DeFi.

---

## The Bigger Picture

SENTINEL proves a pattern:

**Private Intent + Authorization Control + Instant Settlement = Trust at Scale**

This isn't just for procurement. The same primitives enable:
- Private DEX orders (no front-running)
- Sealed-bid NFT auctions (fair discovery)
- Confidential supply chain (trade secret protection)
- Policy-based agent spending (enterprise guardrails)
- Conditional escrow (SLA-enforced payments)

Every autonomous system that handles money needs these three layers. SENTINEL shows how to build them.

---

**Built with SKALE | Secured by BITE | Authorized by AP2 | Settled by x402**
