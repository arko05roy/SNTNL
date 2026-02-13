/**
 * Server API route for ERC-8004 agent registration and management.
 * Agent private keys are generated and stored server-side only.
 * Registration files are stored as data URIs (production would use IPFS).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http, toHex, parseEther } from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { defineChain } from 'viem';
import { AGENT_REGISTRY_ABI, CONTRACT_ADDRESSES } from '@/lib/contracts';
import type { AgentRegistrationFile, RegisteredAgent } from '@/types';

function getSkaleChain() {
  return defineChain({
    id: Number(process.env.NEXT_PUBLIC_SKALE_CHAIN_ID!),
    name: 'SKALE Base Sepolia',
    nativeCurrency: { name: 'CREDIT', symbol: 'CREDIT', decimals: 18 },
    rpcUrls: {
      default: { http: [process.env.NEXT_PUBLIC_SKALE_RPC_URL!] },
    },
    testnet: true,
  });
}

function getTransport() {
  return http(process.env.NEXT_PUBLIC_SKALE_RPC_URL!);
}

function getPublicClient() {
  return createPublicClient({
    chain: getSkaleChain(),
    transport: getTransport(),
  });
}

function getDeployerClient() {
  const deployerKey = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;
  if (!deployerKey) throw new Error('Deployer key not configured');
  const account = privateKeyToAccount(deployerKey);
  return createWalletClient({
    account,
    chain: getSkaleChain(),
    transport: getTransport()
  });
}

// In-memory store for agent private keys (production: encrypted storage / KMS)
const agentKeys = new Map<string, string>();

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  try {
    switch (action) {
      case 'register': {
        const { name, description, strategy, services, x402Support } = body;
        if (!name) {
          return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Build ERC-8004 registration file
        const registrationFile = {
          type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
          name,
          description: description || '',
          services: services || [],
          x402Support: x402Support ?? true,
          active: true,
        };

        // Store as data URI (production: pin to IPFS)
        const agentURI = `data:application/json;base64,${Buffer.from(JSON.stringify(registrationFile)).toString('base64')}`;

        // Build on-chain metadata entries
        const metadataEntries: { key: string; value: `0x${string}` }[] = [];
        if (strategy) {
          metadataEntries.push({
            key: 'strategy',
            value: toHex(new TextEncoder().encode(strategy)),
          });
        }

        // Register on-chain (deployer is caller → becomes NFT owner)
        const deployer = getDeployerClient();
        const publicClient = getPublicClient();
        const hash = await deployer.writeContract({
          address: CONTRACT_ADDRESSES.agentRegistry,
          abi: AGENT_REGISTRY_ABI,
          functionName: 'register',
          args: [agentURI, metadataEntries],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        // Parse agentId from Registered event (topic[1])
        const registeredLog = receipt.logs.find(
          (l) => l.topics[0] === '0x44c4b5848352602e2e1e8d1aa7c40abf986fd4e0c4df85d0e6c3e976e74b02e5' // keccak(Registered(...))
        );
        let agentId: number | null = null;
        // Fallback: first Transfer event topic[3] is tokenId
        const transferLog = receipt.logs.find(
          (l) => l.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
        );
        if (transferLog && transferLog.topics[3]) {
          agentId = Number(BigInt(transferLog.topics[3]));
        }

        // Generate agent wallet, bind it, store key
        const privateKey = generatePrivateKey();
        const agentAccount = privateKeyToAccount(privateKey);
        const agentWallet = agentAccount.address;

        // Fund agent wallet
        const fundHash = await deployer.sendTransaction({
          to: agentWallet,
          value: parseEther('0.0001'),
        });
        await publicClient.waitForTransactionReceipt({ hash: fundHash });

        // Bind wallet on-chain
        if (agentId !== null) {
          const walletHash = await deployer.writeContract({
            address: CONTRACT_ADDRESSES.agentRegistry,
            abi: AGENT_REGISTRY_ABI,
            functionName: 'setAgentWallet',
            args: [BigInt(agentId), agentWallet],
          });
          await publicClient.waitForTransactionReceipt({ hash: walletHash });
        }

        // Store private key server-side only
        agentKeys.set(agentWallet.toLowerCase(), privateKey);

        return NextResponse.json({
          agentId,
          agentWallet,
          txHash: hash,
        });
      }

      case 'list': {
        const { ownerAddress } = body;

        // Query deployer's agents (deployer registers on behalf of users)
        const deployer = getDeployerClient();
        const publicClient = getPublicClient();
        const queryAddress = deployer.account.address;

        const agentIds = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.agentRegistry,
          abi: AGENT_REGISTRY_ABI,
          functionName: 'getAgentsByOwner',
          args: [queryAddress],
        }) as bigint[];

        const agents = await Promise.all(
          agentIds.map(async (id) => {
            const [uri, wallet] = await Promise.all([
              publicClient.readContract({
                address: CONTRACT_ADDRESSES.agentRegistry,
                abi: AGENT_REGISTRY_ABI,
                functionName: 'agentURI',
                args: [id],
              }) as Promise<string>,
              publicClient.readContract({
                address: CONTRACT_ADDRESSES.agentRegistry,
                abi: AGENT_REGISTRY_ABI,
                functionName: 'getAgentWallet',
                args: [id],
              }) as Promise<string>,
            ]);

            // Parse registration file from data URI
            let registrationFile: AgentRegistrationFile | undefined = undefined;
            try {
              if (uri.startsWith('data:application/json;base64,')) {
                const json = Buffer.from(uri.replace('data:application/json;base64,', ''), 'base64').toString();
                registrationFile = JSON.parse(json);
              }
            } catch {}

            // Read strategy metadata
            let strategy: string | undefined;
            try {
              const stratBytes = await publicClient.readContract({
                address: CONTRACT_ADDRESSES.agentRegistry,
                abi: AGENT_REGISTRY_ABI,
                functionName: 'getMetadata',
                args: [id, 'strategy'],
              }) as `0x${string}`;
              if (stratBytes && stratBytes !== '0x') {
                strategy = new TextDecoder().decode(
                  new Uint8Array(Buffer.from(stratBytes.slice(2), 'hex'))
                );
              }
            } catch {}

            return {
              agentId: Number(id),
              owner: queryAddress,
              agentWallet: wallet === '0x0000000000000000000000000000000000000000' ? undefined : wallet,
              registrationFile,
              strategy,
            };
          })
        );

        return NextResponse.json({ agents });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`[agents/${action}] Error:`, error);
    return NextResponse.json(
      { error: error.message || 'Operation failed' },
      { status: 500 }
    );
  }
}
