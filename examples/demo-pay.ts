import { agentPaySkill } from "../src";

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const recipient = readFlag("recipient");
  const amount = readFlag("amount");
  const service = readFlag("service");

  if (!recipient || !amount || !service) {
    throw new Error(
      "Usage: npm run demo:pay -- --recipient 0xabc --amount 0.01 --service premium-report"
    );
  }

  const proof = await agentPaySkill({
    directPayment: {
      amountPhars: amount,
      currency: "PHRS",
      recipient,
      serviceId: service,
      chainId: 688689
    }
  });

  console.log(JSON.stringify(proof, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
