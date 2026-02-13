# SENTINEL

## When AI Agents Go Shopping, Who's Watching?

Every autonomous agent transaction broadcasts strategy. Your trading bot's API purchases reveal which data sources you value. Your procurement agent's GPU bids expose budget constraints. Your research agent's service subscriptions leak competitive intelligence.

**The blockchain's transparency becomes a weapon against you.**

Competitors reverse-engineer your models by watching your purchases. Providers manipulate prices when they see demand signals. MEV bots front-run your intents. Every losing bid becomes public knowledge of what you were willing to pay but didn't win.

**SENTINEL changes the game.**

---

## What We Built

A **private orderbook** where autonomous agents transact with commerce-grade confidentiality:

**Agents bid blind** → Bids encrypted with two-layer BITE until auction deadline
**Losers stay sealed forever** → No strategy leakage, permanent privacy
**Winners pay with authorization** → AP2 mandate chains enforce spending policies
**Settlement is instant** → x402 protocol, zero gas, cryptographic receipts

This isn't just privacy. This is **confidential transactions for the age of autonomous agents.**

---

## The Three Layers

### 🔒 Layer 1: Privacy (BITE Conditional Encryption)

**Two-layer encryption prevents front-running and strategy leakage.**

When an agent bids, it encrypts **twice**:
- **Layer 2:** The bid amount → encrypted with `bite.encryptMessage()` → 96+ bytes of ciphertext
- **Layer 1:** The entire transaction → encrypted with `bite.encryptTransaction()` → opaque blob on-chain

**Why two layers?**
Even after the transaction decrypts at the auction deadline, the bid amount **stays encrypted.** Only the winning agent reveals their Layer 2 amount. Losing agents never call `revealBid()`. Their bids remain as **ciphertext blobs forever.**

**Consensus enforces the timing:** SKALE validators run a BLS threshold committee (t-of-n). When the auction deadline passes and the block finalizes, the committee threshold-decrypts the transaction. No centralized authority. No trusted party. Pure cryptographic enforcement.

**Result:** No front-running. No price manipulation. No strategy leakage. Competitors see **nothing.**

---

### ⚖️ Layer 2: Authorization (AP2 Mandate Chains)

**Hierarchical mandates prevent rogue spending.**

Every transaction follows a mandate chain:

**1. IntentMandate** (Spending Policy)
```typescript
{
  agentName: "AlphaProcure",
  serviceTypes: ["GPU Compute"],
  maxSpend: 300000,
  strategy: "aggressive"
}
```
Signed by the agent's owner. Defines constraints: which services, maximum spend, bidding behavior.

**2. CartMandate** (Provider Commitment)
```typescript
{
  provider: {
    name: "H100 SF Bay",
    serviceType: "GPU Compute",
    basePrice: 250000,
    sla: { uptimeCommitment: 99.9 }
  },
  signature: "0x..." // EIP-712 signed
}
```
Created when providers register. **Price locked.** No mid-auction changes.

**3. PaymentMandate** (Authorization)
```typescript
{
  cartMandate: { /* provider's offering */ },
  agentName: "AlphaProcure",
  bidAmount: 275000,
  auctionId: 42,
  authorization: { approvedBy: "0xABCD...", signature: "0x..." }
}
```
Agent authorizes **this specific payment.** Not a blank check. This exact amount, to this exact provider, for this exact auction.

**4. TransactionRecord** (Receipt)
```typescript
{
  intentMandate: { /* spending policy */ },
  cartMandate: { /* provider offering */ },
  paymentMandate: { /* payment authorization */ },
  settlement: {
    transactionHash: "0xabc123...",
    amountPaid: 275000,
    success: true
  }
}
```
Full audit trail. Links mandates to on-chain settlement. **Cryptographic accountability.**

**Validation happens at every step:** If the agent tries to pay outside its IntentMandate, validation fails. No transaction executes. **Policy enforced cryptographically, not by trust.**

---

### ⚡ Layer 3: Settlement (x402 Instant Payment)

**Gasless settlement with cryptographic receipts.**

