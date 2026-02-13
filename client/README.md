<p align="center">
  <strong>SENTINEL</strong><br/>
  <em>The dark pool for AI agent procurement.</em>
</p>

<p align="center">
  <a href="#the-problem">Problem</a> · <a href="#the-product">Product</a> · <a href="#how-it-works">How It Works</a> · <a href="#bite--threshold-encryption">BITE</a> · <a href="#ap2--agent-payments-protocol">AP2</a> · <a href="#technology">Technology</a> · <a href="#getting-started">Getting Started</a>
</p>

---

## The Problem

Every AI agent needs infrastructure — GPU compute, data feeds, API access. Today, agents acquire these through open marketplaces where bids are visible to everyone.

This is broken.

When bids are transparent, providers see incoming demand and jack up prices. Competing agents front-run each other. Intermediaries extract value from both sides. Agents overpay. Providers game the system. The market runs on information asymmetry that benefits no one except the middlemen.

Traditional finance solved this decades ago with dark pools. Agent commerce hasn't caught up.

## The Product

SENTINEL is a **sealed-bid orderbook** for AI agent procurement. Agents bid on compute, data, and APIs — every bid encrypted with BITE threshold encryption, every payment authorized through AP2 mandates, every settlement atomic via x402.

No one sees what anyone else is paying. Not the providers. Not the competing agents. Not even the platform.

**For Providers** — List services with a base price. Your offering appears as an ask on the orderbook, structured as an AP2 CartMandate. When the book clears, the highest bidder pays you directly. Zero platform fees. Zero gas on SKALE.

**For Agents** — Declare procurement intent (AP2 IntentMandate), then bid encrypted (BITE `encryptTransaction`). Your bid amount is invisible to every participant until clearing. The entire transaction — target contract, function call, arguments — is an opaque blob on-chain. Validators threshold-decrypt only after block finalization.

**For the Network** — Trigger a clearing event. BITE decrypts all bids simultaneously. The matching engine pairs highest bids to cheapest asks. AP2 validates the mandate chain. x402 settles atomically. One click: decrypt, match, authorize, pay.

### The Orderbook

```
┌─────────────────────────────┬────────────────────────────┐
│  ASKS — Providers           │  SEALED BIDS — Encrypted   │
│  [AP2 CartMandate]          │  [BITE v2]                 │
│                             │                            │
│  GPU Compute                │  GPU Compute               │
│  ├ CloudGPU Pro      100k   │  ├ 3 sealed bids           │
│  └ Neural Cloud      120k   │  └ depth: ???              │
│                             │                            │
│  Data Feed                  │  Data Feed                 │
│  ├ DataStream AI      50k   │  ├ 2 sealed bids           │
│  └ Quantum Data       75k   │  └ depth: ???              │
│                             │                            │
│  API Access                 │  API Access                │
│  └ API Gateway+       25k   │  └ 4 sealed bids           │
├─────────────────────────────┴────────────────────────────┤
│              [ CLEAR ORDERBOOK ]                         │
│    BITE decrypt → match → AP2 authorize → x402 settle    │
└──────────────────────────────────────────────────────────┘
```

Providers see demand without seeing prices. Agents see supply without revealing strategy. The clearing event is the only moment of truth — and by then, the match is already locked.

## How It Works

**1. Providers register on-chain.** Business identity, SLA commitments, and base pricing recorded on the ServiceRegistry contract. Each listing is structured as an AP2 CartMandate — a signed, expiring service offering.

**2. Agents register via ERC-8004.** Each agent gets an on-chain identity (ERC-721 NFT) with a bound wallet. The agent issues an AP2 IntentMandate declaring its procurement policy: allowed service types, spend caps, provider allowlists.

**3. Agents place sealed bids.** Two layers of BITE encryption protect every bid:
- **Layer 1** — `encryptTransaction()` wraps the entire `submitBid` contract call (target + calldata) in threshold encryption. On-chain it's an opaque blob sent to the BITE magic address. Validators decrypt after block finalization.
- **Layer 2** — `encryptMessage()` encrypts the bid amount as a standalone ciphertext stored in the contract's `encryptedBid` field. This is the persistent audit trail.

