/**
 * BITE Protocol Integration
 * BITE = Blockchain Integrated Threshold Encryption
 *
 * Two layers of privacy for sealed-bid procurement:
 *
 * Layer 1 — Encrypted Transactions (encryptTransaction)
 *   The entire submitBid contract call (target address + calldata) is
 *   threshold-encrypted before broadcast.  On-chain observers see an opaque
 *   blob sent to the BITE magic address — they cannot tell which contract is
 *   called, which function, or what the arguments are.  Validators
 *   threshold-decrypt and execute it after block finalization.
 *
 * Layer 2 — Encrypted Messages (encryptMessage)
 *   The bid amount is *also* encrypted as a standalone message and stored in
 *   the contract's `encryptedBid` bytes field.  This provides a persistent,
 *   auditable ciphertext that can be decrypted later for the receipt/reveal
 *   phase via getDecryptedTransactionData.
 *
 * Together these satisfy the track rubric:
 *   encrypted intent → condition check (deadline) → decrypt/execute → receipt
 */

import { BITE } from '@skalenetwork/bite';
import { encodeFunctionData } from 'viem';
import { SEALED_BID_AUCTION_ABI, CONTRACT_ADDRESSES } from './contracts';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const RPC_URL = process.env.NEXT_PUBLIC_SKALE_RPC_URL!;

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let biteInstance: BITE | null = null;

function getBite(): BITE {
  if (!biteInstance) {
    biteInstance = new BITE(RPC_URL);
  }
  return biteInstance;
}

// ---------------------------------------------------------------------------
// Committee helpers (for UI status display)
// ---------------------------------------------------------------------------

export interface CommitteeInfo {
  current: { publicKey: string; epochId: number };
  next: { publicKey: string; epochId: number } | null;
}

export async function isBiteAvailable(): Promise<boolean> {
  try {
    const committees = await getBite().getCommitteesInfo();
    return !!(committees && committees.length > 0 && committees[0].commonBLSPublicKey);
  } catch {
    return false;
  }
}

