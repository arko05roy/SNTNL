'use client';

import { useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BiteTraceEntry {
  ts: number;
  phase: 'encrypt' | 'submit' | 'condition' | 'decrypt' | 'execute' | 'receipt' | 'failure';
  label: string;
  detail?: string;
  /** Hex data to show as expandable blob */
  data?: string;
}

export interface BiteTraceGroup {
  serviceType: string;
  providerName: string;
  agentName: string;
  bidAmount: bigint;
  auctionId?: number;
  entries: BiteTraceEntry[];
  /** What stays encrypted */
  encryptedFields: string[];
  /** What condition unlocked execution */
  unlockCondition: string;
  /** How failure would be handled */
  failureHandling: string;
  /** Receipt: what executed and why */
  executionSummary: string;
}

interface Props {
  traces: BiteTraceGroup[];
}

// ---------------------------------------------------------------------------
// Phase styling
// ---------------------------------------------------------------------------

const PHASE_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  encrypt:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'ENCRYPT' },
  submit:    { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  label: 'SUBMIT' },
  condition: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  label: 'CONDITION' },
  decrypt:   { color: '#22d3ee', bg: 'rgba(34,211,238,0.1)',  label: 'DECRYPT' },
  execute:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'EXECUTE' },
  receipt:   { color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  label: 'RECEIPT' },
  failure:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'FAILURE' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BiteTraceLog({ traces }: Props) {
  const [expandedTrace, setExpandedTrace] = useState<number>(0);
  const [expandedBlobs, setExpandedBlobs] = useState<Set<string>>(new Set());
  const [showExplainer, setShowExplainer] = useState(true);

  const toggleBlob = (key: string) => {
    setExpandedBlobs(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* BITE Flow Explainer */}
      <div
        className="border rounded-lg overflow-hidden"
        style={{ borderColor: 'rgba(245,158,11,0.2)', background: 'rgba(5,10,20,0.8)' }}
      >
        <button
          onClick={() => setShowExplainer(!showExplainer)}
          className="w-full px-5 py-3.5 flex items-center justify-between"
          style={{ background: 'rgba(245,158,11,0.05)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold font-mono"
              style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
            >
              BITE
            </div>
            <div className="text-left">
              <div className="font-mono text-sm text-white">BITE v2 Encryption Trace</div>
              <div className="font-mono text-[10px] text-slate-500">Conditional encrypted execution — end-to-end flow</div>
            </div>
          </div>
          <span className="font-mono text-[10px] text-slate-500">{showExplainer ? '▼' : '▶'}</span>
        </button>

        {showExplainer && (
          <div className="px-5 py-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            {/* Flow diagram */}
            <div className="flex items-center gap-1.5 mb-5 flex-wrap">
              {[
                { label: 'Encrypted', sub: 'encryptTransaction + encryptMessage', color: '#f59e0b' },
                { label: 'Submitted', sub: 'opaque blob to BITE address', color: '#8b5cf6' },
                { label: 'Condition', sub: 'auction deadline reached', color: '#3b82f6' },
                { label: 'Decrypted', sub: 'BLS committee threshold', color: '#22d3ee' },
                { label: 'Executed', sub: 'submitBid runs on-chain', color: '#10b981' },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-1.5">
                  <div className="px-2.5 py-2 rounded text-center" style={{ background: `${step.color}10`, border: `1px solid ${step.color}30` }}>
                    <div className="font-mono text-[11px] font-semibold" style={{ color: step.color }}>{step.label}</div>
                    <div className="font-mono text-[8px] text-slate-500 mt-0.5">{step.sub}</div>
                  </div>
                  {i < 4 && <span className="text-slate-700 text-xs">→</span>}
                </div>
              ))}
            </div>

            {/* Three key answers */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded p-3" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <div className="font-mono text-[9px] text-amber-500 uppercase tracking-wider mb-1.5">What stays encrypted</div>
                <ul className="space-y-1">
                  <li className="font-mono text-[10px] text-slate-400">- Full EVM transaction (to + calldata)</li>
                  <li className="font-mono text-[10px] text-slate-400">- Target contract address</li>
                  <li className="font-mono text-[10px] text-slate-400">- Function being called</li>
                  <li className="font-mono text-[10px] text-slate-400">- Bid amount (double-encrypted)</li>
                  <li className="font-mono text-[10px] text-slate-400">- Bidder identity (tx origin hidden)</li>
                </ul>
              </div>
              <div className="rounded p-3" style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)' }}>
                <div className="font-mono text-[9px] text-blue-400 uppercase tracking-wider mb-1.5">What unlocks execution</div>
                <ul className="space-y-1">
                  <li className="font-mono text-[10px] text-slate-400">- Block finalization by validators</li>
                  <li className="font-mono text-[10px] text-slate-400">- BLS committee threshold (t-of-n)</li>
                  <li className="font-mono text-[10px] text-slate-400">- Auction deadline condition met</li>
                  <li className="font-mono text-[10px] text-slate-400">- Clearing event triggered</li>
                </ul>
              </div>
              <div className="rounded p-3" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div className="font-mono text-[9px] text-red-400 uppercase tracking-wider mb-1.5">How failure is handled</div>
                <ul className="space-y-1">
                  <li className="font-mono text-[10px] text-slate-400">- Committee unavailable → bid rejected</li>
                  <li className="font-mono text-[10px] text-slate-400">- Decrypt fails → tx reverts, no state change</li>
                  <li className="font-mono text-[10px] text-slate-400">- Bid invalid → on-chain require() fails</li>
                  <li className="font-mono text-[10px] text-slate-400">- Fallback: plaintext tx if BITE offline</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Per-match trace logs */}
      {traces.map((trace, traceIdx) => (
        <div
          key={traceIdx}
          className="border rounded-lg overflow-hidden"
          style={{ borderColor: '#1a2540', background: '#080e1a' }}
        >
          {/* Trace header */}
          <button
            onClick={() => setExpandedTrace(expandedTrace === traceIdx ? -1 : traceIdx)}
            className="w-full px-4 py-2.5 flex items-center justify-between"
            style={{ background: '#0c1220' }}
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#162040', color: '#4db8db' }}>
                {trace.serviceType === 'GPU Compute' ? 'GPU' : trace.serviceType === 'Data Feed' ? 'DAT' : 'API'}
              </span>
              <span className="font-mono text-[11px] text-gray-300">{trace.serviceType}</span>
              <span className="text-gray-600 text-xs">→</span>
              <span className="font-mono text-[11px] text-cyan-400">{trace.providerName}</span>
              <span className="text-gray-600 text-xs">←</span>
              <span className="font-mono text-[11px] text-gray-400">{trace.agentName}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-green-400 font-semibold">
                {(Number(trace.bidAmount) / 1000).toFixed(1)}k
              </span>
              <span className="font-mono text-[10px] text-slate-600">{expandedTrace === traceIdx ? '▼' : '▶'}</span>
            </div>
          </button>

          {expandedTrace === traceIdx && (
            <>
              {/* Terminal-style trace log */}
              <div className="px-4 py-3 border-t" style={{ borderColor: '#141e35' }}>
                <div className="font-mono text-[9px] text-slate-600 uppercase tracking-widest mb-2">BITE Execution Trace</div>
                <div className="space-y-0.5">
                  {trace.entries.map((entry, entryIdx) => {
                    const style = PHASE_STYLE[entry.phase] || PHASE_STYLE.encrypt;
                    const blobKey = `${traceIdx}-${entryIdx}`;
                    const ts = new Date(entry.ts);
                    const timeStr = `${ts.getHours().toString().padStart(2, '0')}:${ts.getMinutes().toString().padStart(2, '0')}:${ts.getSeconds().toString().padStart(2, '0')}.${ts.getMilliseconds().toString().padStart(3, '0')}`;

                    return (
                      <div key={entryIdx}>
                        <div className="flex items-start gap-2 py-0.5">
                          <span className="font-mono text-[9px] text-slate-700 tabular-nums shrink-0 mt-px">{timeStr}</span>
                          <span
                            className="font-mono text-[8px] font-bold px-1 py-0.5 rounded shrink-0"
                            style={{ background: style.bg, color: style.color }}
                          >
                            {style.label}
                          </span>
                          <span className="font-mono text-[10px] text-slate-300">{entry.label}</span>
                          {entry.detail && (
                            <span className="font-mono text-[10px] text-slate-500 ml-auto shrink-0">{entry.detail}</span>
                          )}
                        </div>
                        {entry.data && (
                          <div className="ml-[88px]">
                            <button
                              onClick={() => toggleBlob(blobKey)}
                              className="font-mono text-[9px] text-amber-500/60 hover:text-amber-400 transition"
                            >
                              {expandedBlobs.has(blobKey) ? '▼ hide encrypted data' : '▶ show encrypted data'}
                            </button>
                            {expandedBlobs.has(blobKey) && (
                              <div className="mt-1 p-2 rounded font-mono text-[9px] text-amber-400/50 break-all leading-relaxed" style={{ background: 'rgba(245,158,11,0.03)' }}>
                                {entry.data}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Execution receipt */}
              <div className="px-4 py-3 border-t" style={{ borderColor: '#141e35', background: 'rgba(16,185,129,0.03)' }}>
                <div className="font-mono text-[9px] text-emerald-500/80 uppercase tracking-widest mb-2">Execution Receipt — What Executed & Why</div>
                <div className="font-mono text-[10px] text-slate-400 leading-relaxed">
                  {trace.executionSummary}
                </div>
                {trace.auctionId != null && (
                  <div className="font-mono text-[10px] text-slate-600 mt-1">
                    on-chain auction #{trace.auctionId}
                  </div>
                )}
              </div>

              {/* Encrypted fields / condition / failure */}
              <div className="grid grid-cols-3 border-t" style={{ borderColor: '#141e35' }}>
                <div className="px-3 py-2.5 border-r" style={{ borderColor: '#141e35' }}>
                  <div className="font-mono text-[8px] text-amber-500/70 uppercase tracking-wider mb-1">Encrypted</div>
                  {trace.encryptedFields.map((f, i) => (
                    <div key={i} className="font-mono text-[9px] text-slate-500">{f}</div>
                  ))}
                </div>
                <div className="px-3 py-2.5 border-r" style={{ borderColor: '#141e35' }}>
                  <div className="font-mono text-[8px] text-blue-400/70 uppercase tracking-wider mb-1">Unlock Condition</div>
                  <div className="font-mono text-[9px] text-slate-500">{trace.unlockCondition}</div>
                </div>
                <div className="px-3 py-2.5">
                  <div className="font-mono text-[8px] text-red-400/70 uppercase tracking-wider mb-1">On Failure</div>
                  <div className="font-mono text-[9px] text-slate-500">{trace.failureHandling}</div>
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
