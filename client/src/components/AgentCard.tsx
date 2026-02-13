'use client';

import type { Agent } from '@/types';
import { getExplorerAddressUrl } from '@/lib/contracts';

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <div
      className="bg-white/5 border rounded-xl p-4 hover:bg-white/[0.07] transition-all"
      style={{ borderColor: agent.color + '40' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: agent.color }} />
        <span className="font-semibold text-sm">{agent.name}</span>
      </div>
      <div className="text-xs text-gray-400 capitalize mb-2">{agent.strategy}</div>
      <a
        href={getExplorerAddressUrl(agent.address)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-gray-500 hover:text-blue-400 truncate block font-mono"
      >
        {agent.address.slice(0, 6)}...{agent.address.slice(-4)}
      </a>
      <div className="text-xs text-gray-600 mt-1">
        {(Number(agent.balance) / 1000).toFixed(0)}k tokens
      </div>
    </div>
  );
}
