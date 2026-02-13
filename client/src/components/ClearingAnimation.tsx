'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ClearingMatch, Agent } from '@/types';

interface ClearingAnimationProps {
  matches: ClearingMatch[];
  agents: Agent[];
  onComplete: () => void;
}

type Step = 'matching' | 'revealing' | 'results';

const GLITCH_CHARS = '0123456789abcdef!@#$%^&*';

function useGlitchText(target: string, active: boolean, duration = 600): string {
  const [text, setText] = useState('');
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setText('');
      return;
    }

    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);

      let result = '';
      for (let i = 0; i < target.length; i++) {
        if (i / target.length < progress) {
          result += target[i];
        } else {
          result += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
      }
      setText(result);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [active, target, duration]);

  return text;
}

function MatchRow({
  match,
  agent,
  revealed,
  index,
}: {
  match: ClearingMatch;
  agent?: Agent;
  revealed: boolean;
  index: number;
}) {
  const amountStr = `${(Number(match.winner.amount) / 1000).toFixed(1)}k`;
  const glitchedAmount = useGlitchText(amountStr, revealed);

  return (
    <div
      className="animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div
        className={`
          relative overflow-hidden rounded border transition-all duration-500
          ${revealed
            ? 'border-green-500/30'
            : 'border-gray-800'
          }
        `}
        style={{ background: revealed ? '#071a12' : '#0a0f1a' }}
      >
        {/* Green sweep on reveal */}
        {revealed && (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.15), transparent)',
              animation: 'shimmer 1s ease-out forwards',
              backgroundSize: '200% 100%',
            }}
          />
        )}

        <div className="relative px-4 py-3 flex items-center justify-between">
          {/* Left: service → provider */}
          <div className="flex items-center gap-3">
            <span
              className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0"
              style={{ background: '#162040', color: '#4db8db' }}
            >
              {match.serviceType === 'GPU Compute' ? 'GPU' : match.serviceType === 'Data Feed' ? 'DAT' : 'API'}
            </span>
            <span className="text-[12px] text-gray-400">{match.serviceType}</span>
            <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-[12px] text-cyan-400 font-medium">{match.provider.name}</span>
          </div>

          {/* Right: winner + amount */}
          <div className="flex items-center gap-4">
            {revealed ? (
              <>
                <div className="flex items-center gap-1.5">
                  {agent && (
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: agent.color }}
                    />
                  )}
                  <span className="text-[12px] text-gray-200 font-medium">
                    {match.winner.agentName}
                  </span>
                </div>
                <span className="font-mono text-[14px] tabular-nums text-green-400 font-semibold animate-decrypt-glitch">
                  {glitchedAmount}
                </span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-4 rounded-[1px] bg-amber-500/30 animate-pulse"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[11px] text-amber-500/60">
                  BITE decrypting...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Payment tx hash */}
        {revealed && match.paymentTxHash && (
          <div
            className="px-4 py-1.5 border-t font-mono text-[10px] text-gray-600"
            style={{ borderColor: '#0f2a1a' }}
          >
            x402 &#8594; {match.paymentTxHash.slice(0, 24)}...
          </div>
        )}
      </div>
    </div>
  );
}

export function ClearingAnimation({ matches, agents, onComplete }: ClearingAnimationProps) {
  const [step, setStep] = useState<Step>('matching');
  const [revealedIndex, setRevealedIndex] = useState(-1);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const t1 = setTimeout(() => setStep('revealing'), 600);

    const revealTimers: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < matches.length; i++) {
      revealTimers.push(
        setTimeout(() => setRevealedIndex(i), 600 + (i + 1) * 700)
      );
    }

    const totalRevealTime = 600 + matches.length * 700 + 500;
    const t3 = setTimeout(() => setStep('results'), totalRevealTime);
    const t4 = setTimeout(() => onCompleteRef.current(), totalRevealTime + 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t3);
      clearTimeout(t4);
      revealTimers.forEach(clearTimeout);
    };
  }, [matches]);

  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* Terminal-style header */}
      <div
        className="rounded-t border border-b-0 px-4 py-2.5 flex items-center justify-between"
        style={{ background: '#0c1220', borderColor: '#1a2540' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          </div>
          <span className="font-mono text-[11px] text-gray-500">
            SENTINEL://clearing-engine
          </span>
        </div>
        <span className={`font-mono text-[10px] uppercase tracking-wider ${
          step === 'results' ? 'text-green-500' : 'text-amber-500'
        }`}>
          {step === 'matching' && 'MATCHING...'}
          {step === 'revealing' && `BITE DECRYPT ${revealedIndex + 1}/${matches.length}`}
          {step === 'results' && 'COMPLETE'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] relative" style={{ background: '#1a2540' }}>
        <div
          className="absolute inset-y-0 left-0 transition-all duration-500"
          style={{
            width: step === 'matching'
              ? '10%'
              : step === 'revealing'
              ? `${10 + ((revealedIndex + 1) / matches.length) * 80}%`
              : '100%',
            background: step === 'results'
              ? 'linear-gradient(90deg, #065f46, #10b981)'
              : 'linear-gradient(90deg, #78350f, #f59e0b)',
          }}
        />
      </div>

      {/* Matches area */}
      <div
        className="border border-t-0 rounded-b relative overflow-hidden"
        style={{ background: '#080e1a', borderColor: '#1a2540' }}
      >
        <div className="p-4 space-y-2">
          {matches.map((match, i) => {
            const agent = agents.find((a) => a.id === match.winner.agentId);
            return (
              <MatchRow
                key={match.serviceType}
                match={match}
                agent={agent}
                revealed={revealedIndex >= i}
                index={i}
              />
            );
          })}
        </div>

        {/* Summary footer */}
        {step === 'results' && (
          <div
            className="px-4 py-3 border-t flex items-center justify-between animate-fade-in-up"
            style={{ background: '#0a1020', borderColor: '#1a2540' }}
          >
            <div className="flex items-center gap-4 font-mono text-[10px]">
              <span className="text-green-500">{matches.length} MATCHED</span>
              <div className="w-px h-3 bg-gray-800" />
              <span className="text-amber-500/70">BITE DECRYPTED</span>
              <div className="w-px h-3 bg-gray-800" />
              <span className="text-blue-400/70">AP2 AUTHORIZED</span>
              <div className="w-px h-3 bg-gray-800" />
              <span className="text-cyan-500/70">
                {(matches.reduce((s, m) => s + Number(m.winner.amount), 0) / 1000).toFixed(0)}k x402 SETTLED
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
