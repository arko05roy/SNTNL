'use client';

import type { Agent } from '@/types';
import { getExplorerAddressUrl } from '@/lib/contracts';

interface AgentCardProps {
  agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <div
      className="rounded border px-3 py-2.5 transition-colors hover:!bg-[#0f1830]"
      style={{
        background: '#0c1220',
        borderColor: agent.color + '25',
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: agent.color }} />
        <span className="font-mono text-[11px] font-semibold text-gray-200">{agent.name}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-wider text-gray-600">{agent.strategy}</span>
        <span className="font-mono text-[10px] text-gray-600">
          {(Number(agent.balance) / 1000).toFixed(0)}k
        </span>
      </div>
      <a
        href={getExplorerAddressUrl(agent.address)}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[9px] text-gray-700 hover:text-cyan-500 truncate block mt-1 transition-colors"
      >
        {agent.address.slice(0, 6)}...{agent.address.slice(-4)}
      </a>
    </div>
  );
}
