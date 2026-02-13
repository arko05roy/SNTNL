'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const BOOT_LINES = [
  { text: '╔═══════════════════════════════════════════════════════════════╗', delay: 0, color: 'cyan', weight: 'normal' },
  { text: '║  SENTINEL v1.0.0 — PRIVATE ORDERBOOK FOR AUTONOMOUS AGENTS  ║', delay: 100, color: 'cyan', weight: 'bold' },
  { text: '╚═══════════════════════════════════════════════════════════════╝', delay: 200, color: 'cyan', weight: 'normal' },
  { text: '', delay: 400, color: 'dim' },
  { text: '[INIT] Loading encryption layer...', delay: 600, color: 'dim' },
  { text: '  ├─ BITE v0.2.1 (BLS12-381 threshold signatures)', delay: 750, color: 'blue' },
  { text: '  ├─ Two-layer encryption: TX + Amount', delay: 900, color: 'blue' },
  { text: '  └─ Status: ✓ OPERATIONAL', delay: 1050, color: 'green' },
  { text: '', delay: 1200, color: 'dim' },
  { text: '[INIT] Loading authorization layer...', delay: 1300, color: 'dim' },
  { text: '  ├─ AP2 hierarchical mandate system', delay: 1450, color: 'blue' },
  { text: '  ├─ IntentMandate → CartMandate → PaymentMandate', delay: 1600, color: 'blue' },
  { text: '  └─ Status: ✓ OPERATIONAL', delay: 1750, color: 'green' },
  { text: '', delay: 1900, color: 'dim' },
  { text: '[INIT] Loading settlement layer...', delay: 2000, color: 'dim' },
  { text: '  ├─ x402 protocol (EIP-3009 signed transfers)', delay: 2150, color: 'blue' },
  { text: '  ├─ Zero gas fees, instant finality', delay: 2300, color: 'blue' },
  { text: '  └─ Status: ✓ OPERATIONAL', delay: 2450, color: 'green' },
  { text: '', delay: 2600, color: 'dim' },
  { text: '[NET] Connecting to SKALE Base Sepolia (324705682)...', delay: 2700, color: 'dim' },
  { text: '  └─ Connection established ✓', delay: 2900, color: 'green' },
  { text: '', delay: 3050, color: 'dim' },
  { text: '>> ALL SYSTEMS NOMINAL', delay: 3200, color: 'green', weight: 'bold' },
  { text: '>> READY FOR SECURE AGENT COMMERCE', delay: 3400, color: 'green', weight: 'bold' },
  { text: '', delay: 3600, color: 'dim' },
];

const CONTRACTS = [
  { name: 'SealedBidAuction', address: '0x98eFA762eDa5FB0C3BA02296c583A5a542c66c8b', desc: 'BITE-encrypted bid storage' },
  { name: 'AgentRegistry', address: '0x31DA867c6C12eCEBbb738d97198792901431e228', desc: 'ERC-721 agent identities' },
  { name: 'ServiceRegistry', address: '0x5754C71c2474FE8F2B83C43432Faf0AC94cc24A5', desc: 'Provider CartMandates' },
  { name: 'SentinelUSDC', address: '0x6bc10d034D0824ee67EaC1e4E66047b723a8D873', desc: 'EIP-3009 settlement token' },
];

const PILLARS = [
  {
    title: 'PRIVACY',
    subtitle: 'via BITE Encryption',
    icon: '🔐',
    features: [
      'Two-layer encryption (Transaction + Amount)',
      'BLS threshold decryption (t-of-n validators)',
      'Losing bids never decrypt — permanent privacy',
      'No front-running, no strategy leakage',
      'Consensus-enforced timing',
    ],
    color: 'cyan',
  },
  {
    title: 'AUTHORIZATION',
    subtitle: 'via AP2 Mandates',
    icon: '🛡️',
    features: [
      'IntentMandate: Agent spending policies',
      'CartMandate: Provider signed commitments',
      'PaymentMandate: Specific authorization (not blank check)',
      'Validation before execution',
      'Cryptographic receipts for every transaction',
    ],
    color: 'blue',
  },
  {
    title: 'SETTLEMENT',
    subtitle: 'via x402 Protocol',
    icon: '⚡',
    features: [
      'EIP-3009 gasless signed transfers',
      'Zero gas fees (SKALE subsidizes)',
      'Instant finality (no confirmation wait)',
      'Self-hosted facilitator (no custody)',
      'Full audit trail with TX hashes',
    ],
    color: 'green',
  },
];

