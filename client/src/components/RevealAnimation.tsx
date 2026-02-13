'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Agent, Bid } from '@/types';
import { getExplorerTxUrl } from '@/lib/contracts';

interface RevealAnimationProps {
  bids: Bid[];
  agents: Agent[];
  winnerId?: string; // Only this bid will be revealed
  onRevealComplete: () => void;
}

type RevealState = 'encrypted' | 'scrambling' | 'revealed';

const SCRAMBLE_CHARS = '0123456789abcdef!@#$%^&*';

function randomScramble(len: number): string {
  return Array.from({ length: len }, () =>
    SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
  ).join('');
}

export function RevealAnimation({ bids, agents, winnerId, onRevealComplete }: RevealAnimationProps) {
  const [revealStates, setRevealStates] = useState<RevealState[]>(
    bids.map(() => 'encrypted')
  );
  const [scrambleTexts, setScrambleTexts] = useState<string[]>(
    bids.map((b) => b.encrypted.slice(0, 16))
  );
  const [revealStarted, setRevealStarted] = useState(false);

  // Only reveal the winner after a short delay
  useEffect(() => {
    if (!revealStarted && winnerId) {
      const winnerIndex = bids.findIndex(b => b.agentId === winnerId);
      if (winnerIndex === -1) {
        // No winner found, complete immediately
        setTimeout(onRevealComplete, 500);
        return;
      }

      setRevealStarted(true);

      // Start scrambling animation for winner
      setTimeout(() => {
        setRevealStates((prev) => {
          const next = [...prev];
          next[winnerIndex] = 'scrambling';
          return next;
        });

        // Scramble for 800ms
        const scrambleInterval = setInterval(() => {
          setScrambleTexts((prev) => {
            const next = [...prev];
            next[winnerIndex] = randomScramble(12);
            return next;
          });
        }, 50);

        setTimeout(() => {
          clearInterval(scrambleInterval);
          setRevealStates((prev) => {
            const next = [...prev];
            next[winnerIndex] = 'revealed';
            return next;
          });
          // Complete after reveal animation
          setTimeout(onRevealComplete, 1200);
        }, 800);
      }, 1000);
    } else if (!winnerId) {
      // No winner specified, complete immediately
      setTimeout(onRevealComplete, 500);
    }
  }, [revealStarted, winnerId, bids, onRevealComplete]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
      <h2 className="text-2xl font-bold mb-2">Revealing Winner</h2>
      <p className="text-gray-400 text-sm mb-6">Decrypting BITE-encrypted winner bid... Losing bids stay sealed forever.</p>

      <div className="space-y-3">
        {bids.map((bid, i) => {
          const agent = agents.find((a) => a.id === bid.agentId);
          const state = revealStates[i];
          const amount = (Number(bid.amount) / 1000).toFixed(1);

          return (
            <div
              key={i}
              className={`flex items-center justify-between p-4 rounded-lg transition-all duration-500 ${
                state === 'revealed'
                  ? 'bg-white/10 border border-white/20'
                  : state === 'scrambling'
                  ? 'bg-yellow-500/10 border border-yellow-500/30'
                  : 'bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: agent?.color }}
                />
                <span className="font-medium">{agent?.name}</span>
              </div>

              <div className="flex items-center gap-3">
                {state === 'encrypted' && (
                  <>
                    <span className="text-amber-500/70 text-sm font-mono">
                      {bid.encrypted.slice(0, 20)}...
                    </span>
                    <span className="text-xs text-amber-600/60 uppercase tracking-wider">
                      🔒 Sealed
                    </span>
                  </>
                )}
                {state === 'scrambling' && (
                  <span className="text-yellow-400 text-sm font-mono animate-pulse">
                    {scrambleTexts[i]}
                  </span>
                )}
                {state === 'revealed' && (
                  <>
                    <span className="text-green-400 text-2xl font-bold animate-[scaleIn_0.3s_ease-out]">
                      {amount}k
                    </span>
                    <span className="text-xs text-green-500/70 uppercase tracking-wider ml-2">
                      Winner
                    </span>
                  </>
                )}
                {bid.revealTxHash && (
                  <a
                    href={getExplorerTxUrl(bid.revealTxHash)}
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
