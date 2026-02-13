'use client';

import { useState, useEffect } from 'react';
import { isBiteAvailable, getCommitteeInfo } from '@/lib/bite';

interface BiteStatusData {
  available: boolean;
  publicKey?: string;
  epochId?: string;
}

interface BiteStatusProps {
  onStatusChange: (available: boolean, epochId?: string) => void;
}

export function BiteStatus({ onStatusChange }: BiteStatusProps) {
  const [status, setStatus] = useState<BiteStatusData>({ available: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkBite();
  }, []);

  const checkBite = async () => {
    try {
      const available = await isBiteAvailable();
      const info = await getCommitteeInfo();

      const newStatus: BiteStatusData = {
        available,
        publicKey: info?.current?.publicKey
          ? String(info.current.publicKey).slice(0, 20) + '...'
          : undefined,
        epochId: info?.current?.epochId != null
          ? String(info.current.epochId)
          : undefined,
      };

      setStatus(newStatus);
      onStatusChange(available, newStatus.epochId);
    } catch (error) {
      console.error('BITE status check failed:', error);
      setStatus({ available: false });
      onStatusChange(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  if (!status.publicKey) return null;

  return (
    <div className="max-w-7xl mx-auto mb-4">
      <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 flex items-center gap-4 text-xs">
        <span className="text-gray-500 uppercase tracking-wider font-semibold">BITE Committee</span>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${status.available ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-gray-400">{status.available ? 'Healthy' : 'Unavailable'}</span>
        </div>
        {status.publicKey && (
          <>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">BLS Key:</span>
            <span className="font-mono text-gray-400">{status.publicKey}</span>
          </>
        )}
        {status.epochId && (
          <>
            <span className="text-gray-600">|</span>
            <span className="text-gray-500">Epoch:</span>
            <span className="font-mono text-gray-400">{status.epochId}</span>
          </>
        )}
      </div>
    </div>
  );
}
