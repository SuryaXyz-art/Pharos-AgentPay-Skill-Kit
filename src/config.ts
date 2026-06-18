import * as dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

export const PHAROS_ATLANTIC = {
  name: "pharos-atlantic",
  rpcUrl: "https://atlantic.dplabs-internal.com",
  chainId: 688689,
  nativeToken: "PHRS",
  explorerUrl: "https://atlantic.pharosscan.xyz"
} as const;

export type AgentPayConfig = {
  rpcUrl: string;
  chainId: number;
  privateKey: string;
  receiptRegistryAddress: string;
  crowdfundAddress?: string;
  escrowPayAddress?: string;
  paymentRequestRegistryAddress?: string;
  payrollAddress?: string;
  walletIntelligenceAddress?: string;
  agentMarketplaceAddress?: string;
  tradingSignalGeneratorAddress?: string;
  maxPaymentPhrs: string;
  dailyLimitPhrs: string;
  testRecipient?: string;
  testTokenAddress?: string;
  explorerBaseUrl: string;
};

export type ReadOnlyAgentPayConfig = Pick<
  AgentPayConfig,
  "rpcUrl" | "chainId" | "receiptRegistryAddress" | "explorerBaseUrl"
>;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required environment variable ${name}. Copy .env.example to .env and set ${name}.`);
  }

  return value.trim();
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

function assertAddress(value: string, name: string): string {
  if (!ethers.isAddress(value)) {
    throw new Error(`Invalid ${name}: expected an EVM address, received "${value}".`);
  }

  return ethers.getAddress(value);
}

function assertPositivePhrs(value: string, name: string): string {
  try {
    if (ethers.parseEther(value) <= 0n) {
      throw new Error();
    }
  } catch {
    throw new Error(`Invalid ${name}: expected a positive PHRS amount, received "${value}".`);
  }

  return value;
}

export function loadConfig(): AgentPayConfig {
  const rpcUrl = requiredEnv("PHAROS_RPC_URL");
  const privateKey = requiredEnv("PRIVATE_KEY");
  const receiptRegistryAddress = requiredEnv("RECEIPT_REGISTRY_ADDRESS");
  const maxPaymentPhrs = requiredEnv("AGENT_MAX_PAYMENT_PHRS");
  const dailyLimitPhrs = requiredEnv("AGENT_DAILY_LIMIT_PHRS");
  const explorerBaseUrl = requiredEnv("EXPLORER_BASE_URL");
  const testRecipient = process.env.TEST_RECIPIENT;
  const testTokenAddress = process.env.TEST_TOKEN_ADDRESS;

  if (!privateKey.startsWith("0x") || privateKey.length !== 66) {
    throw new Error("Invalid PRIVATE_KEY: expected a 32-byte hex private key with 0x prefix.");
  }

  return {
    rpcUrl,
    chainId: PHAROS_ATLANTIC.chainId,
    privateKey,
    receiptRegistryAddress: assertAddress(receiptRegistryAddress, "RECEIPT_REGISTRY_ADDRESS"),
    crowdfundAddress: process.env.CROWDFUND_ADDRESS ? assertAddress(process.env.CROWDFUND_ADDRESS, "CROWDFUND_ADDRESS") : undefined,
    escrowPayAddress: process.env.ESCROW_PAY_ADDRESS ? assertAddress(process.env.ESCROW_PAY_ADDRESS, "ESCROW_PAY_ADDRESS") : undefined,
    paymentRequestRegistryAddress: process.env.PAYMENT_REQUEST_REGISTRY_ADDRESS ? assertAddress(process.env.PAYMENT_REQUEST_REGISTRY_ADDRESS, "PAYMENT_REQUEST_REGISTRY_ADDRESS") : undefined,
    payrollAddress: process.env.PAYROLL_ADDRESS ? assertAddress(process.env.PAYROLL_ADDRESS, "PAYROLL_ADDRESS") : undefined,
    walletIntelligenceAddress: process.env.WALLET_INTELLIGENCE_ADDRESS ? assertAddress(process.env.WALLET_INTELLIGENCE_ADDRESS, "WALLET_INTELLIGENCE_ADDRESS") : undefined,
    agentMarketplaceAddress: process.env.AGENT_MARKETPLACE_ADDRESS ? assertAddress(process.env.AGENT_MARKETPLACE_ADDRESS, "AGENT_MARKETPLACE_ADDRESS") : undefined,
    tradingSignalGeneratorAddress: process.env.TRADING_SIGNAL_GENERATOR_ADDRESS ? assertAddress(process.env.TRADING_SIGNAL_GENERATOR_ADDRESS, "TRADING_SIGNAL_GENERATOR_ADDRESS") : undefined,
    maxPaymentPhrs: assertPositivePhrs(maxPaymentPhrs, "AGENT_MAX_PAYMENT_PHRS"),
    dailyLimitPhrs: assertPositivePhrs(dailyLimitPhrs, "AGENT_DAILY_LIMIT_PHRS"),
    testRecipient: testRecipient ? assertAddress(testRecipient, "TEST_RECIPIENT") : undefined,
    testTokenAddress: testTokenAddress ? assertAddress(testTokenAddress, "TEST_TOKEN_ADDRESS") : undefined,
    explorerBaseUrl
  };
}

export function loadReadOnlyConfig(): ReadOnlyAgentPayConfig {
  const rpcUrl = requiredEnv("PHAROS_RPC_URL");
  const receiptRegistryAddress = requiredEnv("RECEIPT_REGISTRY_ADDRESS");
  const explorerBaseUrl = requiredEnv("EXPLORER_BASE_URL");

  return {
    rpcUrl,
    chainId: PHAROS_ATLANTIC.chainId,
    receiptRegistryAddress: assertAddress(receiptRegistryAddress, "RECEIPT_REGISTRY_ADDRESS"),
    explorerBaseUrl
  };
}

export function loadDemoConfig(): Partial<AgentPayConfig> & {
  rpcUrl: string;
  chainId: number;
  maxPaymentPhrs: string;
  dailyLimitPhrs: string;
  explorerBaseUrl: string;
} {
  return {
    rpcUrl: optionalEnv("PHAROS_RPC_URL", PHAROS_ATLANTIC.rpcUrl),
    chainId: PHAROS_ATLANTIC.chainId,
    privateKey: process.env.PRIVATE_KEY,
    receiptRegistryAddress: process.env.RECEIPT_REGISTRY_ADDRESS,
    crowdfundAddress: process.env.CROWDFUND_ADDRESS,
    escrowPayAddress: process.env.ESCROW_PAY_ADDRESS,
    paymentRequestRegistryAddress: process.env.PAYMENT_REQUEST_REGISTRY_ADDRESS,
    payrollAddress: process.env.PAYROLL_ADDRESS,
    walletIntelligenceAddress: process.env.WALLET_INTELLIGENCE_ADDRESS,
    agentMarketplaceAddress: process.env.AGENT_MARKETPLACE_ADDRESS,
    tradingSignalGeneratorAddress: process.env.TRADING_SIGNAL_GENERATOR_ADDRESS,
    maxPaymentPhrs: optionalEnv("AGENT_MAX_PAYMENT_PHRS", "0.05"),
    dailyLimitPhrs: optionalEnv("AGENT_DAILY_LIMIT_PHRS", "0.25"),
    testRecipient: process.env.TEST_RECIPIENT,
    testTokenAddress: process.env.TEST_TOKEN_ADDRESS,
    explorerBaseUrl: optionalEnv("EXPLORER_BASE_URL", PHAROS_ATLANTIC.explorerUrl)
  };
}

export function getProvider(config: { rpcUrl: string; chainId: number } = loadConfig()): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(config.rpcUrl, config.chainId);
}

export function getWallet(config = loadConfig()): ethers.Wallet {
  return new ethers.Wallet(config.privateKey, getProvider(config));
}