function useTypewriter(text: string, startDelay: number, speed = 18): { displayed: string; done: boolean } {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) {
      const t = setTimeout(() => { setDisplayed(''); setDone(true); }, startDelay);
      return () => clearTimeout(t);
    }

    let idx = 0;
    let timer: ReturnType<typeof setTimeout>;

    const startTimer = setTimeout(() => {
      const type = () => {
        if (idx <= text.length) {
          setDisplayed(text.slice(0, idx));
          idx++;
          timer = setTimeout(type, speed + Math.random() * 8);
        } else {
          setDone(true);
        }
      };
      type();
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(timer);
    };
  }, [text, startDelay, speed]);

  return { displayed, done };
}

function BootLine({ text, delay, color, weight }: { text: string; delay: number; color: string; weight?: string }) {
  const { displayed, done } = useTypewriter(text, delay, 8);

  const colorClass =
    color === 'cyan' ? 'text-cyan-400' :
    color === 'blue' ? 'text-blue-400' :
    color === 'green' ? 'text-emerald-400' :
    color === 'amber' ? 'text-amber-400' :
    'text-slate-500';

  const weightClass = weight === 'bold' ? 'font-bold tracking-wide' : '';

  return (
    <div className={`font-mono text-[11px] leading-relaxed ${colorClass} ${weightClass}`}>
      {displayed}
      {!done && text && <span className="inline-block w-[6px] h-[13px] bg-cyan-400 ml-[2px] animate-pulse" />}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 px-2 py-0.5 text-[9px] font-mono border rounded transition-all hover:bg-cyan-500/10"
      style={{ borderColor: 'rgba(34, 211, 238, 0.3)', color: copied ? '#10b981' : '#22d3ee' }}
    >
      {copied ? '✓ COPIED' : 'COPY'}
    </button>
  );
}

function EncryptionDemo() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStage(prev => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="border rounded-lg p-6 relative overflow-hidden" style={{ background: '#050a14', borderColor: 'rgba(34, 211, 238, 0.2)' }}>
      {/* CRT scanline effect */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 211, 238, 0.015) 2px, rgba(34, 211, 238, 0.015) 4px)',
      }} />

      <div className="relative z-10">
        <h3 className="font-mono text-sm text-cyan-400 mb-4 flex items-center gap-2">
          <span className="text-cyan-500">▸</span> PRIVACY GUARANTEE: TWO-LAYER ENCRYPTION
        </h3>

        <div className="space-y-3">
          {/* Agent 1 Bid */}
          <div className={`font-mono text-[10px] transition-all duration-500 ${stage >= 1 ? 'opacity-100' : 'opacity-30'}`}>
            <div className="text-slate-500 mb-1">Agent_Alpha bids:</div>
            <div className="bg-slate-900/50 border border-slate-800 rounded px-3 py-2 flex items-center justify-between">
              <span className="text-cyan-300">
                {stage >= 2 ? (
                  <span className="text-emerald-400">275,000 USDC</span>
                ) : (
                  '0x4f8a3c2e9b7d1a...'
                )}
              </span>
              {stage === 1 && <span className="text-amber-400 text-[9px]">🔒 ENCRYPTED</span>}
              {stage >= 2 && <span className="text-emerald-400 text-[9px]">✓ WINNER REVEALED</span>}
            </div>
          </div>

          {/* Agent 2 Bid */}
          <div className={`font-mono text-[10px] transition-all duration-500 ${stage >= 1 ? 'opacity-100' : 'opacity-30'}`}>
            <div className="text-slate-500 mb-1">Agent_Bravo bids:</div>
            <div className="bg-slate-900/50 border border-slate-800 rounded px-3 py-2 flex items-center justify-between">
              <span className="text-cyan-300">0x7e2f9a5b3c8d...</span>
              <span className="text-amber-400 text-[9px]">🔒 SEALED FOREVER</span>
            </div>
          </div>

          {/* Agent 3 Bid */}
          <div className={`font-mono text-[10px] transition-all duration-500 ${stage >= 1 ? 'opacity-100' : 'opacity-30'}`}>
            <div className="text-slate-500 mb-1">Agent_Charlie bids:</div>
            <div className="bg-slate-900/50 border border-slate-800 rounded px-3 py-2 flex items-center justify-between">
              <span className="text-cyan-300">0x1a9c5e7f2b4d...</span>
              <span className="text-amber-400 text-[9px]">🔒 SEALED FOREVER</span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="font-mono text-[9px] text-slate-500">
            {stage === 0 && '▸ Agents submitting encrypted bids...'}
            {stage === 1 && '▸ Bids sealed on-chain, awaiting auction deadline...'}
            {stage === 2 && '▸ Auction cleared — winner revealed, losers stay encrypted'}
            {stage === 3 && '▸ No strategy leakage. Permanent privacy for losing bids.'}
          </div>
        </div>
      </div>
    </div>
  );
}

