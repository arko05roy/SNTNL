/**
 * Server API route for on-chain auction transactions.
 * Agent private keys and deployer key stay server-side.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, toHex, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import { SEALED_BID_AUCTION_ABI, CONTRACT_ADDRESSES } from '@/lib/contracts';

const skaleChain = defineChain({
  id: Number(process.env.NEXT_PUBLIC_SKALE_CHAIN_ID!),
  name: process.env.NEXT_PUBLIC_SKALE_CHAIN_NAME || 'SKALE Base Sepolia',
  nativeCurrency: { name: 'CREDIT', symbol: 'CREDIT', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_SKALE_RPC_URL!] },
  },
  testnet: true,
});

const transport = http(process.env.NEXT_PUBLIC_SKALE_RPC_URL!);

const publicClient = createPublicClient({
  chain: skaleChain,
  transport,
});

function getWalletClient(privateKey: `0x${string}`) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: skaleChain,
    transport,
  });
}

function getDeployerClient() {
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
  if (!deployerKey) throw new Error('Deployer key not configured');
  return getWalletClient(deployerKey);
}

/**
 * Send sFUEL from deployer to an agent address if their balance is too low.
 * SKALE gas is free but sFUEL is required as an anti-spam token.
 */
async function ensureAgentFunded(agentAddress: `0x${string}`) {
  const balance = await publicClient.getBalance({ address: agentAddress });
  const minBalance = parseEther('0.00001'); // minimal sFUEL needed

  if (balance < minBalance) {
    console.log(`[fund] Agent ${agentAddress} has ${balance} sFUEL, sending top-up...`);
    const deployer = getDeployerClient();
    const hash = await deployer.sendTransaction({
      to: agentAddress,
      value: parseEther('0.0001'), // small sFUEL top-up
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`[fund] Sent sFUEL to ${agentAddress}: ${hash}`);
    return hash;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  try {
    switch (action) {
      case 'create': {
        const { serviceType, duration, minBid, maxBid } = body;
        const walletClient = getDeployerClient();
        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESSES.sealedBidAuction,
          abi: SEALED_BID_AUCTION_ABI,
          functionName: 'createAuction',
          args: [serviceType, BigInt(duration), BigInt(minBid), BigInt(maxBid)],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        // Parse auctionId from logs
        const auctionCreatedLog = receipt.logs[0];
        let onChainId: string | null = null;
        if (auctionCreatedLog && auctionCreatedLog.topics[1]) {
          onChainId = BigInt(auctionCreatedLog.topics[1]).toString();
        }
        return NextResponse.json({ txHash: hash, onChainId, status: receipt.status });
      }

      case 'fund': {
        // Fund an agent address with sFUEL from deployer
        const { agentAddress } = body;
        const fundTx = await ensureAgentFunded(agentAddress as `0x${string}`);
        return NextResponse.json({ funded: !!fundTx, txHash: fundTx });
      }

      case 'bid': {
        const { auctionId, encryptedBid, agentPrivateKey } = body;
        const agentAccount = privateKeyToAccount(agentPrivateKey as `0x${string}`);

        // Auto-fund agent with sFUEL before submitting bid
        await ensureAgentFunded(agentAccount.address);

        const walletClient = getWalletClient(agentPrivateKey as `0x${string}`);
        const encryptedBytes = toHex(new TextEncoder().encode(encryptedBid));
        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESSES.sealedBidAuction,
          abi: SEALED_BID_AUCTION_ABI,
          functionName: 'submitBid',
          args: [BigInt(auctionId), encryptedBytes],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        // Get bid index from bid count
        const bidCount = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.sealedBidAuction,
          abi: SEALED_BID_AUCTION_ABI,
          functionName: 'getBidCount',
          args: [BigInt(auctionId)],
        });
        return NextResponse.json({
          txHash: hash,
          bidIndex: Number(bidCount) - 1,
          status: receipt.status,
        });
      }

      case 'reveal': {
        const { auctionId, bidIndex, amount, agentPrivateKey } = body;
        const agentAccount = privateKeyToAccount(agentPrivateKey as `0x${string}`);

        // Auto-fund agent with sFUEL before revealing
        await ensureAgentFunded(agentAccount.address);

        const walletClient = getWalletClient(agentPrivateKey as `0x${string}`);
        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESSES.sealedBidAuction,
          abi: SEALED_BID_AUCTION_ABI,
          functionName: 'revealBid',
          args: [BigInt(auctionId), BigInt(bidIndex), BigInt(amount)],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        return NextResponse.json({ txHash: hash, status: receipt.status });
      }

      case 'finalize': {
        const { auctionId } = body;
        const walletClient = getDeployerClient();
        const hash = await walletClient.writeContract({
          address: CONTRACT_ADDRESSES.sealedBidAuction,
          abi: SEALED_BID_AUCTION_ABI,
          functionName: 'finalizeAuction',
          args: [BigInt(auctionId)],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        return NextResponse.json({ txHash: hash, status: receipt.status });
      }

      case 'read': {
        const { auctionId } = body;
        const auctionData = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.sealedBidAuction,
          abi: SEALED_BID_AUCTION_ABI,
          functionName: 'getAuction',
          args: [BigInt(auctionId)],
        });
        const bidCount = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.sealedBidAuction,
          abi: SEALED_BID_AUCTION_ABI,
          functionName: 'getBidCount',
          args: [BigInt(auctionId)],
        });
        return NextResponse.json({
          auction: {
            auctionId: auctionData.auctionId.toString(),
            serviceType: auctionData.serviceType,
            creator: auctionData.creator,
            deadline: auctionData.deadline.toString(),
            minBid: auctionData.minBid.toString(),
            maxBid: auctionData.maxBid.toString(),
            finalized: auctionData.finalized,
            winner: auctionData.winner,
            winningBid: auctionData.winningBid.toString(),
          },
          bidCount: Number(bidCount),
        });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`[auction/${action}] Error:`, error);
    return NextResponse.json(
      { error: error.message || 'Transaction failed' },
      { status: 500 }
    );
  }
}
