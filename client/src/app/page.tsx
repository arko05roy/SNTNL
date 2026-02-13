'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAgentManager } from '@/lib/agents';
import { getAveragePrice } from '@/lib/providers';
import { encryptBidAmount } from '@/lib/bite';
import { processAuctionPayment, type X402PaymentResult } from '@/lib/x402';
import type { Agent, Auction, Bid, ServiceType, AuctionHistory, AuctionReceipt } from '@/types';

import { Header } from '@/components/Header';
import { StatsBar } from '@/components/StatsBar';
import { AuctionSetup } from '@/components/AuctionSetup';
import { BidSubmission } from '@/components/BidSubmission';
import { RevealAnimation } from '@/components/RevealAnimation';
import { AuctionResults } from '@/components/AuctionResults';
import { PaymentSettlement } from '@/components/PaymentSettlement';
import { AgentCard } from '@/components/AgentCard';
import { BiteStatus } from '@/components/BiteStatus';
import { ReceiptDownload } from '@/components/ReceiptDownload';

type Phase = 'setup' | 'bidding' | 'revealing' | 'complete';

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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [auction, setAuction] = useState<Auction | null>(null);
  const [phase, setPhase] = useState<Phase>('setup');
  const [timeLeft, setTimeLeft] = useState(30);
  const [biteAvailable, setBiteAvailable] = useState(false);
  const [biteEpoch, setBiteEpoch] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [paymentResult, setPaymentResult] = useState<X402PaymentResult | null>(null);
  const [history, setHistory] = useState<AuctionHistory[]>([]);
  const [receipt, setReceipt] = useState<AuctionReceipt | null>(null);

  useEffect(() => {
    initializeAgents();
  }, []);

  const initializeAgents = async () => {
    try {
      const manager = getAgentManager();
      const initialized = await manager.initializeAgents(5);
      setAgents(initialized);
    } catch (error) {
      console.error('Failed to initialize agents:', error);
    }
  };

  const handleBiteStatus = useCallback((available: boolean, epochId?: string) => {
    setBiteAvailable(available);
    setBiteEpoch(epochId);
  }, []);

  const startAuction = async (serviceType: ServiceType) => {
    setLoading(true);
    setPaymentResult(null);
    setReceipt(null);

    try {
      const marketPrice = getAveragePrice(serviceType);
      const minBid = marketPrice * BigInt(80) / BigInt(100);
      const maxBid = marketPrice * BigInt(150) / BigInt(100);
      const duration = 30; // seconds

      // Create auction on-chain
      let createTxHash: string | undefined;
      let onChainId: number | undefined;
      try {
        const createResult = await callAuctionApi({
          action: 'create',
          serviceType,
          duration,
          minBid: minBid.toString(),
          maxBid: maxBid.toString(),
        });
        createTxHash = createResult.txHash;
        onChainId = createResult.onChainId != null ? Number(createResult.onChainId) : undefined;
        console.log('[Auction] Created on-chain:', createResult);
      } catch (err) {
        console.warn('[Auction] On-chain create failed, continuing off-chain:', err);
      }

      const newAuction: Auction = {
        id: Date.now(),
        onChainId,
        serviceType,
        deadline: Date.now() + duration * 1000,
        minBid,
        maxBid,
        bids: [],
        finalized: false,
        createTxHash,
      };

      setAuction(newAuction);
      setPhase('bidding');
      setTimeLeft(duration);
      await submitAgentBids(newAuction);
    } catch (error) {
      console.error('Failed to start auction:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitAgentBids = async (auc: Auction) => {
    const manager = getAgentManager();
    const bids: Bid[] = [];

    for (const agent of agents) {
      if (!manager.shouldParticipate(agent, auc.serviceType)) continue;

      const marketPrice = (auc.minBid + auc.maxBid) / BigInt(2);
      const bidAmount = manager.calculateBid(agent, marketPrice, auc.maxBid);

      try {
        const encrypted = await encryptBidAmount(bidAmount, auc.deadline);

        // Submit bid on-chain
        let txHash: string | undefined;
        let bidIndex: number | undefined;
        if (auc.onChainId != null) {
          try {
            const bidResult = await callAuctionApi({
              action: 'bid',
              auctionId: auc.onChainId,
              encryptedBid: encrypted,
              agentPrivateKey: agent.privateKey,
            });
            txHash = bidResult.txHash;
            bidIndex = bidResult.bidIndex;
          } catch (err) {
            console.warn(`[Bid] On-chain submit failed for ${agent.name}:`, err);
          }
        }

        bids.push({
          agentId: agent.id,
          amount: bidAmount,
          encrypted,
          timestamp: Date.now(),
          revealed: false,
          txHash,
          bidIndex,
        });
      } catch (error) {
        console.error(`Failed to encrypt bid for ${agent.name}:`, error);
      }
    }

    setAuction((prev) => (prev ? { ...prev, bids } : null));
  };

  // Countdown timer
  useEffect(() => {
    if (phase !== 'bidding' || !auction) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPhase('revealing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, auction]);

  const handleRevealComplete = useCallback(async () => {
    if (!auction) return;

    // Reveal bids on-chain
    const updatedBids = [...auction.bids];
    for (let i = 0; i < updatedBids.length; i++) {
      const bid = updatedBids[i];
      if (auction.onChainId != null && bid.bidIndex != null) {
        try {
          const revealResult = await callAuctionApi({
            action: 'reveal',
            auctionId: auction.onChainId,
            bidIndex: bid.bidIndex,
            amount: bid.amount.toString(),
            agentPrivateKey: agents.find((a) => a.id === bid.agentId)?.privateKey,
          });
          updatedBids[i] = { ...bid, revealed: true, revealTxHash: revealResult.txHash };
        } catch (err) {
          console.warn(`[Reveal] On-chain reveal failed for bid ${i}:`, err);
          updatedBids[i] = { ...bid, revealed: true };
        }
      } else {
        updatedBids[i] = { ...bid, revealed: true };
      }
    }

    // Find winner (highest bid)
    let highestBid = BigInt(0);
    let winnerId = '';
    updatedBids.forEach((bid) => {
      if (bid.amount > highestBid) {
        highestBid = bid.amount;
        winnerId = bid.agentId;
      }
    });

    // Finalize on-chain
    let finalizeTxHash: string | undefined;
    if (auction.onChainId != null) {
      try {
        const finalizeResult = await callAuctionApi({
          action: 'finalize',
          auctionId: auction.onChainId,
        });
        finalizeTxHash = finalizeResult.txHash;
      } catch (err) {
        console.warn('[Finalize] On-chain finalize failed:', err);
      }
    }

    const finalAuction: Auction = {
      ...auction,
      bids: updatedBids,
      winner: winnerId,
      winningBid: highestBid,
      finalized: true,
      finalizeTxHash,
    };

    setAuction(finalAuction);

    // Process x402 payment
    const winnerAgent = agents.find((a) => a.id === winnerId);
    if (winnerAgent) {
      try {
        const result = await processAuctionPayment(
          winnerAgent.privateKey,
          winnerAgent.address,
          highestBid,
          auction.id
        );
        setPaymentResult(result);

        // Generate receipt
        const receiptData: AuctionReceipt = {
          auctionId: auction.id,
          onChainId: auction.onChainId,
          serviceType: auction.serviceType,
          chainId: 324705682,
          network: 'SKALE Base Sepolia',
          blockExplorer: 'https://base-sepolia-testnet-explorer.skalenodes.com',
          createTxHash: auction.createTxHash,
          finalizeTxHash,
          bids: updatedBids.map((b) => {
            const ag = agents.find((a) => a.id === b.agentId);
            return {
              agentId: b.agentId,
              agentName: ag?.name || b.agentId,
              encrypted: b.encrypted.slice(0, 40) + '...',
              revealedAmount: b.amount.toString(),
              txHash: b.txHash,
              revealTxHash: b.revealTxHash,
            };
          }),
          winner: {
            agentId: winnerId,
            agentName: winnerAgent.name,
            amount: highestBid.toString(),
          },
          payment: {
            protocol: 'x402',
            transactionHash: result.transactionHash,
            success: result.success,
          },
          timestamps: {
            created: auction.deadline - 30000,
            finalized: Date.now(),
            receiptGenerated: Date.now(),
          },
        };
        setReceipt(receiptData);
      } catch (error) {
        console.error('Payment processing failed:', error);
        setPaymentResult({ success: false, error: String(error) });
      }
    }

    // Add to history
    setHistory((prev) => [
      { auction: finalAuction, completedAt: Date.now() },
      ...prev,
    ]);

    setPhase('complete');
  }, [auction, agents]);

  const resetAuction = () => {
    setAuction(null);
    setPhase('setup');
    setPaymentResult(null);
    setReceipt(null);
    setTimeLeft(30);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950/50 to-gray-950 text-white p-8">
      <Header biteAvailable={biteAvailable} biteEpoch={biteEpoch} />
      <BiteStatus onStatusChange={handleBiteStatus} />
      <StatsBar
        agentCount={agents.length}
        biteAvailable={biteAvailable}
        bidCount={auction?.bids.length || 0}
        gasFees={0}
      />

      <div className="max-w-7xl mx-auto">
        {phase === 'setup' && (
          <AuctionSetup
            agentCount={agents.length}
            loading={loading}
            onLaunch={startAuction}
            history={history}
          />
        )}

        {phase === 'bidding' && auction && (
          <BidSubmission
            bids={auction.bids}
            agents={agents}
            serviceType={auction.serviceType}
            timeLeft={timeLeft}
          />
        )}

        {phase === 'revealing' && auction && (
          <RevealAnimation
            bids={auction.bids}
            agents={agents}
            onRevealComplete={handleRevealComplete}
          />
        )}

        {phase === 'complete' && auction && (
          <div>
            <AuctionResults auction={auction} agents={agents} />
            <PaymentSettlement
              paymentResult={paymentResult}
              winnerName={agents.find((a) => a.id === auction.winner)?.name}
              amount={auction.winningBid}
            />
            {receipt && <ReceiptDownload receipt={receipt} />}
            <button
              onClick={resetAuction}
              className="mt-4 ml-4 text-sm text-gray-400 hover:text-white underline transition"
            >
              Run Another Auction
            </button>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-4">Active Agents</h3>
          <div className="grid grid-cols-5 gap-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