Winners pay via x402 protocol:
1. Agent signs EIP-3009 authorization off-chain
2. Authorization goes to self-hosted facilitator (Next.js API route)
3. Facilitator calls `transferWithAuthorization()` on SentinelUSDC contract
4. Payment executes on-chain, zero gas (SKALE subsidizes)
5. Transaction hash returned immediately (instant finality)

**No custody.** The facilitator never holds funds. No external gateway. Full control.

**Result:** Payments settle in milliseconds. No waiting for confirmations. Zero gas fees. Full audit trail with transaction hashes.

---

## The Flow (60 Seconds, Start to Finish)

1. **Provider registers** → CartMandate created on-chain (signed service offering)
2. **Agent registers** → ERC-721 identity minted, CDP wallet bound, spending policy set
3. **Agent sees asks** → Provider listings visible (prices public, bidders hidden)
4. **Agent bids** → Two-layer BITE encryption, opaque blob on-chain
5. **Orderbook shows** → "3 bids" visible, not amounts or identities
6. **Deadline hits** → BLS committee threshold-decrypts transactions
7. **Clearing runs** → Matches highest valid bid to each ask
8. **Winner authorizes** → PaymentMandate created, EIP-712 signature
9. **x402 settles** → EIP-3009 transfer, zero gas, instant finality
10. **Receipt generated** → TransactionRecord with mandate chain + tx hash

**Losers:** Bids never decrypt. No strategy leakage.
**Winners:** Authorized payment. Cryptographic receipt. Full accountability.

---

## Smart Contracts (Deployed & Verified)

**SKALE Base Sepolia Testnet (Chain ID: 324705682)**

### SealedBidAuction (`0x98eFA762eDa5FB0C3BA02296c583A5a542c66c8b`)
Auctions with BITE-encrypted bid storage. Validates decrypted bids. Finalizes and emits winner events.

### AgentRegistry (`0x31DA867c6C12eCEBbb738d97198792901431e228`)
ERC-721 NFT for agent identities. Stores metadata. Binds autonomous wallets. ERC-8004 compliant.

### ServiceRegistry (`0x5754C71c2474FE8F2B83C43432Faf0AC94cc24A5`)
Provider directory. Stores CartMandates on-chain. Returns active listings.

### SentinelUSDC (`0x6bc10d034D0824ee67EaC1e4E66047b723a8D873`)
ERC-20 with EIP-3009 extension. Gasless signed transfers via `transferWithAuthorization()`.

**Block Explorer:** https://base-sepolia-testnet-explorer.skalenodes.com

---

## Tech Stack

**Frontend:** Next.js 16, TypeScript, Tailwind CSS, RainbowKit, Wagmi 2.x, Viem 2.x

**Privacy:** `@skalenetwork/bite` v0.2.1 (BLS12-381 threshold signatures)

**Authorization:** Custom AP2 implementation (IntentMandate, CartMandate, PaymentMandate, TransactionRecord)

**Settlement:** `@x402/evm` + `@x402/fetch` (x402 protocol, EIP-3009 transfers)

**Agent Wallets:** `@coinbase/coinbase-sdk` (CDP, non-custodial)

**Blockchain:** SKALE Base Sepolia (zero gas, instant finality)

---

## Running Locally

```bash
# Clone
git clone <repository-url>
cd SNTNL

# Install
cd client
npm install

# Configure
cp .env.example .env.local
# Add: SKALE RPC, contract addresses, CDP API keys

# Run
npm run dev
# Open http://localhost:3000
```

### Deploy Contracts
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
│   │   │   ├── api/settle/    # x402 facilitator
│   │   │   ├── api/agents/    # Agent management
│   │   │   ├── api/providers/ # Provider registry
│   │   │   ├── agents/        # Agent UI
│   │   │   ├── providers/     # Provider UI
│   │   │   └── orderbook/     # Main orderbook
│   │   ├── components/        # React components
│   │   ├── lib/
│   │   │   ├── x402.ts        # x402 client
│   │   │   ├── bite.ts        # BITE encryption
│   │   │   ├── ap2.ts         # AP2 mandates
│   │   │   ├── cdp-agents.ts  # CDP wallets
│   │   │   ├── orderbook.ts   # Matching logic
│   │   │   └── contracts.ts   # ABIs & addresses
│   │   └── types/             # TypeScript types
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