**4. The orderbook clears.** BITE committee threshold-decrypts all bids simultaneously. The matching engine pairs highest bid to cheapest ask per service type. AP2 validates the full mandate chain (intent → cart → payment) before authorizing settlement.

**5. Settlement is atomic.** Each match triggers an x402 payment — the winning agent's AP2 PaymentMandate authorizes a `transferWithAuthorization`, and funds move from agent to provider in a single transaction. An `AP2TransactionRecord` receipt is generated with all three mandates, tx hashes, and validation results.

## BITE — Threshold Encryption

SENTINEL uses SKALE's [BITE](https://docs.skale.space/builders/app-developers/bite) (Blockchain Integrated Threshold Encryption) for two-layer bid privacy via `@skalenetwork/bite`.

### Layer 1: Encrypted Transactions

Every bid submission is wrapped in `bite.encryptTransaction()`. The entire EVM call — target contract address, function selector, and all arguments — is threshold-encrypted using the BLS committee's public key before broadcast.

On-chain, the transaction appears as an opaque payload sent to the BITE magic address. No observer can determine which contract is being called, which function, or what the arguments are. SKALE validators threshold-decrypt and execute the transaction only after block finalization.

This means: even if someone watches the mempool or the chain, they cannot see that an agent is bidding, what auction it's bidding on, or how much it's bidding.

```
Agent                    BITE                      Chain
  │                        │                         │
  ├─ submitBid(id, amt) ──▶│                         │
  │                        ├─ encryptTransaction() ──▶│ opaque blob
  │                        │                         │ to BITE magic addr
  │                        │      block finalized ◀──┤
  │                        │                         ├─ threshold decrypt
  │                        │                         ├─ execute submitBid
  │                        │                         │
```

We also encrypt `revealBid` and `finalizeAuction` calls the same way — so even the reveal phase can't be front-run.

### Layer 2: Encrypted Messages

The bid amount is *also* encrypted via `bite.encryptMessage()` and stored in the smart contract's `encryptedBid` bytes field. This provides a persistent, auditable ciphertext on-chain that can be decrypted later via `bite.getDecryptedTransactionData()` for the receipt/reveal phase.

Two layers means: the transaction itself is hidden (Layer 1), and the bid value within it is independently encrypted (Layer 2). Even after the transaction decrypts, the bid amount has its own ciphertext for audit.

### BITE SDK Usage

```typescript
import { BITE } from '@skalenetwork/bite';

const bite = new BITE(SKALE_RPC_URL);

// Check committee status
const committees = await bite.getCommitteesInfo();
// → [{ commonBLSPublicKey, epochId }, ...]

// Layer 1: encrypt full transaction
const encryptedTx = await bite.encryptTransaction({
  to: AUCTION_CONTRACT,
  data: submitBidCalldata,
  gasLimit: '500000',
});

// Layer 2: encrypt bid amount as standalone message
const encryptedAmount = await bite.encryptMessage(amountHex);

// After finalization: retrieve decrypted tx data
const decrypted = await bite.getDecryptedTransactionData(txHash);
// → { to, data }
```

## AP2 — Agent Payments Protocol

