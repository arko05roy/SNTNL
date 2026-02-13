'use client';

import { useState, useEffect, useCallback } from 'react';
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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!bootDone) return;
      
      const key = e.key;
      setPressedKey(key);
      
      if (key === '1') {
        window.location.href = '/orderbook';
      } else if (key === '2') {
        window.location.href = '/agents';
      } else if (key === '3') {
        window.location.href = '/providers';
      }
    };

    const handleKeyUp = () => setPressedKey(null);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [bootDone]);

  // Occasional glitch effect
  useEffect(() => {
    if (!bootDone) return;
    
    const glitchInterval = setInterval(() => {
      if (Math.random() > 0.85) {
        setActiveGlitch(true);
        setTimeout(() => setActiveGlitch(false), 120);
      }
    }, 3000);

    return () => clearInterval(glitchInterval);
  }, [bootDone]);

  const handleNavClick = useCallback((href: string) => {
    // Could add transition effect here
    window.location.href = href;
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden selection:bg-cyan-500/30 selection:text-cyan-100"
      style={{ background: '#020408' }}
    >
      {/* Animated gradient mesh background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 90% 60% at 15% 35%, rgba(6, 182, 212, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse 70% 50% at 85% 55%, rgba(16, 185, 129, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 50% 15%, rgba(34, 211, 238, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse 80% 60% at 70% 85%, rgba(99, 102, 241, 0.05) 0%, transparent 50%)
          `,
        }}
      />

      {/* Hex pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%2322d3ee' fill-opacity='1'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Grid background with perspective */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 211, 238, 0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 211, 238, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          transform: 'perspective(500px) rotateX(2deg)',
          transformOrigin: 'center top',
        }}
      />

      {/* Data stream left */}
      <div className="absolute left-0 top-0 bottom-0 w-32 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-0 left-4 h-full w-[1px] bg-gradient-to-b from-transparent via-cyan-500/50 to-transparent" />
        {['0xFA23B12', '01', '10', 'BLOCK', 'TX', '0xFA2', 'SYNC', 'DATA'].map((text, i) => (
          <div
            key={i}
            className="absolute left-8 font-mono text-[8px] text-cyan-400/60 whitespace-nowrap animate-stream-down-left"
            style={{
              top: `${(i * 15) - 5}%`,
              animationDelay: `${i * 0.3}s`,
            }}
          >
            {text}
          </div>
        ))}
      </div>

      {/* Data stream right */}
      <div className="absolute right-0 top-0 bottom-0 w-32 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-0 right-4 h-full w-[1px] bg-gradient-to-b from-transparent via-emerald-500/50 to-transparent" />
        {['SYNC', '0xA1B2C3', 'PING', 'ACK', 'DATA', 'NULL', '0xDEAD', 'PONG'].map((text, i) => (
          <div
            key={i}
            className="absolute right-8 font-mono text-[8px] text-emerald-400/60 whitespace-nowrap animate-stream-down-right"
            style={{
              top: `${(i * 15) - 5}%`,
              animationDelay: `${i * 0.3 + 1.5}s`,
            }}
          >
            {text}
          </div>
        ))}
      </div>

      {/* Scanning beam */}
      <div 
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)',
        }}
      >
        <div 
          className="absolute left-0 right-0 h-[200px] pointer-events-none animate-scan"
          style={{
            background: 'linear-gradient(180deg, transparent 0%, rgba(34, 211, 238, 0.03) 50%, transparent 100%)',
            top: '-200px',
          }}
        />
      </div>

      {/* Floating particles - enhanced */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Larger glowing orbs */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`orb-${i}`}
            className="absolute rounded-full animate-float-orb"
            style={{
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              width: `${4 + (i % 3) * 2}px`,
              height: `${4 + (i % 3) * 2}px`,
              background: i % 2 === 0 ? 'rgba(34, 211, 238, 0.3)' : 'rgba(16, 185, 129, 0.3)',
              boxShadow: i % 2 === 0 
                ? `0 0 ${10 + i * 5}px rgba(34, 211, 238, 0.4)` 
                : `0 0 ${10 + i * 5}px rgba(16, 185, 129, 0.4)`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${8 + i}s`,
            }}
          />
        ))}
        
        {/* Tiny specks - static positions */}
        {[
          { l: 8, t: 12, d: 1.2 }, { l: 23, t: 45, d: 2.8 }, { l: 67, t: 23, d: 0.5 }, { l: 34, t: 78, d: 3.1 },
          { l: 89, t: 34, d: 1.9 }, { l: 12, t: 56, d: 2.3 }, { l: 78, t: 67, d: 0.8 }, { l: 45, t: 89, d: 2.1 },
          { l: 56, t: 23, d: 3.4 }, { l: 23, t: 12, d: 1.1 }, { l: 90, t: 78, d: 2.7 }, { l: 34, t: 45, d: 0.9 },
          { l: 67, t: 56, d: 3.2 }, { l: 12, t: 34, d: 1.5 }, { l: 78, t: 12, d: 2.5 }, { l: 45, t: 67, d: 0.4 },
          { l: 89, t: 23, d: 2.9 }, { l: 23, t: 90, d: 1.3 }, { l: 56, t: 78, d: 3.6 }, { l: 34, t: 34, d: 0.7 },
          { l: 67, t: 12, d: 2.2 }, { l: 12, t: 67, d: 1.8 }, { l: 90, t: 45, d: 3.0 }, { l: 45, t: 23, d: 0.6 },
          { l: 78, t: 56, d: 2.4 }, { l: 23, t: 89, d: 1.0 }, { l: 56, t: 12, d: 3.3 }, { l: 34, t: 67, d: 0.3 },
          { l: 89, t: 78, d: 2.6 }, { l: 67, t: 34, d: 1.4 },
        ].map((pos, i) => (
          <div
            key={`spec-${i}`}
            className="absolute w-0.5 h-0.5 rounded-full bg-cyan-400/40 animate-pulse"
            style={{
              left: `${pos.l}%`,
              top: `${pos.t}%`,
              animationDelay: `${pos.d}s`,
              animationDuration: `${1.5 + (i % 3) * 0.8}s`,
            }}
          />
        ))}
        
        {/* Data bits - static positions */}
        {[
          { l: 15, t: 8, d: 0.5 }, { l: 42, t: 25, d: 2.1 }, { l: 73, t: 42, d: 4.2 }, { l: 28, t: 65, d: 1.3 },
          { l: 85, t: 15, d: 3.8 }, { l: 52, t: 82, d: 0.9 }, { l: 18, t: 55, d: 2.7 }, { l: 63, t: 38, d: 4.5 },
          { l: 38, t: 72, d: 1.6 }, { l: 78, t: 58, d: 3.2 }, { l: 22, t: 28, d: 0.3 }, { l: 55, t: 92, d: 2.4 },
        ].map((pos, i) => (
          <div
            key={`bit-${i}`}
            className="absolute font-mono text-[6px] text-cyan-500/30 animate-float-bit"
            style={{
              left: `${pos.l}%`,
              top: `${pos.t}%`,
              animationDelay: `${pos.d}s`,
              animationDuration: `${6 + (i % 4)}s`,
            }}
          >
            {['01', '10', '00', '11', '█', '░'][i % 6]}
          </div>
        ))}
      </div>

      {/* Horizontal scan lines */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 h-px animate-scan-horizontal"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(34, 211, 238, 0.1) 50%, transparent 100%)',
              top: `${20 + i * 15}%`,
              animationDelay: `${i * 0.8}s`,
            }}
          />
        ))}
      </div>

      {/* CRT scanline overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-50 opacity-[0.025]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
          backgroundSize: '100% 4px',
        }}
      />

      {/* Vignette effect */}
      <div 
        className="absolute inset-0 pointer-events-none z-40"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)',
        }}
      />

      {/* Corner accents - enhanced */}
      <div className="absolute top-8 left-8 w-24 h-24 pointer-events-none">
        <div className="absolute top-0 left-0 w-20 h-[1px] bg-gradient-to-r from-cyan-500/60 to-transparent" />
        <div className="absolute top-0 left-0 w-[1px] h-20 bg-gradient-to-b from-cyan-500/60 to-transparent" />
        <div className="absolute top-4 left-4 w-2 h-2 border-l-2 border-t-2 border-cyan-400/40" />
      </div>
      <div className="absolute bottom-8 right-8 w-24 h-24 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-20 h-[1px] bg-gradient-to-l from-emerald-500/40 to-transparent" />
        <div className="absolute bottom-0 right-0 w-[1px] h-20 bg-gradient-to-t from-emerald-500/40 to-transparent" />
        <div className="absolute bottom-4 right-4 w-2 h-2 border-r-2 border-b-2 border-emerald-400/30" />
      </div>

      {/* Top/bottom decorative lines */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/15 to-transparent" />
      </div>

      {/* Animated noise grain */}
      <div 
        className="absolute inset-0 pointer-events-none z-45 opacity-[0.015] animate-grain"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content — vertically centered */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-12">
        <div className="w-full max-w-2xl">

          {/* Terminal window */}
          <div className={`relative transition-transform duration-100 ${activeGlitch ? 'translate-x-[1px]' : ''}`}>
            {/* Window chrome */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-t-lg border border-b-0 backdrop-blur-sm"
              style={{ 
                background: 'linear-gradient(180deg, #0a1628 0%, #070f1c 100%)',
                borderColor: 'rgba(34, 211, 238, 0.15)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-3 h-3 rounded-full transition-colors duration-200 hover:bg-red-400/80 cursor-pointer"
                    style={{ background: '#2a2a2a', border: '1px solid #3a3a3a' }}
                  />
                  <div 
                    className="w-3 h-3 rounded-full transition-colors duration-200 hover:bg-amber-400/80 cursor-pointer"
                    style={{ background: '#2a2a2a', border: '1px solid #3a3a3a' }}
                  />
                  <div 
                    className="w-3 h-3 rounded-full transition-colors duration-200 hover:bg-emerald-400/80 cursor-pointer"
                    style={{ background: '#2a2a2a', border: '1px solid #3a3a3a' }}
                  />
                </div>
              </div>
              <span className="font-mono text-[11px] text-slate-500 tracking-widest uppercase">
                sentinel — bash
              </span>
              <div className="w-12" />
            </div>

            {/* Terminal body */}
            <div
              className="border rounded-b-lg relative overflow-hidden backdrop-blur-sm"
              style={{ 
                background: 'linear-gradient(180deg, #050a14 0%, #03060c 100%)',
                borderColor: 'rgba(34, 211, 238, 0.15)',
                boxShadow: `
                  inset 0 0 80px rgba(34, 211, 238, 0.03),
                  0 0 60px rgba(0,0,0,0.5),
                  0 0 100px rgba(34, 211, 238, 0.05)
                `,
              }}
            >
              {/* Terminal glow */}
              <div 
                className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"
              />

              {/* Boot sequence */}
              <div className="px-6 pt-6 pb-4">
                {BOOT_LINES.map((line, i) => (
                  <BootLine 
                    key={i} 
                    text={line.text} 
                    delay={line.delay} 
                    color={line.color} 
                    weight={line.weight}
                  />
                ))}
              </div>

              {/* Navigation — appears after boot */}
              <div
                className="transition-all duration-700 ease-out overflow-hidden"
                style={{
                  maxHeight: bootDone ? '450px' : '0px',
                  opacity: bootDone ? 1 : 0,
                }}
              >
                {/* Divider */}
                <div className="mx-6 my-2 relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent h-px" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-700/50 to-transparent h-px mt-px" />
                </div>

                {/* Nav links */}
                <div className="p-6 space-y-2">
                  {NAV_ITEMS.map((item, index) => (
                    <Link
                      key={item.key}
                      href={item.href}
                      onMouseEnter={() => setHoveredNav(item.key)}
                      onMouseLeave={() => setHoveredNav(null)}
                      className="group block rounded-lg px-4 py-3 transition-all duration-200"
                      style={{
                        background: hoveredNav === item.key 
                          ? 'linear-gradient(90deg, rgba(34, 211, 238, 0.08) 0%, transparent 100%)' 
                          : 'transparent',
                        borderLeft: hoveredNav === item.key 
                          ? '2px solid rgba(34, 211, 238, 0.5)' 
                          : '2px solid transparent',
                        transform: pressedKey === String(index + 1) ? 'scale(0.98)' : 'scale(1)',
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <span 
                          className={`font-mono text-[11px] shrink-0 transition-colors duration-200 ${
                            hoveredNav === item.key ? 'text-cyan-400' : 'text-slate-600'
                          }`}
                        >
                          [{item.shortcut}]
                        </span>
                        <span className={`font-mono text-[14px] font-semibold transition-colors duration-200 ${
                          hoveredNav === item.key ? 'text-cyan-300' : 'text-slate-300'
                        }`}>
                          {item.label}
                        </span>
                        <span
                          className="transition-all duration-200 font-mono text-[12px]"
                          style={{
                            opacity: hoveredNav === item.key ? 1 : 0,
                            transform: hoveredNav === item.key ? 'translateX(0)' : 'translateX(-6px)',
                            color: '#22d3ee',
                          }}
                        >
                          {'->'}
                        </span>
                      </div>
                      <p className="font-mono text-[11px] text-slate-500 mt-1 ml-[52px] group-hover:text-slate-400 transition-colors">
                        {item.desc}
                      </p>
                    </Link>
                  ))}
                </div>

                {/* Prompt line */}
                <div className="px-6 pb-6">
                  <div className="font-mono text-[13px] flex items-center gap-1.5">
                    <span className="text-cyan-500 font-semibold">sentinel</span>
                    <span className="text-slate-600">:</span>
                    <span className="text-slate-500">~</span>
                    <span className="text-slate-600">$</span>
                    <span className="inline-block w-[8px] h-[16px] bg-cyan-400/70 ml-1.5 animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata bar */}
          <div
            className="flex items-center justify-between mt-5 px-2 transition-all duration-700 ease-out"
            style={{ opacity: bootDone ? 1 : 0, transform: bootDone ? 'translateY(0)' : 'translateY(10px)' }}
          >
            <div className="flex items-center gap-2 font-mono text-[10px] text-slate-600">
              <span className="hover:text-cyan-400 transition-colors cursor-default">SKALE</span>
              <span className="text-slate-700">/</span>
              <span className="hover:text-cyan-400 transition-colors cursor-default">BITE</span>
              <span className="text-slate-700">/</span>
              <span className="hover:text-cyan-400 transition-colors cursor-default">x402</span>
              <span className="text-slate-700">/</span>
              <span className="hover:text-cyan-400 transition-colors cursor-default">ERC-8004</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
              <span className="font-mono text-[10px] text-slate-500">
                all systems operational
              </span>
            </div>
          </div>

          {/* Keyboard hint */}
          <div
            className="mt-4 text-center transition-all duration-700 delay-300"
            style={{ opacity: bootDone ? 0.5 : 0 }}
          >
            <span className="font-mono text-[9px] text-slate-600">
              press [1], [2], or [3] to navigate
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
