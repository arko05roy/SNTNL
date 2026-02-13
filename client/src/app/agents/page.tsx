'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import type { RegisteredAgent, BiddingStrategy, AgentService } from '@/types';

const EMPTY_SERVICE: AgentService = { name: '', endpoint: '', skills: [], domains: [] };

export default function AgentsPage() {
  const { address, isConnected } = useAccount();
  const [agents, setAgents] = useState<RegisteredAgent[]>([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');

  // Registration form state (ERC-8004 fields)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [strategy, setStrategy] = useState<BiddingStrategy>('conservative');
  const [x402Support, setX402Support] = useState(true);
  const [services, setServices] = useState<AgentService[]>([{ ...EMPTY_SERVICE }]);
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">My Agents</h1>
        <p className="text-gray-400 mb-2">ERC-8004 compatible agent registry.</p>
        <p className="text-gray-500 text-sm mb-6">Register autonomous agents with on-chain identity, verified wallets, and service declarations.</p>
        <div className="inline-block">
          <ConnectButton />
        </div>
      </div>
    );
  }

  const strategyColors: Record<BiddingStrategy, string> = {
    conservative: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    aggressive: 'text-red-400 bg-red-400/10 border-red-400/20',
    random: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">My Agents</h1>
        <p className="text-gray-400 text-sm">
          ERC-8004 Identity Registry &middot; Each agent is an NFT with off-chain registration file + on-chain metadata
        </p>
      </div>

      {/* Registration Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-1">Register New Agent</h2>
        <p className="text-xs text-gray-500 mb-5">
          Creates an ERC-721 identity token, generates a bound wallet, and stores your registration file on-chain.
        </p>

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Row 1: Name + Strategy */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-1.5">Agent Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. AlphaTrader"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Bidding Strategy</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as BiddingStrategy)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="conservative">Conservative</option>
                <option value="aggressive">Aggressive</option>
                <option value="random">Random</option>
              </select>
            </div>
          </div>

          {/* Row 2: Description */}
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this agent do? e.g. Autonomous GPU procurement agent optimized for batch ML training workloads"
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {showAdvanced ? 'Hide' : 'Show'} advanced fields (services, skills, x402)
          </button>

          {showAdvanced && (
            <div className="space-y-4 border-t border-gray-800 pt-4">
              {/* x402 Support */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={x402Support}
                  onChange={(e) => setX402Support(e.target.checked)}
                  className="rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">x402 Payment Support</span>
                <span className="text-xs text-gray-500">(agent can make/receive x402 payments)</span>
              </label>

              {/* Services */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400">Services</label>
                  <button
                    type="button"
                    onClick={addService}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    + Add service
                  </button>
                </div>
                {services.map((svc, idx) => (
                  <div key={idx} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">Service {idx + 1}</span>
                      {services.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeService(idx)}
                          className="text-xs text-gray-500 hover:text-red-400"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={svc.name}
                        onChange={(e) => updateService(idx, 'name', e.target.value)}
                        placeholder="Service name (e.g. GPU Bidding)"
                        className="bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={svc.endpoint || ''}
                        onChange={(e) => updateService(idx, 'endpoint', e.target.value)}
                        placeholder="Endpoint URL (optional)"
                        className="bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={svc.skills?.join(', ') || ''}
                        onChange={(e) => updateService(idx, 'skills', e.target.value)}
                        placeholder="Skills (comma-separated, e.g. bidding, negotiation)"
                        className="bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        value={svc.domains?.join(', ') || ''}
                        onChange={(e) => updateService(idx, 'domains', e.target.value)}
                        placeholder="Domains (comma-separated, e.g. compute, ml)"
                        className="bg-gray-800 border border-gray-700 rounded px-2.5 py-1.5 text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={registering || !name.trim()}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {registering ? 'Minting Agent NFT...' : 'Register Agent'}
            </button>
            {registering && (
              <span className="text-xs text-gray-500">Creating ERC-721 token + binding wallet...</span>
            )}
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>
      </div>

      {/* Agent Dashboard */}
      {loading ? (
        <p className="text-gray-400">Loading agents...</p>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-1">No agents registered yet</p>
          <p className="text-sm">Use the form above to mint your first agent identity (ERC-8004 NFT).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <div
              key={agent.agentId}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">
                      {agent.registrationFile?.name || `Agent #${agent.agentId}`}
                    </h3>
                    <span className="text-xs text-gray-500 font-mono bg-gray-800 px-1.5 py-0.5 rounded">
                      #{agent.agentId}
                    </span>
                  </div>
                  {agent.registrationFile?.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {agent.registrationFile.description}
                    </p>
                  )}
                </div>
                {agent.strategy && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${strategyColors[agent.strategy as BiddingStrategy] || 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>
                    {agent.strategy}
                  </span>
                )}
              </div>

              {/* Wallet */}
              {agent.agentWallet && (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-gray-500">Wallet:</span>
                  <span className="text-xs text-gray-300 font-mono">
                    {agent.agentWallet.slice(0, 6)}...{agent.agentWallet.slice(-4)}
                  </span>
                </div>
              )}

              {/* Services */}
              {agent.registrationFile?.services?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {agent.registrationFile.services.map((svc, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700"
                    >
                      {svc.name}
                      {svc.skills?.length ? ` (${svc.skills.join(', ')})` : ''}
                    </span>
                  ))}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center gap-3 text-xs text-gray-500">
                {agent.registrationFile?.x402Support && (
                  <span className="text-green-400">x402</span>
                )}
                <span className={agent.registrationFile?.active ? 'text-green-400' : 'text-gray-500'}>
                  {agent.registrationFile?.active ? 'Active' : 'Inactive'}
                </span>
                <span>ERC-8004</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
