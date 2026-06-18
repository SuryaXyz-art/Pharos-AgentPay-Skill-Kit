import { ethers } from "ethers";

export type NormalizedPayment = {
  amountPhars: string;
  currency: "PHRS";
  recipient: string;
  serviceId: string;
  chainId: 688689;
  requestHash: string;
};

type RawPayment = {
  amount?: unknown;
  amountPhars?: unknown;
  currency?: unknown;
  asset?: unknown;
  recipient?: unknown;
  payTo?: unknown;
  serviceId?: unknown;
  resource?: unknown;
  chainId?: unknown;
};

function asRecord(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Invalid x402 requirement: expected an object.");
  }

  return input as Record<string, unknown>;
}

function isPaymentRequired(input: Record<string, unknown>): boolean {
  const error = input.error;
  const status = input.status ?? input.statusCode;

  return error === "Payment Required"
    || status === 402
    || status === "402"
    || status === "Payment Required"
    || input.paymentRequired === true;
}

function pickPaymentData(input: Record<string, unknown>): RawPayment {
  const nested = input.payment ?? input.paymentRequirement ?? input.requirement ?? input.x402;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    return nested as RawPayment;
  }

  return input as RawPayment;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Invalid x402 requirement: ${field} is required.`);
  }

  return value.trim();
}

function normalizeChainId(value: unknown): 688689 {
  const chainId = typeof value === "string" ? Number(value) : value;
  if (chainId !== 688689) {
    throw new Error("Invalid x402 requirement: chainId must be 688689.");
  }

  return 688689;
}

export function parseX402Requirement(input: unknown): NormalizedPayment {
  const envelope = asRecord(input);
  if (!isPaymentRequired(envelope)) {
    throw new Error('Invalid x402 requirement: error must be "Payment Required" or status must indicate payment required.');
  }

  const payment = pickPaymentData(envelope);
  const amountPhars = requiredString(payment.amountPhars ?? payment.amount, "amount");
  const currency = requiredString(payment.currency ?? payment.asset, "currency").toUpperCase();
  const recipient = requiredString(payment.recipient ?? payment.payTo, "recipient");
  const serviceId = requiredString(payment.serviceId ?? payment.resource, "serviceId");
  const chainId = normalizeChainId(payment.chainId);

  let amountWei: bigint;
  try {
    amountWei = ethers.parseEther(amountPhars);
  } catch {
    throw new Error("Invalid x402 requirement: amount must be a positive decimal PHRS value.");
  }
  if (amountWei <= 0n) {
    throw new Error("Invalid x402 requirement: amount must be positive.");
  }

  if (currency !== "PHRS") {
    throw new Error('Invalid x402 requirement: currency must be "PHRS".');
  }
  if (!ethers.isAddress(recipient)) {
    throw new Error("Invalid x402 requirement: recipient must be a valid EVM address.");
  }

  const normalized = {
    amountPhars,
    currency: "PHRS" as const,
    recipient: ethers.getAddress(recipient),
    serviceId,
    chainId
  };

  return {
    ...normalized,
    requestHash: ethers.id(JSON.stringify(normalized))
  };
}

export function createDemoX402Request(recipient: string, amount = "0.001") {
  return {
    error: "Payment Required",
    status: 402,
    payment: {
      amount,
      currency: "PHRS",
      recipient,
      serviceId: "premium-report",
      chainId: 688689
    }
  };
}
