import { ethers } from "ethers";
import { loadConfig } from "./config";
import { executeNativePayment } from "./pay";
import { storePaymentReceipt } from "./receipt";
import { checkSpendingLimit } from "./spendingLimit";
import { NormalizedPayment, parseX402Requirement } from "./x402";

export * from "./config";
export * from "./agentic";
export * from "./pay";
export * from "./proof";
export * from "./receipt";
export * from "./spendingLimit";
export * from "./x402";

export type DirectPaymentInput = {
  amountPhars: string;
  currency?: "PHRS";
  recipient: string;
  serviceId: string;
  chainId?: 688689;
  requestHash?: string;
};

export type AgentPaySkillInput =
  | {
      x402: unknown;
      directPayment?: never;
      maxPaymentPhars?: string;
    }
  | {
      directPayment: DirectPaymentInput;
      x402?: never;
      maxPaymentPhars?: string;
    };

export type AgentPaySkillProof = {
  ok: true;
  payment: {
    txHash: string;
    blockNumber: number;
    gasUsed: string;
    status: "success" | "failed";
  };
  receipt: {
    id: string;
    registryAddress: string;
    registryTxHash: string;
    blockNumber: number;
    gasUsed: string;
    status: "success" | "failed";
  };
  proof: {
    payer: string;
    recipient: string;
    token: string;
    amountPhars: string;
    amountWei: string;
    currency: "PHRS";
    serviceId: string;
    chainId: 688689;
    requestHash: string;
    paymentTxHash: string;
  };
  links: {
    paymentTx: string;
    receiptTx: string;
    registry: string;
  };
  proofHeader: string;
};

function normalizeDirectPayment(input: DirectPaymentInput): NormalizedPayment {
  if (input.currency && input.currency !== "PHRS") {
    throw new Error('Invalid directPayment: currency must be "PHRS".');
  }
  if (input.chainId && input.chainId !== 688689) {
    throw new Error("Invalid directPayment: chainId must be 688689.");
  }
  if (!ethers.isAddress(input.recipient)) {
    throw new Error("Invalid directPayment: recipient must be a valid EVM address.");
  }
  if (!input.serviceId || input.serviceId.trim() === "") {
    throw new Error("Invalid directPayment: serviceId is required.");
  }

  const normalized = {
    amountPhars: input.amountPhars,
    currency: "PHRS" as const,
    recipient: ethers.getAddress(input.recipient),
    serviceId: input.serviceId.trim(),
    chainId: 688689 as const
  };

  ethers.parseEther(normalized.amountPhars);

  return {
    ...normalized,
    requestHash: input.requestHash || ethers.id(JSON.stringify(normalized))
  };
}

function normalizeSkillInput(input: AgentPaySkillInput): NormalizedPayment {
  if ("x402" in input && input.x402) {
    return parseX402Requirement(input.x402);
  }
  if ("directPayment" in input && input.directPayment) {
    return normalizeDirectPayment(input.directPayment);
  }

  throw new Error("agentPaySkill requires either x402 or directPayment input.");
}

export async function agentPaySkill(input: AgentPaySkillInput): Promise<AgentPaySkillProof> {
  const config = loadConfig();
  const payment = normalizeSkillInput(input);
  const limit = checkSpendingLimit({
    amountPhars: payment.amountPhars,
    maxPaymentPhars: input.maxPaymentPhars
  });

  if (!limit.allowed) {
    throw new Error(`Spending limit rejected payment: ${limit.reason}`);
  }

  const paymentTx = await executeNativePayment({
    recipient: payment.recipient,
    amountPhars: payment.amountPhars,
    maxPaymentPhars: input.maxPaymentPhars
  });

  if (paymentTx.status !== "success") {
    throw new Error(`Native PHRS payment failed: ${paymentTx.txHash}`);
  }

  const receipt = await storePaymentReceipt({
    recipient: payment.recipient,
    amountWei: limit.amountWei,
    serviceId: payment.serviceId,
    requestHash: payment.requestHash,
    paymentTxHash: paymentTx.txHash
  });

  const proofHeader = JSON.stringify({
    receiptId: receipt.id,
    payer: receipt.payer,
    recipient: payment.recipient,
    amountWei: limit.amountWei.toString(),
    serviceId: payment.serviceId,
    paymentTxHash: paymentTx.txHash,
    receiptTxHash: receipt.registryTxHash,
    requestHash: payment.requestHash
  });

  return {
    ok: true,
    payment: paymentTx,
    receipt: {
      id: receipt.id,
      registryAddress: config.receiptRegistryAddress,
      registryTxHash: receipt.registryTxHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed,
      status: receipt.status
    },
    proof: {
      payer: receipt.payer,
      recipient: payment.recipient,
      token: receipt.token,
      amountPhars: payment.amountPhars,
      amountWei: limit.amountWei.toString(),
      currency: payment.currency,
      serviceId: payment.serviceId,
      chainId: payment.chainId,
      requestHash: payment.requestHash,
      paymentTxHash: paymentTx.txHash
    },
    links: {
      paymentTx: `${config.explorerBaseUrl}/tx/${paymentTx.txHash}`,
      receiptTx: `${config.explorerBaseUrl}/tx/${receipt.registryTxHash}`,
      registry: `${config.explorerBaseUrl}/address/${config.receiptRegistryAddress}`
    },
    proofHeader
  };
}
