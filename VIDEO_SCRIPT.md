# SENTINEL Demo Video Script
**Format:** Screen recording with live narration (conversational, story-driven)
**Total Duration:** ~3 minutes

---

## Scene 1: Landing Page (15 seconds max)

**[Screen: SENTINEL landing page with terminal boot sequence]**

**Voiceover (conversational):**
"Imagine you're an AI agent buying GPU compute. Every bid you make is public. Every price you're willing to pay? Visible to the seller. Your entire procurement strategy? Leaked to competitors. This is the problem SENTINEL solves. We built a sealed-bid marketplace where agents can transact privately using BITE threshold encryption for bids and AP2 authorization for payments. Let me show you how it works."

**[Action: Quick scroll showing the three navigation options, then navigate to /agents]**

---

## Scene 2: Agent Registration (25 seconds, 2x speed)

**[Screen: Navigate to /agents page, start filling form in 2x speed]**

**Voiceover (while typing in 2x):**
"First, agents need on-chain identity. I'm registering a procurement agent right now—giving it a name, describing what it does, setting its bidding strategy to aggressive. I can add service capabilities, set x402 payment support. Behind the scenes, this would mint an ERC-721 NFT identity and create an autonomous wallet through Coinbase CDP. Every bid this agent makes will be cryptographically tied to this identity."

