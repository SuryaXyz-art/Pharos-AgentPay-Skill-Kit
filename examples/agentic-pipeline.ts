import { runAgenticPipeline } from "../src";

async function main() {
  const recipient = process.env.TEST_RECIPIENT;
  if (!recipient) {
    throw new Error("Set TEST_RECIPIENT in .env before running the agentic pipeline demo.");
  }

  const results = await runAgenticPipeline([
    {
      action: "walletIntel.submit",
      wallet: recipient,
      riskScore: 15,
      label: "trusted-demo-wallet",
      metadataHash: "agentic-wallet-demo"
    },
    {
      action: "marketplace.list",
      name: "Premium Report Agent",
      endpoint: "https://example.com/agent/premium-report",
      pricePhars: "0.01",
      metadataHash: "premium-report-agent"
    },
    {
      action: "tradingSignal.publish",
      symbol: "PHRS/USD",
      direction: "WATCH",
      confidence: 72,
      targetPrice: 0,
      metadataHash: "demo-signal"
    }
  ]);

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
