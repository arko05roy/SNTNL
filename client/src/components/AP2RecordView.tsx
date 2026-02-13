'use client';

import { useState } from 'react';
import type { AP2TransactionRecord } from '@/lib/ap2';

interface Props {
  record: AP2TransactionRecord;
}

export function AP2RecordView({ record }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const toggle = (section: string) =>
    setExpanded(expanded === section ? null : section);

  const v = record.validation;
  const allValid = v.intent_valid && v.cart_signed && v.payment_authorized && v.spend_within_limits;

  return (
    <div className="my-6 border rounded-lg overflow-hidden" style={{ borderColor: 'rgba(34,211,238,0.2)', background: 'rgba(5,10,20,0.8)' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between" style={{ background: 'rgba(34,211,238,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(34,211,238,0.15)', color: '#22d3ee' }}>
            AP2
          </div>
          <div>
            <div className="font-mono text-sm text-white">Agent Payments Protocol — Transaction Record</div>
            <div className="font-mono text-[10px] text-slate-500">{record.transaction_id}</div>
          </div>
        </div>
        <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${allValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {allValid ? 'ALL CHECKS PASSED' : 'VALIDATION ISSUES'}
        </div>
      </div>

      {/* Flow visualization */}
      <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-3 uppercase tracking-widest">
          <span>AP2 Authorization Chain</span>
        </div>
        <div className="flex items-center gap-2">
          {[
            { label: 'Intent', ok: v.intent_valid, key: 'intent' },
            { label: 'Cart', ok: v.cart_signed, key: 'cart' },
            { label: 'Payment', ok: v.payment_authorized, key: 'payment' },
            { label: 'Settlement', ok: v.settlement_confirmed, key: 'settlement' },
          ].map((step, i) => (
            <div key={step.key} className="flex items-center gap-2">
              <button
                onClick={() => toggle(step.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded transition-all"
                style={{
                  background: expanded === step.key ? 'rgba(34,211,238,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${step.ok ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${step.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="font-mono text-xs text-slate-300">{step.label}</span>
              </button>
              {i < 3 && <span className="text-slate-700 text-xs">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Expandable sections */}
      {expanded === 'intent' && (
        <MandateSection title="IntentMandate" subtitle="Agent procurement policy">
          <Row label="Description" value={record.intent_mandate.natural_language_description} />
          <Row label="Service Types" value={record.intent_mandate.service_types?.join(', ') || 'Any'} />
          <Row label="Max Spend" value={record.intent_mandate.max_spend != null ? `${record.intent_mandate.max_spend} tokens` : 'Unlimited'} />
          <Row label="Strategy" value={record.intent_mandate.strategy || 'N/A'} />
          <Row label="Expires" value={record.intent_mandate.intent_expiry} />
          <Row label="Allowed Providers" value={record.intent_mandate.merchants?.join(', ') || 'Unrestricted'} />
          <StatusRow label="Valid" ok={v.intent_valid} />
          <StatusRow label="Within Spend Limit" ok={v.spend_within_limits} />
        </MandateSection>
      )}

      {expanded === 'cart' && (
        <MandateSection title="CartMandate" subtitle="Provider-signed service offering">
          <Row label="Cart ID" value={record.cart_mandate.contents.id} />
          <Row label="Provider" value={`${record.cart_mandate.contents.merchant_name} (${record.cart_mandate.contents.merchant_address.slice(0, 10)}...)`} />
          <Row label="Service" value={record.cart_mandate.contents.payment_request.details.display_items[0]?.label || ''} />
          <Row label="Price" value={`${record.cart_mandate.contents.payment_request.details.total.amount.value} ${record.cart_mandate.contents.payment_request.details.total.amount.currency}`} />
          <Row label="Payment Method" value={record.cart_mandate.contents.payment_request.method_data[0]?.supported_methods || ''} />
          <Row label="Expires" value={record.cart_mandate.contents.cart_expiry} />
          <Row label="Authorization Hash" value={record.cart_mandate.merchant_authorization.slice(0, 32) + '...'} mono />
          <StatusRow label="Signature Valid" ok={v.cart_signed} />
        </MandateSection>
      )}

      {expanded === 'payment' && (
        <MandateSection title="PaymentMandate" subtitle="Agent payment authorization">
          <Row label="Mandate ID" value={record.payment_mandate.payment_mandate_contents.payment_mandate_id} mono />
          <Row label="Buyer Agent" value={record.payment_mandate.payment_mandate_contents.buyer_agent} />
          <Row label="Merchant Agent" value={record.payment_mandate.payment_mandate_contents.merchant_agent} />
          <Row label="Amount" value={`${record.payment_mandate.payment_mandate_contents.payment_details_total.amount.value} ${record.payment_mandate.payment_mandate_contents.payment_details_total.amount.currency}`} />
          <Row label="Settlement Method" value={record.payment_mandate.payment_mandate_contents.payment_response.method_name} />
          {record.payment_mandate.payment_mandate_contents.auction_id != null && (
            <Row label="Auction ID" value={`#${record.payment_mandate.payment_mandate_contents.auction_id}`} />
          )}
          <Row label="Authorized At" value={record.payment_mandate.payment_mandate_contents.timestamp} />
          <Row label="Authorization Chain" value={record.payment_mandate.user_authorization.slice(0, 40) + '...'} mono />
          <StatusRow label="Authorization Valid" ok={v.payment_authorized} />
        </MandateSection>
      )}

      {expanded === 'settlement' && (
        <MandateSection title="Settlement" subtitle="x402 on-chain payment + BITE encryption">
          <Row label="Protocol" value={record.settlement.protocol} />
          <Row label="Network" value={record.settlement.network} />
          <Row label="Chain ID" value={String(record.settlement.chain_id)} />
          <Row label="Gas Fees" value={`${record.settlement.gas_fees} (SKALE zero-gas)`} />
          {record.settlement.transaction_hash && (
            <Row label="Tx Hash" value={record.settlement.transaction_hash} mono />
          )}
          {record.settlement.settled_at && (
            <Row label="Settled At" value={record.settlement.settled_at} />
          )}
          {record.encryption && (
            <>
              <div className="my-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
              <Row label="Encryption" value={record.encryption.protocol} />
              <Row label="Bid Encrypted" value={record.encryption.encrypted ? 'Yes — threshold encrypted by BLS committee' : 'No'} />
              {record.encryption.bid_tx_hash && (
                <Row label="Encrypted Tx" value={record.encryption.bid_tx_hash} mono />
              )}
            </>
          )}
          <StatusRow label="Settlement Confirmed" ok={v.settlement_confirmed} />
        </MandateSection>
      )}

      {/* Raw JSON toggle */}
      <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="font-mono text-[10px] text-slate-500 hover:text-cyan-400 transition"
        >
          {showRaw ? '▼ Hide' : '▶ Show'} Raw AP2 Record (JSON)
        </button>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ap2-record-${record.transaction_id}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="font-mono text-[10px] text-cyan-500 hover:text-cyan-300 transition"
        >
          ↓ Download JSON
        </button>
      </div>

      {showRaw && (
        <div className="px-5 pb-4">
          <pre className="p-3 rounded text-[10px] font-mono text-slate-400 overflow-x-auto leading-relaxed" style={{ background: 'rgba(0,0,0,0.4)' }}>
            {JSON.stringify(record, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function MandateSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-xs text-cyan-400 font-semibold">{title}</span>
        <span className="font-mono text-[10px] text-slate-600">— {subtitle}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="font-mono text-[10px] text-slate-500 shrink-0">{label}</span>
      <span className={`font-mono text-[10px] text-slate-300 text-right break-all ${mono ? 'text-cyan-400/70' : ''}`}>{value}</span>
    </div>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex justify-between items-center gap-4 mt-1">
      <span className="font-mono text-[10px] text-slate-500">{label}</span>
      <span className={`font-mono text-[10px] font-semibold ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
        {ok ? '✓ PASS' : '✗ FAIL'}
      </span>
    </div>
  );
}
