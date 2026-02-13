'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/orderbook', label: 'Orderbook' },
  { href: '/agents', label: 'Agents' },
  { href: '/providers', label: 'Providers' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{ background: 'rgba(6, 11, 20, 0.85)', borderColor: '#1a2540', backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-mono text-[13px] font-bold tracking-tight text-cyan-400 hover:text-cyan-300 transition-colors">
            SENTINEL
          </Link>
          <div className="w-px h-4" style={{ background: '#1a2540' }} />
          <div className="flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-2.5 py-1 rounded font-mono text-[11px] transition-colors ${
                    active
                      ? 'text-cyan-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                  style={{
                    background: active ? 'rgba(34, 211, 238, 0.06)' : 'transparent',
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <ConnectButton />
      </div>
    </nav>
  );
}
