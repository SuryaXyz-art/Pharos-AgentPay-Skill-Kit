import { ethers } from "ethers";

export type SpendingLimitInput = {
  amountPhars: string;
  maxPaymentPhars?: string;
};

export type SpendingLimitCheck = {
  allowed: boolean;
  reason: string;
  amountWei: bigint;
  maxWei: bigint;
};

function readMaxPayment(inputMax?: string): string {
  const max = inputMax || process.env.AGENT_MAX_PAYMENT_PHRS;
  if (!max || max.trim() === "") {
    throw new Error("Missing AGENT_MAX_PAYMENT_PHRS. Set it in .env or pass maxPaymentPhars.");
  }

  return max.trim();
}

function parsePositiveEther(value: string, label: string): bigint {
  try {
    const parsed = ethers.parseEther(value);
    if (parsed <= 0n) {
      return parsed;
    }

    return parsed;
  } catch {
    throw new Error(`Invalid ${label}: expected a decimal PHRS amount.`);
  }
}

export function checkSpendingLimit(input: SpendingLimitInput): SpendingLimitCheck {
  const amountWei = parsePositiveEther(input.amountPhars, "amountPhars");
  const maxWei = parsePositiveEther(readMaxPayment(input.maxPaymentPhars), "maxPaymentPhars");

  if (amountWei <= 0n) {
    return {
      allowed: false,
      reason: "Amount must be greater than zero.",
      amountWei,
      maxWei
    };
  }

  if (maxWei <= 0n) {
    return {
      allowed: false,
      reason: "Maximum payment limit must be greater than zero.",
      amountWei,
      maxWei
    };
  }

  if (amountWei > maxWei) {
    return {
      allowed: false,
      reason: "Amount exceeds maximum payment limit.",
      amountWei,
      maxWei
    };
  }

  return {
    allowed: true,
    reason: "Payment is within spending limit.",
    amountWei,
    maxWei
  };
}
