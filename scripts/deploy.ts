import { ethers } from "hardhat";

async function main() {
  const contractNames = [
    "AgentReceiptRegistry",
    "Crowdfund",
    "EscrowPay",
    "PaymentRequestRegistry",
    "Payroll",
    "WalletIntelligence",
    "AgentMarketplace",
    "TradingSignalGenerator"
  ];

  for (const name of contractNames) {
    const contract = await ethers.deployContract(name);
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    console.log(`${name} deployed to: ${address}`);

    if (name === "AgentReceiptRegistry") {
      console.log("Set RECEIPT_REGISTRY_ADDRESS in your .env file.");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
