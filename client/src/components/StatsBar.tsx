'use client';

interface StatsBarProps {
  agentCount: number;
  biteAvailable: boolean;
  bidCount: number;
  gasFees: number;
}

export function StatsBar({ agentCount, biteAvailable, bidCount, gasFees }: StatsBarProps) {
  const stats = [
    { label: 'Active Agents', value: String(agentCount), color: 'text-white' },
    { label: 'BITE Status', value: biteAvailable ? 'Active' : 'Checking...', color: biteAvailable ? 'text-green-400' : 'text-yellow-400' },
    { label: 'Encrypted Bids', value: String(bidCount), color: 'text-white' },
    { label: 'Gas Fees', value: String(gasFees), color: 'text-blue-400' },
  ];

  return (
    <div className="max-w-7xl mx-auto grid grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm hover:bg-white/[0.07] transition-colors"
        >
          <div className="text-gray-400 text-xs uppercase tracking-wider mb-1">{stat.label}</div>
          <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
        </div>
      ))}
    </div>
  );
}
