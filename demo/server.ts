import * as dotenv from "dotenv";
import express from "express";
import path from "path";
import { verifyPaymentProofHeader } from "../src";

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const port = Number(process.env.PORT || 4020);
const recipient = process.env.TEST_RECIPIENT || "0xYourRecipientAddress";

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.get("/premium-report", async (req, res) => {
  const proof = req.header("x-payment-proof");

  if (!proof) {
    res.status(402).json({
      error: "Payment Required",
      amount: "0.01",
      currency: "PHRS",
      recipient,
      serviceId: "premium-report",
      chainId: 688689,
      description: "Premium AI market report"
    });
    return;
  }

  try {
    const verifiedProof = await verifyPaymentProofHeader(proof);
    if (!verifiedProof.verified) {
      res.status(402).json({
        error: "Payment Required",
        reason: "Receipt proof could not be verified on Pharos.",
        amount: "0.01",
        currency: "PHRS",
        recipient,
        serviceId: "premium-report",
        chainId: 688689
      });
      return;
    }

    res.json({
      status: "unlocked",
      report: "This is the premium report unlocked by Pharos AgentPay Skill Kit.",
      proof: verifiedProof,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(402).json({
      error: "Payment Required",
      reason: error instanceof Error ? error.message : "Invalid payment proof.",
      amount: "0.01",
      currency: "PHRS",
      recipient,
      serviceId: "premium-report",
      chainId: 688689
    });
  }
});

app.listen(port, () => {
  console.log(`Pharos AgentPay demo server listening on http://localhost:${port}`);
  console.log(`Open the UI at http://localhost:${port}`);
  console.log("GET /premium-report returns HTTP 402 until x-payment-proof is provided.");
});
