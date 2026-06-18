import { ethers } from "ethers";
import { getProvider, getWallet, loadConfig } from "./config";
import { agentPaySkill, AgentPaySkillInput, AgentPaySkillProof } from "./index";

const ABIS = {
  Crowdfund: [
    "function createCampaign(string title,uint256 goal,uint256 durationSeconds) returns (uint256)",
    "function contribute(uint256 id) payable",
    "function claim(uint256 id)",
    "function refund(uint256 id)",
    "function getCampaign(uint256 id) view returns (tuple(uint256 id,address creator,string title,uint256 goal,uint256 totalRaised,uint256 deadline,bool claimed))",
    "event CampaignCreated(uint256 indexed id,address indexed creator,string title,uint256 goal,uint256 deadline)"
  ],
  EscrowPay: [
    "function createEscrow(address payee,string serviceId) payable returns (uint256)",
    "function release(uint256 id)",
    "function refund(uint256 id)",
    "function getEscrow(uint256 id) view returns (tuple(uint256 id,address payer,address payee,uint256 amount,string serviceId,bool released,bool refunded,uint256 createdAt))",
    "event EscrowCreated(uint256 indexed id,address indexed payer,address indexed payee,uint256 amount,string serviceId)"
  ],
  PaymentRequestRegistry: [
    "function createRequest(address payer,uint256 amount,string serviceId,string memo) returns (uint256)",
    "function payRequest(uint256 id) payable",
    "function cancelRequest(uint256 id)",
    "function getRequest(uint256 id) view returns (tuple(uint256 id,address requester,address payer,uint256 amount,string serviceId,string memo,bool paid,bool cancelled,uint256 createdAt,uint256 paidAt))",
    "event PaymentRequestCreated(uint256 indexed id,address indexed requester,address indexed payer,uint256 amount,string serviceId)"
  ],
  Payroll: [
    "function createPayroll(address worker,uint256 amountPerPeriod,uint256 intervalSeconds,string roleId) payable returns (uint256)",
    "function fundPayroll(uint256 id) payable",
    "function pay(uint256 id)",
    "function cancelPayroll(uint256 id)",
    "function getPayroll(uint256 id) view returns (tuple(uint256 id,address employer,address worker,uint256 amountPerPeriod,uint256 intervalSeconds,uint256 nextPayAt,string roleId,bool active))",
    "event PayrollCreated(uint256 indexed id,address indexed employer,address indexed worker,uint256 amountPerPeriod,uint256 intervalSeconds,string roleId)"
  ],
  WalletIntelligence: [
    "function submitWalletSignal(address wallet,uint8 riskScore,string label,bytes32 metadataHash) returns (uint256)",
    "function getLatestSignal(address wallet) view returns (tuple(uint256 id,address wallet,address reporter,uint8 riskScore,string label,bytes32 metadataHash,uint256 timestamp))",
    "event WalletSignalSubmitted(uint256 indexed id,address indexed wallet,address indexed reporter,uint8 riskScore,string label,bytes32 metadataHash)"
  ],
  AgentMarketplace: [
    "function listAgent(string name,string endpoint,uint256 price,bytes32 metadataHash) returns (uint256)",
    "function purchaseAccess(uint256 id) payable",
    "function setListingActive(uint256 id,bool active)",
    "function getListing(uint256 id) view returns (tuple(uint256 id,address owner,string name,string endpoint,uint256 price,bytes32 metadataHash,bool active))",
    "event AgentListed(uint256 indexed id,address indexed owner,string name,uint256 price,bytes32 metadataHash)"
  ],
  TradingSignalGenerator: [
    "function publishSignal(string symbol,string direction,uint8 confidence,uint256 targetPrice,bytes32 metadataHash) returns (uint256)",
    "function getSignal(uint256 id) view returns (tuple(uint256 id,address publisher,string symbol,string direction,uint8 confidence,uint256 targetPrice,bytes32 metadataHash,uint256 timestamp))",
    "event TradingSignalPublished(uint256 indexed id,address indexed publisher,string symbol,string direction,uint8 confidence,uint256 targetPrice,bytes32 metadataHash)"
  ]
};