function MandateFlow() {
  return (
    <div className="border rounded-lg p-6 relative overflow-hidden" style={{ background: '#050a14', borderColor: 'rgba(34, 211, 238, 0.2)' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 211, 238, 0.015) 2px, rgba(34, 211, 238, 0.015) 4px)',
      }} />

      <div className="relative z-10">
        <h3 className="font-mono text-sm text-cyan-400 mb-4 flex items-center gap-2">
          <span className="text-cyan-500">▸</span> MANDATE HIERARCHY: CRYPTOGRAPHIC AUTHORIZATION
        </h3>

        <div className="space-y-4 font-mono text-[10px]">
          <div className="flex items-start gap-3">
            <div className="text-blue-400 text-lg leading-none mt-0.5">①</div>
            <div className="flex-1">
              <div className="text-blue-300 font-semibold mb-1">IntentMandate</div>
              <div className="text-slate-500 leading-relaxed">Agent owner sets spending policy: "Max 300k per transaction, GPU services only"</div>
              <div className="mt-2 bg-slate-900/50 border border-slate-800 rounded px-2 py-1 text-cyan-300 text-[9px]">
                EIP-712 signed by agent owner
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-8">
            <div className="text-slate-600">↓</div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-cyan-400 text-lg leading-none mt-0.5">②</div>
            <div className="flex-1">
              <div className="text-cyan-300 font-semibold mb-1">CartMandate</div>
              <div className="text-slate-500 leading-relaxed">Provider commits: "H100 GPU @ 250k, 99.9% uptime, 100ms latency"</div>
              <div className="mt-2 bg-slate-900/50 border border-slate-800 rounded px-2 py-1 text-cyan-300 text-[9px]">
                Immutable on-chain, price locked
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-8">
            <div className="text-slate-600">↓</div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-emerald-400 text-lg leading-none mt-0.5">③</div>
            <div className="flex-1">
              <div className="text-emerald-300 font-semibold mb-1">PaymentMandate</div>
              <div className="text-slate-500 leading-relaxed">Agent authorizes: "Pay 275k to 0x5754... for auction #42"</div>
              <div className="mt-2 bg-slate-900/50 border border-slate-800 rounded px-2 py-1 text-emerald-300 text-[9px]">
                Specific authorization, not blank check
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pl-8">
            <div className="text-slate-600">↓</div>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-green-400 text-lg leading-none mt-0.5">✓</div>
            <div className="flex-1">
              <div className="text-green-300 font-semibold mb-1">x402 Settlement</div>
              <div className="text-slate-500 leading-relaxed">Payment executes instantly, zero gas, full audit trail</div>
              <div className="mt-2 bg-slate-900/50 border border-slate-800 rounded px-2 py-1 text-green-300 text-[9px]">
                Transaction hash: 0xabc123...
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [bootDone, setBootDone] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);

  useEffect(() => {
    const lastLine = BOOT_LINES[BOOT_LINES.length - 1];
    const totalBootTime = lastLine.delay + 800;
    const t = setTimeout(() => setBootDone(true), totalBootTime);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!bootDone) return;
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.85) {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), 100);
      }
    }, 5000);
    return () => clearInterval(glitchInterval);
  }, [bootDone]);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#020408' }}>
      {/* CRT Glow Effect */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(6, 182, 212, 0.08) 0%, transparent 60%)',
      }} />

      {/* Scanlines */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(34, 211, 238, 0.01) 2px, rgba(34, 211, 238, 0.01) 4px)',
      }} />

      {/* Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      {/* Noise texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />

      <div className="relative z-10">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(34, 211, 238, 0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 border rounded flex items-center justify-center relative" style={{ borderColor: 'rgba(34, 211, 238, 0.4)' }}>
              <span className="text-cyan-400 font-mono text-base font-bold">S</span>
              <div className="absolute inset-0 rounded" style={{
                boxShadow: '0 0 20px rgba(34, 211, 238, 0.3)',
              }} />
            </div>
            <div>
              <div className="font-mono text-base text-white tracking-wider font-bold">SENTINEL</div>
              <div className="font-mono text-[8px] text-slate-500 tracking-wide">PRIVATE AGENT COMMERCE</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" style={{
                boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)',
              }} />
              <span className="font-mono text-[10px] text-slate-400">SKALE MAINNET</span>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-6 py-12">
          <div className="max-w-7xl mx-auto">
            {/* Boot Terminal */}
            <div className="mb-16">
              <div className="max-w-4xl mx-auto">
                <div className={`border rounded-lg overflow-hidden transition-all duration-200 ${glitchActive ? 'translate-x-[1px]' : ''}`} style={{
                  background: 'linear-gradient(180deg, #050a14 0%, #03060c 100%)',
                  borderColor: 'rgba(34, 211, 238, 0.25)',
                  boxShadow: '0 0 40px rgba(34, 211, 238, 0.15), inset 0 1px 0 rgba(34, 211, 238, 0.1)',
                }}>
                  {/* Terminal Header */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{
                    background: 'linear-gradient(180deg, #0a1628 0%, #070f1c 100%)',
                    borderColor: 'rgba(34, 211, 238, 0.2)',
                  }}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/40" />
                      <div className="w-3 h-3 rounded-full bg-amber-500/20 border border-amber-500/40" />
                      <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                    </div>
                    <span className="font-mono text-[10px] text-cyan-400/70 tracking-wider">root@sentinel:~$</span>
                    <div className="w-12" />
                  </div>

                  {/* Terminal Body */}
                  <div className="px-6 py-5 min-h-[400px] relative">
                    {/* Subtle inner glow */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                      background: 'radial-gradient(ellipse 100% 100% at 50% 0%, rgba(34, 211, 238, 0.03) 0%, transparent 50%)',
                    }} />

                    <div className="relative z-10">
                      {BOOT_LINES.map((line, i) => (
                        <BootLine key={i} text={line.text} delay={line.delay} color={line.color} weight={line.weight} />
                      ))}

                      {/* Navigation appears after boot */}
                      <div
                        className="transition-all duration-700 ease-out overflow-hidden"
                        style={{
                          maxHeight: bootDone ? '300px' : '0px',
                          opacity: bootDone ? 1 : 0,
                        }}
                      >
                        <div className="mt-6 space-y-2">
                          <div className="font-mono text-[11px] text-cyan-400 mb-3">
                            <span className="text-slate-600">&gt;&gt;</span> Navigate to:
                          </div>

                          {[
                            { label: 'Orderbook', href: '/orderbook', key: '1', desc: 'Place sealed bids' },
                            { label: 'Agents', href: '/agents', key: '2', desc: 'Register AI agents' },
                            { label: 'Providers', href: '/providers', key: '3', desc: 'Browse services' },
                          ].map((item) => (
                            <Link
                              key={item.key}
                              href={item.href}
                              className="group flex items-center gap-3 px-3 py-2 rounded hover:bg-cyan-500/5 transition-colors border border-transparent hover:border-cyan-500/20"
                            >
                              <span className="font-mono text-[10px] text-slate-600 group-hover:text-cyan-500">[{item.key}]</span>
                              <span className="font-mono text-[12px] text-cyan-300 group-hover:text-cyan-400">{item.label}</span>
                              <span className="font-mono text-[10px] text-slate-600 flex-1">{item.desc}</span>
                              <span className="text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm">→</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center mt-4">
                  <span className="font-mono text-[9px] text-slate-600">Press [1], [2], or [3] to navigate</span>
                </div>
              </div>
            </div>

            {/* Problem Statement */}
            <div className="mb-16">
              <div className="max-w-4xl mx-auto text-center mb-8">
                <div className="inline-block px-4 py-1.5 rounded-full mb-4" style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}>
                  <span className="font-mono text-[10px] text-red-400 tracking-wide">⚠ THE PROBLEM</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  When Agents Become Economic Actors,<br />
                  <span className="text-red-400">Privacy Dies</span>
                </h2>
                <p className="text-slate-400 text-base leading-relaxed max-w-2xl mx-auto">
                  Every autonomous agent transaction broadcasts strategy. Your trading bot's API purchases reveal which data sources you value.
                  Your procurement agent's GPU bids expose budget constraints. <span className="text-red-400 font-semibold">The blockchain's transparency becomes a weapon against you.</span>
                </p>
              </div>
            </div>

            {/* Three Pillars */}
            <div className="mb-16">
              <div className="text-center mb-8">
                <div className="inline-block px-4 py-1.5 rounded-full mb-4" style={{
                  background: 'rgba(34, 211, 238, 0.1)',
                  border: '1px solid rgba(34, 211, 238, 0.3)',
                }}>
                  <span className="font-mono text-[10px] text-cyan-400 tracking-wide">✓ THE SOLUTION</span>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">
                  Three Pillars of <span className="text-cyan-400">Secure Agent Commerce</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                {PILLARS.map((pillar, idx) => (
                  <div
                    key={idx}
                    className="border rounded-lg p-6 relative overflow-hidden group hover:border-opacity-60 transition-all duration-300"
                    style={{
                      background: 'linear-gradient(180deg, #050a14 0%, #03060c 100%)',
                      borderColor: `rgba(${pillar.color === 'cyan' ? '34, 211, 238' : pillar.color === 'blue' ? '59, 130, 246' : '16, 185, 129'}, 0.25)`,
                    }}
                  >
                    {/* Hover glow */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{
                      background: `radial-gradient(circle at top, rgba(${pillar.color === 'cyan' ? '34, 211, 238' : pillar.color === 'blue' ? '59, 130, 246' : '16, 185, 129'}, 0.05) 0%, transparent 70%)`,
                    }} />

                    <div className="relative z-10">
                      <div className="text-3xl mb-3">{pillar.icon}</div>
                      <h3 className={`font-mono text-lg font-bold mb-1 ${
                        pillar.color === 'cyan' ? 'text-cyan-400' :
                        pillar.color === 'blue' ? 'text-blue-400' :
                        'text-emerald-400'
                      }`}>
                        {pillar.title}
                      </h3>
                      <div className="font-mono text-[10px] text-slate-500 mb-4">{pillar.subtitle}</div>
                      <ul className="space-y-2.5">
                        {pillar.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2 font-mono text-[11px] text-slate-400 leading-relaxed">
                            <span className={`${
                              pillar.color === 'cyan' ? 'text-cyan-500' :
                              pillar.color === 'blue' ? 'text-blue-500' :
                              'text-emerald-500'
                            } mt-0.5`}>▸</span>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual Demos */}
            <div className="mb-16">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
                <EncryptionDemo />
                <MandateFlow />
              </div>
            </div>

            {/* Smart Contracts */}
            <div className="mb-16">
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-white mb-2">Deployed & Verified Contracts</h2>
                  <p className="font-mono text-[11px] text-slate-500">SKALE Base Sepolia Testnet (Chain ID: 324705682)</p>
                </div>

                <div className="border rounded-lg overflow-hidden" style={{
                  background: 'linear-gradient(180deg, #050a14 0%, #03060c 100%)',
                  borderColor: 'rgba(34, 211, 238, 0.2)',
                }}>
                  <div className="px-5 py-3 border-b" style={{
                    background: 'rgba(34, 211, 238, 0.05)',
                    borderColor: 'rgba(34, 211, 238, 0.2)',
                  }}>
                    <div className="font-mono text-[10px] text-cyan-400 tracking-wider">SMART CONTRACTS</div>
                  </div>

                  <div className="divide-y" style={{ borderColor: 'rgba(34, 211, 238, 0.1)' }}>
                    {CONTRACTS.map((contract, idx) => (
                      <div key={idx} className="px-5 py-4 hover:bg-cyan-500/5 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="font-mono text-[12px] text-white font-semibold mb-1">{contract.name}</div>
                            <div className="font-mono text-[10px] text-slate-500 mb-2">{contract.desc}</div>
                            <div className="flex items-center gap-2">
                              <code className="font-mono text-[10px] text-cyan-300 bg-slate-900/50 px-2 py-1 rounded">
                                {contract.address}
                              </code>
                              <CopyButton text={contract.address} />
                            </div>
                          </div>
                          <a
                            href={`https://base-sepolia-testnet-explorer.skalenodes.com/address/${contract.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[10px] text-cyan-400 hover:text-cyan-300 border rounded px-3 py-1.5 transition-colors whitespace-nowrap"
                            style={{ borderColor: 'rgba(34, 211, 238, 0.3)' }}
                          >
                            VIEW →
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-center mt-4">
                  <a
                    href="https://base-sepolia-testnet-explorer.skalenodes.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-mono text-[10px] text-slate-500 hover:text-cyan-400 transition-colors"
                  >
                    <span>Block Explorer</span>
                    <span>→</span>
                  </a>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="text-center mb-16">
              <div className="max-w-2xl mx-auto border rounded-lg p-8 relative overflow-hidden" style={{
                background: 'linear-gradient(135deg, #050a14 0%, #0a1628 100%)',
                borderColor: 'rgba(34, 211, 238, 0.3)',
              }}>
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'radial-gradient(circle at center, rgba(34, 211, 238, 0.1) 0%, transparent 70%)',
                }} />

                <div className="relative z-10">
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Ready for <span className="text-cyan-400">Confidential Commerce?</span>
                  </h3>
                  <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                    Build autonomous agents that bid, buy, and transact without leaking strategy.
                    <br />Zero gas fees. Instant settlement. Cryptographic accountability.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link
                      href="/orderbook"
                      className="px-6 py-3 rounded font-mono text-sm font-semibold transition-all"
                      style={{
                        background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2) 0%, rgba(34, 211, 238, 0.1) 100%)',
                        border: '1px solid rgba(34, 211, 238, 0.4)',
                        color: '#22d3ee',
                        boxShadow: '0 0 20px rgba(34, 211, 238, 0.2)',
                      }}
                    >
                      EXPLORE ORDERBOOK
                    </Link>
                    <Link
                      href="/agents"
                      className="px-6 py-3 rounded font-mono text-sm font-semibold border transition-all hover:bg-slate-800/50"
                      style={{
                        borderColor: 'rgba(148, 163, 184, 0.3)',
                        color: '#cbd5e1',
                      }}
                    >
                      REGISTER AGENT
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="border-t pt-8 pb-4" style={{ borderColor: 'rgba(34, 211, 238, 0.1)' }}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-[10px] text-slate-600">
                  {['SKALE', 'BITE v0.2.1', 'AP2', 'x402', 'EIP-3009', 'ERC-721', 'BLS12-381'].map((tech, i, arr) => (
                    <span key={tech} className="flex items-center gap-3">
                      <span className="hover:text-cyan-400 transition-colors cursor-default">{tech}</span>
                      {i < arr.length - 1 && <span className="text-slate-800">•</span>}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" style={{
                    boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
                  }} />
                  <span className="font-mono text-[10px] text-slate-500 tracking-wide">ALL SYSTEMS OPERATIONAL</span>
                </div>
              </div>

              <div className="text-center mt-6">
                <div className="font-mono text-[9px] text-slate-700">
                  Built on SKALE | Secured by BITE | Authorized by AP2 | Settled by x402
                </div>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}
