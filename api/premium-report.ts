import { verifyPaymentProofHeader } from "../src";

const recipient = process.env.TEST_RECIPIENT || "0xYourRecipientAddress";

function paymentRequired(res: any, reason?: string) {
  res.status(402).json({
    error: "Payment Required",
    ...(reason ? { reason } : {}),
    amount: "0.01",
    currency: "PHRS",
    recipient,
    serviceId: "premium-report",
    chainId: 688689,
    description: "Premium AI market report"
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const proof = req.headers["x-payment-proof"];
  const proofHeader = Array.isArray(proof) ? proof[0] : proof;

  if (!proofHeader) {
    paymentRequired(res);
    return;
  }

  try {
    const verifiedProof = await verifyPaymentProofHeader(proofHeader);
    if (!verifiedProof.verified) {
      paymentRequired(res, "Receipt proof could not be verified on Pharos.");
      return;
    }

    res.status(200).json({
      status: "unlocked",
      report: "This is the premium report unlocked by Pharos AgentPay Skill Kit.",
      proof: verifiedProof,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    paymentRequired(res, error instanceof Error ? error.message : "Invalid payment proof.");
  }
}