export type AgenticAction =
  | { action: "agentPay"; input: AgentPaySkillInput }
  | { action: "crowdfund.create"; title: string; goalPhars: string; durationSeconds: number }
  | { action: "crowdfund.contribute"; campaignId: string | number | bigint; amountPhars: string }
  | { action: "crowdfund.claim"; campaignId: string | number | bigint }
  | { action: "crowdfund.refund"; campaignId: string | number | bigint }
  | { action: "escrow.create"; payee: string; amountPhars: string; serviceId: string }
  | { action: "escrow.release"; escrowId: string | number | bigint }
  | { action: "escrow.refund"; escrowId: string | number | bigint }
  | { action: "paymentRequest.create"; payer?: string; amountPhars: string; serviceId: string; memo?: string }
  | { action: "paymentRequest.pay"; requestId: string | number | bigint; amountPhars: string }
  | { action: "paymentRequest.cancel"; requestId: string | number | bigint }
  | { action: "payroll.create"; worker: string; amountPerPeriodPhars: string; intervalSeconds: number; roleId: string; initialFundingPhars?: string }
  | { action: "payroll.fund"; payrollId: string | number | bigint; amountPhars: string }
  | { action: "payroll.pay"; payrollId: string | number | bigint }
  | { action: "payroll.cancel"; payrollId: string | number | bigint }
  | { action: "walletIntel.submit"; wallet: string; riskScore: number; label: string; metadataHash?: string }
  | { action: "marketplace.list"; name: string; endpoint: string; pricePhars: string; metadataHash?: string }
  | { action: "marketplace.purchase"; listingId: string | number | bigint; pricePhars: string }
  | { action: "marketplace.setActive"; listingId: string | number | bigint; active: boolean }
  | { action: "tradingSignal.publish"; symbol: string; direction: string; confidence: number; targetPrice: string | number | bigint; metadataHash?: string };

export type AgenticResult = {
  ok: true;
  action: AgenticAction["action"];
  contract?: string;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  id?: string;
  explorerUrl?: string;
  proof?: AgentPaySkillProof;
};

function metadataHash(value?: string): string {
  if (!value) return ethers.ZeroHash;
  return ethers.isHexString(value, 32) ? value : ethers.id(value);
}

