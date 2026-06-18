import { verifyPaymentReceipt } from "../src";

async function main() {
  const [receiptId, payer, recipient, amount, serviceId] = process.argv.slice(2);

  if (!receiptId || !payer || !recipient || !amount || !serviceId) {
    throw new Error(
      "Usage: npm run demo:verify -- <receiptId> <payer> <recipient> <amountWei> <serviceId>"
    );
  }

  const result = await verifyPaymentReceipt({
    id: receiptId,
    payer,
    recipient,
    amountWei: amount,
    serviceId
  });

  console.log(JSON.stringify({
    receiptId,
    payer,
    recipient,
    amountWei: amount,
    serviceId,
    ...result
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
