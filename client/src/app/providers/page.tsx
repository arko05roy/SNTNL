'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { SERVICE_REGISTRY_ABI, CONTRACT_ADDRESSES, getExplorerTxUrl } from '@/lib/contracts';
import { PROVIDERS as SEED_PROVIDERS } from '@/lib/providers';
import type { OnChainProvider } from '@/types';

type Step = 'form' | 'legal' | 'sign' | 'done';

const JURISDICTIONS = [
  { value: 'US-DE', label: 'United States — Delaware' },
  { value: 'US-WY', label: 'United States — Wyoming' },
  { value: 'US-CA', label: 'United States — California' },
  { value: 'SG', label: 'Singapore' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'IE', label: 'Ireland' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'KY', label: 'Cayman Islands' },
  { value: 'HK', label: 'Hong Kong' },
  { value: 'JP', label: 'Japan' },
];

export default function ProvidersPage() {
  const { address, isConnected } = useAccount();
  const [onChainProviders, setOnChainProviders] = useState<OnChainProvider[]>([]);
  const [loading, setLoading] = useState(false);

  // Registration state
  const [step, setStep] = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [approvalToken, setApprovalToken] = useState('');
  const [confirmedTxHash, setConfirmedTxHash] = useState('');

  // Form fields — Business
  const [legalName, setLegalName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');

  // Form fields — Service
  const [providerName, setProviderName] = useState('');
  const [serviceType, setServiceType] = useState('GPU Compute');
  const [basePrice, setBasePrice] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [capacityDetails, setCapacityDetails] = useState('');
  const [uptimeCommitment, setUptimeCommitment] = useState('99.9');
  const [maxLatencyMs, setMaxLatencyMs] = useState('');
  const [supportTier, setSupportTier] = useState<'community' | 'standard' | 'premium'>('standard');

  // Legal
  const [tosAccepted, setTosAccepted] = useState(false);
  const [liabilityAcknowledged, setLiabilityAcknowledged] = useState(false);
  const [dataProcessingConsent, setDataProcessingConsent] = useState(false);

  // On-chain tx
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

  // After on-chain tx confirms, notify server
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

  // Step 1 → Step 2: Submit application to server
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
      setError('Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // Step 3: Sign on-chain tx
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
      setError('Transaction failed. Please try again.');
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
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Service Providers</h1>
        <p className="text-gray-400 mb-2">Verified provider registry for the SENTINEL procurement network.</p>
        <p className="text-gray-500 text-sm mb-6">Connect your wallet to register as a provider or browse existing providers.</p>
        <div className="inline-block"><ConnectButton /></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-white mb-1">Service Providers</h1>
      <p className="text-gray-400 text-sm mb-8">Verified provider registry with SLA commitments and on-chain registration.</p>

      {/* Registration */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {(['Application', 'Legal Review', 'On-Chain Registration', 'Complete'] as const).map((label, i) => {
            const stepIdx = ['form', 'legal', 'sign', 'done'].indexOf(step);
            const isActive = i === stepIdx;
            const isDone = i < stepIdx;
            return (
              <div key={label} className="flex items-center gap-2">
                {i > 0 && <div className={`w-8 h-px ${isDone ? 'bg-blue-500' : 'bg-gray-700'}`} />}
                <div className={`flex items-center gap-1.5 text-xs font-medium ${isActive ? 'text-blue-400' : isDone ? 'text-green-400' : 'text-gray-600'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] border ${isActive ? 'border-blue-400 text-blue-400' : isDone ? 'border-green-400 bg-green-400/10 text-green-400' : 'border-gray-700 text-gray-600'}`}>
                    {isDone ? '\u2713' : i + 1}
                  </span>
                  <span className="hidden sm:inline">{label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* STEP: Application Form */}
        {step === 'form' && (
          <form onSubmit={(e) => { e.preventDefault(); setStep('legal'); }} className="space-y-6">
            {/* Business Identity */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Business Identity</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Legal Entity Name *" value={legalName} onChange={setLegalName} placeholder="e.g. Acme Cloud Services LLC" required />
                <Field label="Contact Email *" value={contactEmail} onChange={setContactEmail} placeholder="ops@acme.cloud" type="email" required />
                <Field label="Website" value={website} onChange={setWebsite} placeholder="https://acme.cloud" />
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Jurisdiction *</label>
                  <select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="">Select jurisdiction...</option>
                    {JURISDICTIONS.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Service Specification */}
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Service Specification</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Provider Name *" value={providerName} onChange={setProviderName} placeholder="e.g. Acme GPU Pro" required />
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5">Service Type *</label>
                  <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="GPU Compute">GPU Compute</option>
                    <option value="Data Feed">Data Feed</option>
                    <option value="API Access">API Access</option>
                  </select>
                </div>
                <Field label="Base Price (tokens/hr) *" value={basePrice} onChange={setBasePrice} placeholder="100000" type="number" required min="1" />
              </div>
              <div className="mt-4">
                <label className="block text-sm text-gray-400 mb-1.5">Service Description *</label>
                <textarea value={serviceDescription} onChange={(e) => setServiceDescription(e.target.value)}
                  placeholder="Describe your service offering in detail. Include hardware specs, supported frameworks, API capabilities, data sources, etc. (min 20 characters)"
                  rows={3} required minLength={20}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Field label="Capacity Details *" value={capacityDetails} onChange={setCapacityDetails} placeholder="e.g. 8x NVIDIA A100 80GB, 100k req/min" required />
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Uptime SLA (%) *" value={uptimeCommitment} onChange={setUptimeCommitment} type="number" min="90" max="100" step="0.1" required />
                  <Field label="Max Latency (ms)" value={maxLatencyMs} onChange={setMaxLatencyMs} type="number" placeholder="Optional" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm text-gray-400 mb-1.5">Support Tier *</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'community' as const, label: 'Community', desc: 'Forum + docs only' },
                    { value: 'standard' as const, label: 'Standard', desc: '24hr email response' },
                    { value: 'premium' as const, label: 'Premium', desc: '1hr response, dedicated contact' },
                  ]).map(t => (
                    <button key={t.value} type="button" onClick={() => setSupportTier(t.value)}
                      className={`p-3 rounded-lg border text-left transition-colors ${supportTier === t.value ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'}`}>
                      <span className={`text-sm font-medium ${supportTier === t.value ? 'text-blue-400' : 'text-gray-300'}`}>{t.label}</span>
                      <p className="text-xs text-gray-500 mt-0.5">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit"
                disabled={!legalName || !contactEmail || !jurisdiction || !providerName || !basePrice || !serviceDescription || !capacityDetails}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
                Continue to Legal Review
              </button>
            </div>
          </form>
        )}

        {/* STEP: Legal / ToS */}
        {step === 'legal' && (
          <form onSubmit={handleSubmitApplication} className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Terms of Service & Legal Agreements</h3>
              <p className="text-xs text-gray-500 mb-4">
                Please review and accept the following agreements before proceeding with on-chain registration.
                Your acceptance is recorded with a timestamp and linked to your wallet address.
              </p>
            </div>

            {/* ToS */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">Provider Terms of Service (v1.0.0)</h4>
              <div className="text-xs text-gray-400 space-y-2 max-h-40 overflow-y-auto pr-2 mb-3">
                <p>By registering as a Service Provider on the SENTINEL network, you agree to:</p>
                <p><strong className="text-gray-300">1. Service Obligations.</strong> You will provide the services described in your registration at the stated quality levels, including uptime commitments and response times. Failure to meet stated SLAs may result in reputation penalties and potential removal from the registry.</p>
                <p><strong className="text-gray-300">2. Accurate Representation.</strong> All information provided in your registration is accurate and not misleading. You will promptly update your registration if any material information changes.</p>
                <p><strong className="text-gray-300">3. Pricing Transparency.</strong> Your stated base price is binding for auction participation. Additional fees, if any, must be disclosed upfront.</p>
                <p><strong className="text-gray-300">4. Compliance.</strong> You are responsible for compliance with all applicable laws and regulations in your jurisdiction, including but not limited to data protection, export controls, and sanctions compliance.</p>
                <p><strong className="text-gray-300">5. Dispute Resolution.</strong> Service disputes will be handled through the SENTINEL arbitration process. You agree to participate in good faith in any dispute resolution proceedings.</p>
                <p><strong className="text-gray-300">6. Termination.</strong> Either party may terminate the provider relationship by deactivating the on-chain registration. Pending obligations must be fulfilled prior to termination.</p>
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={tosAccepted} onChange={(e) => setTosAccepted(e.target.checked)}
                  className="mt-0.5 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500" />
                <span className="text-sm text-gray-300">I have read and accept the Provider Terms of Service</span>
              </label>
            </div>

            {/* Liability */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">Liability Acknowledgement</h4>
              <div className="text-xs text-gray-400 space-y-2 mb-3">
                <p>Smart contracts on the SKALE network are immutable once deployed. On-chain registration is permanent and publicly visible. You acknowledge that:</p>
                <p>- Your wallet address and provider details will be permanently recorded on a public blockchain.</p>
                <p>- SENTINEL provides the marketplace infrastructure only and assumes no liability for service quality, uptime, or disputes between providers and consumers.</p>
                <p>- You are solely responsible for the security of your wallet and private keys.</p>
                <p>- Gas fees on SKALE are zero, but you accept all risks associated with blockchain transactions.</p>
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={liabilityAcknowledged} onChange={(e) => setLiabilityAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500" />
                <span className="text-sm text-gray-300">I acknowledge and accept the liability terms</span>
              </label>
            </div>

            {/* Data Processing */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="text-sm font-medium text-white mb-2">Data Processing Consent</h4>
              <div className="text-xs text-gray-400 space-y-2 mb-3">
                <p>Your registration data (legal name, contact email, jurisdiction) is stored server-side and linked to your on-chain identity. This data is used to:</p>
                <p>- Verify your provider identity and eligibility</p>
                <p>- Facilitate communication regarding service disputes or platform updates</p>
                <p>- Comply with applicable regulatory requirements</p>
                <p>Your contact email will not be shared publicly. On-chain data (provider name, service type, pricing) is inherently public.</p>
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={dataProcessingConsent} onChange={(e) => setDataProcessingConsent(e.target.checked)}
                  className="mt-0.5 rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500" />
                <span className="text-sm text-gray-300">I consent to the processing of my data as described above</span>
              </label>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={() => setStep('form')} className="text-sm text-gray-400 hover:text-gray-300 transition-colors">
                Back to Application
              </button>
              <button type="submit"
                disabled={submitting || !tosAccepted || !liabilityAcknowledged || !dataProcessingConsent}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
                {submitting ? 'Validating...' : 'Submit Application'}
              </button>
            </div>
          </form>
        )}

        {/* STEP: Sign On-Chain */}
        {step === 'sign' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-2">On-Chain Registration</h3>
              <p className="text-xs text-gray-400 mb-4">
                Your application has been validated. Sign the transaction below to register on-chain.
                This will call <code className="text-gray-300 bg-gray-800 px-1 rounded">registerProvider()</code> on the ServiceRegistry contract.
              </p>
            </div>

            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Provider Name</span>
                <span className="text-white">{providerName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Service Type</span>
                <span className="text-white">{serviceType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Base Price</span>
                <span className="text-white font-mono">{basePrice} tokens/hr</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Wallet</span>
                <span className="text-white font-mono text-xs">{address}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Legal Entity</span>
                <span className="text-white">{legalName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Jurisdiction</span>
                <span className="text-white">{jurisdiction}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">SLA Uptime</span>
                <span className="text-white">{uptimeCommitment}%</span>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {txHash && !txConfirmed && <p className="text-yellow-400 text-sm">Transaction submitted. Waiting for confirmation...</p>}

            <div className="flex items-center justify-between pt-2">
              <button type="button" onClick={() => setStep('legal')} className="text-sm text-gray-400 hover:text-gray-300 transition-colors">
                Back
              </button>
              <button onClick={handleSignOnChain} disabled={txPending || !!txHash}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors">
                {txPending ? 'Sign in Wallet...' : txHash ? 'Confirming...' : 'Sign & Register On-Chain'}
              </button>
            </div>
          </div>
        )}

        {/* STEP: Done */}
        {step === 'done' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-green-400/10 border border-green-400/20 flex items-center justify-center mx-auto text-green-400 text-xl">
              {'\u2713'}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Provider Registered Successfully</h3>
              <p className="text-sm text-gray-400 mt-1">Your provider profile is live on the SENTINEL network.</p>
            </div>
            {confirmedTxHash && (
              <a href={getExplorerTxUrl(confirmedTxHash)} target="_blank" rel="noopener noreferrer"
                className="inline-block text-xs text-blue-400 hover:text-blue-300 font-mono">
                View transaction: {confirmedTxHash.slice(0, 10)}...{confirmedTxHash.slice(-6)}
              </a>
            )}
            <button onClick={resetForm} className="block mx-auto text-sm text-gray-400 hover:text-gray-300 transition-colors mt-4">
              Register another provider
            </button>
          </div>
        )}
      </div>

      {/* Provider Listing */}
      <div className="space-y-6">
        {onChainProviders.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Registered Providers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {onChainProviders.map((p) => (
                <ProviderCard key={p.address} provider={p} isOnChain />
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            {loading ? 'Loading...' : 'Seed Providers (Demo)'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SEED_PROVIDERS.map((p) => (
              <ProviderCard
                key={p.address}
                provider={{ ...p, active: true, isOnChain: false as const } as any}
                isOnChain={false}
              />
            ))}
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
      <label className="block text-sm text-gray-400 mb-1.5">{label}</label>
      <input type={type || 'text'} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} required={required} min={min} max={max} step={step} minLength={minLength}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" />
    </div>
  );
}

function ProviderCard({ provider, isOnChain }: { provider: any; isOnChain: boolean }) {
  const typeColors: Record<string, string> = {
    'GPU Compute': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    'Data Feed': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    'API Access': 'text-green-400 bg-green-400/10 border-green-400/20',
  };

  const verificationColors: Record<string, string> = {
    verified: 'text-green-400 bg-green-400/10',
    pending: 'text-yellow-400 bg-yellow-400/10',
    suspended: 'text-red-400 bg-red-400/10',
  };

  const profile = provider.profile;

  return (
    <div className={`bg-gray-900 border rounded-xl p-5 ${provider.active ? 'border-gray-800' : 'border-gray-800/50 opacity-60'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-white font-semibold">{provider.name}</h3>
          {profile?.legalName && (
            <p className="text-xs text-gray-500 mt-0.5">{profile.legalName}</p>
          )}
          <p className="text-xs text-gray-500 font-mono mt-0.5">
            {provider.address.slice(0, 6)}...{provider.address.slice(-4)}
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${typeColors[provider.serviceType] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>
          {provider.serviceType}
        </span>
      </div>

      {profile?.serviceDescription && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">{profile.serviceDescription}</p>
      )}

      {profile && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {profile.uptimeCommitment && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">SLA {profile.uptimeCommitment}%</span>
          )}
          {profile.jurisdiction && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">{profile.jurisdiction}</span>
          )}
          {profile.supportTier && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">{profile.supportTier}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">
          <span className="text-white font-mono">{provider.basePrice.toString()}</span>
          <span className="text-xs text-gray-500 ml-1">tokens/hr</span>
        </span>
        <div className="flex items-center gap-1.5">
          {profile?.verificationStatus && (
            <span className={`text-xs px-1.5 py-0.5 rounded ${verificationColors[profile.verificationStatus] || ''}`}>
              {profile.verificationStatus}
            </span>
          )}
          <span className={`text-xs px-1.5 py-0.5 rounded ${isOnChain ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-700 text-gray-400'}`}>
            {isOnChain ? 'on-chain' : 'seed'}
          </span>
        </div>
      </div>
    </div>
  );
}
