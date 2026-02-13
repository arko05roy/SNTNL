/**
 * Orderbook State Manager
 * Manages sealed-bid orderbook: asks from providers, sealed bids from agents
 */

import type { Agent, ServiceProvider, SealedBidEntry, OrderbookAsk, ClearingMatch } from '@/types';
import { PROVIDERS, fetchOnChainProviders } from '@/lib/providers';
import { getAgentManager } from '@/lib/agents';
import { encryptBidAmount } from '@/lib/bite';

let asks: OrderbookAsk[] = [];
let bids: Map<string, SealedBidEntry[]> = new Map();

export async function buildAsks(): Promise<OrderbookAsk[]> {
  const onChain = await fetchOnChainProviders();
  const seen = new Set<string>();
  const allProviders: ServiceProvider[] = [];

  for (const p of PROVIDERS) {
    allProviders.push(p);
    seen.add(p.address);
  }
  for (const p of onChain) {
    if (!seen.has(p.address)) {
      allProviders.push(p);
      seen.add(p.address);
    }
  }

  asks = allProviders.map((provider) => ({
    provider,
    listedAt: Date.now(),
  }));

  return asks;
}

export function placeSealedBid(
  agentId: string,
  serviceType: string,
  encrypted: string,
  amount: bigint
): void {
  const entry: SealedBidEntry = {
    agentId,
    serviceType,
    encrypted,
    amount,
    timestamp: Date.now(),
  };
  const existing = bids.get(serviceType) || [];
  existing.push(entry);
  bids.set(serviceType, existing);
}

export async function autoBidDemoAgents(
  agents: Agent[],
  currentAsks: OrderbookAsk[]
): Promise<void> {
  const manager = getAgentManager();
  const serviceTypes = [...new Set(currentAsks.map((a) => a.provider.serviceType))];

  for (const agent of agents) {
    for (const serviceType of serviceTypes) {
      if (!manager.shouldParticipate(agent, serviceType)) continue;

      const providersForType = currentAsks
        .filter((a) => a.provider.serviceType === serviceType)
        .map((a) => a.provider);

      if (providersForType.length === 0) continue;

      const avgPrice =
        providersForType.reduce((sum, p) => sum + p.basePrice, BigInt(0)) /
        BigInt(providersForType.length);

      const maxBid = avgPrice * BigInt(150) / BigInt(100);
      const bidAmount = manager.calculateBid(agent, avgPrice, maxBid);

      try {
        const encrypted = await encryptBidAmount(bidAmount, Date.now() + 60000);
        placeSealedBid(agent.id, serviceType, encrypted, bidAmount);
      } catch {
        // BITE unavailable — store with placeholder encryption
        placeSealedBid(
          agent.id,
          serviceType,
          JSON.stringify({ encrypted: '0x' + bidAmount.toString(16), placeholder: true }),
          bidAmount
        );
      }
    }
  }
}

export function clearOrderbook(
  currentAsks: OrderbookAsk[],
  currentBids: Map<string, SealedBidEntry[]>,
  agents: Agent[]
): ClearingMatch[] {
  const serviceTypes = [...new Set(currentAsks.map((a) => a.provider.serviceType))];
  const matches: ClearingMatch[] = [];

  for (const serviceType of serviceTypes) {
    const typeBids = currentBids.get(serviceType);
    if (!typeBids || typeBids.length === 0) continue;

    // Cheapest ask (provider with lowest base price)
    const typeProviders = currentAsks
      .filter((a) => a.provider.serviceType === serviceType)
      .sort((a, b) => Number(a.provider.basePrice - b.provider.basePrice));

    if (typeProviders.length === 0) continue;
    const bestProvider = typeProviders[0].provider;

    // Highest bid wins
    let highestBid = BigInt(0);
    let winnerId = '';
    for (const bid of typeBids) {
      if (bid.amount > highestBid) {
        highestBid = bid.amount;
        winnerId = bid.agentId;
      }
    }

    const winnerAgent = agents.find((a) => a.id === winnerId);
    matches.push({
      serviceType,
      provider: bestProvider,
      winner: {
        agentId: winnerId,
        agentName: winnerAgent?.name || winnerId,
        amount: highestBid,
      },
    });
  }

  return matches;
}

export function getAsks(): OrderbookAsk[] {
  return asks;
}

export function getBids(): Map<string, SealedBidEntry[]> {
  return bids;
}

export function getBidCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [serviceType, entries] of bids) {
    counts.set(serviceType, entries.length);
  }
  return counts;
}

export function resetBids(): void {
  bids = new Map();
}
