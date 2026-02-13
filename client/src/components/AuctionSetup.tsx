'use client';

import { useState, useEffect } from 'react';
import type { ServiceType, ServiceProvider, Agent } from '@/types';
import { getAveragePrice, getProvidersForAuction } from '@/lib/providers';

interface AuctionSetupProps {
  agentCount: number;
  agents: Agent[];
  loading: boolean;
  onLaunch: (serviceType: ServiceType, provider: ServiceProvider) => void;
  buyerAddress?: string;
  isConnected: boolean;
}

const SERVICE_TYPES: { type: ServiceType; icon: string; desc: string }[] = [
  { type: 'GPU Compute', icon: '[ GPU ]', desc: 'High-performance compute' },
  { type: 'Data Feed', icon: '[ DATA ]', desc: 'Real-time data streams' },
  { type: 'API Access', icon: '[ API ]', desc: 'API endpoint access' },
];

export function AuctionSetup({ agentCount, agents, loading, onLaunch, buyerAddress, isConnected }: AuctionSetupProps) {
  const [selected, setSelected] = useState<ServiceType>('GPU Compute');
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [loadingProviders, setLoadingProviders] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingProviders(true);
    setSelectedProvider(null);
    getProvidersForAuction(selected).then((p) => {
      if (!cancelled) {
        setProviders(p);
        if (p.length > 0) setSelectedProvider(p[0]);
        setLoadingProviders(false);
      }
    });
    return () => { cancelled = true; };
  }, [selected]);

  return (
    <div className="text-center py-12">
      {/* Buyer identity */}
      {isConnected && buyerAddress ? (
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6 text-sm">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-gray-400">Buyer:</span>
          <span className="font-mono text-gray-200">
            {buyerAddress.slice(0, 6)}...{buyerAddress.slice(-4)}
          </span>
        </div>
      ) : (
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5 mb-6 text-sm">
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-yellow-300">Connect wallet to identify as buyer</span>
        </div>
      )}

      <h2 className="text-3xl font-bold mb-2">Select Service Type</h2>
      <p className="text-gray-400 mb-8">
        {agentCount} AI agents will compete in a BITE-encrypted sealed-bid auction
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

      {/* Available Providers */}
      {!loadingProviders && providers.length > 0 && (
        <div className="max-w-2xl mx-auto mb-8">
          <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-3">
            Available Providers for {selected}
          </h3>
          <div className="grid gap-2">
            {providers.map((p) => {
              const isChosen = selectedProvider?.address === p.address;
              return (
                <button
                  key={p.address}
                  onClick={() => setSelectedProvider(p)}
                  className={`flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all ${
                    isChosen
                      ? 'bg-blue-500/15 border border-blue-500/50'
                      : 'bg-white/5 border border-transparent hover:border-white/10'
                  }`}
                >
                  <div>
                    <span className="font-medium text-sm">{p.name}</span>
                    <span className="text-xs text-gray-500 ml-2 font-mono">
                      {p.address.slice(0, 8)}...{p.address.slice(-4)}
                    </span>
                  </div>
                  <span className="font-mono text-sm text-gray-300">
                    {(Number(p.basePrice) / 1000).toFixed(0)}k tokens
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Agent Preview */}
      {agents.length > 0 && (
        <div className="max-w-2xl mx-auto mb-8">
          <h3 className="text-sm uppercase tracking-wider text-gray-500 mb-3">
            Competing Agents
          </h3>
          <div className="flex justify-center gap-3 flex-wrap">
            {agents.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 text-sm"
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                <span className="text-gray-300">{a.name}</span>
                <span className="text-xs text-gray-500">{a.strategy}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={() => selectedProvider && onLaunch(selected, selectedProvider)}
        disabled={loading || agentCount === 0 || !selectedProvider}
        className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 px-10 py-4 rounded-xl text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
      >
        {loading
          ? 'Initializing...'
          : selectedProvider
          ? `Auction for ${selectedProvider.name}`
          : `Launch ${selected} Auction`}
      </button>
    </div>
  );
}
