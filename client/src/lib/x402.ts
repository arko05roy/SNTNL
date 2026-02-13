/**
 * x402 Payment Protocol Integration
 *
 * Uses @x402/fetch + @x402/evm to handle the full 402 payment flow:
 *   1. Makes request → gets 402 with payment requirements (v1 body format)
 *   2. Signs EIP-3009 transferWithAuthorization using agent's private key
 *   3. Retries with X-PAYMENT header
 *   4. Server forwards to PayAI facilitator for on-chain settlement
 *   5. Returns real transaction hash
 */

import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';

export interface X402PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  payer?: string;
  network?: string;
}

/**
 * Process auction settlement via x402 protocol.
 */
export async function processAuctionPayment(
  winnerPrivateKey: string,
  winnerAddress: string,
  amount: bigint,
  auctionId: number
): Promise<X402PaymentResult> {
  const account = privateKeyToAccount(winnerPrivateKey as `0x${string}`);

  // Create x402 client with both v1 and v2 EVM scheme support
  const client = new x402Client();
  registerExactEvmScheme(client, { signer: account });

  // Wrap fetch to auto-handle 402 → sign → retry
  const paymentFetch = wrapFetchWithPayment(fetch, client);

  const settlementUrl = `${getBaseUrl()}/api/settle`;

  console.log(`[x402] Settling auction ${auctionId} for ${amount} from ${winnerAddress}`);

  try {
    const response = await paymentFetch(settlementUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auctionId,
        winner: winnerAddress,
        amount: amount.toString(),
        serviceType: 'GPU Compute',
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('[x402] Settlement success:', result);
      return {
        success: true,
        transactionHash: result.transaction,
        payer: result.payer,
        network: result.network,
      };
    }

    const errText = await response.text();
    console.error(`[x402] Settlement failed (${response.status}):`, errText);
    return {
      success: false,
      error: `Settlement failed (${response.status}): ${errText}`,
    };
  } catch (err) {
    console.error('[x402] Payment error:', err);
    return {
      success: false,
      error: `Payment error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}
