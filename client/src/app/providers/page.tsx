'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { SERVICE_REGISTRY_ABI, CONTRACT_ADDRESSES, getExplorerTxUrl } from '@/lib/contracts';
import { PROVIDERS as SEED_PROVIDERS } from '@/lib/providers';
import type { OnChainProvider } from '@/types';

type Step = 'form' | 'legal' | 'sign' | 'done';

const JURISDICTIONS = [
  { value: 'US-DE', label: 'US — Delaware' },
  { value: 'US-WY', label: 'US — Wyoming' },
  { value: 'SG', label: 'Singapore' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'GB', label: 'UK' },
  { value: 'DE', label: 'Germany' },
  { value: 'HK', label: 'Hong Kong' },
];

export default function ProvidersPage() {
  const { address, isConnected } = useAccount();
  const [onChainProviders, setOnChainProviders] = useState<OnChainProvider[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [approvalToken, setApprovalToken] = useState('');
  const [confirmedTxHash, setConfirmedTxHash] = useState('');

  const [legalName, setLegalName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [providerName, setProviderName] = useState('');
  const [serviceType, setServiceType] = useState('GPU Compute');
  const [basePrice, setBasePrice] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [capacityDetails, setCapacityDetails] = useState('');
  const [uptimeCommitment, setUptimeCommitment] = useState('99.9');
  const [maxLatencyMs, setMaxLatencyMs] = useState('');
  const [supportTier, setSupportTier] = useState<'community' | 'standard' | 'premium'>('standard');
  const [tosAccepted, setTosAccepted] = useState(false);
  const [liabilityAcknowledged, setLiabilityAcknowledged] = useState(false);
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);

  const { data: txHash, writeContract, isPending: txPending } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list' }),
      });
      const data = await res.json();
      if (data.providers) setOnChainProviders(data.providers);
    } catch {
      console.error('Failed to fetch providers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  useEffect(() => {
    if (txConfirmed && txHash && approvalToken && address) {
      fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          token: approvalToken,
          txHash,
          walletAddress: address,
        }),
      }).then(() => {
        setConfirmedTxHash(txHash);
        setStep('done');
        fetchProviders();
      });
    }
  }, [txConfirmed, txHash, approvalToken, address, fetchProviders]);

  async function handleSubmitApplication(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          walletAddress: address,
          legalName, contactEmail, website, jurisdiction,
          providerName, serviceType, basePrice,
          serviceDescription, capacityDetails,
          uptimeCommitment: Number(uptimeCommitment),
          maxLatencyMs: maxLatencyMs ? Number(maxLatencyMs) : undefined,
          supportTier,
          tosAccepted, liabilityAcknowledged, dataProcessingConsent,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setApprovalToken(data.approvalToken);
        setStep('sign');
      }
    } catch {
      setError('Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  function handleSignOnChain() {
    setError('');
    try {
      writeContract({
        address: CONTRACT_ADDRESSES.serviceRegistry,
        abi: SERVICE_REGISTRY_ABI,
        functionName: 'registerProvider',
        args: [providerName.trim(), serviceType, BigInt(basePrice)],
      });
    } catch {
      setError('Transaction failed');
    }
  }

  function resetForm() {
    setStep('form');
    setError('');
    setApprovalToken('');
    setConfirmedTxHash('');
    setLegalName(''); setContactEmail(''); setWebsite(''); setJurisdiction('');
    setProviderName(''); setServiceType('GPU Compute'); setBasePrice('');
    setServiceDescription(''); setCapacityDetails('');
    setUptimeCommitment('99.9'); setMaxLatencyMs(''); setSupportTier('standard');
    setTosAccepted(false); setLiabilityAcknowledged(false); setDataProcessingConsent(false);
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{ background: '#020408' }}>
        <BackgroundEffects />
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-6" style={{ borderColor: 'rgba(34, 211, 238, 0.2)', background: 'rgba(34, 211, 238, 0.05)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400">Registry</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Service Providers</h1>
          <p className="text-slate-400 mb-2">Verified provider registry for the SENTINEL procurement network.</p>
          <p className="text-slate-500 text-sm mb-8">Connect your wallet to register or browse existing providers.</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#020408' }}>
      <BackgroundEffects />
      
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-xs font-mono text-slate-600 hover:text-cyan-400 transition-colors mb-2 inline-flex items-center gap-1">
              ← back
            </Link>
            <h1 className="text-2xl font-bold text-white">Service Providers</h1>
            <p className="text-xs text-slate-500 font-mono mt-1">Verified Registry • SLA Commitments</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-slate-500">connected</span>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 mb-6">
          {(['Application', 'Legal', 'On-Chain', 'Done'] as const).map((label, i) => {
            const stepIdx = ['form', 'legal', 'sign', 'done'].indexOf(step);
            const isActive = i === stepIdx;
            const isDone = i < stepIdx;
            return (
              <div key={label} className="flex items-center">
                <div className={`flex items-center gap-1.5 text-[10px] font-mono ${isActive ? 'text-cyan-400' : isDone ? 'text-emerald-400' : 'text-slate-600'}`}>
                  <span className={`w-5 h-5 rounded flex items-center justify-center border ${isActive ? 'border-cyan-400 bg-cyan-400/10' : isDone ? 'border-emerald-400 bg-emerald-400/10' : 'border-slate-700'}`}>
                    {isDone ? '✓' : i + 1}
                  </span>
                </div>
                {i < 3 && <div className={`w-8 h-px ${isDone ? 'bg-emerald-400/30' : 'bg-slate-800'}`} />}
              </div>
            );
          })}
        </div>

        {/* Terminal Form */}
        <div className="border rounded-lg mb-8" style={{ background: 'linear-gradient(180deg, #050a14 0%, #03060c 100%)', borderColor: 'rgba(34, 211, 238, 0.15)' }}>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b" style={{ background: 'rgba(10, 22, 40, 0.8)', borderColor: 'rgba(34, 211, 238, 0.1)' }}>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2a2a2a' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2a2a2a' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2a2a2a' }} />
            </div>
            <span className="text-[10px] font-mono text-slate-500 ml-2">sentinel — providers/register</span>
          </div>

          <div className="p-5">
            {step === 'form' && (
              <form onSubmit={(e) => { e.preventDefault(); setStep('legal'); }} className="space-y-5">
                <div>
                  <h3 className="text-xs font-mono text-cyan-500 mb-3">&gt; Business Identity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Legal Entity *" value={legalName} onChange={setLegalName} placeholder="e.g. Acme Cloud LLC" required />
                    <Field label="Contact Email *" value={contactEmail} onChange={setContactEmail} placeholder="ops@acme.cloud" type="email" required />
                    <Field label="Website" value={website} onChange={setWebsite} placeholder="https://acme.cloud" />
                    <div>
                      <label className="block text-xs font-mono text-slate-500 mb-1.5">Jurisdiction *</label>
                      <select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} required
                        className="w-full bg-slate-900/80 border border-slate-800 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50">
                        <option value="">select...</option>
                        {JURISDICTIONS.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-mono text-cyan-500 mb-3">&gt; Service Specification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Field label="Provider Name *" value={providerName} onChange={setProviderName} placeholder="e.g. Acme GPU Pro" required />
                    <div>
                      <label className="block text-xs font-mono text-slate-500 mb-1.5">Service Type *</label>
                      <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}
                        className="w-full bg-slate-900/80 border border-slate-800 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50">
                        <option value="GPU Compute">GPU Compute</option>
                        <option value="Data Feed">Data Feed</option>
                        <option value="API Access">API Access</option>
                      </select>
                    </div>
                    <Field label="Base Price (tokens/hr) *" value={basePrice} onChange={setBasePrice} placeholder="100000" type="number" required min="1" />
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-mono text-slate-500 mb-1.5">Description *</label>
                    <textarea value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)}
                      placeholder="Describe your service offering..." rows={2} required minLength={20}
                      className="w-full bg-slate-900/80 border border-slate-800 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50 resize-none" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <Field label="Capacity *" value={capacityDetails} onChange={setCapacityDetails} placeholder="e.g. 8x A100 80GB" required />
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Uptime SLA (%) *" value={uptimeCommitment} onChange={setUptimeCommitment} type="number" min="90" max="100" step="0.1" required />
                      <Field label="Max Latency (ms)" value={maxLatencyMs} onChange={setMaxLatencyMs} type="number" placeholder="optional" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-500 mb-2">Support Tier *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { value: 'community' as const, label: 'Community', desc: 'forum only' },
                      { value: 'standard' as const, label: 'Standard', desc: '24hr email' },
                      { value: 'premium' as const, label: 'Premium', desc: '1hr response' },
                    ]).map(t => (
                      <button key={t.value} type="button" onClick={() => setSupportTier(t.value)}
                        className={`p-2 rounded border text-center transition-colors ${supportTier === t.value ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'}`}>
                        <span className={`text-xs font-mono block ${supportTier === t.value ? 'text-cyan-400' : 'text-slate-400'}`}>{t.label}</span>
                        <span className="text-[10px] font-mono text-slate-600">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <button type="submit"
                    disabled={!legalName || !contactEmail || !jurisdiction || !providerName || !basePrice || !serviceDescription || !capacityDetails}
                    className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-cyan-400 text-xs font-mono rounded border transition-colors"
                    style={{ borderColor: 'rgba(34, 211, 238, 0.3)' }}>
                    continue &gt;
                  </button>
                </div>
              </form>
            )}

            {step === 'legal' && (
              <form onSubmit={handleSubmitApplication} className="space-y-4">
                <div>
                  <h3 className="text-xs font-mono text-cyan-500 mb-3">&gt; Terms & Agreements</h3>
                  <p className="text-[10px] font-mono text-slate-600 mb-4">Review and accept before on-chain registration.</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded p-3">
                  <h4 className="text-xs font-mono text-slate-300 mb-2">Provider Terms of Service</h4>
                  <div className="text-[10px] font-mono text-slate-500 space-y-1 max-h-24 overflow-y-auto pr-2">
                    <p>• Service obligations and SLA commitments</p>
                    <p>• Accurate representation requirements</p>
                    <p>• Pricing transparency</p>
                    <p>• Compliance with applicable laws</p>
                    <p>• Dispute resolution process</p>
                  </div>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" checked={tosAccepted} onChange={(e) => setTosAccepted(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500/30" />
                    <span className="text-[10px] font-mono text-slate-400">I accept the ToS</span>
                  </label>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded p-3">
                  <h4 className="text-xs font-mono text-slate-300 mb-2">Liability Acknowledgement</h4>
                  <div className="text-[10px] font-mono text-slate-500 space-y-1 mb-2">
                    <p>• On-chain data is permanent and public</p>
                    <p>• Zero gas fees on SKALE</p>
                    <p>• Wallet security is your responsibility</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={liabilityAcknowledged} onChange={(e) => setLiabilityAcknowledged(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500/30" />
                    <span className="text-[10px] font-mono text-slate-400">I acknowledge</span>
                  </label>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded p-3">
                  <h4 className="text-xs font-mono text-slate-300 mb-2">Data Processing Consent</h4>
                  <p className="text-[10px] font-mono text-slate-500 mb-2">Contact email will not be shared publicly. On-chain data is public.</p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={dataProcessingConsent} onChange={(e) => setDataProcessingConsent(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500/30" />
                    <span className="text-[10px] font-mono text-slate-400">I consent</span>
                  </label>
                </div>

                {error && <p className="text-red-400 text-xs font-mono">{error}</p>}

                <div className="flex items-center justify-between pt-2">
                  <button type="button" onClick={() => setStep('form')} className="text-xs font-mono text-slate-500 hover:text-slate-400 transition-colors">
                    &lt; back
                  </button>
                  <button type="submit"
                    disabled={submitting || !tosAccepted || !liabilityAcknowledged || !dataProcessingConsent}
                    className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-cyan-400 text-xs font-mono rounded border transition-colors"
                    style={{ borderColor: 'rgba(34, 211, 238, 0.3)' }}>
                    {submitting ? 'validating...' : 'submit application'}
                  </button>
                </div>
              </form>
            )}

            {step === 'sign' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-mono text-cyan-500 mb-2">&gt; On-Chain Registration</h3>
                  <p className="text-[10px] font-mono text-slate-500 mb-4">Sign transaction to register.</p>
                </div>

                <div className="bg-slate-900/50 border border-slate-800 rounded p-3 space-y-1.5 text-[10px] font-mono">
                  <div className="flex justify-between"><span className="text-slate-500">provider</span><span className="text-white">{providerName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">type</span><span className="text-white">{serviceType}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">price</span><span className="text-white">{basePrice} tokens/hr</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">jurisdiction</span><span className="text-white">{jurisdiction}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">SLA</span><span className="text-white">{uptimeCommitment}%</span></div>
                </div>

                {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
                {txHash && !txConfirmed && <p className="text-amber-400 text-[10px] font-mono">transaction submitted. waiting...</p>}

                <div className="flex items-center justify-between pt-2">
                  <button type="button" onClick={() => setStep('legal')} className="text-xs font-mono text-slate-500 hover:text-slate-400 transition-colors">
                    &lt; back
                  </button>
                  <button onClick={handleSignOnChain} disabled={txPending || !!txHash}
                    className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-cyan-400 text-xs font-mono rounded border transition-colors"
                    style={{ borderColor: 'rgba(34, 211, 238, 0.3)' }}>
                    {txPending ? 'signing...' : txHash ? 'confirming...' : 'sign & register'}
                  </button>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="text-center py-6 space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 text-lg">
                  ✓
                </div>
                <div>
                  <h3 className="text-sm font-mono text-white">Provider Registered</h3>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">Your profile is live on SENTINEL.</p>
                </div>
                {confirmedTxHash && (
                  <a href={getExplorerTxUrl(confirmedTxHash)} target="_blank" rel="noopener noreferrer"
                    className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300">
                    tx: {confirmedTxHash.slice(0, 12)}...{confirmedTxHash.slice(-6)}
                  </a>
                )}
                <button onClick={resetForm} className="text-[10px] font-mono text-slate-500 hover:text-slate-400 transition-colors mt-2">
                  register another
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Provider Listing */}
        <div className="space-y-6">
          {onChainProviders.length > 0 && (
            <div>
              <h2 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">On-Chain Providers</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {onChainProviders.map((p) => (
                  <ProviderCard key={p.address} provider={p} isOnChain />
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-3">
              {loading ? 'loading...' : 'Demo Providers'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {SEED_PROVIDERS.map((p) => (
                <ProviderCard
                  key={p.address}
                  provider={{ ...p, active: true, isOnChain: false } as unknown as OnChainProvider}
                  isOnChain={false}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type, required, min, max, step, minLength }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; required?: boolean; min?: string; max?: string; step?: string; minLength?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-mono text-slate-500 mb-1.5">{label}</label>
      <input type={type || 'text'} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={required} min={min} max={max} step={step} minLength={minLength}
        className="w-full bg-slate-900/80 border border-slate-800 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50" />
    </div>
  );
}

function ProviderCard({ provider, isOnChain }: { provider: OnChainProvider; isOnChain: boolean }) {
  const typeColors: Record<string, string> = {
    'GPU Compute': 'text-purple-400 border-purple-400/30',
    'Data Feed': 'text-cyan-400 border-cyan-400/30',
    'API Access': 'text-emerald-400 border-emerald-400/30',
  };

  const profile = provider.profile;

  return (
    <div className="border rounded-lg p-4 transition-colors hover:border-cyan-500/30"
      style={{ background: 'rgba(5, 10, 20, 0.6)', borderColor: 'rgba(34, 211, 238, 0.1)' }}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-mono text-white">{provider.name}</h3>
          {profile?.legalName && (
            <p className="text-[10px] font-mono text-slate-600 mt-0.5">{profile.legalName}</p>
          )}
          <p className="text-[10px] font-mono text-slate-700 mt-0.5">
            {provider.address.slice(0, 8)}...{provider.address.slice(-6)}
          </p>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${typeColors[provider.serviceType] || 'text-slate-400 border-slate-400/30'}`}>
          {provider.serviceType}
        </span>
      </div>

      {profile?.serviceDescription && (
        <p className="text-[10px] font-mono text-slate-500 mb-2 line-clamp-1">{profile.serviceDescription}</p>
      )}

      {profile && (
        <div className="flex flex-wrap gap-1 mb-2">
          {profile.uptimeCommitment && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-400">SLA {profile.uptimeCommitment}%</span>
          )}
          {profile.jurisdiction && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-400">{profile.jurisdiction}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-slate-300">
          <span className="text-white">{provider.basePrice.toString()}</span>
          <span className="text-slate-600 ml-1">tokens/hr</span>
        </span>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isOnChain ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-800 text-slate-500'}`}>
          {isOnChain ? 'on-chain' : 'demo'}
        </span>
      </div>
    </div>
  );
}

function BackgroundEffects() {
  return (
    <>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(16, 185, 129, 0.06) 0%, transparent 50%)`,
      }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: `linear-gradient(rgba(34, 211, 238, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.02) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
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
