'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import type { RegisteredAgent, BiddingStrategy, AgentService } from '@/types';

const EMPTY_SERVICE: AgentService = { name: '', endpoint: '', skills: [], domains: [] };

export default function AgentsPage() {
  const { address, isConnected } = useAccount();
  const [agents, setAgents] = useState<RegisteredAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [activeGlitch, setActiveGlitch] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [strategy, setStrategy] = useState<BiddingStrategy>('conservative');
  const [x402Support, setX402Support] = useState(true);
  const [services, setServices] = useState<AgentService[]>([{ ...EMPTY_SERVICE }]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (Math.random() > 0.9) {
      setActiveGlitch(true);
      setTimeout(() => setActiveGlitch(false), 80);
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list', ownerAddress: address }),
      });
      const data = await res.json();
      if (data.agents) setAgents(data.agents);
    } catch {
      console.error('Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected && address) fetchAgents();
  }, [isConnected, address, fetchAgents]);

  function updateService(idx: number, field: keyof AgentService, value: string) {
    setServices((prev) => {
      const next = [...prev];
      if (field === 'skills' || field === 'domains') {
        next[idx] = { ...next[idx], [field]: value.split(',').map((s) => s.trim()).filter(Boolean) };
      } else {
        next[idx] = { ...next[idx], [field]: value };
      }
      return next;
    });
  }

  function addService() {
    setServices((prev) => [...prev, { ...EMPTY_SERVICE }]);
  }

  function removeService(idx: number) {
    setServices((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setRegistering(true);
    setError('');
    try {
      const cleanServices = services
        .filter((s) => s.name.trim())
        .map((s) => ({
          name: s.name,
          endpoint: s.endpoint || undefined,
          version: s.version || undefined,
          skills: s.skills?.length ? s.skills : undefined,
          domains: s.domains?.length ? s.domains : undefined,
        }));

      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register',
          name: name.trim(),
          description: description.trim(),
          strategy,
          x402Support,
          services: cleanServices,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setName('');
        setDescription('');
        setStrategy('conservative');
        setServices([{ ...EMPTY_SERVICE }]);
        setShowAdvanced(false);
        fetchAgents();
      }
    } catch {
      setError('Registration failed');
    } finally {
      setRegistering(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen relative overflow-hidden" style={{ background: '#020408' }}>
        <BackgroundEffects />
        <div className="relative z-10 max-w-3xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border mb-6" style={{ borderColor: 'rgba(34, 211, 238, 0.2)', background: 'rgba(34, 211, 238, 0.05)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs font-mono text-cyan-400">ERC-8004</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">AI Agents</h1>
          <p className="text-slate-400 mb-2">Register autonomous agents with on-chain identity and verified wallets.</p>
          <p className="text-slate-500 text-sm mb-8">Each agent is an ERC-721 identity token with a bound wallet for sealed-bid procurement.</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  const strategyColors: Record<BiddingStrategy, string> = {
    conservative: 'text-cyan-400 border-cyan-400/30',
    aggressive: 'text-red-400 border-red-400/30',
    random: 'text-amber-400 border-amber-400/30',
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#020408' }}>
      <BackgroundEffects />
      
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-xs font-mono text-slate-600 hover:text-cyan-400 transition-colors mb-2 inline-flex items-center gap-1">
              ← back
            </Link>
            <h1 className="text-2xl font-bold text-white">AI Agents</h1>
            <p className="text-xs text-slate-500 font-mono mt-1">ERC-8004 Identity Registry</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-mono text-slate-500">connected</span>
          </div>
        </div>

        {/* Terminal Form */}
        <div className={`border rounded-lg mb-8 transition-transform duration-75 ${activeGlitch ? 'translate-x-0.5' : ''}`} style={{ background: 'linear-gradient(180deg, #050a14 0%, #03060c 100%)', borderColor: 'rgba(34, 211, 238, 0.15)' }}>
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b" style={{ background: 'rgba(10, 22, 40, 0.8)', borderColor: 'rgba(34, 211, 238, 0.1)' }}>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2a2a2a' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2a2a2a' }} />
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#2a2a2a' }} />
            </div>
            <span className="text-[10px] font-mono text-slate-500 ml-2">sentinel — agents/register</span>
          </div>

          <div className="p-5">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-mono text-slate-500 mb-1.5">
                    <span className="text-cyan-500 mr-1">&gt;</span>Agent Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. AlphaTrader"
                    className="w-full bg-slate-900/80 border border-slate-800 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-slate-500 mb-1.5">
                    <span className="text-cyan-500 mr-1">&gt;</span>Strategy
                  </label>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value as BiddingStrategy)}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="conservative">conservative</option>
                    <option value="aggressive">aggressive</option>
                    <option value="random">random</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-500 mb-1.5">
                  <span className="text-cyan-500 mr-1">&gt;</span>Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this agent do?"
                  rows={2}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-cyan-500/50 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-mono text-cyan-500 hover:text-cyan-400 transition-colors"
              >
                [{showAdvanced ? '-' : '+'}] advanced fields
              </button>

              {showAdvanced && (
                <div className="space-y-3 border-t border-slate-800/50 pt-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={x402Support}
                      onChange={(e) => setX402Support(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-cyan-500/30"
                    />
                    <span className="text-xs font-mono text-slate-400">x402 Payment Support</span>
                  </label>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-mono text-slate-500">Services</label>
                      <button
                        type="button"
                        onClick={addService}
                        className="text-xs font-mono text-cyan-500 hover:text-cyan-400"
                      >
                        + add
                      </button>
                    </div>
                    {services.map((svc, idx) => (
                      <div key={idx} className="bg-slate-900/50 border border-slate-800/50 rounded p-3 mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono text-slate-600">service_{idx}</span>
                          {services.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeService(idx)}
                              className="text-[10px] font-mono text-slate-600 hover:text-red-400"
                            >
                              rm
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={svc.name}
                            onChange={(e) => updateService(idx, 'name', e.target.value)}
                            placeholder="name"
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500/50"
                          />
                          <input
                            type="text"
                            value={svc.endpoint || ''}
                            onChange={(e) => updateService(idx, 'endpoint', e.target.value)}
                            placeholder="endpoint URL"
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500/50"
                          />
                          <input
                            type="text"
                            value={svc.skills?.join(', ') || ''}
                            onChange={(e) => updateService(idx, 'skills', e.target.value)}
                            placeholder="skills (comma-separated)"
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500/50"
                          />
                          <input
                            type="text"
                            value={svc.domains?.join(', ') || ''}
                            onChange={(e) => updateService(idx, 'domains', e.target.value)}
                            placeholder="domains (comma-separated)"
                            className="bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-white text-xs font-mono focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={registering || !name.trim()}
                  className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-30 disabled:cursor-not-allowed text-cyan-400 text-xs font-mono rounded border transition-colors"
                  style={{ borderColor: 'rgba(34, 211, 238, 0.3)' }}
                >
                  {registering ? 'minting...' : '> register_agent'}
                </button>
                {registering && (
                  <span className="text-[10px] font-mono text-slate-600">creating ERC-721 + bound wallet...</span>
                )}
              </div>

              {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
            </form>
          </div>
        </div>

        {/* Agent List */}
        {loading ? (
          <div className="text-center py-8">
            <span className="text-xs font-mono text-slate-500">loading agents...</span>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-8 border border-dashed rounded-lg" style={{ borderColor: 'rgba(34, 211, 238, 0.1)' }}>
            <p className="text-xs font-mono text-slate-600 mb-1">no agents registered</p>
            <p className="text-[10px] font-mono text-slate-700">use the form above to mint your first agent</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {agents.map((agent) => (
              <div
                key={agent.agentId}
                className="border rounded-lg p-4 transition-colors hover:border-cyan-500/30"
                style={{ background: 'rgba(5, 10, 20, 0.6)', borderColor: 'rgba(34, 211, 238, 0.1)' }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-white">
                      {agent.registrationFile?.name || `agent_${agent.agentId}`}
                    </span>
                    <span className="text-[10px] font-mono text-slate-600">#{agent.agentId}</span>
                  </div>
                  {agent.strategy && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${strategyColors[agent.strategy as BiddingStrategy]}`}>
                      {agent.strategy}
                    </span>
                  )}
                </div>
                
                {agent.registrationFile?.description && (
                  <p className="text-[10px] font-mono text-slate-500 mb-2 line-clamp-1">
                    {agent.registrationFile.description}
                  </p>
                )}

                {agent.agentWallet && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-[10px] font-mono text-slate-600">wallet:</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {agent.agentWallet.slice(0, 8)}...{agent.agentWallet.slice(-6)}
                    </span>
                  </div>
                )}

                {agent.registrationFile?.services?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {agent.registrationFile.services.map((svc, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/50 text-slate-400"
                      >
                        {svc.name}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 text-[10px] font-mono">
                  {agent.registrationFile?.x402Support && (
                    <span className="text-emerald-400">x402</span>
                  )}
                  <span className={agent.registrationFile?.active ? 'text-emerald-400' : 'text-slate-600'}>
                    {agent.registrationFile?.active ? 'active' : 'inactive'}
                  </span>
                  <span className="text-slate-700">ERC-8004</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BackgroundEffects() {
  return (
    <>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(6, 182, 212, 0.08) 0%, transparent 50%)`,
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
