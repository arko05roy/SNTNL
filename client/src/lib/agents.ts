/**
 * Agent Manager with Real Wallets and Bidding Strategies
 */

import { Agent, BiddingStrategy } from '@/types';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const AGENT_NAMES = [
  'AlphaBot', 'BetaAI', 'GammaAgent', 'DeltaBot', 'EpsilonAI'
];

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6'  // violet
];

export class AgentManager {
  private agents: Agent[] = [];

  /**
   * Initialize agents with real wallets (private keys for x402 signing)
   */
  async initializeAgents(count: number = 5): Promise<Agent[]> {
    this.agents = [];
    const strategies: BiddingStrategy[] = ['conservative', 'aggressive', 'random'];

    for (let i = 0; i < count; i++) {
      const privateKey = generatePrivateKey();
      const account = privateKeyToAccount(privateKey);

      this.agents.push({
        id: `agent-${i}`,
        name: AGENT_NAMES[i] || `Agent ${i + 1}`,
        address: account.address,
        privateKey,
        balance: BigInt(1000000),
        strategy: strategies[i % 3],
        color: COLORS[i] || '#6b7280'
      });
    }

    console.log(`[AgentManager] Initialized ${count} agents with real wallets`);
    return this.agents;
  }

  /**
   * Calculate bid based on agent strategy
   */
  calculateBid(
    agent: Agent,
    marketPrice: bigint,
    maxBid: bigint
  ): bigint {
    const minBid = marketPrice * BigInt(80) / BigInt(100);

    switch (agent.strategy) {
      case 'conservative':
        // Bid slightly below market (90-95%)
        const conservativeFactor = 90 + Math.floor(Math.random() * 5);
        return marketPrice * BigInt(conservativeFactor) / BigInt(100);

      case 'aggressive':
        // Bid above market, approaching max (105-120%)
        const aggressiveFactor = 105 + Math.floor(Math.random() * 15);
        const aggressiveBid = marketPrice * BigInt(aggressiveFactor) / BigInt(100);
        return aggressiveBid > maxBid ? maxBid : aggressiveBid;

      case 'random':
        // Random between min and max
        const range = maxBid - minBid;
        const randomFactor = Math.random();
        return minBid + BigInt(Math.floor(Number(range) * randomFactor));

      default:
        return marketPrice;
    }
  }

  /**
   * Simulate agent decision to participate in auction
   * Agents decide based on:
   * - Service type match
   * - Budget availability
   * - Random chance (simulates availability)
   */
  shouldParticipate(agent: Agent, serviceType: string): boolean {
    // Conservative agents participate less (60%)
    if (agent.strategy === 'conservative') {
      return Math.random() > 0.4;
    }

    // Aggressive agents participate more (90%)
    if (agent.strategy === 'aggressive') {
      return Math.random() > 0.1;
    }

    // Random strategy: 70% participation
    return Math.random() > 0.3;
  }

  /**
   * Update agent balance after auction
   */
  updateBalance(agentId: string, newBalance: bigint): void {
    const agent = this.agents.find(a => a.id === agentId);
    if (agent) {
      agent.balance = newBalance;
    }
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): Agent | undefined {
    return this.agents.find(a => a.id === id);
  }

  /**
   * Get all agents
   */
  getAgents(): Agent[] {
    return this.agents;
  }

}

// Singleton
let agentManager: AgentManager | null = null;

export function getAgentManager(): AgentManager {
  if (!agentManager) {
    agentManager = new AgentManager();
  }
  return agentManager;
}
