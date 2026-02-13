# DoraHacks Submission: SENTINEL

## 30-Word Bio

Private orderbook where AI agents transact with two-layer BITE encryption and AP2 authorization flows—bid amounts stay encrypted until clearing, losing bids never reveal, settlements execute via x402 on zero-gas SKALE.

---

## What We Built

When AI agents buy and sell services, every bid becomes public intelligence. Trading algorithms broadcast their valuations. Procurement bots reveal budget constraints. Strategy leaks to competitors with every transaction.

SENTINEL is a private orderbook where agents submit encrypted bids, providers list service offerings, and matches settle through cryptographic authorization flows. Agents see provider asks. Providers see sealed bid counts—nothing more. When the orderbook clears, only winners are revealed. Losing bids stay encrypted on-chain forever.

Every transaction follows a mandate chain: agents declare spending policies (IntentMandate), providers sign service commitments (CartMandate), winners authorize specific payments (PaymentMandate), and settlements generate cryptographic receipts (TransactionRecord). Full accountability after execution. Complete privacy before.

---

## The Implementation

### Layer 1: Provider Registration & Service Listings

Providers register through a multi-step flow: business identity verification, service specification, legal agreements, then on-chain registration via the ServiceRegistry contract.

When a provider registers, they create a CartMandate:

```typescript
{
  provider: {
    name: "H100 SF Bay",
    address: "0x5754...",
    serviceType: "GPU Compute",
    basePrice: 250000,
    sla: {
      uptimeCommitment: 99.9,
      maxLatencyMs: 100
    }
  },
  timestamp: 1739491100000,
  signature: "0x..." // EIP-712 signed commitment
}
```

This goes on-chain via `registerProvider()`. It's a binding commitment: this service, this price, this SLA. No mid-auction price changes. No hidden fees. The mandate is immutable.

Providers then list their services as "asks" in the orderbook—visible to all agents but with no visibility into who's bidding or how much.

### Layer 2: Agent Identity & Bidding Logic

Agents register as ERC-721 NFTs via the AgentRegistry contract. Each agent gets:
- Unique on-chain identity (NFT with metadata URI)
- Autonomous wallet (Coinbase CDP SDK)
- Bidding strategy (conservative/aggressive/random)
- Service capabilities (what they can buy)
- x402 payment support

Before any agent can bid, it creates an IntentMandate:

```typescript
{
  agentName: "AlphaProcure",
  serviceTypes: ["GPU Compute"],
  maxSpend: 300000,
  strategy: "aggressive",
  timestamp: 1739491200000
}
```

This is the spending policy. Signed by the agent's owner (human or DAO). It defines constraints: which services the agent can buy, maximum spend per transaction, bidding behavior.

When agents see asks, they submit bids—but not in plaintext.

### Layer 3: BITE Two-Layer Encryption

**Encryption happens in two phases.**

**Phase 1: Bid Amount Encryption (Layer 2)**

```typescript
const bidAmount = 275000n;
const auctionDeadline = Date.now() + 30000; // 30 seconds

const encryptedAmount = await bite.encryptMessage(
  bidAmount.toString(),
  auctionDeadline
);
```

The bid amount becomes ciphertext: `0x4f8a3c2e...` (96+ bytes). This uses BLS threshold encryption. Without the SKALE validator committee's cooperation, decryption is computationally infeasible. The `auctionDeadline` parameter sets the unlock condition.

**Phase 2: Transaction Encryption (Layer 1)**

```typescript
const txData = {
  to: AUCTION_CONTRACT,
  data: encodeFunctionData({
    abi: AUCTION_ABI,
    functionName: 'submitBid',
    args: [auctionId, encryptedAmount]
  }),
  from: agentWallet,
  value: 0n
};

const encryptedTx = await bite.encryptTransaction(txData);
```

Now the entire transaction is encrypted:
- Contract address (hidden)
- Function selector (hidden)
- Arguments including the already-encrypted bid amount (hidden)
- Sender identity (hidden)

The encrypted transaction is submitted to SKALE's BITE "magic address"—a precompile that stores encrypted transactions until their unlock condition is met. On-chain, it appears as an opaque blob. Block explorers show the transaction exists, but not what it does or who sent it.

**Why two layers?**

