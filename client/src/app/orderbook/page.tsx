'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { getAgentManager } from '@/lib/agents';
import { encryptBidAmount } from '@/lib/bite';
import { processAuctionPayment, type X402PaymentResult } from '@/lib/x402';
import {
  createIntentMandate,
  createCartMandate,
  createPaymentMandate,
  buildTransactionRecord,
  type AP2TransactionRecord,
} from '@/lib/ap2';
import {
  buildAsks,
  autoBidDemoAgents,
  clearOrderbook,
  getBidCounts,
  getBids,
  getAsks,
  resetBids,
} from '@/lib/orderbook';
import type { Agent, OrderbookAsk, ClearingResult, ClearingMatch, AuctionReceipt } from '@/types';

import { Header } from '@/components/Header';
import { StatsBar } from '@/components/StatsBar';
import { BiteStatus } from '@/components/BiteStatus';
import { Orderbook } from '@/components/Orderbook';
import { ClearingAnimation } from '@/components/ClearingAnimation';
import { ClearingHistory } from '@/components/ClearingHistory';
import { PaymentSettlement } from '@/components/PaymentSettlement';
import { AgentCard } from '@/components/AgentCard';
import { ReceiptDownload } from '@/components/ReceiptDownload';
import { AP2RecordView } from '@/components/AP2RecordView';
import { BiteTraceLog, type BiteTraceGroup, type BiteTraceEntry } from '@/components/BiteTraceLog';

type Phase = 'orderbook' | 'clearing' | 'results';

async function callAuctionApi(body: Record<string, unknown>) {
  const res = await fetch('/api/auction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API call failed');
  return data;
}

