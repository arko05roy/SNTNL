'use client';

import { useState, useEffect } from 'react';
import type { X402PaymentResult } from '@/lib/x402';
import type { ServiceProvider } from '@/types';
import { getExplorerTxUrl } from '@/lib/contracts';

interface PaymentSettlementProps {
  paymentResult: X402PaymentResult | null;
  winnerName?: string;
  amount?: bigint;
  provider?: ServiceProvider;
}

export function PaymentSettlement({ paymentResult, winnerName, amount, provider }: PaymentSettlementProps) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!paymentResult) {
      // Animate payment flow steps
      const timers = [
        setTimeout(() => setStep(1), 300),
        setTimeout(() => setStep(2), 900),
        setTimeout(() => setStep(3), 1500),
      ];
      return () => timers.forEach(clearTimeout);
    } else {
      setStep(4);
    }
  }, [paymentResult]);

  const steps = [
    { label: 'AP2 PaymentMandate authorized', active: step >= 1 },
    { label: 'Initiating x402 payment...', active: step >= 2 },
    { label: 'BITE encrypted settlement...', active: step >= 3 },
    { label: step < 4 ? 'Settling...' : paymentResult?.success ? 'x402 payment settled' : 'Payment failed', active: step >= 4 },
  ];

  return (
    <div
      className={`mt-6 border rounded-xl p-5 transition-all ${
        paymentResult?.success
          ? 'bg-blue-500/10 border-blue-500/30'
          : paymentResult?.error
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-white/5 border-white/10'
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-semibold">x402 Payment Settlement</h3>
        <span className="font-mono text-[8px] px-1 py-0.5 rounded" style={{ background: 'rgba(96,165,250,0.1)', color: 'rgba(96,165,250,0.6)' }}>AP2</span>
        <span className="font-mono text-[8px] px-1 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: 'rgba(245,158,11,0.6)' }}>BITE</span>
      </div>

      <div className="space-y-2 mb-4">
        {steps.map((s, i) => (
          <div
            key={i}
            className={`flex items-center gap-2 text-sm transition-all duration-300 ${
              s.active ? 'opacity-100' : 'opacity-20'
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${
              i < step ? 'bg-green-400' : i === step ? 'bg-yellow-400 animate-pulse' : 'bg-gray-600'
            }`} />
            <span className="text-gray-300">{s.label}</span>
          </div>
        ))}
      </div>

      {paymentResult && (
        <div className="pt-3 border-t border-white/10 space-y-1">
          {winnerName && amount && (
            <p className="text-sm text-gray-300">
              {winnerName} pays {(Number(amount) / 1000).toFixed(1)}k tokens
              {provider && (
                <span className="text-cyan-400"> &#8594; {provider.name}</span>
              )}
            </p>
          )}
          {provider && (
            <p className="text-xs font-mono text-gray-500">
              Recipient: {provider.address}
            </p>
          )}
          {paymentResult.transactionHash && (
            <p className="text-xs font-mono text-gray-500 break-all">
              Tx:{' '}
              <a
                href={getExplorerTxUrl(paymentResult.transactionHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                {paymentResult.transactionHash}
              </a>
            </p>
          )}
          {paymentResult.error && (
            <p className="text-xs text-red-400">{paymentResult.error}</p>
          )}
          <p className="text-xs text-gray-500 mt-2">SKALE Base Sepolia &middot; BITE encrypted &middot; x402 SDK</p>
        </div>
      )}
    </div>
  );
}
