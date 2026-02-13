'use client';

import { useEffect, useState } from 'react';
import type { Agent, Bid } from '@/types';
import { getExplorerTxUrl } from '@/lib/contracts';

interface BidSubmissionProps {
  bids: Bid[];
  agents: Agent[];
  serviceType: string;
  timeLeft: number;
}

export function BidSubmission({ bids, agents, serviceType, timeLeft }: BidSubmissionProps) {
  const [visibleBids, setVisibleBids] = useState<number>(0);

  useEffect(() => {
    // Stagger bid appearances
    if (visibleBids < bids.length) {
      const timer = setTimeout(() => setVisibleBids((v) => v + 1), 400);
      return () => clearTimeout(timer);
    }
  }, [visibleBids, bids.length]);

  // Reset when bids change
  useEffect(() => {
    setVisibleBids(0);
  }, [bids.length === 0]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Auction in Progress</h2>
          <p className="text-gray-400 text-sm">{serviceType}</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-red-400 mb-1">Time Remaining</div>
          <div className={`text-4xl font-bold font-mono tabular-nums ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-white'}`}>
            {timeLeft}s
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {bids.map((bid, i) => {
          const agent = agents.find((a) => a.id === bid.agentId);
          const isVisible = i < visibleBids;
          return (
            <div
              key={i}
              className={`flex items-center justify-between bg-white/5 rounded-lg p-3.5 transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full ring-2 ring-offset-1 ring-offset-gray-900"
                  style={{ backgroundColor: agent?.color }}
                />
                <span className="font-medium">{agent?.name}</span>
                <span className="text-xs text-gray-500">{agent?.address.slice(0, 10)}...</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400 text-xs font-mono bg-green-400/10 px-2 py-1 rounded">
                  {bid.encrypted.slice(0, 24)}... [ENCRYPTED]
                </span>
                {bid.txHash && (
                  <a
                    href={getExplorerTxUrl(bid.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    tx
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