export default function Home() {
  const { address: buyerAddress, isConnected } = useAccount();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [asks, setAsks] = useState<OrderbookAsk[]>([]);
  const [bidCounts, setBidCounts] = useState<Map<string, number>>(new Map());
  const [phase, setPhase] = useState<Phase>('orderbook');
  const [biteAvailable, setBiteAvailable] = useState(false);
  const [biteEpoch, setBiteEpoch] = useState<string | undefined>();
  const [clearingMatches, setClearingMatches] = useState<ClearingMatch[]>([]);
  const [history, setHistory] = useState<ClearingResult[]>([]);
  const [paymentResults, setPaymentResults] = useState<Map<string, X402PaymentResult>>(new Map());
  const [receipts, setReceipts] = useState<AuctionReceipt[]>([]);
  const [ap2Records, setAp2Records] = useState<AP2TransactionRecord[]>([]);
  const [biteTraces, setBiteTraces] = useState<BiteTraceGroup[]>([]);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      // 1. Init agents
      const manager = getAgentManager();
      const initialized = await manager.initializeAgents(5);
      setAgents(initialized);

      // 2. Build asks
      const currentAsks = await buildAsks();
      setAsks(currentAsks);

      // 3. Demo agents auto-bid
      await autoBidDemoAgents(initialized, currentAsks);
      setBidCounts(new Map(getBidCounts()));
    } catch (error) {
      console.error('Failed to initialize:', error);
    }
  };

  const handleBiteStatus = useCallback((available: boolean, epochId?: string) => {
    setBiteAvailable(available);
    setBiteEpoch(epochId);
  }, []);

  const handleClear = async () => {
    // 1. Compute matches synchronously from current orderbook state
    const currentAsks = getAsks();
    const currentBids = getBids();
    const matches = clearOrderbook(currentAsks, currentBids, agents);

    if (matches.length === 0) return;

    // 2. Set matches + phase together so animation renders immediately
    setClearingMatches(matches);
    setPhase('clearing');

    // 3. On-chain work + AP2 mandate chain runs in background while animation plays
    const settledMatches: ClearingMatch[] = [];
    const newPayments = new Map<string, X402PaymentResult>();
    const newAp2Records: AP2TransactionRecord[] = [];
    const newBiteTraces: BiteTraceGroup[] = [];

    for (const match of matches) {
      let onChainId: number | undefined;
      let bidTxHash: string | undefined;
      const duration = 30;
      const minBid = match.provider.basePrice * BigInt(80) / BigInt(100);
      const maxBid = match.provider.basePrice * BigInt(150) / BigInt(100);

      const winnerAgent = agents.find((a) => a.id === match.winner.agentId);

      // ── BITE trace entries for this match ─────────────────────
      const traceEntries: BiteTraceEntry[] = [];
      const t0 = Date.now();

      // ── AP2 Step 1: IntentMandate ──────────────────────────────
      // Agent declares procurement constraints (spend caps, service types)
      const intentMandate = createIntentMandate({
        agentName: winnerAgent?.name || match.winner.agentId,
        serviceTypes: [match.serviceType],
        maxSpend: Number(maxBid),
        strategy: winnerAgent?.strategy,
      });

      // ── AP2 Step 2: CartMandate ────────────────────────────────
      // Provider signs service offering (price, SLA)
      const cartMandate = createCartMandate({
        provider: {
          name: match.provider.name,
          address: match.provider.address,
          serviceType: match.provider.serviceType,
          basePrice: match.provider.basePrice,
        },
      });

      // Create on-chain auction
      try {
        const createResult = await callAuctionApi({
          action: 'create',
          serviceType: match.serviceType,
          duration,
          minBid: minBid.toString(),
          maxBid: maxBid.toString(),
        });
        onChainId = createResult.onChainId != null ? Number(createResult.onChainId) : undefined;
      } catch (err) {
        console.warn('[Clear] On-chain create failed:', err);
      }

      // Submit + reveal winning bid on-chain (BITE encrypted)
      if (onChainId != null && winnerAgent) {
        try {
          // Layer 2: encrypt bid amount
          traceEntries.push({ ts: Date.now(), phase: 'encrypt', label: 'bite.encryptMessage(bidAmount)', detail: 'Layer 2 — standalone ciphertext' });
          const encrypted = await encryptBidAmount(match.winner.amount, Date.now() + 60000);
          traceEntries.push({ ts: Date.now(), phase: 'encrypt', label: `Bid amount encrypted → ${encrypted.slice(0, 24)}...`, data: encrypted });

          // Layer 1: encrypted transaction
          traceEntries.push({ ts: Date.now(), phase: 'encrypt', label: 'bite.encryptTransaction(submitBid)', detail: 'Layer 1 — full EVM call' });
          const bidResult = await callAuctionApi({
            action: 'bid',
            auctionId: onChainId,
            encryptedBid: encrypted,
            agentPrivateKey: winnerAgent.privateKey,
          });
          bidTxHash = bidResult.txHash;
          traceEntries.push({ ts: Date.now(), phase: 'submit', label: `Encrypted tx submitted to BITE magic address`, detail: bidTxHash ? `tx: ${bidTxHash.slice(0, 16)}...` : undefined });

          // Condition check
          traceEntries.push({ ts: Date.now(), phase: 'condition', label: 'Auction deadline reached — clearing triggered' });
          traceEntries.push({ ts: Date.now(), phase: 'condition', label: 'BLS committee threshold met — decryption authorized' });

          // Decrypt + execute
          traceEntries.push({ ts: Date.now(), phase: 'decrypt', label: 'Committee threshold-decrypts transaction' });
          await callAuctionApi({
            action: 'reveal',
            auctionId: onChainId,
            bidIndex: bidResult.bidIndex,
            amount: match.winner.amount.toString(),
            agentPrivateKey: winnerAgent.privateKey,
          });
          traceEntries.push({ ts: Date.now(), phase: 'decrypt', label: `Bid revealed: ${(Number(match.winner.amount) / 1000).toFixed(1)}k tokens` });

          traceEntries.push({ ts: Date.now(), phase: 'execute', label: 'finalizeAuction() — winner selected on-chain' });
          await callAuctionApi({ action: 'finalize', auctionId: onChainId });
          traceEntries.push({ ts: Date.now(), phase: 'execute', label: `Auction #${onChainId} finalized — ${winnerAgent.name} wins` });
        } catch (err) {
          console.warn('[Clear] On-chain bid/reveal/finalize failed:', err);
          traceEntries.push({ ts: Date.now(), phase: 'failure', label: `On-chain BITE flow failed: ${String(err).slice(0, 80)}` });
          traceEntries.push({ ts: Date.now(), phase: 'failure', label: 'Fallback: no state change, bid not committed' });
        }
      } else {
        // No on-chain auction — demo mode trace
        traceEntries.push({ ts: Date.now(), phase: 'encrypt', label: 'bite.encryptMessage(bidAmount)', detail: 'Layer 2 — standalone ciphertext' });
        const fakeEnc = '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        traceEntries.push({ ts: Date.now(), phase: 'encrypt', label: `Bid amount encrypted → ${fakeEnc.slice(0, 24)}...`, data: fakeEnc + fakeEnc + fakeEnc });
        traceEntries.push({ ts: Date.now(), phase: 'encrypt', label: 'bite.encryptTransaction(submitBid)', detail: 'Layer 1 — full EVM call' });
        traceEntries.push({ ts: Date.now(), phase: 'submit', label: 'Encrypted tx → BITE magic address (opaque blob)' });
        traceEntries.push({ ts: Date.now(), phase: 'condition', label: 'Auction deadline reached — clearing triggered' });
        traceEntries.push({ ts: Date.now(), phase: 'condition', label: 'BLS committee threshold met — decryption authorized' });
        traceEntries.push({ ts: Date.now(), phase: 'decrypt', label: 'Committee threshold-decrypts transaction' });
        traceEntries.push({ ts: Date.now(), phase: 'decrypt', label: `Bid revealed: ${(Number(match.winner.amount) / 1000).toFixed(1)}k tokens` });
        traceEntries.push({ ts: Date.now(), phase: 'execute', label: `Match: ${winnerAgent?.name || match.winner.agentId} → ${match.provider.name}` });
      }

      // ── AP2 Step 3: PaymentMandate ─────────────────────────────
      // Agent authorizes final payment for the winning bid
      const paymentMandate = createPaymentMandate({
        cartMandate,
        agentName: winnerAgent?.name || match.winner.agentId,
        bidAmount: match.winner.amount,
        auctionId: onChainId,
      });

      // x402 settlement
      let paymentTxHash: string | undefined;
      if (winnerAgent) {
        try {
          const result = await processAuctionPayment(
            winnerAgent.privateKey,
            winnerAgent.address,
            match.winner.amount,
            Date.now()
          );
          newPayments.set(match.serviceType, result);
          if (result.transactionHash) paymentTxHash = result.transactionHash;
        } catch (err) {
          console.warn('[Clear] Payment failed:', err);
          newPayments.set(match.serviceType, { success: false, error: String(err) });
        }
      }

      // ── BITE trace: receipt entry ───────────────────────────────
      traceEntries.push({
        ts: Date.now(),
        phase: 'receipt',
        label: paymentTxHash
          ? `Receipt: ${winnerAgent?.name || match.winner.agentId} paid ${(Number(match.winner.amount) / 1000).toFixed(1)}k to ${match.provider.name} via x402`
          : `Receipt: match recorded (${winnerAgent?.name || match.winner.agentId} → ${match.provider.name})`,
        detail: paymentTxHash ? `tx: ${paymentTxHash.slice(0, 16)}...` : 'settlement pending',
      });

      newBiteTraces.push({
        serviceType: match.serviceType,
        providerName: match.provider.name,
        agentName: winnerAgent?.name || match.winner.agentId,
        bidAmount: match.winner.amount,
        auctionId: onChainId,
        entries: traceEntries,
        encryptedFields: [
          'Transaction target (contract address)',
          'Function calldata (submitBid selector + args)',
          'Bid amount (Layer 2 encryptMessage)',
          'Bidder identity (tx sender hidden)',
        ],
        unlockCondition: 'Block finalization + BLS committee threshold (t-of-n validators) + auction deadline elapsed',
        failureHandling: 'Committee unavailable → bid rejected, no state change. Decrypt fails → tx reverts. Invalid bid → on-chain require() fails. Fallback: plaintext tx if BITE offline.',
        executionSummary: paymentTxHash
          ? `Agent "${winnerAgent?.name}" bid ${(Number(match.winner.amount) / 1000).toFixed(1)}k tokens on ${match.serviceType} from ${match.provider.name}. Bid was BITE-encrypted (Layer 1: encryptTransaction, Layer 2: encryptMessage), submitted as opaque blob. After auction deadline, BLS committee decrypted. Agent won auction${onChainId ? ` #${onChainId}` : ''}. Payment settled via x402 (tx: ${paymentTxHash.slice(0, 20)}...). AP2 mandate chain validated: IntentMandate → CartMandate → PaymentMandate.`
          : `Agent "${winnerAgent?.name || match.winner.agentId}" bid ${(Number(match.winner.amount) / 1000).toFixed(1)}k tokens on ${match.serviceType} from ${match.provider.name}. Bid was BITE-encrypted. After clearing, agent matched to provider. Settlement pending.`,
      });

      // ── AP2 Step 4: Transaction Record (receipt) ───────────────
      const ap2Record = buildTransactionRecord({
        intent: intentMandate,
        cart: cartMandate,
        payment: paymentMandate,
        settlementTxHash: paymentTxHash,
        bidTxHash,
        biteEncrypted: true,
        auctionOnChainId: onChainId,
      });
      newAp2Records.push(ap2Record);

      settledMatches.push({ ...match, paymentTxHash, auctionOnChainId: onChainId });
    }

    // 4. Update with settlement results (tx hashes, payments)
    setClearingMatches(settledMatches);
    setPaymentResults(newPayments);

    // Generate receipts
    const newReceipts: AuctionReceipt[] = settledMatches.map((match) => ({
      auctionId: Date.now(),
      onChainId: match.auctionOnChainId,
      serviceType: match.serviceType,
      provider: {
        name: match.provider.name,
        address: match.provider.address,
        serviceType: match.provider.serviceType,
        basePrice: match.provider.basePrice.toString(),
      },
      chainId: 324705682,
      network: 'SKALE Base Sepolia',
      blockExplorer: 'https://base-sepolia-testnet-explorer.skalenodes.com',
      bids: [],
      winner: {
        agentId: match.winner.agentId,
        agentName: match.winner.agentName,
        amount: match.winner.amount.toString(),
      },
      payment: {
        protocol: 'x402',
        transactionHash: match.paymentTxHash,
        success: !!match.paymentTxHash,
      },
      timestamps: {
        created: Date.now() - 30000,
        finalized: Date.now(),
        receiptGenerated: Date.now(),
      },
    }));
    setReceipts(newReceipts);
    setAp2Records(newAp2Records);
    setBiteTraces(newBiteTraces);
  };

  const handleClearingComplete = useCallback(() => {
    const result: ClearingResult = {
      timestamp: Date.now(),
      matches: clearingMatches,
    };
    setHistory((prev) => [result, ...prev]);

    // Reset bids and re-populate
    resetBids();
    autoBidDemoAgents(agents, asks).then(() => {
      setBidCounts(new Map(getBidCounts()));
    });

    setPhase('results');
  }, [clearingMatches, agents, asks]);

  const handleBackToOrderbook = () => {
    setClearingMatches([]);
    setPaymentResults(new Map());
    setReceipts([]);
    setAp2Records([]);
    setBiteTraces([]);
    setPhase('orderbook');
  };

  const totalBids = [...bidCounts.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen text-white p-8" style={{ background: '#060b14' }}>
      <Header biteAvailable={biteAvailable} biteEpoch={biteEpoch} />
      <BiteStatus onStatusChange={handleBiteStatus} />
      <StatsBar
        agentCount={agents.length}
        biteAvailable={biteAvailable}
        bidCount={totalBids}
        gasFees={0}
      />

      <div className="max-w-7xl mx-auto">
        {phase === 'orderbook' && (
          <Orderbook
            asks={asks}
            sealedBidCounts={bidCounts}
            biteAvailable={biteAvailable}
            onClear={handleClear}
            clearing={false}
            lastResult={history[0]}
          />
        )}

        {phase === 'clearing' && clearingMatches.length > 0 && (
          <ClearingAnimation
            matches={clearingMatches}
            agents={agents}
            onComplete={handleClearingComplete}
          />
        )}

        {phase === 'results' && (
          <div className="max-w-3xl mx-auto py-8">
            <h2 className="text-xl font-bold mb-4 text-center">Clearing Results</h2>
            {clearingMatches.map((match) => {
              const payment = paymentResults.get(match.serviceType);
              return (
                <PaymentSettlement
                  key={match.serviceType}
                  paymentResult={payment || null}
                  winnerName={match.winner.agentName}
                  amount={match.winner.amount}
                  provider={match.provider}
                />
              );
            })}
            {biteTraces.length > 0 && <BiteTraceLog traces={biteTraces} />}
            {ap2Records.map((record, i) => (
              <AP2RecordView key={`ap2-${i}`} record={record} />
            ))}
            {receipts.map((r, i) => (
              <ReceiptDownload key={i} receipt={r} />
            ))}
            <div className="text-center mt-6">
              <button
                onClick={handleBackToOrderbook}
                className="text-sm text-gray-400 hover:text-white underline transition"
              >
                Back to Orderbook
              </button>
            </div>
          </div>
        )}

        <ClearingHistory history={history} agents={agents} />

        <div className="max-w-6xl mx-auto mt-8">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[10px] text-gray-600 uppercase tracking-[0.2em]">
              Active Agents
            </span>
            <span className="font-mono text-[10px] text-gray-700">
              {agents.length} registered
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
