/**
 * AP2 — Agent Payments Protocol Integration
 *
 * Implements Google's AP2 mandate lifecycle for agent procurement:
 *
 *   IntentMandate  → agent declares procurement constraints (spend caps, allowlists)
 *   CartMandate    → provider signs service offering (price, SLA, terms)
 *   PaymentMandate → agent authorizes final payment for winning bid
 *
 * Each mandate is a signed, auditable credential.  Together they form
 * a verifiable chain:  intent → authorization → settlement → receipt.
 *
 * Reference: https://github.com/google-agentic-commerce/AP2
 */

import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Core AP2 types (mirroring google-agentic-commerce/AP2 src/ap2/types)
// ---------------------------------------------------------------------------

export interface PaymentCurrencyAmount {
  currency: string;   // e.g. "USDC", "USD"
  value: number;      // decimal amount
}

export interface PaymentItem {
  label: string;
  amount: PaymentCurrencyAmount;
  pending?: boolean;
}

export interface PaymentDetailsInit {
  id: string;
  display_items: PaymentItem[];
  total: PaymentItem;
}

export interface PaymentMethodData {
  supported_methods: string;  // e.g. "x402", "skale-x402"
  data?: Record<string, unknown>;
}

export interface PaymentRequest {
  method_data: PaymentMethodData[];
  details: PaymentDetailsInit;
}

