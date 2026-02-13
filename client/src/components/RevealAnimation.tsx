'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Agent, Bid } from '@/types';
import { getExplorerTxUrl } from '@/lib/contracts';

interface RevealAnimationProps {
  bids: Bid[];
  agents: Agent[];
  onRevealComplete: () => void;
}

type RevealState = 'encrypted' | 'scrambling' | 'revealed';

const SCRAMBLE_CHARS = '0123456789abcdef!@#$%^&*';

function randomScramble(len: number): string {
  return Array.from({ length: len }, () =>
    SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
  ).join('');
}

export function RevealAnimation({ bids, agents, onRevealComplete }: RevealAnimationProps) {
  const [revealStates, setRevealStates] = useState<RevealState[]>(
    bids.map(() => 'encrypted')
  );
  const [scrambleTexts, setScrambleTexts] = useState<string[]>(
    bids.map((b) => b.encrypted.slice(0, 16))
  );
  const [currentReveal, setCurrentReveal] = useState(-1);

  // Stagger reveals with 1s delay
  useEffect(() => {
    if (currentReveal < bids.length - 1) {
      const timer = setTimeout(() => setCurrentReveal((c) => c + 1), 1000);
      return () => clearTimeout(timer);
    } else if (currentReveal === bids.length - 1) {
      // Wait for last animation to finish, then signal complete
      const timer = setTimeout(onRevealComplete, 1200);
      return () => clearTimeout(timer);
    }
  }, [currentReveal, bids.length, onRevealComplete]);

  // Scramble animation for current reveal
  useEffect(() => {
    if (currentReveal < 0) return;

    setRevealStates((prev) => {
      const next = [...prev];
      next[currentReveal] = 'scrambling';
      return next;
    });

    // Scramble for 800ms
    const scrambleInterval = setInterval(() => {
      setScrambleTexts((prev) => {
        const next = [...prev];
        next[currentReveal] = randomScramble(12);
        return next;
      });
    }, 50);

    const revealTimer = setTimeout(() => {
      clearInterval(scrambleInterval);
      setRevealStates((prev) => {
        const next = [...prev];
        next[currentReveal] = 'revealed';
        return next;
      });
    }, 800);

    return () => {
      clearInterval(scrambleInterval);
      clearTimeout(revealTimer);
    };
  }, [currentReveal]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-sm">
      <h2 className="text-2xl font-bold mb-2">Revealing Bids</h2>
      <p className="text-gray-400 text-sm mb-6">Decrypting BITE-encrypted bids...</p>

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
                  <span className="text-green-400 text-sm font-mono opacity-50">
                    {bid.encrypted.slice(0, 20)}...
                  </span>
                )}
                {state === 'scrambling' && (
                  <span className="text-yellow-400 text-sm font-mono animate-pulse">
                    {scrambleTexts[i]}
                  </span>
                )}
                {state === 'revealed' && (
                  <span className="text-white text-2xl font-bold animate-[scaleIn_0.3s_ease-out]">
                    {amount}k
                  </span>
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