export async function getCommitteeInfo(): Promise<CommitteeInfo | null> {
  try {
    const committees = await getBite().getCommitteesInfo();
    if (!committees || committees.length === 0) return null;
    return {
      current: {
        publicKey: committees[0].commonBLSPublicKey,
        epochId: committees[0].epochId,
      },
      next: committees.length > 1
        ? { publicKey: committees[1].commonBLSPublicKey, epochId: committees[1].epochId }
        : null,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Layer 1 — Encrypted Transaction
// ---------------------------------------------------------------------------

export interface EncryptedBidTx {
  /** The raw encrypted transaction object ready for eth_sendTransaction */
  encryptedTx: any;
  /** The plaintext calldata (for local bookkeeping / reveal) */
  plaintextCalldata: string;
  /** The bid amount (for local bookkeeping) */
  amount: bigint;
}

/**
 * Build an encrypted transaction that calls submitBid on the auction contract.
 *
 * The entire call (target + calldata) is threshold-encrypted.  On-chain it
 * appears as an opaque payload to the BITE magic address.  Validators decrypt
 * and execute after block finalization.
 *
 * @param auctionId  — on-chain auction id
 * @param amount     — bid amount in token units
 * @param encryptedMessageHex — the Layer 2 encrypted message bytes to store on-chain
 */
export async function buildEncryptedBidTx(
  auctionId: bigint,
  amount: bigint,
  encryptedMessageHex: string,
): Promise<EncryptedBidTx> {
  const bite = getBite();

  // Encode the contract call: submitBid(uint256 _auctionId, bytes _encryptedBid)
  const calldata = encodeFunctionData({
    abi: SEALED_BID_AUCTION_ABI,
    functionName: 'submitBid',
    args: [auctionId, encryptedMessageHex as `0x${string}`],
  });

  // Encrypt the full transaction (to + data)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const encryptedTx = await (bite as any).encryptTransaction({
    to: CONTRACT_ADDRESSES.sealedBidAuction,
    data: calldata,
    gasLimit: '500000',
  });

  return {
    encryptedTx,
    plaintextCalldata: calldata,
    amount,
  };
}

/**
 * Build an encrypted transaction for revealBid.
 * The reveal itself is encrypted so observers can't front-run finalization.
 */
export async function buildEncryptedRevealTx(
  auctionId: bigint,
  bidIndex: bigint,
  amount: bigint,
): Promise<any> {
  const bite = getBite();

  const calldata = encodeFunctionData({
    abi: SEALED_BID_AUCTION_ABI,
    functionName: 'revealBid',
    args: [auctionId, bidIndex, amount],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const encryptedTx = await (bite as any).encryptTransaction({
    to: CONTRACT_ADDRESSES.sealedBidAuction,
    data: calldata,
    gasLimit: '300000',
  });

  return encryptedTx;
}

/**
 * Build an encrypted transaction for finalizeAuction.
 */
export async function buildEncryptedFinalizeTx(
  auctionId: bigint,
): Promise<any> {
  const bite = getBite();

  const calldata = encodeFunctionData({
    abi: SEALED_BID_AUCTION_ABI,
    functionName: 'finalizeAuction',
    args: [auctionId],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const encryptedTx = await (bite as any).encryptTransaction({
    to: CONTRACT_ADDRESSES.sealedBidAuction,
    data: calldata,
    gasLimit: '500000',
  });

  return encryptedTx;
}

// ---------------------------------------------------------------------------
// Layer 2 — Encrypted Message (bid amount as auditable ciphertext)
// ---------------------------------------------------------------------------

/**
 * Encrypt the bid amount as a standalone BITE message.
 * The resulting hex is stored in the contract's `encryptedBid` bytes field
 * so the ciphertext is permanently on-chain for the audit trail.
 */
export async function encryptBidAmount(
  amount: bigint,
  _deadline: number,
): Promise<string> {
  const bite = getBite();
  const amountHex = '0x' + amount.toString(16).padStart(64, '0');
  const encryptedHex = await bite.encryptMessage(amountHex);
  return encryptedHex;
}

// ---------------------------------------------------------------------------
// Decryption / Receipt
// ---------------------------------------------------------------------------

/**
 * After an encrypted transaction is finalized, retrieve what actually executed.
 * Returns the decrypted `to` and `data` from the original encrypted tx.
 */
export async function getDecryptedTransaction(
  txHash: string,
): Promise<{ to: string; data: string } | null> {
  try {
    const bite = getBite();
    const result = await bite.getDecryptedTransactionData(txHash) as unknown as { to: string; data: string } | null;
    return result || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Convenience: full bid flow
// ---------------------------------------------------------------------------

export interface SealedBidResult {
  /** Encrypted message hex (stored on-chain in encryptedBid field) */
  encryptedMessage: string;
  /** The full encrypted transaction ready to send */
  encryptedTx: any;
  /** Plaintext calldata for local records */
  plaintextCalldata: string;
  /** Bid amount */
  amount: bigint;
}

/**
 * Prepare a complete sealed bid:
 *  1. Encrypt the bid amount as a BITE message (Layer 2)
 *  2. Wrap the submitBid call in an encrypted transaction (Layer 1)
 *
 * Caller is responsible for actually sending the encryptedTx via their signer.
 */
export async function prepareSealedBid(
  auctionId: bigint,
  amount: bigint,
  deadline: number,
): Promise<SealedBidResult> {
  // Layer 2: encrypt the amount as a message
  const encryptedMessage = await encryptBidAmount(amount, deadline);

  // Layer 1: encrypt the whole submitBid(auctionId, encryptedMessage) call
  const { encryptedTx, plaintextCalldata } = await buildEncryptedBidTx(
    auctionId,
    amount,
    encryptedMessage,
  );

  return {
    encryptedMessage,
    encryptedTx,
    plaintextCalldata,
    amount,
  };
}

/**
 * Check BITE availability — returns false gracefully so callers can fall back.
 */
export async function checkBiteAvailability(): Promise<boolean> {
  return isBiteAvailable();
}