export interface PaymentResponse {
  request_id: string;
  method_name: string;
  details?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Mandate types
// ---------------------------------------------------------------------------

/** IntentMandate — agent's procurement policy / authorization scope */
export interface IntentMandate {
  natural_language_description: string;
  user_cart_confirmation_required: boolean;
  intent_expiry: string;            // ISO 8601
  /** Allowed provider addresses (null = unrestricted) */
  merchants?: string[];
  /** Max spend in token units */
  max_spend?: number;
  /** Allowed service types */
  service_types?: string[];
  /** Strategy constraints */
  strategy?: string;
}

/** CartMandate — provider-signed service offering */
export interface CartContents {
  id: string;
  user_cart_confirmation_required: boolean;
  payment_request: PaymentRequest;
  cart_expiry: string;              // ISO 8601
  merchant_name: string;
  merchant_address: string;
  /** SLA terms for the service */
  sla?: {
    uptime_commitment?: number;     // percentage
    max_latency_ms?: number;
    support_tier?: string;
  };
}

export interface CartMandate {
  contents: CartContents;
  /** SHA-256 hash of contents, signed by provider */
  merchant_authorization: string;
}

/** PaymentMandate — agent's final payment authorization */
export interface PaymentMandateContents {
  payment_mandate_id: string;       // UUID
  payment_details_id: string;       // references PaymentRequest.details.id
  payment_details_total: PaymentItem;
  payment_response: PaymentResponse;
  merchant_agent: string;           // provider name
  buyer_agent: string;              // agent name
  auction_id?: number;              // on-chain auction id
  timestamp: string;                // ISO 8601
}

export interface PaymentMandate {
  payment_mandate_contents: PaymentMandateContents;
  /** SHA-256(cart_mandate) + "." + SHA-256(payment_mandate_contents) */
  user_authorization: string;
}

// ---------------------------------------------------------------------------
// Full AP2 transaction record (the receipt the track requires)
// ---------------------------------------------------------------------------

export interface AP2TransactionRecord {
  /** Protocol version */
  ap2_version: '1.0';
  /** Unique transaction id */
  transaction_id: string;
  /** The three mandates forming the authorization chain */
  intent_mandate: IntentMandate;
  cart_mandate: CartMandate;
  payment_mandate: PaymentMandate;
  /** Settlement result */
  settlement: {
    protocol: 'x402';
    network: string;
    chain_id: number;
    transaction_hash?: string;
    settled_at?: string;            // ISO 8601
    gas_fees: string;               // "0" on SKALE
  };
  /** BITE encryption details */
  encryption?: {
    protocol: 'BITE-v2';
    bid_tx_hash?: string;
    encrypted: boolean;
    decrypted_at?: string;
  };
  /** Lifecycle timestamps */
  timestamps: {
    intent_created: string;
    cart_created: string;
    payment_authorized: string;
    settled: string;
    receipt_generated: string;
  };
  /** Validation status */
  validation: {
    intent_valid: boolean;
    cart_signed: boolean;
    payment_authorized: boolean;
    settlement_confirmed: boolean;
    spend_within_limits: boolean;
  };
}

// ---------------------------------------------------------------------------
// AP2 data keys (for A2A messaging compatibility)
// ---------------------------------------------------------------------------

export const AP2_KEYS = {
  INTENT_MANDATE: 'ap2.mandates.IntentMandate',
  CART_MANDATE: 'ap2.mandates.CartMandate',
  PAYMENT_MANDATE: 'ap2.mandates.PaymentMandate',
} as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

function nowISO(): string {
  return new Date().toISOString();
}

function expiryISO(minutes: number): string {
  return new Date(Date.now() + minutes * 60_000).toISOString();
}

// ---------------------------------------------------------------------------
// Mandate creation
// ---------------------------------------------------------------------------

/**
 * Create an IntentMandate — the agent's procurement policy.
 * Defines what the agent is authorized to buy and spending constraints.
 */
export function createIntentMandate(params: {
  agentName: string;
  serviceTypes: string[];
  maxSpend: number;
  allowedProviders?: string[];
  strategy?: string;
}): IntentMandate {
  return {
    natural_language_description:
      `Agent "${params.agentName}" is authorized to procure services of type ` +
      `[${params.serviceTypes.join(', ')}] up to ${params.maxSpend} tokens. ` +
      (params.strategy ? `Strategy: ${params.strategy}.` : ''),
    user_cart_confirmation_required: false, // agents auto-confirm
    intent_expiry: expiryISO(60 * 24),     // 24 hours
    merchants: params.allowedProviders,
    max_spend: params.maxSpend,
    service_types: params.serviceTypes,
    strategy: params.strategy,
  };
}

/**
 * Create a CartMandate — the provider's signed service offering.
 * The provider "signs" by hashing the cart contents.
 */
export function createCartMandate(params: {
  provider: { name: string; address: string; serviceType: string; basePrice: bigint };
  paymentMethodId?: string;
  sla?: CartContents['sla'];
}): CartMandate {
  const cartId = `cart_${crypto.randomUUID().slice(0, 8)}`;
  const priceNum = Number(params.provider.basePrice);

  const contents: CartContents = {
    id: cartId,
    user_cart_confirmation_required: true,
    payment_request: {
      method_data: [
        {
          supported_methods: 'x402',
          data: { network: 'skale', token: 'USDC' },
        },
      ],
      details: {
        id: `order_${cartId}`,
        display_items: [
          {
            label: `${params.provider.serviceType} — ${params.provider.name}`,
            amount: { currency: 'USDC', value: priceNum },
          },
        ],
        total: {
          label: 'Total',
          amount: { currency: 'USDC', value: priceNum },
        },
      },
    },
    cart_expiry: expiryISO(30),  // 30 minutes
    merchant_name: params.provider.name,
    merchant_address: params.provider.address,
    sla: params.sla,
  };

  // Provider "signs" by hashing contents
  const contentsHash = sha256(JSON.stringify(contents));

  return {
    contents,
    merchant_authorization: contentsHash,
  };
}

/**
 * Create a PaymentMandate — the agent's final payment authorization.
 * Links back to the CartMandate and specifies exact settlement terms.
 */
export function createPaymentMandate(params: {
  cartMandate: CartMandate;
  agentName: string;
  bidAmount: bigint;
  auctionId?: number;
}): PaymentMandate {
  const amountNum = Number(params.bidAmount);
  const mandateId = crypto.randomUUID();

  const paymentResponse: PaymentResponse = {
    request_id: params.cartMandate.contents.payment_request.details.id,
    method_name: 'x402',
    details: {
      network: 'skale',
      token: 'USDC',
      amount: amountNum,
      auction_id: params.auctionId,
    },
  };

  const paymentMandateContents: PaymentMandateContents = {
    payment_mandate_id: mandateId,
    payment_details_id: params.cartMandate.contents.payment_request.details.id,
    payment_details_total: {
      label: 'Winning Bid Settlement',
      amount: { currency: 'USDC', value: amountNum },
    },
    payment_response: paymentResponse,
    merchant_agent: params.cartMandate.contents.merchant_name,
    buyer_agent: params.agentName,
    auction_id: params.auctionId,
    timestamp: nowISO(),
  };

  // Agent "signs" by hashing cart mandate + payment mandate contents
  const cartHash = sha256(JSON.stringify(params.cartMandate));
  const paymentHash = sha256(JSON.stringify(paymentMandateContents));

  return {
    payment_mandate_contents: paymentMandateContents,
    user_authorization: `${cartHash}.${paymentHash}`,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Validate that a payment stays within the intent's spend limits */
export function validateSpendLimit(
  intent: IntentMandate,
  bidAmount: number,
): boolean {
  if (intent.max_spend == null) return true;
  return bidAmount <= intent.max_spend;
}

/** Validate the cart mandate merchant authorization hash */
export function validateCartSignature(cartMandate: CartMandate): boolean {
  const expected = sha256(JSON.stringify(cartMandate.contents));
  return expected === cartMandate.merchant_authorization;
}

/** Validate the payment mandate authorization chain */
export function validatePaymentAuthorization(
  paymentMandate: PaymentMandate,
  cartMandate: CartMandate,
): boolean {
  if (!paymentMandate.user_authorization) return false;
  const [cartHash, paymentHash] = paymentMandate.user_authorization.split('.');
  if (!cartHash || !paymentHash) return false;

  const expectedCartHash = sha256(JSON.stringify(cartMandate));
  const expectedPaymentHash = sha256(JSON.stringify(paymentMandate.payment_mandate_contents));

  return cartHash === expectedCartHash && paymentHash === expectedPaymentHash;
}

/** Validate that the cart hasn't expired */
export function validateCartExpiry(cartMandate: CartMandate): boolean {
  return new Date(cartMandate.contents.cart_expiry).getTime() > Date.now();
}

/** Validate that the intent hasn't expired */
export function validateIntentExpiry(intent: IntentMandate): boolean {
  return new Date(intent.intent_expiry).getTime() > Date.now();
}

/** Full validation of the mandate chain */
export function validateMandateChain(
  intent: IntentMandate,
  cart: CartMandate,
  payment: PaymentMandate,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!validateIntentExpiry(intent)) errors.push('Intent mandate expired');
  if (!validateCartExpiry(cart)) errors.push('Cart mandate expired');
  if (!validateCartSignature(cart)) errors.push('Cart merchant signature invalid');
  if (!validatePaymentAuthorization(payment, cart)) errors.push('Payment authorization chain invalid');

  const bidAmount = payment.payment_mandate_contents.payment_details_total.amount.value;
  if (!validateSpendLimit(intent, bidAmount)) {
    errors.push(`Bid ${bidAmount} exceeds spend limit ${intent.max_spend}`);
  }

  if (intent.service_types && intent.service_types.length > 0) {
    const cartLabel = cart.contents.payment_request.details.display_items[0]?.label || '';
    const matchesType = intent.service_types.some(t => cartLabel.includes(t));
    if (!matchesType) errors.push('Service type not in intent allowlist');
  }

  if (intent.merchants && intent.merchants.length > 0) {
    if (!intent.merchants.includes(cart.contents.merchant_address)) {
      errors.push('Provider not in intent allowlist');
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Full transaction record builder
// ---------------------------------------------------------------------------

/**
 * Build the complete AP2 transaction record / receipt.
 * This is the auditable artifact the track requires.
 */
export function buildTransactionRecord(params: {
  intent: IntentMandate;
  cart: CartMandate;
  payment: PaymentMandate;
  settlementTxHash?: string;
  bidTxHash?: string;
  biteEncrypted?: boolean;
  auctionOnChainId?: number;
}): AP2TransactionRecord {
  const validation = validateMandateChain(params.intent, params.cart, params.payment);
  const now = nowISO();

  return {
    ap2_version: '1.0',
    transaction_id: `ap2_${crypto.randomUUID().slice(0, 12)}`,
    intent_mandate: params.intent,
    cart_mandate: params.cart,
    payment_mandate: params.payment,
    settlement: {
      protocol: 'x402',
      network: 'SKALE Base Sepolia',
      chain_id: Number(process.env.NEXT_PUBLIC_SKALE_CHAIN_ID || 324705682),
      transaction_hash: params.settlementTxHash,
      settled_at: params.settlementTxHash ? now : undefined,
      gas_fees: '0',
    },
    encryption: params.biteEncrypted
      ? {
          protocol: 'BITE-v2',
          bid_tx_hash: params.bidTxHash,
          encrypted: true,
          decrypted_at: now,
        }
      : undefined,
    timestamps: {
      intent_created: params.intent.intent_expiry
        ? new Date(new Date(params.intent.intent_expiry).getTime() - 86400000).toISOString()
        : now,
      cart_created: params.cart.contents.cart_expiry
        ? new Date(new Date(params.cart.contents.cart_expiry).getTime() - 1800000).toISOString()
        : now,
      payment_authorized: params.payment.payment_mandate_contents.timestamp,
      settled: now,
      receipt_generated: now,
    },
    validation: {
      intent_valid: !validation.errors.includes('Intent mandate expired'),
      cart_signed: !validation.errors.includes('Cart merchant signature invalid'),
      payment_authorized: !validation.errors.includes('Payment authorization chain invalid'),
      settlement_confirmed: !!params.settlementTxHash,
      spend_within_limits: !validation.errors.some(e => e.includes('exceeds spend limit')),
    },
  };
}
