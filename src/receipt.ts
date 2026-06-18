import { ethers } from "ethers";
import { getProvider, getWallet, loadConfig, loadReadOnlyConfig } from "./config";

export const NATIVE_PHRS_TOKEN = ethers.ZeroAddress;

const REGISTRY_ABI = [
  "event ReceiptStored(uint256 indexed id,address indexed payer,address indexed recipient,address token,uint256 amount,string serviceId,bytes32 requestHash,bytes32 paymentTxHash)",
  "function storeReceipt(address recipient,address token,uint256 amount,string serviceId,bytes32 requestHash,bytes32 paymentTxHash) returns (uint256)",
  "function getReceipt(uint256 id) view returns (tuple(uint256 id,address payer,address recipient,address token,uint256 amount,string serviceId,bytes32 requestHash,bytes32 paymentTxHash,uint256 timestamp))",
  "function verifyReceipt(uint256 id,address payer,address recipient,uint256 amount,string serviceId) view returns (bool)"
];

export type StorePaymentReceiptInput = {
  recipient: string;
  amountWei: bigint | string;
  serviceId: string;
  requestHash: string;
  paymentTxHash: string;
  token?: string;
};

export type StoredPaymentReceipt = {
  id: string;
  payer: string;
  recipient: string;
  token: string;
  amountWei: string;
  serviceId: string;
  requestHash: string;
  paymentTxHash: string;
  registryTxHash: string;
  blockNumber: number;
  gasUsed: string;
  status: "success" | "failed";
};

export type PaymentReceipt = {
  id: string;
  payer: string;
  recipient: string;
  token: string;
  amountWei: string;
  serviceId: string;
  requestHash: string;
  paymentTxHash: string;
  timestamp: string;
};

export type VerifyPaymentReceiptInput = {
  id: bigint | number | string;
  payer: string;
  recipient: string;
  amountWei: bigint | string;
  serviceId: string;
};

function getRegistryContract(signerOrProvider?: ethers.Signer | ethers.Provider): ethers.Contract {
  const config = signerOrProvider ? loadConfig() : loadReadOnlyConfig();
  const registryAddress = config.receiptRegistryAddress;
  const provider = getProvider(config);
  const connection = signerOrProvider || provider;

  return new ethers.Contract(registryAddress, REGISTRY_ABI, connection);
}

function cleanReceipt(receipt: {
  id: bigint;
  payer: string;
  recipient: string;
  token: string;
  amount: bigint;
  serviceId: string;
  requestHash: string;
  paymentTxHash: string;
  timestamp: bigint;
}): PaymentReceipt {
  return {
    id: receipt.id.toString(),
    payer: receipt.payer,
    recipient: receipt.recipient,
    token: receipt.token,
    amountWei: receipt.amount.toString(),
    serviceId: receipt.serviceId,
    requestHash: receipt.requestHash,
    paymentTxHash: receipt.paymentTxHash,
    timestamp: receipt.timestamp.toString()
  };
}

function getStoredReceiptEvent(
  registry: ethers.Contract,
  txReceipt: ethers.TransactionReceipt
): { id: bigint; payer: string } {
  for (const log of txReceipt.logs) {
    if (log.address.toLowerCase() !== registry.target.toString().toLowerCase()) {
      continue;
    }

    const parsed = registry.interface.parseLog(log);
    if (parsed?.name === "ReceiptStored") {
      return {
        id: parsed.args.id,
        payer: parsed.args.payer
      };
    }
  }

  throw new Error("Receipt transaction did not emit ReceiptStored.");
}

export async function storePaymentReceipt(input: StorePaymentReceiptInput): Promise<StoredPaymentReceipt> {
  if (!ethers.isAddress(input.recipient)) {
    throw new Error("Invalid receipt recipient: expected a valid EVM address.");
  }
  if (input.token && !ethers.isAddress(input.token)) {
    throw new Error("Invalid receipt token: expected a valid EVM address.");
  }

  const config = loadConfig();
  const wallet = getWallet(config).connect(getProvider(config));
  const registry = getRegistryContract(wallet);
  const token = input.token ? ethers.getAddress(input.token) : NATIVE_PHRS_TOKEN;
  const amountWei = BigInt(input.amountWei);
  if (amountWei <= 0n) {
    throw new Error("Invalid receipt amount: amountWei must be greater than zero.");
  }
  if (!input.serviceId.trim()) {
    throw new Error("Invalid receipt serviceId: serviceId is required.");
  }
  if (!ethers.isHexString(input.requestHash, 32)) {
    throw new Error("Invalid receipt requestHash: expected bytes32 hex string.");
  }
  if (!ethers.isHexString(input.paymentTxHash, 32)) {
    throw new Error("Invalid receipt paymentTxHash: expected bytes32 hex string.");
  }

  const tx = await registry.storeReceipt(
    ethers.getAddress(input.recipient),
    token,
    amountWei,
    input.serviceId,
    input.requestHash,
    input.paymentTxHash
  );
  const txReceipt = await tx.wait();

  if (!txReceipt) {
    throw new Error(`Receipt transaction was not confirmed: ${tx.hash}`);
  }
  const storedEvent = getStoredReceiptEvent(registry, txReceipt);

  return {
    id: storedEvent.id.toString(),
    payer: storedEvent.payer,
    recipient: ethers.getAddress(input.recipient),
    token,
    amountWei: amountWei.toString(),
    serviceId: input.serviceId,
    requestHash: input.requestHash,
    paymentTxHash: input.paymentTxHash,
    registryTxHash: tx.hash,
    blockNumber: txReceipt.blockNumber,
    gasUsed: txReceipt.gasUsed.toString(),
    status: txReceipt.status === 1 ? "success" : "failed"
  };
}

export async function getPaymentReceipt(id: bigint | number | string): Promise<PaymentReceipt> {
  const registry = getRegistryContract();
  const receipt = await registry.getReceipt(id);
  return cleanReceipt(receipt);
}

export async function verifyPaymentReceipt(input: VerifyPaymentReceiptInput): Promise<{
  id: string;
  verified: boolean;
}> {
  if (!ethers.isAddress(input.payer)) {
    throw new Error("Invalid receipt payer: expected a valid EVM address.");
  }
  if (!ethers.isAddress(input.recipient)) {
    throw new Error("Invalid receipt recipient: expected a valid EVM address.");
  }
  if (BigInt(input.amountWei) <= 0n) {
    throw new Error("Invalid receipt amount: amountWei must be greater than zero.");
  }
  if (!input.serviceId.trim()) {
    throw new Error("Invalid receipt serviceId: serviceId is required.");
  }

  const registry = getRegistryContract();
  const verified = await registry.verifyReceipt(
    input.id,
    ethers.getAddress(input.payer),
    ethers.getAddress(input.recipient),
    input.amountWei,
    input.serviceId.trim()
  );

  return {
    id: input.id.toString(),
    verified
  };
}