**[Action: Fill out fields - name: "AlphaProcure", description: "Aggressive GPU procurement agent", strategy: "aggressive", x402Support: checked. DON'T click register. Cut immediately to providers page]**

---

## Scene 3: Provider Registration (20 seconds, 2x speed)

**[Screen: Navigate to /providers page, start filling form in 2x speed]**

**Voiceover (while typing in 2x):**
"Now providers. They go through a multi-step registration—business identity, service specs, legal agreements, then on-chain registration. I'm listing a GPU provider here: H100 cluster, 99.9% uptime SLA, base price. This creates what AP2 calls a CartMandate—a signed service offering with price and commitments. Providers list their services as asks in the orderbook."

**[Action: Fill Application step - legal name, email, provider name: "H100 SF Bay", service type: "GPU Compute", base price: "250000", description, capacity: "8x H100 80GB", uptime: "99.9". DON'T click continue. Cut to orderbook page]**

---

## Scene 4: Orderbook - The Core Demo (90-100 seconds)

**[Screen: Land on /orderbook page, sees asks with sealed bid counts]**

**Voiceover (normal pace, building narrative):**
"Here's where it gets interesting. This is the orderbook. You see providers listing their services—GPU compute, data feeds, API access. These are the asks. Now watch the sealed bid counts."

**[Screen: Bid counts incrementing as agents bid in background]**

**Voiceover:**
"Agents are bidding right now, but their bids are encrypted. Not just hidden—cryptographically sealed using BITE threshold encryption. No one can see what they're bidding. Not the providers, not other agents, not even the platform. The bids are encrypted at two layers: first, the bid amount itself is encrypted using BITE's encryptMessage. Then the entire transaction—the contract call, the function arguments, everything—is encrypted again using encryptTransaction. It's submitted to SKALE as an opaque blob to a BITE magic address. Completely invisible until the auction clears."

**[Screen: Click "Clear Orderbook" button]**

**Voiceover (as clearing animation starts):**
"When I click clear, the matching engine runs. It pairs winning bids with asks. Now watch what happens behind the scenes."

**[Screen: Clearing animation playing, showing matches being computed]**

**Voiceover (explaining while animation plays):**
"For each match, we're running the full AP2 authorization flow. First, the agent creates an IntentMandate—declaring its procurement constraints, what it's willing to spend, which service types it wants. The provider already created a CartMandate when they registered—their signed offering. Now the agent creates a PaymentMandate, authorizing the specific payment for this specific bid."

**[Screen: Shows loading states, transaction processing]**

**Voiceover:**
"Here's where BITE proves its value. The auction deadline just hit. The conditional decryption triggers. SKALE's BLS committee—a threshold group of validators—decrypts only the winning bids. Losing bids stay encrypted forever. No strategy leakage. The decrypted transaction executes on-chain: the auction finalizes, the winner is selected. Then x402 kicks in—the payment protocol executes the settlement using EIP-3009 signed transfers. Every transaction on SKALE is zero gas, so the agent doesn't need ETH. Just pure payment execution."

**[Screen: Results page appears with payment settlements]**

---

## Scene 5: Results - Showing AP2 & BITE (50 seconds)

**[Screen: Results page showing payment settlement cards]**

**Voiceover (walking through results):**
"Results are in. Here's the payment settlement—transaction hash, amount paid, who won. Everything is verifiable on-chain. Now let me show you why this matters for the judges."

**[Screen: Scroll to or click BITE Trace Log]**

**Voiceover:**
"This is the BITE trace log. It shows the complete lifecycle. Step one: we encrypted the bid amount—Layer 2 encryption. You can see the ciphertext. Step two: we encrypted the entire transaction—Layer 1, the full EVM call is now opaque. Step three: submitted to BITE magic address. No one can read it. Step four: condition check—auction deadline reached, BLS committee threshold met. Step five: committee decrypts the transaction. Step six: bid revealed, auction finalized. Step seven: receipt generated with the transaction hash."

**[Action: Point to encrypted fields section showing what stayed hidden]**

**Voiceover:**
"Look at what stayed encrypted: the transaction target, the function calldata, the bid amount, the bidder identity. Everything. The unlock condition was block finalization plus BLS threshold plus auction deadline. If the committee was unavailable, the bid would be rejected with no state change. If decryption failed, the transaction reverts. There's a clear failure path—no ambiguity."

**[Screen: Scroll to AP2 Record View]**

**Voiceover:**
"Now the AP2 record. This is the full mandate chain proving authorization. IntentMandate at the top—the agent declared what it wanted to buy and its spending limits. CartMandate from the provider—the signed service offering. PaymentMandate from the agent—explicit authorization to pay this specific amount to this specific provider. And finally, the TransactionRecord—the settlement transaction hash tying it all together. This is the accountability layer. You can audit who authorized what, when they authorized it, what was executed, and what was delivered."

**[Screen: Scroll to receipt download section]**

**Voiceover:**
"And here's the downloadable receipt with every detail—auction ID, provider info, winning bid, payment transaction hash, timestamps. Full audit trail. This is what judges want to see: a reusable pattern. Intent, authorization, settlement, receipt. Clean separation. Cryptographic accountability."

---

## Scene 6: Closing (10 seconds)

**[Screen: Back at results page or landing page]**

**Voiceover:**
"This is SENTINEL. Agents bid privately with BITE conditional encryption. Payments execute with AP2 authorization guarantees. Everything settles on SKALE with zero gas. Private intent, explicit approval, instant settlement. Agentic commerce that actually works."

**[Text overlay fades in: "Built on SKALE | Secured by BITE | Authorized by AP2"]**

---

## Key Narrative Beats to Emphasize

**Story Arc:**
1. **Problem:** Public bids leak strategy and enable manipulation
2. **Solution Layer 1:** BITE encrypts bids conditionally
3. **Solution Layer 2:** AP2 ensures authorization before settlement
4. **Proof:** Show the full trace and mandate chain
5. **Impact:** This is a reusable pattern for all agentic commerce

**Technical Credibility Moments:**
- "Two-layer encryption" (not just "encrypted")
- "BLS committee threshold" (not just "decryption")
- "Conditional triggers" (deadline + threshold + finalization)
- "EIP-3009 signed transfers" (not just "payment")
- "Zero gas on SKALE" (remove friction from autonomous operations)
- "Mandate chain" (not just "authorization")

**Emotional Beats:**
- Frustration: "Every bid you make is public"
- Relief: "Cryptographically sealed"
- Confidence: "Losing bids stay encrypted forever"
- Trust: "Full audit trail with transaction hashes"
- Victory: "This is a reusable pattern"

---

## Pacing Guide

- **0:00-0:15** → Landing (hook with the problem)
- **0:15-0:40** → Agent registration (fast, 2x speed, explain identity)
- **0:40-1:00** → Provider registration (fast, 2x speed, explain CartMandate)
- **1:00-2:40** → Orderbook clearing (THE CORE: explain BITE + AP2 during animation)
- **2:40-3:30** → Results walkthrough (prove it with trace logs and mandate chain)
- **3:30-3:40** → Closing (restate the pattern)

---

## Tone & Delivery

- **Conversational, not robotic** - Talk like you're excited to show this, not reading a script
- **Build momentum** - Start with problem, escalate through solution, climax at results
- **Emphasize "why"** - Don't just say "it encrypts," say "it encrypts SO THAT strategy stays private"
- **Use judge language** - "reusable pattern," "mandate chain," "conditional execution," "audit trail"
- **Show confidence** - This isn't a demo, it's proof that the pattern works

---

## What NOT to Say

❌ "I hope this works"
❌ "This is just a prototype"
❌ "We didn't have time to..."
❌ "In the future we could..."
❌ "This might be useful for..."

✅ "This proves the pattern"
✅ "You can verify this on-chain"
✅ "The mandate chain shows accountability"
✅ "This is how agents should transact"
✅ "Other teams can reuse this flow"
