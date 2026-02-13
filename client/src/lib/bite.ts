/**
 * BITE Protocol Integration
 * BITE = Blockchain Integrated Threshold Encryption
 * Enables sealed-bid auctions with time-locked decryption
 */

import { BITE } from '@skalenetwork/bite';

interface BiteConfig {
  rpcUrl: string;
  chainId: number;
}

export class BiteEncryption {
  private bite: BITE;
  private config: BiteConfig;

  constructor(config: BiteConfig) {
    this.config = config;
    this.bite = new BITE(config.rpcUrl);
  }

  /**
   * Encrypt bid amount using BITE threshold encryption
   * Uses BLS threshold encryption with committee's public key
   */
  async encryptBid(bidAmount: bigint, deadline: number): Promise<string> {
    const bidHex = this.encodeBidAmountToHex(bidAmount);
    const encryptedHex = await this.bite.encryptMessage(bidHex);

    return JSON.stringify({
      encrypted: encryptedHex,
      deadline,
      timestamp: Date.now()
    });
  }

  /**
   * Request decryption of bid after transaction is processed
   * BITE decryption happens automatically after block finalization
   */
  async requestDecryption(encryptedBid: string, txHash: string): Promise<bigint> {
    const bidData = JSON.parse(encryptedBid);

    const now = Date.now();
    if (now < bidData.deadline) {
      throw new Error('Cannot decrypt before deadline');
    }

    const decrypted = await this.bite.getDecryptedTransactionData(txHash);
    return this.decodeBidAmountFromHex(decrypted || bidData.encrypted);
  }

  private encodeBidAmountToHex(amount: bigint): string {
    return '0x' + amount.toString(16).padStart(64, '0');
  }

  private decodeBidAmountFromHex(hex: string): bigint {
    return BigInt(hex);
  }

  /**
   * Check if BITE is available on current network
   */
  async isBiteAvailable(): Promise<boolean> {
    const committees = await this.bite.getCommitteesInfo();
    return committees && committees.length > 0 && committees[0].commonBLSPublicKey != null;
  }

  /**
   * Get committee information with BLS public keys
   */
  async getCommitteeInfo() {
    const committees = await this.bite.getCommitteesInfo();

    if (!committees || committees.length === 0) {
      return null;
    }

    return {
      current: {
        publicKey: committees[0].commonBLSPublicKey,
        epochId: committees[0].epochId
      },
      next: committees.length > 1 ? {
        publicKey: committees[1].commonBLSPublicKey,
        epochId: committees[1].epochId
      } : null
    };
  }
}

// Singleton instance
let biteInstance: BiteEncryption | null = null;

export function getBiteInstance(): BiteEncryption {
  if (!biteInstance) {
    biteInstance = new BiteEncryption({
      rpcUrl: process.env.NEXT_PUBLIC_SKALE_RPC_URL!,
      chainId: Number(process.env.NEXT_PUBLIC_SKALE_CHAIN_ID!)
    });
  }
  return biteInstance;
}

export async function encryptBidAmount(
  amount: bigint,
  deadline: number
): Promise<string> {
  const bite = getBiteInstance();
  return bite.encryptBid(amount, deadline);
}

export async function decryptBidAmount(
  encryptedBid: string,
  txHash: string
): Promise<bigint> {
  const bite = getBiteInstance();
  return bite.requestDecryption(encryptedBid, txHash);
}

export async function checkBiteAvailability(): Promise<boolean> {
  const bite = getBiteInstance();
  return bite.isBiteAvailable();
}