function requiredAddress(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing ${name}. Deploy contracts and set ${name} in .env.`);
  return value;
}

function featureContract(name: keyof typeof ABIS, address: string) {
  const config = loadConfig();
  const wallet = getWallet(config).connect(getProvider(config));
  return new ethers.Contract(address, ABIS[name], wallet);
}

function findEventId(contract: ethers.Contract, receipt: ethers.TransactionReceipt, eventName: string): string | undefined {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contract.target.toString().toLowerCase()) continue;
    const parsed = contract.interface.parseLog(log);
    if (parsed?.name === eventName && parsed.args.id !== undefined) {
      return parsed.args.id.toString();
    }
  }
  return undefined;
}

async function waitForTx(action: AgenticAction["action"], contract: ethers.Contract, tx: ethers.ContractTransactionResponse, eventName?: string): Promise<AgenticResult> {
  const config = loadConfig();
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error(`${action} failed: ${tx.hash}`);
  const address = contract.target.toString();

  return {
    ok: true,
    action,
    contract: address,
    txHash: tx.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
    id: eventName ? findEventId(contract, receipt, eventName) : undefined,
    explorerUrl: `${config.explorerBaseUrl}/tx/${tx.hash}`
  };
}

export async function runAgenticAction(input: AgenticAction): Promise<AgenticResult> {
  const config = loadConfig();

  switch (input.action) {
    case "agentPay": {
      const proof = await agentPaySkill(input.input);
      return { ok: true, action: input.action, proof };
    }
    case "crowdfund.create": {
      const contract = featureContract("Crowdfund", requiredAddress(config.crowdfundAddress, "CROWDFUND_ADDRESS"));
      const tx = await contract.createCampaign(input.title, ethers.parseEther(input.goalPhars), input.durationSeconds);
      return waitForTx(input.action, contract, tx, "CampaignCreated");
    }
    case "crowdfund.contribute": {
      const contract = featureContract("Crowdfund", requiredAddress(config.crowdfundAddress, "CROWDFUND_ADDRESS"));
      return waitForTx(input.action, contract, await contract.contribute(input.campaignId, { value: ethers.parseEther(input.amountPhars) }));
    }
    case "crowdfund.claim": {
      const contract = featureContract("Crowdfund", requiredAddress(config.crowdfundAddress, "CROWDFUND_ADDRESS"));
      return waitForTx(input.action, contract, await contract.claim(input.campaignId));
    }
    case "crowdfund.refund": {
      const contract = featureContract("Crowdfund", requiredAddress(config.crowdfundAddress, "CROWDFUND_ADDRESS"));
      return waitForTx(input.action, contract, await contract.refund(input.campaignId));
    }
    case "escrow.create": {
      const contract = featureContract("EscrowPay", requiredAddress(config.escrowPayAddress, "ESCROW_PAY_ADDRESS"));
      const tx = await contract.createEscrow(input.payee, input.serviceId, { value: ethers.parseEther(input.amountPhars) });
      return waitForTx(input.action, contract, tx, "EscrowCreated");
    }
    case "escrow.release": {
      const contract = featureContract("EscrowPay", requiredAddress(config.escrowPayAddress, "ESCROW_PAY_ADDRESS"));
      return waitForTx(input.action, contract, await contract.release(input.escrowId));
    }
    case "escrow.refund": {
      const contract = featureContract("EscrowPay", requiredAddress(config.escrowPayAddress, "ESCROW_PAY_ADDRESS"));
      return waitForTx(input.action, contract, await contract.refund(input.escrowId));
    }
    case "paymentRequest.create": {
      const contract = featureContract("PaymentRequestRegistry", requiredAddress(config.paymentRequestRegistryAddress, "PAYMENT_REQUEST_REGISTRY_ADDRESS"));
      const payer = input.payer || ethers.ZeroAddress;
      const tx = await contract.createRequest(payer, ethers.parseEther(input.amountPhars), input.serviceId, input.memo || "");
      return waitForTx(input.action, contract, tx, "PaymentRequestCreated");
    }
    case "paymentRequest.pay": {
      const contract = featureContract("PaymentRequestRegistry", requiredAddress(config.paymentRequestRegistryAddress, "PAYMENT_REQUEST_REGISTRY_ADDRESS"));
      return waitForTx(input.action, contract, await contract.payRequest(input.requestId, { value: ethers.parseEther(input.amountPhars) }));
    }
    case "paymentRequest.cancel": {
      const contract = featureContract("PaymentRequestRegistry", requiredAddress(config.paymentRequestRegistryAddress, "PAYMENT_REQUEST_REGISTRY_ADDRESS"));
      return waitForTx(input.action, contract, await contract.cancelRequest(input.requestId));
    }
    case "payroll.create": {
      const contract = featureContract("Payroll", requiredAddress(config.payrollAddress, "PAYROLL_ADDRESS"));
      const tx = await contract.createPayroll(input.worker, ethers.parseEther(input.amountPerPeriodPhars), input.intervalSeconds, input.roleId, {
        value: ethers.parseEther(input.initialFundingPhars || "0")
      });
      return waitForTx(input.action, contract, tx, "PayrollCreated");
    }
    case "payroll.fund": {
      const contract = featureContract("Payroll", requiredAddress(config.payrollAddress, "PAYROLL_ADDRESS"));
      return waitForTx(input.action, contract, await contract.fundPayroll(input.payrollId, { value: ethers.parseEther(input.amountPhars) }));
    }
    case "payroll.pay": {
      const contract = featureContract("Payroll", requiredAddress(config.payrollAddress, "PAYROLL_ADDRESS"));
      return waitForTx(input.action, contract, await contract.pay(input.payrollId));
    }
    case "payroll.cancel": {
      const contract = featureContract("Payroll", requiredAddress(config.payrollAddress, "PAYROLL_ADDRESS"));
      return waitForTx(input.action, contract, await contract.cancelPayroll(input.payrollId));
    }
    case "walletIntel.submit": {
      const contract = featureContract("WalletIntelligence", requiredAddress(config.walletIntelligenceAddress, "WALLET_INTELLIGENCE_ADDRESS"));
      const tx = await contract.submitWalletSignal(input.wallet, input.riskScore, input.label, metadataHash(input.metadataHash));
      return waitForTx(input.action, contract, tx, "WalletSignalSubmitted");
    }
    case "marketplace.list": {
      const contract = featureContract("AgentMarketplace", requiredAddress(config.agentMarketplaceAddress, "AGENT_MARKETPLACE_ADDRESS"));
      const tx = await contract.listAgent(input.name, input.endpoint, ethers.parseEther(input.pricePhars), metadataHash(input.metadataHash));
      return waitForTx(input.action, contract, tx, "AgentListed");
    }
    case "marketplace.purchase": {
      const contract = featureContract("AgentMarketplace", requiredAddress(config.agentMarketplaceAddress, "AGENT_MARKETPLACE_ADDRESS"));
      return waitForTx(input.action, contract, await contract.purchaseAccess(input.listingId, { value: ethers.parseEther(input.pricePhars) }));
    }
    case "marketplace.setActive": {
      const contract = featureContract("AgentMarketplace", requiredAddress(config.agentMarketplaceAddress, "AGENT_MARKETPLACE_ADDRESS"));
      return waitForTx(input.action, contract, await contract.setListingActive(input.listingId, input.active));
    }
    case "tradingSignal.publish": {
      const contract = featureContract("TradingSignalGenerator", requiredAddress(config.tradingSignalGeneratorAddress, "TRADING_SIGNAL_GENERATOR_ADDRESS"));
      const tx = await contract.publishSignal(input.symbol, input.direction, input.confidence, input.targetPrice, metadataHash(input.metadataHash));
      return waitForTx(input.action, contract, tx, "TradingSignalPublished");
    }
  }
}

export async function runAgenticPipeline(actions: AgenticAction[]): Promise<AgenticResult[]> {
  const results: AgenticResult[] = [];
  for (const action of actions) {
    results.push(await runAgenticAction(action));
  }
  return results;
}
