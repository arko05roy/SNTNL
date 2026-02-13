'use client';

import type { Agent, Auction, ServiceProvider } from '@/types';
import { getExplorerTxUrl } from '@/lib/contracts';

interface AuctionResultsProps {
  auction: Auction;
  agents: Agent[];
  provider?: ServiceProvider;
}

export function AuctionResults({ auction, agents, provider }: AuctionResultsProps) {
  const sortedBids = [...auction.bids].sort((a, b) => Number(b.amount - a.amount));

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Auction Results</h2>
          <p className="text-gray-400 text-sm">{auction.serviceType}</p>
        </div>
        <div className="flex items-center gap-6">
          {provider && (
            <div className="text-right">
              <div className="text-xs text-gray-500">Provider Secured</div>
              <div className="text-sm font-medium text-cyan-400">{provider.name}</div>
              <div className="text-xs text-gray-500 font-mono">
                {provider.address.slice(0, 8)}...{provider.address.slice(-4)}
              </div>
            </div>
          )}
          {auction.onChainId !== undefined && (
            <div className="text-right">
              <div className="text-xs text-gray-500">On-Chain ID</div>
              <div className="font-mono text-sm text-blue-400">#{auction.onChainId}</div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {sortedBids.map((bid, i) => {
          const agent = agents.find((a) => a.id === bid.agentId);
          const isWinner = auction.winner === bid.agentId;
          return (
            <div
              key={i}
              className={`flex items-center justify-between p-4 rounded-lg transition-all duration-300 ${
                isWinner
                  ? 'bg-green-500/15 border-2 border-green-500/50 scale-[1.01] shadow-lg shadow-green-500/10'
                  : 'bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                {isWinner && <span className="text-lg">&#9733;</span>}
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: agent?.color }}
                />
                <div>
                  <span className="font-medium">{agent?.name}</span>
                  <span className="text-xs text-gray-500 ml-2">{agent?.strategy}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  {isWinner ? (
                    <>
                      <div className="text-2xl font-bold text-green-400">
                        {(Number(bid.amount) / 1000).toFixed(1)}k
                      </div>
                      <div className="text-xs text-gray-500">tokens</div>
                    </>
                  ) : (
                    <>
                      <div className="font-mono text-sm text-amber-500/70">
                        {bid.encrypted.slice(0, 16)}...
                      </div>
                      <div className="text-xs text-amber-600/60 uppercase tracking-wider">
                        🔒 Sealed Forever
                      </div>
                    </>
                  )}
                </div>
                {bid.txHash && (
                  <a
                    href={getExplorerTxUrl(bid.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    [bid tx]
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {auction.createTxHash && (
        <div className="mt-4 pt-4 border-t border-white/10 flex gap-4 text-xs">
          <a href={getExplorerTxUrl(auction.createTxHash)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
            Create Tx
          </a>
          {auction.finalizeTxHash && (
            <a href={getExplorerTxUrl(auction.finalizeTxHash)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
              Finalize Tx
            </a>
          )}
        </div>
      )}
    </div>
  );
}
