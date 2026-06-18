import { agentPaySkill } from "../src";

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

async function main() {
  const baseUrl = process.env.DEMO_BASE_URL || "http://localhost:4020";

  const firstResponse = await fetch(`${baseUrl}/premium-report`);
  const firstJson = await readJson(firstResponse);

  if (firstResponse.status !== 402) {
    console.log(JSON.stringify({
      status: "already_unlocked",
      response: firstJson
    }, null, 2));
    return;
  }

  const paymentProof = await agentPaySkill({ x402: firstJson });

  const unlockedResponse = await fetch(`${baseUrl}/premium-report`, {
    headers: {
      "x-payment-proof": paymentProof.proofHeader
    }
  });
  const unlockedReport = await readJson(unlockedResponse);

  console.log(JSON.stringify({
    paymentProof,
    unlockedReport
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
