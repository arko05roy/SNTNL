'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const BOOT_LINES = [
  { text: 'SENTINEL v0.9.1', delay: 0, color: 'cyan', weight: 'bold' },
  { text: 'initializing sealed-bid procurement engine...', delay: 300, color: 'dim' },
  { text: 'network: SKALE Base Sepolia (chain 324705682)', delay: 600, color: 'dim' },
  { text: 'encryption: BITE threshold (BLS committee)', delay: 850, color: 'dim' },
  { text: 'settlement: x402 payment protocol', delay: 1050, color: 'dim' },
  { text: 'status: ALL SYSTEMS NOMINAL', delay: 1400, color: 'green', weight: 'bold' },
  { text: '', delay: 1600, color: 'dim' },
];

const NAV_ITEMS = [
  {
    key: 'orderbook',
    href: '/orderbook',
    label: 'orderbook',
    desc: 'sealed-bid orderbook — place asks, bid encrypted, clear to match',
    shortcut: '01',
  },
  {
    key: 'agents',
    href: '/agents',
    label: 'agents',
    desc: 'register & manage AI agents — ERC-8004 compliant',
    shortcut: '02',
  },
  {
    key: 'providers',
    href: '/providers',
    label: 'providers',
    desc: 'service provider registry — GPU, data feeds, APIs',
    shortcut: '03',
  },
];

const FEATURES = [
  {
    icon: '🔒',
    title: 'Sealed-Bid Procurement',
    desc: 'AI agents submit encrypted bids. No front-running. Fair clearing at auction end.',
  },
  {
    icon: '🤖',
    title: 'Autonomous Agents',
    desc: 'ERC-8004 compliant agents with bound wallets. Self-directing procurement.',
  },
  {
    icon: '⚡',
    title: 'Instant Settlement',
    desc: 'x402 payment protocol enables microtransactions. Pay per request.',
  },
  {
    icon: '🔗',
    title: 'On-Chain Verified',
    desc: 'All providers verified on SKALE. SLA commitments enforced on-chain.',
  },
];

const STATS = [
  { label: 'Providers', value: '12' },
  { label: 'Agents', value: '24' },
  { label: 'Volume', value: '1.2M' },
  { label: 'Uptime', value: '99.9%' },
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
          timer = setTimeout(type, speed + Math.random() * 12);
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
  const { displayed, done } = useTypewriter(text, delay, 12);

  const colorClass =
    color === 'cyan' ? 'text-cyan-400' :
    color === 'green' ? 'text-emerald-400' :
    color === 'amber' ? 'text-amber-400' :
    'text-slate-500';

  const weightClass = weight === 'bold' ? 'font-semibold tracking-wide' : '';

  return (
    <div className={`font-mono text-[13px] leading-relaxed ${colorClass} ${weightClass}`}>
      <span className="text-slate-700 mr-2 select-none opacity-60">{`>`}</span>
      {displayed}
      {!done && <span className="inline-block w-[7px] h-[15px] bg-current ml-[2px] animate-pulse" />}
    </div>
  );
}

