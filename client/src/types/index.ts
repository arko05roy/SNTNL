export interface Agent {
  id: string;
  name: string;
  address: string;
  privateKey: string;
  balance: bigint;
  strategy: BiddingStrategy;
  color: string;
}

export type BiddingStrategy =
  | 'conservative' // Bids near market price
  | 'aggressive'   // Bids above market
  | 'random';      // Random bid within range

export interface Bid {
  agentId: string;
  amount: bigint;
  encrypted: string; // BITE encrypted bid
  timestamp: number;
  revealed: boolean;
  txHash?: string;       // on-chain submission tx
  revealTxHash?: string; // on-chain reveal tx
  bidIndex?: number;     // index in on-chain auction
}

export interface Auction {
  id: number;
  onChainId?: number;    // on-chain auction ID
  serviceType: string;
  deadline: number;
  minBid: bigint;
  maxBid: bigint;
  bids: Bid[];
  winner?: string;
  winningBid?: bigint;
  finalized: boolean;
  createTxHash?: string;    // on-chain create tx
  finalizeTxHash?: string;  // on-chain finalize tx
  provider?: ServiceProvider;  // the provider being bid on
}

export interface AuctionHistory {
  auction: Auction;
  completedAt: number;
}

export interface ServiceProvider {
  address: string;
  name: string;
  serviceType: string;
  basePrice: bigint;
}

export interface X402PaymentRequest {
  amount: string;
  currency: string;
  recipient: string;
  metadata?: Record<string, any>;
}

export interface X402PaymentResponse {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export type ServiceType = 'GPU Compute' | 'Data Feed' | 'API Access';

// ERC-8004-aligned agent registration file schema
export interface AgentRegistrationFile {
  type: string;                   // "https://eips.ethereum.org/EIPS/eip-8004#registration-v1"
  name: string;
  description: string;
  image?: string;
  services: AgentService[];
  x402Support: boolean;
  active: boolean;
}

export interface AgentService {
  name: string;
  endpoint?: string;
  version?: string;
  skills?: string[];
  domains?: string[];
}

export interface RegisteredAgent {
  agentId: number;                // ERC-721 tokenId
  owner: string;
  agentWallet?: string;           // bound wallet address
  registrationFile: AgentRegistrationFile;
  // On-chain metadata (decoded)
  strategy?: BiddingStrategy;
}

export interface OnChainProvider {
  address: string;
  name: string;
  serviceType: string;
  basePrice: bigint;
  active: boolean;
  isOnChain: true;
  profile?: ProviderProfile;
}

export interface ProviderProfile {
  // Business identity
  legalName: string;
  contactEmail: string;
  website?: string;
  jurisdiction: string;         // e.g. "US-DE", "SG", "CH"

  // Service specification
  serviceDescription: string;
  capacityDetails: string;      // e.g. "8x A100 80GB", "100k req/min"
  uptimeCommitment: number;     // percentage, e.g. 99.9
  maxLatencyMs?: number;
  supportTier: 'community' | 'standard' | 'premium';

  // Compliance
  tosAcceptedAt: number;        // unix timestamp
  tosVersion: string;
  privacyPolicyUrl?: string;
  dataProcessingRegions?: string[];  // e.g. ["US", "EU"]

  // Status
  verificationStatus: 'pending' | 'verified' | 'suspended';
  registeredAt: number;
}

export interface AuctionReceipt {
  auctionId: number;
  onChainId?: number;
  serviceType: string;
  chainId: number;
  network: string;
  blockExplorer: string;
  createTxHash?: string;
  finalizeTxHash?: string;
  bids: {
    agentId: string;
    agentName: string;
    encrypted: string;
    revealedAmount: string;
    txHash?: string;
    revealTxHash?: string;
  }[];
  winner: {
    agentId: string;
    agentName: string;
    amount: string;
  };
  provider?: {
    name: string;
    address: string;
    serviceType: string;
    basePrice: string;
  };
  payment: {
    protocol: string;
    transactionHash?: string;
    success: boolean;
  };
  timestamps: {
    created: number;
    finalized: number;
    receiptGenerated: number;
  };
}
