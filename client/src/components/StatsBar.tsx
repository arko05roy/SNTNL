'use client';

interface StatsBarProps {
  agentCount: number;
  biteAvailable: boolean;
  bidCount: number;
  gasFees: number;
}

export function StatsBar({ agentCount, biteAvailable, bidCount, gasFees }: StatsBarProps) {
  const stats = [
    { label: 'Agents', value: String(agentCount), color: 'text-gray-200' },
    { label: 'BITE', value: biteAvailable ? 'Active' : '...', color: biteAvailable ? 'text-green-400' : 'text-amber-500' },
    { label: 'AP2', value: 'Active', color: 'text-blue-400' },
    { label: 'Sealed Bids', value: String(bidCount), color: 'text-amber-400' },
    { label: 'Gas', value: String(gasFees), color: 'text-cyan-400/70' },
  ];

  return (
    <div className="max-w-6xl mx-auto flex items-center gap-6 mb-6 px-4 py-2.5 rounded border" style={{ background: '#0c1220', borderColor: '#1a2540' }}>
      {stats.map((stat, i) => (
        <div key={stat.label} className="flex items-center gap-3">
          {i > 0 && <div className="w-px h-4 bg-gray-800" />}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-gray-600 uppercase tracking-wider">{stat.label}</span>
            <span className={`font-mono text-[13px] tabular-nums font-semibold ${stat.color}`}>{stat.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