export default function LandingPage() {
  const [bootDone, setBootDone] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [activeGlitch, setActiveGlitch] = useState(false);

  useEffect(() => {
    const lastLine = BOOT_LINES[BOOT_LINES.length - 1];
    const totalBootTime = lastLine.delay + (lastLine.text.length * 14) + 600;
    const t = setTimeout(() => setBootDone(true), totalBootTime);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!bootDone) return;
      const key = e.key;
      setPressedKey(key);
      if (key === '1') window.location.href = '/orderbook';
      else if (key === '2') window.location.href = '/agents';
      else if (key === '3') window.location.href = '/providers';
    };
    const handleKeyUp = () => setPressedKey(null);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [bootDone]);

  useEffect(() => {
    if (!bootDone) return;
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.9) {
        setActiveGlitch(true);
        setTimeout(() => setActiveGlitch(false), 80);
      }
    }, 4000);
    return () => clearInterval(glitchInterval);
  }, [bootDone]);

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden selection:bg-cyan-500/30"
      style={{ background: '#020408' }}
    >
      {/* Background Effects */}
      <BackgroundEffects />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded border border-cyan-500/30 flex items-center justify-center">
            <span className="text-cyan-400 font-mono text-sm">S</span>
          </div>
          <span className="font-mono text-sm text-white tracking-wide">SENTINEL</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-mono text-[10px] text-slate-500">SKALE Mainnet</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-6" style={{ borderColor: 'rgba(34, 211, 238, 0.2)', background: 'rgba(34, 211, 238, 0.05)' }}>
              <span className="text-[10px] font-mono text-cyan-400">Decentralized AI Infrastructure</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
              Autonomous AI Agent
              <br />
              <span className="text-cyan-400">Procurement Network</span>
            </h1>
            <p className="text-slate-400 max-w-xl mx-auto mb-6 text-sm sm:text-base">
              Sealed-bid marketplace where AI agents procure compute, data, and APIs. 
              Encrypted bids prevent front-running. x402 payments for instant settlement.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/orderbook" className="px-5 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-sm font-mono rounded border transition-colors" style={{ borderColor: 'rgba(34, 211, 238, 0.3)' }}>
                Explore Orderbook
              </Link>
              <Link href="/agents" className="px-5 py-2.5 bg-slate-800/50 hover:bg-slate-800 text-slate-300 text-sm font-mono rounded border border-slate-700 transition-colors">
                Register Agent
              </Link>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex justify-center gap-8 sm:gap-16 mb-12">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-white font-mono">{stat.value}</div>
                <div className="text-[10px] font-mono text-slate-600 uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="border rounded-lg p-4 transition-all duration-300 hover:border-cyan-500/30"
                style={{ background: 'rgba(5, 10, 20, 0.6)', borderColor: 'rgba(34, 211, 238, 0.1)' }}
              >
                <div className="text-2xl mb-2">{feature.icon}</div>
                <h3 className="text-sm font-mono text-white mb-1">{feature.title}</h3>
                <p className="text-[10px] font-mono text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Terminal Section */}
          <div className="max-w-2xl mx-auto">
            <div className={`relative transition-transform duration-100 ${activeGlitch ? 'translate-x-0.5' : ''}`}>
              <div
                className="flex items-center justify-between px-4 py-2.5 rounded-t-lg border border-b-0"
                style={{ 
                  background: 'linear-gradient(180deg, #0a1628 0%, #070f1c 100%)',
                  borderColor: 'rgba(34, 211, 238, 0.15)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2a2a2a' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2a2a2a' }} />
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2a2a2a' }} />
                </div>
                <span className="font-mono text-[10px] text-slate-500 uppercase">sentinel — bash</span>
                <div className="w-8" />
              </div>

              <div
                className="border rounded-b-lg relative overflow-hidden"
                style={{ 
                  background: 'linear-gradient(180deg, #050a14 0%, #03060c 100%)',
                  borderColor: 'rgba(34, 211, 238, 0.15)',
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

                <div className="px-5 pt-5 pb-3">
                  {BOOT_LINES.map((line, i) => (
                    <BootLine key={i} text={line.text} delay={line.delay} color={line.color} weight={line.weight} />
                  ))}
                </div>

                <div
                  className="transition-all duration-700 ease-out overflow-hidden"
                  style={{
                    maxHeight: bootDone ? '400px' : '0px',
                    opacity: bootDone ? 1 : 0,
                  }}
                >
                  <div className="mx-5 my-2 relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent h-px" />
                  </div>

                  <div className="p-5 space-y-2">
                    {NAV_ITEMS.map((item, index) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        onMouseEnter={() => setHoveredNav(item.key)}
                        onMouseLeave={() => setHoveredNav(null)}
                        className="group block rounded-lg px-3 py-2.5 transition-all duration-200"
                        style={{
                          background: hoveredNav === item.key ? 'linear-gradient(90deg, rgba(34, 211, 238, 0.08) 0%, transparent 100%)' : 'transparent',
                          borderLeft: hoveredNav === item.key ? '2px solid rgba(34, 211, 238, 0.5)' : '2px solid transparent',
                          transform: pressedKey === String(index + 1) ? 'scale(0.98)' : 'scale(1)',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`font-mono text-[10px] ${hoveredNav === item.key ? 'text-cyan-400' : 'text-slate-600'}`}>
                            [{item.shortcut}]
                          </span>
                          <span className={`font-mono text-[13px] ${hoveredNav === item.key ? 'text-cyan-300' : 'text-slate-300'}`}>
                            {item.label}
                          </span>
                          <span className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                            →
                          </span>
                        </div>
                        <p className="font-mono text-[10px] text-slate-500 mt-0.5 ml-[38px]">
                          {item.desc}
                        </p>
                      </Link>
                    ))}
                  </div>

                  <div className="px-5 pb-5">
                    <div className="font-mono text-[12px] flex items-center gap-1.5">
                      <span className="text-cyan-500">sentinel</span>
                      <span className="text-slate-600">:</span>
                      <span className="text-slate-500">~</span>
                      <span className="text-slate-600">$</span>
                      <span className="inline-block w-[7px] h-[14px] bg-cyan-400/70 ml-1 animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Keyboard hint */}
            <div className="text-center mt-4">
              <span className="font-mono text-[9px] text-slate-600">
                press [1], [2], or [3] to navigate
              </span>
            </div>
          </div>

          {/* How it Works */}
          <div className="mt-16 text-center">
            <h2 className="text-sm font-mono text-slate-500 uppercase tracking-wider mb-8">How It Works</h2>
            <div className="flex flex-wrap justify-center items-start gap-4 sm:gap-8">
              {[
                { step: '01', title: 'Providers List', desc: 'Register services with SLA terms' },
                { step: '02', title: 'Agents Bid', desc: 'Submit encrypted sealed bids' },
                { step: '03', title: 'Auction Clear', desc: 'Bids revealed & winners selected' },
                { step: '04', title: 'Instant Pay', desc: 'x402 payments settle immediately' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="font-mono text-lg text-cyan-400 font-bold">{item.step}</div>
                    <div className="text-xs font-mono text-white mt-1">{item.title}</div>
                    <div className="text-[10px] font-mono text-slate-600">{item.desc}</div>
                  </div>
                  {i < 3 && <span className="text-slate-700 text-xl hidden sm:inline">→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-slate-800/50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 font-mono text-[10px] text-slate-600">
                <span>SKALE</span>
                <span className="text-slate-800">/</span>
                <span>BITE</span>
                <span className="text-slate-800">/</span>
                <span>x402</span>
                <span className="text-slate-800">/</span>
                <span>ERC-8004</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
                <span className="font-mono text-[10px] text-slate-500">all systems operational</span>
              </div>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

function BackgroundEffects() {
  return (
    <>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 80% 50% at 50% 20%, rgba(6, 182, 212, 0.1) 0%, transparent 50%)`,
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(34, 211, 238, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.03) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
      }} />
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.2), transparent)',
      }} />
      <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none" style={{
        background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.1), transparent)',
      }} />
    </>
  );
}
