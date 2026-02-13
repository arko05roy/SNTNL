'use client';

interface HeaderProps {
  biteAvailable: boolean;
  biteEpoch?: string;
}

export function Header({ biteAvailable, biteEpoch }: HeaderProps) {
  return (
    <div className="max-w-6xl mx-auto mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-0.5 tracking-tight font-mono">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              SENTINEL
            </span>
          </h1>
          <p className="text-gray-500 text-[11px] font-mono tracking-wide">
            Sealed-Bid Agent Procurement
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-[10px]">
            <span className="text-gray-600">SKALE</span>
            <div className="w-px h-3 bg-gray-800" />
            <span className="text-gray-600">BITE</span>
            <div className="w-px h-3 bg-gray-800" />
            <span className="text-gray-600">x402</span>
          </div>
          <div className="flex items-center gap-1.5 pl-3 border-l border-gray-800">
            <div className={`w-1.5 h-1.5 rounded-full ${biteAvailable ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="font-mono text-[10px] text-gray-500">
              {biteAvailable ? 'ONLINE' : 'OFFLINE'}
              {biteEpoch && <span className="text-gray-600 ml-1.5">E{biteEpoch}</span>}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