If we only encrypted the transaction (Layer 1), the auction contract would see bid amounts once decryption happens. With two layers, even after the transaction decrypts, the bid amount stays encrypted. Only the winning agent reveals their Layer 2 amount by calling `revealBid()`. Losing agents never call it. Their bid amounts remain as ciphertext blobs on-chain forever.

**Conditional Decryption**

SKALE validators run a BLS threshold signature committee. When the auction deadline passes and the block finalizes:

1. Validators reach consensus that the unlock condition is met
2. Each validator contributes a BLS signature share
3. Once t-of-n shares are collected, the threshold signature reconstructs the decryption key
4. The encrypted transaction is decrypted and executed on-chain

No centralized decryption authority. No single validator can decrypt early. No oracle to bribe. Consensus enforces the timing.

**Failure Handling**

- **Committee unavailable:** Transaction rejected at submission. No state change.
- **Decryption fails:** Transaction reverts. Auction continues without that bid.
- **Invalid bid:** Smart contract `require()` fails after decryption. Bid rejected.
- **BITE offline:** Fallback to plaintext with explicit user warning.

### Layer 4: Orderbook Clearing & Matching

The orderbook maintains asks (provider listings) and sealed bid counts (how many agents bid per service, but not amounts or identities).

When clearing triggers, the matching engine:
1. Retrieves all encrypted bids that have reached their deadline
2. Waits for BITE committee to decrypt transaction layer
3. For each decrypted bid, verifies it against the agent's IntentMandate (spending policy)
4. Matches highest valid bid to each ask
5. Winners revealed. Losers stay encrypted.

Example match:
```typescript
{
  serviceType: "GPU Compute",
  provider: {
    name: "H100 SF Bay",
    address: "0x5754...",
    basePrice: 250000n
  },
  winner: {
    agentId: "agent_001",
    agentName: "AlphaProcure",
    amount: 275000n
  }
}
```

### Layer 5: AP2 Authorization & Settlement

**Step 1: PaymentMandate Creation**

After the agent wins, it creates a PaymentMandate authorizing the specific payment:

```typescript
{
  cartMandate: { /* provider's signed offering */ },
  agentName: "AlphaProcure",
  bidAmount: 275000,
  auctionId: 42,
  timestamp: 1739491300000,
  authorization: {
    approvedBy: "0xABCD...", // agent owner wallet
    signature: "0x..." // EIP-712 signature
  }
}
```

This mandate says: "I authorize paying 275,000 tokens to this specific provider for this specific auction." Not a blank check. Not a recurring payment. This exact transaction.

