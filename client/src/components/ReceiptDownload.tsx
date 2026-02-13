'use client';

import type { AuctionReceipt } from '@/types';

interface ReceiptDownloadProps {
  receipt: AuctionReceipt;
}

export function ReceiptDownload({ receipt }: ReceiptDownloadProps) {
  const handleDownload = () => {
    const json = JSON.stringify(receipt, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-receipt-${receipt.auctionId}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={handleDownload}
      className="mt-4 bg-white/10 hover:bg-white/15 border border-white/20 px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
    >
      Download Receipt (.json)
    </button>
  );
}
