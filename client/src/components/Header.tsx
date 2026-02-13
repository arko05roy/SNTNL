'use client';

interface HeaderProps {
  biteAvailable: boolean;
  biteEpoch?: string;
}

export function Header({ biteAvailable, biteEpoch }: HeaderProps) {
  return (
    <div className="max-w-7xl mx-auto mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-1 tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              SENTINEL
            </span>
          </h1>
          <p className="text-gray-400 text-sm">Private Agent Procurement Platform</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-xs text-gray-500">SKALE Base Sepolia</span>
            <span className="text-xs text-gray-600">|</span>
            <span className="text-xs text-gray-500">BITE Encryption</span>
            <span className="text-xs text-gray-600">|</span>
            <span className="text-xs text-gray-500">x402 Payments</span>
            <span className="text-xs text-gray-600">|</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${biteAvailable ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-xs text-gray-500">
                BITE {biteAvailable ? 'Active' : 'Unavailable'}
                {biteEpoch && ` · Epoch ${biteEpoch}`}
              </span>
            </div>
          </div>
        </div>
        {/* ConnectButton moved to Navbar */}
      </div>
    </div>
  );
}
