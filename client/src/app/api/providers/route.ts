/**
 * Server API route for provider registration and management.
 *
 * Flow:
 *  1. User submits full provider application (business details, SLA, ToS acceptance)
 *  2. Server validates all fields, stores extended profile
 *  3. Server returns an approval token
 *  4. Client uses the token to unlock the on-chain registerProvider() call
 *  5. Client signs and submits the on-chain tx via wagmi
 *  6. Client confirms tx hash back to server → profile linked to on-chain address
 *
 * On-chain registration is gated behind server-side validation.
 * Private keys never touch the server — the user signs with their own wallet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { defineChain } from 'viem';
import { SERVICE_REGISTRY_ABI, CONTRACT_ADDRESSES } from '@/lib/contracts';
import type { ProviderProfile } from '@/types';

const TOS_CURRENT_VERSION = '1.0.0';

const skaleChain = defineChain({
  id: Number(process.env.NEXT_PUBLIC_SKALE_CHAIN_ID!),
  name: 'SKALE Base Sepolia',
  nativeCurrency: { name: 'CREDIT', symbol: 'CREDIT', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_SKALE_RPC_URL!] },
  },
  testnet: true,
});

const publicClient = createPublicClient({
  chain: skaleChain,
  transport: http(process.env.NEXT_PUBLIC_SKALE_RPC_URL!),
});

// In-memory store for provider profiles + approval tokens
// Production: database with encryption at rest
const providerProfiles = new Map<string, ProviderProfile>();  // address → profile
const approvalTokens = new Map<string, { address: string; name: string; serviceType: string; basePrice: string; expiresAt: number }>();

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

// Validation
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const JURISDICTION_RE = /^[A-Z]{2}(-[A-Z0-9]{1,4})?$/;
const VALID_SERVICE_TYPES = ['GPU Compute', 'Data Feed', 'API Access'];
const VALID_SUPPORT_TIERS = ['community', 'standard', 'premium'];

function validateApplication(body: any): string | null {
  // Business identity
  if (!body.legalName || body.legalName.trim().length < 2) return 'Legal entity name is required (min 2 characters)';
  if (!body.contactEmail || !EMAIL_RE.test(body.contactEmail)) return 'Valid contact email is required';
  if (body.website && !/^https?:\/\/.+/.test(body.website)) return 'Website must be a valid URL starting with http(s)://';
  if (!body.jurisdiction || !JURISDICTION_RE.test(body.jurisdiction)) return 'Jurisdiction is required (ISO 3166 format, e.g. US-DE, SG, CH)';

  // Service details
  if (!body.providerName || body.providerName.trim().length < 2) return 'Provider name is required';
  if (!VALID_SERVICE_TYPES.includes(body.serviceType)) return `Service type must be one of: ${VALID_SERVICE_TYPES.join(', ')}`;
  if (!body.basePrice || isNaN(Number(body.basePrice)) || Number(body.basePrice) <= 0) return 'Base price must be a positive number';
  if (!body.serviceDescription || body.serviceDescription.trim().length < 20) return 'Service description is required (min 20 characters)';
  if (!body.capacityDetails || body.capacityDetails.trim().length < 5) return 'Capacity details are required';
  if (body.uptimeCommitment == null || body.uptimeCommitment < 90 || body.uptimeCommitment > 100) return 'Uptime commitment must be between 90% and 100%';
  if (!VALID_SUPPORT_TIERS.includes(body.supportTier)) return `Support tier must be one of: ${VALID_SUPPORT_TIERS.join(', ')}`;

  // Legal
  if (!body.tosAccepted) return 'You must accept the Terms of Service';
  if (!body.liabilityAcknowledged) return 'You must acknowledge the liability terms';
  if (!body.dataProcessingConsent) return 'You must consent to data processing terms';
  if (!body.walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(body.walletAddress)) return 'Valid wallet address is required';

  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  try {
    switch (action) {
      // Step 1: Submit application → get approval token
      case 'apply': {
        const error = validateApplication(body);
        if (error) {
          return NextResponse.json({ error }, { status: 400 });
        }

        // Check if already registered on-chain
        try {
          const existing = await publicClient.readContract({
            address: CONTRACT_ADDRESSES.serviceRegistry,
            abi: SERVICE_REGISTRY_ABI,
            functionName: 'getProvider',
            args: [body.walletAddress as `0x${string}`],
          }) as any;
          if (existing.providerAddress !== '0x0000000000000000000000000000000000000000') {
            return NextResponse.json({ error: 'This wallet is already registered as a provider' }, { status: 409 });
          }
        } catch {
          // Contract call failed = not registered, which is fine
        }

        // Store profile
        const profile: ProviderProfile = {
          legalName: body.legalName.trim(),
          contactEmail: body.contactEmail.trim().toLowerCase(),
          website: body.website?.trim() || undefined,
          jurisdiction: body.jurisdiction.toUpperCase(),
          serviceDescription: body.serviceDescription.trim(),
          capacityDetails: body.capacityDetails.trim(),
          uptimeCommitment: Number(body.uptimeCommitment),
          maxLatencyMs: body.maxLatencyMs ? Number(body.maxLatencyMs) : undefined,
          supportTier: body.supportTier,
          tosAcceptedAt: Date.now(),
          tosVersion: TOS_CURRENT_VERSION,
          privacyPolicyUrl: body.privacyPolicyUrl?.trim() || undefined,
          dataProcessingRegions: body.dataProcessingRegions?.length ? body.dataProcessingRegions : undefined,
          verificationStatus: 'pending',
          registeredAt: Date.now(),
        };

        providerProfiles.set(body.walletAddress.toLowerCase(), profile);

        // Generate approval token (expires in 30 min)
        const token = generateToken();
        approvalTokens.set(token, {
          address: body.walletAddress.toLowerCase(),
          name: body.providerName.trim(),
          serviceType: body.serviceType,
          basePrice: body.basePrice,
          expiresAt: Date.now() + 30 * 60 * 1000,
        });

        return NextResponse.json({
          approvalToken: token,
          tosVersion: TOS_CURRENT_VERSION,
          message: 'Application approved. You may now register on-chain.',
        });
      }

      // Step 2: Validate approval token before on-chain tx
      case 'verify-token': {
        const { token } = body;
        const approval = approvalTokens.get(token);
        if (!approval) {
          return NextResponse.json({ error: 'Invalid or expired approval token' }, { status: 403 });
        }
        if (Date.now() > approval.expiresAt) {
          approvalTokens.delete(token);
          return NextResponse.json({ error: 'Approval token has expired. Please re-submit your application.' }, { status: 403 });
        }
        return NextResponse.json({
          approved: true,
          name: approval.name,
          serviceType: approval.serviceType,
          basePrice: approval.basePrice,
        });
      }

      // Step 3: Confirm on-chain registration (client sends tx hash after signing)
      case 'confirm': {
        const { token, txHash, walletAddress } = body;
        const approval = approvalTokens.get(token);
        if (!approval) {
          return NextResponse.json({ error: 'Invalid approval token' }, { status: 403 });
        }

        // Update profile verification status
        const profile = providerProfiles.get(walletAddress.toLowerCase());
        if (profile) {
          profile.verificationStatus = 'verified';
        }

        // Clean up token
        approvalTokens.delete(token);

        return NextResponse.json({
          confirmed: true,
          txHash,
          verificationStatus: 'verified',
        });
      }

      // List providers (on-chain data + profiles)
      case 'list': {
        const providerAddresses = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.serviceRegistry,
          abi: SERVICE_REGISTRY_ABI,
          functionName: 'getAllProviders',
          args: [],
        }) as `0x${string}`[];

        const providers = await Promise.all(
          providerAddresses.map(async (addr) => {
            const info = await publicClient.readContract({
              address: CONTRACT_ADDRESSES.serviceRegistry,
              abi: SERVICE_REGISTRY_ABI,
              functionName: 'getProvider',
              args: [addr],
            }) as any;

            const profile = providerProfiles.get(addr.toLowerCase());

            return {
              address: info.providerAddress,
              name: info.name,
              serviceType: info.serviceType,
              basePrice: info.basePrice.toString(),
              active: info.active,
              isOnChain: true,
              profile: profile ? {
                legalName: profile.legalName,
                jurisdiction: profile.jurisdiction,
                serviceDescription: profile.serviceDescription,
                capacityDetails: profile.capacityDetails,
                uptimeCommitment: profile.uptimeCommitment,
                supportTier: profile.supportTier,
                verificationStatus: profile.verificationStatus,
                registeredAt: profile.registeredAt,
                tosVersion: profile.tosVersion,
              } : undefined,
            };
          })
        );

        return NextResponse.json({ providers });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error(`[providers/${action}] Error:`, error);
    return NextResponse.json(
      { error: error.message || 'Operation failed' },
      { status: 500 }
    );
  }
}