## Why This Matters

### For AI Agents
- **Strategic Privacy:** Bid without revealing budget or valuation strategy
- **Anti-Manipulation:** Sellers can't adjust prices based on demand signals
- **Front-Run Protection:** Encrypted intent prevents MEV extraction
- **Authorization Control:** Never spend without explicit approval
- **Zero Gas:** All transactions free—no ETH needed

### For Providers
- **Fair Competition:** Win on value, not information asymmetry
- **Instant Payment:** x402 settlement happens immediately on-chain
- **Locked Commitments:** CartMandates prevent price changes mid-auction
- **Reputation Tracking:** Build verifiable service history with receipts

### For Enterprises
- **Audit Trail:** Every authorization and settlement cryptographically logged
- **Conditional Execution:** Set policies that trigger automatically
- **Human Override:** Keep humans in the loop for high-value decisions
- **Compliance Ready:** Authorization records prove who approved what, when, why

---

## The Three Guarantees

### 1. Privacy That Prevents Front-Running

**Problem:** Public bids leak strategy. MEV bots front-run. Competitors see valuations.

**Solution:** Two-layer BITE encryption. Bids sealed until clearing. Losers never decrypt.

**Result:** No front-running. No price manipulation. No strategy leakage. **Your strategy stays proprietary.**

---

### 2. Authorization That Prevents Rogue Spending

**Problem:** Agents with wallets can drain funds instantly. No spending caps. No approval flows.

**Solution:** AP2 mandate chain. IntentMandate defines policies. PaymentMandate requires approval. Validation before execution.

**Result:** Agents can't exceed limits. Payments need authorization. Policy violations caught before money moves. **Guardrails work cryptographically.**

---

### 3. Settlement That Leaves Audit Trails

**Problem:** Manual payment reconciliation. Days to settle. No cryptographic proof.

**Solution:** x402 instant settlement. EIP-3009 signed transfers. TransactionRecord links mandates to tx hashes.

**Result:** Payments settle instantly. Zero gas. Full audit trail. **Compliance built-in.**

---

## What Makes This Commerce-Grade

**Zero Gas Fees**
SKALE subsidizes all transactions. Agents don't need ETH. No gas volatility. **Pure execution.**

**Instant Finality**
SKALE consensus provides instant finality. No confirmation waits. Settlement in milliseconds. **Real-time commerce.**

**Production SDKs**
`@skalenetwork/bite`, `@x402/evm`, `@coinbase/coinbase-sdk` — official libraries. No custom crypto. **Battle-tested primitives.**

**Verifiable On-Chain**
Every bid, settlement, finalization has a transaction hash. Judges can verify on block explorer. **No smoke and mirrors.**

**Explicit Failure Modes**
Committee unavailable → rejected. Decryption fails → reverted. Invalid bid → require() fails. BITE offline → fallback with warning. **No ambiguity.**

**Self-Hosted Settlement**
x402 facilitator is a Next.js API route. No external gateway. No custody. **Full control.**

---

## The Bigger Picture

SENTINEL proves a pattern:

**Private Intent + Authorization Control + Instant Settlement = Trust at Scale**

This isn't just for GPU procurement. The same primitives enable:
- **Private DEX orders** (no front-running)
- **Sealed-bid NFT auctions** (fair discovery)
- **Confidential supply chain** (trade secret protection)
- **Policy-based agent spending** (enterprise guardrails)
- **Conditional escrow** (SLA-enforced payments)

Every autonomous system that handles money needs these three layers. SENTINEL shows how to build them.

---

**Built on SKALE | Secured by BITE | Authorized by AP2 | Settled by x402**

**This is commerce-grade privacy for autonomous agents. This is SENTINEL.**
