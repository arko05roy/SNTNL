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
    { label: 'Initiating x402 payment...', active: step >= 1 },
    { label: 'Signing authorization...', active: step >= 2 },
    { label: 'Processing settlement...', active: step >= 3 },
    { label: step < 4 ? 'Settling payment...' : paymentResult?.success ? 'Payment settled' : 'Payment failed', active: step >= 4 },
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
      <h3 className="font-semibold mb-4">x402 Payment Settlement</h3>

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
