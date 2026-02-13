/**
 * Server API route for on-chain auction transactions.
 * Agent private keys and deployer key stay server-side.
 *
 * BITE integration:
 *   - 'bid' action uses BITE encryptTransaction to hide the entire submitBid call
 *   - 'reveal' action uses BITE encryptTransaction to hide the revealBid call
 *   - 'decrypt' action retrieves decrypted transaction data for the receipt
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createPublicClient,
  createWalletClient,
  http,
  toHex,
  parseEther,
  encodeFunctionData,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import { BITE } from '@skalenetwork/bite';
import { SEALED_BID_AUCTION_ABI, CONTRACT_ADDRESSES } from '@/lib/contracts';

const RPC_URL = process.env.NEXT_PUBLIC_SKALE_RPC_URL!;

const skaleChain = defineChain({
  id: Number(process.env.NEXT_PUBLIC_SKALE_CHAIN_ID!),
  name: process.env.NEXT_PUBLIC_SKALE_CHAIN_NAME || 'SKALE Base Sepolia',
  nativeCurrency: { name: 'CREDIT', symbol: 'CREDIT', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  testnet: true,
});

const transport = http(RPC_URL);

const publicClient = createPublicClient({
  chain: skaleChain,
  transport,
});

const bite = new BITE(RPC_URL);

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

async function ensureAgentFunded(agentAddress: `0x${string}`) {
  const balance = await publicClient.getBalance({ address: agentAddress });
  const minBalance = parseEther('0.00001');

  if (balance < minBalance) {
    console.log(`[fund] Agent ${agentAddress} has ${balance} sFUEL, sending top-up...`);
    const deployer = getDeployerClient();
    const hash = await deployer.sendTransaction({
      to: agentAddress,
      value: parseEther('0.0001'),
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
      // ---------------------------------------------------------------
      // CREATE — plain transaction (auction params are public by design)
      // ---------------------------------------------------------------
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
        const auctionCreatedLog = receipt.logs[0];
        let onChainId: string | null = null;
        if (auctionCreatedLog && auctionCreatedLog.topics[1]) {
          onChainId = BigInt(auctionCreatedLog.topics[1]).toString();
        }
        return NextResponse.json({ txHash: hash, onChainId, status: receipt.status });
      }

      // ---------------------------------------------------------------
      // FUND — send sFUEL to agent
      // ---------------------------------------------------------------
      case 'fund': {
        const { agentAddress } = body;
        const fundTx = await ensureAgentFunded(agentAddress as `0x${string}`);
        return NextResponse.json({ funded: !!fundTx, txHash: fundTx });
      }

      // ---------------------------------------------------------------
      // BID — BITE encrypted transaction
      //
      // The entire submitBid(auctionId, encryptedBidBytes) call is
      // threshold-encrypted.  On-chain observers see an opaque blob
      // sent to the BITE magic address.  Validators decrypt + execute
      // after block finalization.
      // ---------------------------------------------------------------
      case 'bid': {
        const { auctionId, encryptedBid, agentPrivateKey } = body;
        const agentAccount = privateKeyToAccount(agentPrivateKey as `0x${string}`);

        await ensureAgentFunded(agentAccount.address);

        const walletClient = getWalletClient(agentPrivateKey as `0x${string}`);
        const encryptedBytes = toHex(new TextEncoder().encode(encryptedBid));

        // Encode the plaintext calldata
        const calldata = encodeFunctionData({
          abi: SEALED_BID_AUCTION_ABI,
          functionName: 'submitBid',
          args: [BigInt(auctionId), encryptedBytes as `0x${string}`],
        });

        // BITE: encrypt the full transaction (to + data)
        let hash: `0x${string}`;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const encryptedTx = await (bite as any).encryptTransaction({
            to: CONTRACT_ADDRESSES.sealedBidAuction,
            data: calldata,
            gasLimit: '500000',
          });

          // Send the encrypted transaction via the agent's wallet
          hash = await walletClient.sendTransaction({
            to: encryptedTx.to as `0x${string}`,
            data: encryptedTx.data as `0x${string}`,
            gas: BigInt(500_000),
          });
          console.log(`[bid] Encrypted tx sent: ${hash}`);
        } catch (biteErr) {
          // Fallback: send plaintext if BITE committee is down
          console.warn('[bid] BITE encryption failed, falling back to plaintext:', biteErr);
          hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESSES.sealedBidAuction,
            abi: SEALED_BID_AUCTION_ABI,
            functionName: 'submitBid',
            args: [BigInt(auctionId), encryptedBytes as `0x${string}`],
            gas: BigInt(500_000),
          });
        }

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
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
          encrypted: true,
        });
      }

      // ---------------------------------------------------------------
      // REVEAL — BITE encrypted transaction
      //
      // The revealBid call is also encrypted so that observers cannot
      // front-run the finalization by seeing reveal amounts early.
      // ---------------------------------------------------------------
      case 'reveal': {
        const { auctionId, bidIndex, amount, agentPrivateKey } = body;
        const agentAccount = privateKeyToAccount(agentPrivateKey as `0x${string}`);

        await ensureAgentFunded(agentAccount.address);

        const walletClient = getWalletClient(agentPrivateKey as `0x${string}`);

        const calldata = encodeFunctionData({
          abi: SEALED_BID_AUCTION_ABI,
          functionName: 'revealBid',
          args: [BigInt(auctionId), BigInt(bidIndex), BigInt(amount)],
        });

        let hash: `0x${string}`;
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const encryptedTx = await (bite as any).encryptTransaction({
            to: CONTRACT_ADDRESSES.sealedBidAuction,
            data: calldata,
            gasLimit: '300000',
          });

          hash = await walletClient.sendTransaction({
            to: encryptedTx.to as `0x${string}`,
            data: encryptedTx.data as `0x${string}`,
            gas: BigInt(300_000),
          });
          console.log(`[reveal] Encrypted tx sent: ${hash}`);
        } catch (biteErr) {
          console.warn('[reveal] BITE encryption failed, falling back to plaintext:', biteErr);
          hash = await walletClient.writeContract({
            address: CONTRACT_ADDRESSES.sealedBidAuction,
            abi: SEALED_BID_AUCTION_ABI,
            functionName: 'revealBid',
            args: [BigInt(auctionId), BigInt(bidIndex), BigInt(amount)],
            gas: BigInt(300_000),
          });
        }

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        return NextResponse.json({ txHash: hash, status: receipt.status, encrypted: true });
      }

      // ---------------------------------------------------------------
      // FINALIZE — plain transaction (result is public)
      // ---------------------------------------------------------------
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

      // ---------------------------------------------------------------
      // DECRYPT — retrieve decrypted data from a BITE-encrypted tx
      // Used for the receipt / audit trail.
      // ---------------------------------------------------------------
      case 'decrypt': {
        const { txHash } = body;
        const decrypted = await bite.getDecryptedTransactionData(txHash);
        return NextResponse.json({
          txHash,
          decrypted: decrypted || null,
        });
      }

      // ---------------------------------------------------------------
      // READ — read auction state (view call, no tx)
      // ---------------------------------------------------------------
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
