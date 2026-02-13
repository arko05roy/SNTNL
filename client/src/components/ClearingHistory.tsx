'use client';

import { useState, useEffect } from 'react';
import type { ClearingResult, Agent } from '@/types';

interface ClearingHistoryProps {
  history: ClearingResult[];
  agents: Agent[];
}

export function ClearingHistory({ history, agents }: ClearingHistoryProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  if (history.length === 0) return null;

  const allMatches = history.flatMap((result) =>
    result.matches.map((match, i) => ({ match, timestamp: result.timestamp, idx: i }))
  );

  return (
    <div className="max-w-6xl mx-auto mt-8">
      {/* Section header */}
      <div
        className="rounded-t border border-b-0 px-4 py-2 flex items-center justify-between"
        style={{ background: '#0c1220', borderColor: '#1a2540' }}
      >
        <span className="font-mono text-[10px] text-gray-500 uppercase tracking-[0.2em]">
          Clearing History
        </span>
        <span className="font-mono text-[10px] text-gray-600">
          {allMatches.length} fill{allMatches.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table header row */}
      <div
        className="grid border-x px-4 py-1.5"
        style={{
          gridTemplateColumns: '80px 1fr 1fr 80px 60px',
          background: '#0a1020',
          borderColor: '#1a2540',
        }}
      >
        <span className="font-mono text-[9px] text-gray-600 uppercase">Market</span>
        <span className="font-mono text-[9px] text-gray-600 uppercase">Provider</span>
        <span className="font-mono text-[9px] text-gray-600 uppercase">Winner</span>
        <span className="font-mono text-[9px] text-gray-600 uppercase text-right">Amount</span>
        <span className="font-mono text-[9px] text-gray-600 uppercase text-right">Time</span>
      </div>

      {/* Rows */}
      <div
        className="border rounded-b overflow-hidden"
        style={{ background: '#080e1a', borderColor: '#1a2540' }}
      >
        {allMatches.map(({ match, timestamp, idx }) => {
          const agent = agents.find((a) => a.id === match.winner.agentId);
          const seconds = Math.floor((now - timestamp) / 1000);
          const timeAgo = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m`;

          return (
            <div
              key={`${timestamp}-${idx}`}
              className="grid px-4 py-2 border-b transition-colors hover:!bg-[#0f1830]"
              style={{
                gridTemplateColumns: '80px 1fr 1fr 80px 60px',
                borderColor: '#141e35',
              }}
            >
              <span
                className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded self-center w-fit"
                style={{ background: '#162040', color: '#4db8db' }}
              >
                {match.serviceType === 'GPU Compute' ? 'GPU' : match.serviceType === 'Data Feed' ? 'DAT' : 'API'}
              </span>
              <span className="text-[11px] text-cyan-400/80 self-center truncate">
                {match.provider.name}
              </span>
              <div className="flex items-center gap-1.5 self-center">
                {agent && (
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: agent.color }}
                  />
                )}
                <span className="text-[11px] text-gray-300 truncate">
                  {match.winner.agentName}
                </span>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-green-400 self-center text-right">
                {(Number(match.winner.amount) / 1000).toFixed(1)}k
              </span>
              <span className="font-mono text-[10px] text-gray-600 self-center text-right">
                {timeAgo}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
