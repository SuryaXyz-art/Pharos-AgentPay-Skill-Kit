import { ethers } from "ethers";
import { getProvider, getWallet, loadConfig } from "./config";
import { checkSpendingLimit } from "./spendingLimit";

export type ExecuteNativePaymentInput = {
  recipient: string;
  amountPhars: string;
  maxPaymentPhars?: string;
};

export type NativePaymentResult = {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  status: "success" | "failed";
};

export async function executeNativePayment(input: ExecuteNativePaymentInput): Promise<NativePaymentResult> {
  if (!ethers.isAddress(input.recipient)) {
    throw new Error("Invalid recipient: expected a valid EVM address.");
  }

  const limit = checkSpendingLimit({
    amountPhars: input.amountPhars,
    maxPaymentPhars: input.maxPaymentPhars
  });
  if (!limit.allowed) {
    throw new Error(`Spending limit rejected payment: ${limit.reason}`);
  }

  const config = loadConfig();
  const provider = getProvider(config);
  const wallet = getWallet(config).connect(provider);

  const tx = await wallet.sendTransaction({
    to: ethers.getAddress(input.recipient),
    value: limit.amountWei
  });
  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error(`Payment transaction was not confirmed: ${tx.hash}`);
  }

  return {
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    status: receipt.status === 1 ? "success" : "failed"
  };
}
