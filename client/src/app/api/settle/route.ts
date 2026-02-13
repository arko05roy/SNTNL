/**
 * x402-protected settlement API route with SELF-HOSTED facilitator.
 *
 * Flow:
 *   1. Client POSTs without X-PAYMENT → return 402 with payment requirements
 *   2. Client retries with X-PAYMENT (signed EIP-3009 payload from @x402/evm)
 *   3. Server decodes the signed authorization and calls transferWithAuthorization
 *      directly on-chain (no external facilitator needed)
 *   4. Return real transaction hash
 *
 * Before settlement, the deployer mints sUSDC to the paying agent so they have
 * sufficient balance for the transferWithAuthorization call.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, getAddress, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const TOKEN_ADDRESS = process.env.NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS as `0x${string}`;
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
const RPC_URL = process.env.NEXT_PUBLIC_SKALE_RPC_URL || '';
const PAY_TO = process.env.NEXT_PUBLIC_REGISTRY_ADDRESS || '0x5754C71c2474FE8F2B83C43432Faf0AC94cc24A5';

// Settlement fee in token smallest units (1000 = 0.001 sUSDC)
const SETTLEMENT_AMOUNT = '1000';

// Payment requirements returned on 402
const PAYMENT_REQUIREMENTS = {
  scheme: 'exact',
  network: 'skale-base-sepolia',
  maxAmountRequired: SETTLEMENT_AMOUNT,
  asset: TOKEN_ADDRESS,
  payTo: PAY_TO,
  resource: '/api/settle',
  description: 'Auction settlement fee',
  mimeType: 'application/json',
  outputSchema: null,
  maxTimeoutSeconds: 300,
  extra: {
    name: 'SentinelUSDC',
    version: '1',
  },
};

const SENTINEL_USDC_ABI = [
  {
    type: 'function',
    name: 'mint',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'transferWithAuthorization',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

const skaleChain = defineChain({
  id: 324705682,
  name: 'SKALE Base Sepolia',
  nativeCurrency: { name: 'sFUEL', symbol: 'sFUEL', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

export async function POST(request: NextRequest) {
  const paymentHeader = request.headers.get('X-PAYMENT') || request.headers.get('PAYMENT-SIGNATURE');

  // No payment → return 402 with payment requirements
  if (!paymentHeader) {
    console.log('[settle] No payment header, returning 402');
    return NextResponse.json(
      {
        x402Version: 1,
        error: 'X-PAYMENT header is required',
        accepts: [PAYMENT_REQUIREMENTS],
      },
      { status: 402 }
    );
  }

  console.log('[settle] X-PAYMENT received, processing locally...');

  let paymentPayload: Record<string, unknown>;
  try {
    paymentPayload = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
  } catch {
    return NextResponse.json({ error: 'Invalid X-PAYMENT header' }, { status: 400 });
  }

  console.log('[settle] Payment payload keys:', Object.keys(paymentPayload));

  const body = await request.json();

  // Try multiple possible payload shapes from @x402/evm
  let authorization: Record<string, unknown> | undefined;
  let signature: string | undefined;

  if (paymentPayload.authorization && paymentPayload.signature) {
    // Shape: { authorization: {...}, signature: "0x..." }
    authorization = paymentPayload.authorization as Record<string, unknown>;
    signature = paymentPayload.signature as string;
  } else if (paymentPayload.payload) {
    // Shape: { payload: { authorization: {...}, signature: "0x..." } }
    const inner = paymentPayload.payload as Record<string, unknown>;
    authorization = inner.authorization as Record<string, unknown>;
    signature = inner.signature as string;
  } else if (paymentPayload.from && paymentPayload.signature) {
    // Shape: flat { from, to, value, ..., signature }
    authorization = paymentPayload;
    signature = paymentPayload.signature as string;
  } else {
    // Unknown shape - dump it and return error with details
    console.error('[settle] Unknown payload shape. Keys:', Object.keys(paymentPayload));
    return NextResponse.json(
      { success: false, error: 'Unknown payment payload structure', keys: Object.keys(paymentPayload), payload: paymentPayload },
      { status: 400 }
    );
  }

  const from = authorization.from as string;
  const to = authorization.to as string;
  const value = authorization.value as string;
  const validAfter = authorization.validAfter as string;
  const validBefore = authorization.validBefore as string;
  const nonce = authorization.nonce as string;

  // Split 65-byte signature into r, s, v
  const sig = signature.replace('0x', '');
  const r = `0x${sig.slice(0, 64)}` as `0x${string}`;
  const s = `0x${sig.slice(64, 128)}` as `0x${string}`;
  const v = parseInt(sig.slice(128, 130), 16);

  if (!from || !to || !value || !nonce) {
    console.error('[settle] Missing authorization fields:', { from, to, value, nonce });
    return NextResponse.json(
      { success: false, error: 'Missing authorization fields in payment payload' },
      { status: 400 }
    );
  }

  // Ensure the paying agent has enough sUSDC
  try {
    await ensureAgentBalance(from, BigInt(value));
  } catch (err) {
    console.error('[settle] Failed to fund agent:', err);
  }

  // Execute transferWithAuthorization on-chain using deployer wallet
  try {
    const account = privateKeyToAccount(DEPLOYER_KEY);
    const publicClient = createPublicClient({ chain: skaleChain, transport: http(RPC_URL) });
    const walletClient = createWalletClient({ account, chain: skaleChain, transport: http(RPC_URL) });

    console.log('[settle] Calling transferWithAuthorization on-chain...');
    console.log('[settle] from:', from, 'to:', to, 'value:', value, 'v:', v, 'r:', r, 's:', s);

    const txHash = await walletClient.writeContract({
      address: TOKEN_ADDRESS,
      abi: SENTINEL_USDC_ABI,
      functionName: 'transferWithAuthorization',
      args: [
        getAddress(from),
        getAddress(to),
        BigInt(value),
        BigInt(validAfter || '0'),
        BigInt(validBefore || '115792089237316195423570985008687907853269984665640564039457584007913129639935'),
        nonce as `0x${string}`,
        v,
        r,
        s,
      ],
      gas: BigInt(300000),
    });

    // Return immediately with txHash - SKALE has fast finality so no need to wait
    console.log('[settle] Transaction sent! TX:', txHash);

    return NextResponse.json({
      success: true,
      transaction: txHash,
      payer: from,
      network: 'skale-base-sepolia',
      auctionId: body.auctionId,
      protocol: 'x402',
    });
  } catch (err) {
    console.error('[settle] On-chain settlement failed:', err);
    return NextResponse.json(
      { success: false, error: `Settlement error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

/**
 * Mint sUSDC to agent if their balance is below the required amount.
 */
async function ensureAgentBalance(agentAddress: string, minAmount: bigint) {
  if (!DEPLOYER_KEY || !TOKEN_ADDRESS || !agentAddress) return;

  const account = privateKeyToAccount(DEPLOYER_KEY);
  const publicClient = createPublicClient({ chain: skaleChain, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: skaleChain, transport: http(RPC_URL) });

  const balance = await publicClient.readContract({
    address: TOKEN_ADDRESS,
    abi: SENTINEL_USDC_ABI,
    functionName: 'balanceOf',
    args: [getAddress(agentAddress)],
  });

  if (balance < minAmount) {
    const mintAmount = minAmount * BigInt(100);
    console.log(`[settle] Minting ${mintAmount} sUSDC to ${agentAddress}`);
    const hash = await walletClient.writeContract({
      address: TOKEN_ADDRESS,
      abi: SENTINEL_USDC_ABI,
      functionName: 'mint',
      args: [getAddress(agentAddress), mintAmount],
      gas: BigInt(200000),
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[settle] Minted sUSDC, tx: ${hash}`);
  }
}