SENTINEL implements [Google's AP2](https://github.com/google-agentic-commerce/AP2) mandate lifecycle to give every auction a verifiable authorization chain. Three mandates flow through the system:

**IntentMandate** — Before an agent bids, it declares a procurement policy: which service types it's allowed to buy, a maximum spend cap, and optionally a provider allowlist. This is the agent's authorization scope — nothing outside this mandate can be purchased.

**CartMandate** — Each provider's listing is structured as a signed cart: service type, base price, SLA terms, payment method (`x402`), and an expiry window. The provider "signs" by hashing the cart contents (SHA-256). This is the offer the agent is bidding on.

**PaymentMandate** — When an agent wins an auction, it issues a PaymentMandate linking the CartMandate to the final bid amount. The authorization field is a compound hash: `SHA-256(CartMandate) + "." + SHA-256(PaymentMandateContents)`. This proves the agent authorized this specific payment for this specific cart.

The three mandates are validated as a chain before settlement:

```
IntentMandate          CartMandate              PaymentMandate
(agent policy)    →    (provider offering)  →   (payment auth)
                                                      │
  ✓ not expired        ✓ signature valid         ✓ hash chain valid
  ✓ service type ok    ✓ not expired             ✓ within spend limit
  ✓ spend cap set      ✓ x402 method                  │
                                                      ▼
                                              x402 Settlement
                                              (atomic transfer)
```

After settlement, SENTINEL generates an `AP2TransactionRecord` — a full receipt containing all three mandates, BITE encryption details, settlement tx hash, and validation results. This is the auditable artifact: anyone can verify that the agent was authorized to buy, the provider signed the offering, and the payment matches both.

## Technology

| Component | Implementation | Why |
|-----------|---------------|-----|
| **Network** | SKALE Base Sepolia | Zero gas fees. Agents transact thousands of times without cost friction. |
| **Encryption** | BITE v2 (BLS Threshold) | Two-layer encryption: `encryptTransaction` hides the full EVM call, `encryptMessage` encrypts bid amounts. Committee-based — no single party can decrypt. |
| **Authorization** | AP2 (Google) | Three-mandate chain: IntentMandate → CartMandate → PaymentMandate. Verifiable agent-to-provider authorization with SHA-256 hash chain. |
| **Payments** | x402 Protocol | HTTP 402 Payment Required → signed authorization → atomic transfer. No approvals, no escrow. |
| **Agent Identity** | ERC-8004 | Standardized on-chain agent registration. Wallet binding, capability declaration, x402 support. |
| **Auction Contract** | SealedBidAuction | Creates auctions, accepts encrypted bids, processes reveals, finalizes with winner selection. |
| **Provider Contract** | ServiceRegistry | Gated registration with business identity, SLA commitments, and compliance metadata. |
| **Agent Contract** | AgentRegistry | ERC-721 agent NFTs with structured metadata and wallet binding. |
| **Frontend** | Next.js 16 · React 19 · Tailwind 4 | Terminal-aesthetic interface with boot sequence, real-time orderbook, clearing animation. |

### Architecture

```
         ┌──────────────┐
         │   Providers   │  Register services (AP2 CartMandate)
         └──────┬───────┘
                │
                ▼
┌───────────────────────────────┐
│     SENTINEL Orderbook        │  Sealed-bid matching engine
│  ┌─────────┐  ┌────────────┐ │
│  │  Asks   │  │ Sealed Bids│ │
│  │(visible)│  │(BITE enc.) │ │
│  └─────────┘  └────────────┘ │
│         ┌──────────┐         │
│         │  CLEAR   │         │
│         └────┬─────┘         │
│              │               │
│  BITE decrypt → Match → AP2  │
│     authorize → x402 settle  │
└──────────────┬───────────────┘
               │
        ┌──────┼──────┐
        ▼      ▼      ▼
  ┌────────┐┌────────┐┌────────┐
  │  BITE  ││  AP2   ││  x402  │
  │Decrypt ││Mandate ││Payment │
  └────────┘└────────┘└────────┘
        │      │      │
        ▼      ▼      ▼
  ┌──────────────────────────┐
  │   SKALE · Zero Gas Fees  │
  └──────────────────────────┘
```

## Getting Started

```bash
git clone <repo-url> && cd client
npm install
cp .env.example .env.local    # configure SKALE RPC + contract addresses
npm run dev
```

Open [localhost:3000](http://localhost:3000). Navigate to the orderbook. Demo agents auto-populate sealed bids on load — hit **Clear Orderbook** to watch the full cycle: BITE decrypt, AP2 authorize, x402 settle.

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
