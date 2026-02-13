'use client';

import { useState } from 'react';
import type { ServiceType, AuctionHistory } from '@/types';
import { getAveragePrice } from '@/lib/providers';

interface AuctionSetupProps {
  agentCount: number;
  loading: boolean;
  onLaunch: (serviceType: ServiceType) => void;
  history: AuctionHistory[];
}

const SERVICE_TYPES: { type: ServiceType; icon: string; desc: string }[] = [
  { type: 'GPU Compute', icon: '[ GPU ]', desc: 'High-performance compute' },
  { type: 'Data Feed', icon: '[ DATA ]', desc: 'Real-time data streams' },
  { type: 'API Access', icon: '[ API ]', desc: 'API endpoint access' },
];

export function AuctionSetup({ agentCount, loading, onLaunch, history }: AuctionSetupProps) {
  const [selected, setSelected] = useState<ServiceType>('GPU Compute');

  return (
    <div className="text-center py-12">
      <h2 className="text-3xl font-bold mb-2">Select Service Type</h2>
      <p className="text-gray-400 mb-8">
        {agentCount} AI agents with wallets will compete in a BITE-encrypted sealed-bid auction
      </p>

      <div className="flex justify-center gap-4 mb-8">
        {SERVICE_TYPES.map(({ type, icon, desc }) => {
          const avgPrice = getAveragePrice(type);
          const isSelected = selected === type;
          return (
            <button
              key={type}
              onClick={() => setSelected(type)}
              className={`p-5 rounded-xl border-2 transition-all w-52 text-left ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="text-lg font-mono mb-1 text-blue-400">{icon}</div>
              <div className="font-semibold mb-1">{type}</div>
              <div className="text-xs text-gray-400 mb-2">{desc}</div>
              <div className="text-xs text-gray-500">
                Avg: {(Number(avgPrice) / 1000).toFixed(0)}k tokens
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => onLaunch(selected)}
        disabled={loading || agentCount === 0}
        className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 px-10 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        {loading ? 'Initializing...' : `Launch ${selected} Auction`}
      </button>

      {history.length > 0 && (
        <div className="mt-12 max-w-2xl mx-auto text-left">
          <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-3">Auction History</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3 text-sm">
                <span className="text-gray-300">{h.auction.serviceType}</span>
                <span className="text-gray-500">
                  Winner: {h.auction.winner?.slice(0, 8)}...
                </span>
                <span className="font-mono text-green-400">
                  {h.auction.winningBid ? `${(Number(h.auction.winningBid) / 1000).toFixed(1)}k` : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
