import { verifyPaymentReceipt } from "./receipt";

export type PaymentProofHeader = {
  receiptId: string;
  payer: string;
  recipient: string;
  amountWei: string;
  serviceId: string;
  paymentTxHash?: string;
  receiptTxHash?: string;
  requestHash?: string;
};

export type VerifiedPaymentProof = PaymentProofHeader & {
  verified: boolean;
};

export function parsePaymentProofHeader(headerValue: string): PaymentProofHeader {
  let parsed: unknown;
  try {
    parsed = JSON.parse(headerValue);
  } catch {
    throw new Error("Invalid x-payment-proof header: expected JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid x-payment-proof header: expected an object.");
  }

  const proof = parsed as Partial<PaymentProofHeader>;
  const required: Array<keyof PaymentProofHeader> = [
    "receiptId",
    "payer",
    "recipient",
    "amountWei",
    "serviceId"
  ];

  for (const key of required) {
    if (typeof proof[key] !== "string" || proof[key]?.trim() === "") {
      throw new Error(`Invalid x-payment-proof header: ${key} is required.`);
    }
  }

  return {
    receiptId: proof.receiptId!.trim(),
    payer: proof.payer!.trim(),
    recipient: proof.recipient!.trim(),
    amountWei: proof.amountWei!.trim(),
    serviceId: proof.serviceId!.trim(),
    paymentTxHash: proof.paymentTxHash,
    receiptTxHash: proof.receiptTxHash,
    requestHash: proof.requestHash
  };
}

export async function verifyPaymentProofHeader(headerValue: string): Promise<VerifiedPaymentProof> {
  const proof = parsePaymentProofHeader(headerValue);
  const result = await verifyPaymentReceipt({
    id: proof.receiptId,
    payer: proof.payer,
    recipient: proof.recipient,
    amountWei: proof.amountWei,
    serviceId: proof.serviceId
  });

  return {
    ...proof,
    verified: result.verified
  };
}
