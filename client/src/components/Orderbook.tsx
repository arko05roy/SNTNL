'use client';

import { useState, useEffect } from 'react';
import type { OrderbookAsk, ClearingResult } from '@/types';

interface OrderbookProps {
  asks: OrderbookAsk[];
  sealedBidCounts: Map<string, number>;
  biteAvailable: boolean;
  onClear: () => void;
  clearing: boolean;
  lastResult?: ClearingResult;
}

const SERVICE_ICONS: Record<string, string> = {
  'GPU Compute': 'GPU',
  'Data Feed': 'DAT',
  'API Access': 'API',
};

export function Orderbook({ asks, sealedBidCounts, biteAvailable, onClear, clearing, lastResult }: OrderbookProps) {
  const [now, setNow] = useState(Date.now());

  // Tick every 10s so "time ago" updates
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(t);
  }, []);

  // Group asks by service type
  const grouped = new Map<string, OrderbookAsk[]>();
  for (const ask of asks) {
    const type = ask.provider.serviceType;
    const existing = grouped.get(type) || [];
    existing.push(ask);
    grouped.set(type, existing);
  }

  const serviceTypes = [...grouped.keys()];
  const totalBids = [...sealedBidCounts.values()].reduce((a, b) => a + b, 0);

  // Find max price for depth bar scaling
  const maxPrice = asks.reduce((max, a) => Math.max(max, Number(a.provider.basePrice)), 0);

  return (
    <div className="max-w-6xl mx-auto relative">
      {/* Terminal header bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5 rounded-t-lg border border-b-0"
        style={{ background: '#0c1220', borderColor: '#1a2540' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="font-mono text-[11px] text-gray-500 tracking-wide">
            SENTINEL://orderbook
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${biteAvailable ? 'bg-cyan-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="font-mono text-[10px] text-gray-500 uppercase tracking-wider">
              BITE {biteAvailable ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-gray-600">
            {totalBids} sealed
          </span>
        </div>
      </div>

      {/* Main book container */}
      <div
        className="border rounded-b-lg relative overflow-hidden noise-overlay scanline-effect"
        style={{ background: '#080e1a', borderColor: '#1a2540' }}
      >
        {/* Column headers */}
        <div className="grid grid-cols-2">
          <div className="px-4 py-2 border-b border-r" style={{ borderColor: '#1a2540' }}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-cyan-500/80 uppercase tracking-[0.2em]">
                Asks — Providers
              </span>
              <span className="font-mono text-[10px] text-gray-600">
                {asks.length} listed
              </span>
            </div>
          </div>
          <div className="px-4 py-2 border-b" style={{ borderColor: '#1a2540' }}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-amber-500/80 uppercase tracking-[0.2em]">
                Sealed Bids — Encrypted
              </span>
              <span className="font-mono text-[10px] text-gray-600">
                {totalBids} total
              </span>
            </div>
          </div>
        </div>

        {/* Book rows - side by side */}
        <div className="grid grid-cols-2 relative" style={{ zIndex: 2 }}>
          {/* LEFT: ASKS */}
          <div className="border-r" style={{ borderColor: '#1a2540' }}>
            {serviceTypes.map((type, typeIdx) => (
              <div key={type}>
                {/* Service type divider */}
                <div
                  className="px-4 py-1.5 flex items-center gap-2 border-b"
                  style={{ background: '#0a1020', borderColor: '#141e35' }}
                >
                  <span
                    className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: '#162040', color: '#4db8db' }}
                  >
                    {SERVICE_ICONS[type] || type.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="text-[11px] font-medium text-gray-400">{type}</span>
                </div>

                {/* Provider rows */}
                {(grouped.get(type) || []).map((ask, rowIdx) => {
                  const price = Number(ask.provider.basePrice);
                  const depthPct = maxPrice > 0 ? (price / maxPrice) * 100 : 0;

                  return (
                    <div
                      key={ask.provider.address}
                      className="group relative px-4 py-2 border-b transition-colors hover:!bg-[#0f1830]"
                      style={{
                        borderColor: '#141e35',
                        animationDelay: `${typeIdx * 100 + rowIdx * 50}ms`,
                      }}
                    >
                      {/* Depth bar background */}
                      <div
                        className="absolute inset-y-0 right-0 animate-depth-fill origin-right"
                        style={{
                          width: `${depthPct}%`,
                          background: 'linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.04))',
                          animationDelay: `${typeIdx * 100 + rowIdx * 50 + 200}ms`,
                        }}
                      />

                      <div className="relative flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-[12px] font-medium text-gray-200 truncate">
                            {ask.provider.name}
                          </span>
                          <span className="font-mono text-[10px] text-gray-600 shrink-0">
                            {ask.provider.address.slice(0, 6)}..{ask.provider.address.slice(-3)}
                          </span>
                        </div>
                        <span className="font-mono text-[13px] tabular-nums text-cyan-400 font-medium shrink-0">
                          {(price / 1000).toFixed(0)}k
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* RIGHT: SEALED BIDS */}
          <div>
            {serviceTypes.map((type, typeIdx) => {
              const count = sealedBidCounts.get(type) || 0;
              const asksForType = grouped.get(type) || [];

              return (
                <div key={type}>
                  {/* Service type divider */}
                  <div
                    className="px-4 py-1.5 flex items-center gap-2 border-b"
                    style={{ background: '#0a1020', borderColor: '#141e35' }}
                  >
                    <span
                      className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ background: '#2a1f0a', color: '#d4a017' }}
                    >
                      BID
                    </span>
                    <span className="text-[11px] font-medium text-gray-400">{type}</span>
                  </div>

                  {/* Bid summary row - matches height of ask rows */}
                  <div
                    className="border-b"
                    style={{ borderColor: '#141e35' }}
                  >
                    {/* Main bid info row */}
                    <div className="px-4 py-2 animate-shimmer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] tabular-nums text-amber-400 font-semibold">
                            {count}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            sealed bid{count !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-amber-500/60 animate-pulse" />
                          <span
                            className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d4a017' }}
                          >
                            encrypted
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Depth indicator rows to fill remaining height */}
                    {asksForType.slice(1).map((_, i) => (
                      <div key={i} className="px-4 py-2 border-t" style={{ borderColor: '#141e35' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {Array.from({ length: Math.min(count, 5) }).map((_, j) => (
                              <div
                                key={j}
                                className="w-1.5 h-3 rounded-[1px]"
                                style={{
                                  background: `rgba(245, 158, 11, ${0.15 + j * 0.08})`,
                                }}
                              />
                            ))}
                          </div>
                          <span className="font-mono text-[10px] text-gray-600">
                            depth: ???
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spread / summary bar */}
        <div
          className="px-4 py-2.5 border-t flex items-center justify-between"
          style={{ background: '#0a1020', borderColor: '#1a2540', zIndex: 2, position: 'relative' }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-gray-600 uppercase">Markets</span>
              <span className="font-mono text-[11px] text-gray-400">{serviceTypes.length}</span>
            </div>
            <div className="w-px h-3 bg-gray-800" />
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-gray-600 uppercase">Providers</span>
              <span className="font-mono text-[11px] text-gray-400">{asks.length}</span>
            </div>
            <div className="w-px h-3 bg-gray-800" />
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-gray-600 uppercase">Bids</span>
              <span className="font-mono text-[11px] text-amber-400">{totalBids}</span>
            </div>
          </div>
          {lastResult && (
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span className="text-gray-600">LAST CLEAR</span>
              <span className="text-gray-500">{formatTimeAgo(lastResult.timestamp, now)}</span>
              <span className="text-green-500">{lastResult.matches.length} matched</span>
              <span className="text-cyan-500/70">
                {(lastResult.matches.reduce((s, m) => s + Number(m.winner.amount), 0) / 1000).toFixed(0)}k vol
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Clear action */}
      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          onClick={onClear}
          disabled={clearing || totalBids === 0}
          className={`
            group relative font-mono text-sm font-semibold uppercase tracking-[0.15em] px-12 py-3.5 rounded
            transition-all duration-200
            ${clearing || totalBids === 0
              ? 'bg-gray-800/50 text-gray-600 border border-gray-800 cursor-not-allowed'
              : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 hover:border-cyan-400/50 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] active:scale-[0.98]'
            }
          `}
        >
          {clearing ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-gray-500 border-t-gray-400 rounded-full animate-spin" />
              Clearing...
            </span>
          ) : (
            <>
              <span className="relative z-10">Clear Orderbook</span>
              {totalBids > 0 && (
                <span className="absolute inset-0 rounded bg-cyan-400/5 animate-pulse-glow" />
              )}
            </>
          )}
        </button>
        <span className="font-mono text-[10px] text-gray-600 tracking-wider">
          REVEAL + MATCH + SETTLE
        </span>
      </div>
    </div>
  );
}

function formatTimeAgo(ts: number, now: number): string {
  const seconds = Math.floor((now - ts) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m`;
}