The PaymentMandate is validated against:
- The IntentMandate (does this payment fit within spending policy?)
- The CartMandate (is the provider's offering still valid?)
- The auction result (did this agent actually win?)

If any validation fails, the payment doesn't execute.

**Step 2: x402 Settlement**

The agent (or its autonomous wallet) initiates x402 payment flow:

```typescript
// Agent signs EIP-3009 authorization off-chain
const authorization = await signTransferAuthorization({
  from: agentWallet,
  to: providerWallet,
  value: 275000n,
  validAfter: 0,
  validBefore: Math.floor(Date.now() / 1000) + 3600,
  nonce: generateNonce()
});

// x402 facilitator executes on-chain
const result = await fetch('/api/settle', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-PAYMENT': JSON.stringify(authorization)
  }
});
```

The self-hosted facilitator (Next.js API route) receives the signed authorization, validates the signature, and calls `transferWithAuthorization()` on the SentinelUSDC contract. The payment executes on-chain. Zero gas cost to the agent (SKALE subsidizes). Transaction hash returned immediately.

**Step 3: TransactionRecord Generation**

After settlement, a full audit record is generated:

```typescript
{
  intentMandate: { /* agent's spending policy */ },
  cartMandate: { /* provider's signed offering */ },
  paymentMandate: { /* agent's payment authorization */ },
  settlement: {
    protocol: "x402",
    transactionHash: "0xabc123...",
    blockNumber: 12847392,
    timestamp: 1739491350000,
    amountPaid: 275000,
    recipient: "0x5754...",
    success: true
  },
  biteEncryption: {
    bidEncrypted: true,
    decryptionTimestamp: 1739491280000,
    auctionOnChainId: 42
  }
}
```

This record links:
- What the agent was allowed to do (IntentMandate)
- What the provider committed to (CartMandate)
- What the agent authorized (PaymentMandate)
- What actually executed (on-chain transaction hash)

Full accountability. If an agent overspends, trace it back to the authorization. If a provider doesn't deliver, verify the signed SLA. If a payment fails, check the settlement status.

### Layer 6: Audit Trail & Receipts

**BITE Trace Log**

Every match generates a trace log showing the complete lifecycle:

```
[12:34:56.123] encrypt    | bite.encryptMessage(bidAmount)
[12:34:56.145] encrypt    | Layer 2 ciphertext: 0x4f8a3c2e...
[12:34:56.178] encrypt    | bite.encryptTransaction(submitBid)
[12:34:56.201] encrypt    | Layer 1 — full EVM call encrypted
[12:34:56.234] submit     | Encrypted tx → BITE magic address
[12:34:56.267] submit     | tx: 0xabc123... (on-chain, encrypted)
[12:35:26.401] condition  | Auction deadline reached
[12:35:26.423] condition  | BLS committee threshold met (t=5, n=7)
[12:35:26.456] decrypt    | Committee threshold-decrypts transaction
[12:35:26.489] decrypt    | Bid revealed: 275.0k tokens (winner)
[12:35:26.512] execute    | finalizeAuction() — winner selected
[12:35:26.545] execute    | Auction #42 finalized
[12:35:26.578] receipt    | Payment: 275.0k to H100 SF Bay via x402
[12:35:26.601] receipt    | Settlement tx: 0xdef456...
```

Every transaction hash links to SKALE block explorer. Verifiable on-chain.

**Encrypted Fields**

The trace log shows what stayed hidden:
- Transaction target (contract address)
- Function calldata (submitBid selector + args)
- Bid amount (Layer 2 encryptMessage)
- Bidder identity (sender hidden until winner revealed)

**Unlock Condition**

Block finalization + BLS committee threshold (t-of-n validators) + auction deadline elapsed.

**Downloadable Receipts**

Each match produces a JSON receipt with:
- Auction ID (on-chain and local)
- Provider details (name, address, service type, price)
- Winner details (agent ID, agent name, bid amount)
- Payment details (protocol, transaction hash, success status)
- Timestamps (created, finalized, receipt generated)
- Network details (chain ID, block explorer link)

---

## The Stack

**Frontend:** Next.js 16, TypeScript, Tailwind CSS, RainbowKit, Wagmi 2.x, Viem 2.x

**Privacy:** `@skalenetwork/bite` v0.2.1 (production SDK, BLS12-381 threshold signatures)

**Authorization:** Custom AP2 implementation (IntentMandate, CartMandate, PaymentMandate, TransactionRecord)

**Settlement:** `@x402/evm` + `@x402/fetch` (x402 protocol, EIP-3009 signed transfers)

**Agents:** `@coinbase/coinbase-sdk` (CDP agent wallets, non-custodial)

**Blockchain:** SKALE Base Sepolia Testnet (Chain ID: 324705682, zero gas, instant finality)

**Smart Contracts (4 deployed, verified source):**
- **SealedBidAuction** (`0x98eFA762eDa5FB0C3BA02296c583A5a542c66c8b`)
  - Creates auctions with BITE-encrypted bid storage
  - Validates decrypted bids against min/max bounds
  - Finalizes auctions and emits winner events

- **AgentRegistry** (`0x31DA867c6C12eCEBbb738d97198792901431e228`)
  - ERC-721 NFT for agent identities
  - Stores agent metadata (name, strategy, services, x402 support)
  - Binds autonomous wallets to agent IDs
  - ERC-8004 compliant

- **ServiceRegistry** (`0x5754C71c2474FE8F2B83C43432Faf0AC94cc24A5`)
  - Provider directory (GPU, data feeds, APIs)
  - Stores CartMandates on-chain
  - Returns active provider listings

- **SentinelUSDC** (`0x6bc10d034D0824ee67EaC1e4E66047b723a8D873`)
  - ERC-20 with EIP-3009 extension
  - `transferWithAuthorization()` for gasless signed transfers
  - Used by x402 facilitator for settlement

---

## Why BITE + AP2

**BITE enables conditional privacy.**

Agents can bid without revealing:
- Their valuation (bid amount stays encrypted)
- Their identity (sender hidden until they win)
- Their strategy (losing bids never decrypt)

This prevents:
- Front-running (no one sees your bid before deadline)
- Price manipulation (providers can't adjust based on demand signals)
- Strategy leakage (competitors can't reverse-engineer your models)

The unlock condition is enforced by consensus: block finalization + BLS threshold + auction deadline. No trusted party. No centralized decryption. Pure cryptographic timing enforcement.

**AP2 enables hierarchical authorization.**

Agents can transact with guardrails:
- IntentMandate defines spending policies (max spend, allowed services)
- CartMandate locks in provider commitments (no price changes mid-auction)
- PaymentMandate authorizes specific transactions (not blank checks)
- TransactionRecord links everything to on-chain settlement

This prevents:
- Rogue spending (agents can't exceed policy constraints)
- Unauthorized payments (every transfer requires explicit approval)
- Ambiguous accountability (full audit trail shows who authorized what)

The mandate chain is validated at every step. If an agent tries to pay outside its IntentMandate constraints, the PaymentMandate validation fails. No money moves.

**Together:**

Agents bid privately (BITE). Winners settle through authorization flows (AP2). Losing bids never reveal (permanent privacy). Winning payments execute with accountability (cryptographic receipts). Everything happens on zero-gas infrastructure (SKALE removes ETH friction).

---

## Technical Details

**BITE Implementation:**
- Two-layer encryption: `encryptTransaction()` for full EVM calls, `encryptMessage()` for bid amounts
- BLS12-381 threshold signatures (t-of-n validator committee)
- Conditional execution enforced by smart contract logic on-chain
- Semantic security (IND-CPA), forward secrecy, no single point of decryption
- Ciphertext size: 96+ bytes per message (constant regardless of plaintext length)

**AP2 Implementation:**
- Four mandate types with EIP-712 typed signatures
- Domain separation + replay protection via nonce
- Hierarchical validation (PaymentMandate requires valid IntentMandate + CartMandate)
- On-chain mandate verification (not trust-based)
- Full audit trail linking mandates to settlement transaction hashes

**x402 Implementation:**
- Self-hosted facilitator (Next.js API route, no external gateway)
- EIP-3009 `transferWithAuthorization()` for gasless transfers
- Off-chain signature generation, on-chain execution
- Transaction hash returned immediately (instant finality on SKALE)
- Zero custody risk (facilitator never holds funds)

**Smart Contract Security:**
- OpenZeppelin base contracts (ERC-721, ERC-20, Ownable)
- Reentrancy guards on state-changing functions
- Input validation (min/max bid bounds, address zero checks)
- Event emission for all state changes (on-chain audit trail)
- Deployed on SKALE testnet, verified source code

---

## The Flow (End-to-End)

1. **Provider registers** → CartMandate created on-chain (signed service offering)
2. **Agent registers** → ERC-721 identity minted, CDP wallet bound
3. **Agent creates IntentMandate** → Spending policy signed off-chain
4. **Agent sees asks** → Provider listings visible (prices public)
5. **Agent submits bid** → Two-layer BITE encryption, opaque blob on-chain
6. **Orderbook shows sealed count** → Providers see "3 bids" not amounts or identities
7. **Deadline hits** → BLS committee decrypts transactions
8. **Clearing runs** → Matches highest valid bid to each ask
9. **Winner creates PaymentMandate** → Authorizes specific payment amount
10. **x402 settlement executes** → EIP-3009 signed transfer, zero gas
11. **TransactionRecord generated** → Full mandate chain + settlement tx hash
12. **BITE trace log displayed** → Shows encrypt → submit → condition → decrypt → execute
13. **Receipt downloadable** → JSON with all details, verifiable on-chain

**Losers:** Encrypted bids never reveal. No strategy leakage.
**Winners:** Authorized payment, cryptographic receipt, full audit trail.

---

## Deployed & Verifiable

**SKALE Base Sepolia Testnet (Chain ID: 324705682)**

Block Explorer: https://base-sepolia-testnet-explorer.skalenodes.com

**Contracts:**
- ServiceRegistry: `0x5754C71c2474FE8F2B83C43432Faf0AC94cc24A5`
- SealedBidAuction: `0x98eFA762eDa5FB0C3BA02296c583A5a542c66c8b`
- AgentRegistry: `0x31DA867c6C12eCEBbb738d97198792901431e228`
- SentinelUSDC: `0x6bc10d034D0824ee67EaC1e4E66047b723a8D873`

Every bid, settlement, and finalization has an on-chain transaction hash.

---

**Built on SKALE | Secured by BITE | Authorized by AP2 | Settled by x402**
