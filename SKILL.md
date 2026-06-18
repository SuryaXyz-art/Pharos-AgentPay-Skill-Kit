# Skill Name: Pharos AgentPay Skill Kit

## Skill Summary

Pharos AgentPay Skill Kit is a reusable payment Skill for AI agents. It lets an agent parse an x402-style payment request, check a per-payment PHRS spending limit, pay a service on Pharos Atlantic Testnet, store an on-chain receipt, and return clean JSON proof.

This is designed as a composable Skill module, not only a demo dApp.

## Problem

AI agents need to interact with paid APIs, datasets, tools, and services. Most payment flows are designed for humans and do not give agents the structure they need: clear payment requirements, programmable limits, machine-readable receipts, and later verification.

Without a reusable Skill, every agent project has to rebuild payment parsing, wallet execution, spend safety, and proof handling from scratch.

## Solution

The Skill exposes a small TypeScript API centered on `agentPaySkill(input)`. It accepts either an x402-style payment requirement or a direct payment instruction, validates it, enforces a maximum PHRS payment, executes the native PHRS transfer, stores the receipt in `AgentReceiptRegistry`, and returns a JSON proof that other tools can consume.

The repository also includes separate Pharos-native contracts for adjacent agent economy workflows. These are independent modules, so agents can compose only the pieces they need.

## What AI Agents Can Do With It

- Unlock paid APIs when the cost is within policy.
- Pay another service or agent in native PHRS.
- Store an auditable receipt on Pharos.
- Verify a previous receipt by ID.
- Compose payment with retrieval, trading, research, model routing, or workflow automation.
- Keep payment logic isolated in a reusable Skill instead of embedding it into every app.
- Compose payments with crowdfunding, escrow, payment requests, payroll, wallet intelligence, agent listings, and trading signal workflows.

## Extension Contracts

- `Crowdfund`: raise native PHRS for agent projects or data campaigns.
- `EscrowPay`: hold native PHRS until a payer releases or refunds the service payment.
- `PaymentRequestRegistry`: create invoice-style PHRS payment requests.
- `Payroll`: fund and execute recurring PHRS payments.
- `WalletIntelligence`: publish wallet labels and risk scores for agent safety checks.
- `AgentMarketplace`: list paid agent endpoints and sell access.
- `TradingSignalGenerator`: publish on-chain trading signals with confidence scores.

Each feature is deployed as its own contract to keep the architecture modular, auditable, and easy for agents to compose.

## Agentic Pipeline

The Skill exposes all features through an agent-friendly action router:

- `runAgenticAction(action)` for a single action.
- `runAgenticPipeline(actions)` for a sequence of actions.

Example actions:

```json
[
  {
    "action": "walletIntel.submit",
    "wallet": "0xWallet",
    "riskScore": 15,
    "label": "trusted-demo-wallet"
  },
  {
    "action": "marketplace.list",
    "name": "Premium Report Agent",
    "endpoint": "https://example.com/agent",
    "pricePhars": "0.01"
  },
  {
    "action": "tradingSignal.publish",
    "symbol": "PHRS/USD",
    "direction": "WATCH",
    "confidence": 72,
    "targetPrice": 0
  }
]
```

The output is clean JSON with transaction hashes, IDs, contract addresses, gas used, and explorer links.

## Inputs

The Skill supports x402-style input:

```json
{
  "error": "Payment Required",
  "amount": "0.01",
  "currency": "PHRS",
  "recipient": "0xRecipientAddress",
  "serviceId": "premium-report",
  "chainId": 688689,
  "description": "Premium AI market report"
}
```

The Skill also supports direct payment input:

```json
{
  "directPayment": {
    "amountPhars": "0.01",
    "currency": "PHRS",
    "recipient": "0xRecipientAddress",
    "serviceId": "premium-report",
    "chainId": 688689
  }
}
```

Required environment:

- `PHAROS_RPC_URL`
- `PRIVATE_KEY`
- `RECEIPT_REGISTRY_ADDRESS`
- `AGENT_MAX_PAYMENT_PHRS`
- `EXPLORER_BASE_URL`

## Outputs

The main output is a clean JSON proof:

```json
{
  "ok": true,
  "payment": {
    "txHash": "0x...",
    "blockNumber": 12345,
    "gasUsed": "21000",
    "status": "success"
  },
  "receipt": {
    "id": "1",
    "registryAddress": "0x...",
    "registryTxHash": "0x...",
    "status": "success"
  },
  "proof": {
    "payer": "0x...",
    "recipient": "0x...",
    "token": "0x0000000000000000000000000000000000000000",
    "amountPhars": "0.01",
    "amountWei": "10000000000000000",
    "currency": "PHRS",
    "serviceId": "premium-report",
    "chainId": 688689,
    "requestHash": "0x...",
    "paymentTxHash": "0x..."
  },
  "links": {
    "paymentTx": "https://atlantic.pharosscan.xyz/tx/0x...",
    "receiptTx": "https://atlantic.pharosscan.xyz/tx/0x...",
    "registry": "https://atlantic.pharosscan.xyz/address/0x..."
  }
}
```

## Example Agent Prompts

- "Use AgentPay to unlock this paid API if it costs less than 0.05 PHRS."
- "Pay this service 0.01 PHRS and store a verifiable receipt."
- "Verify receipt ID 1 for premium-report."
- "Check if this x402 payment request is safe before paying."

## Safety Rules

- Only supports Pharos Atlantic Testnet chain ID `688689`.
- Only supports native `PHRS` payments in Phase 1.
- Rejects invalid recipient addresses.
- Rejects zero or negative amounts.
- Rejects unsupported currencies.
- Checks `AGENT_MAX_PAYMENT_PHRS` before sending funds.
- Uses `RECEIPT_REGISTRY_ADDRESS` from environment.
- Uses the zero address as the native PHRS token marker in receipts.

## Spending Limit Behavior

`checkSpendingLimit(input)` converts the requested amount with `ethers.parseEther`, compares it against `AGENT_MAX_PAYMENT_PHRS`, and returns:

```json
{
  "allowed": true,
  "reason": "Payment is within spending limit.",
  "amountWei": "10000000000000000",
  "maxWei": "50000000000000000"
}
```

If the requested amount is too high, the Skill returns `allowed: false` from the helper and `agentPaySkill()` throws before any transaction is sent. Phase 1 intentionally enforces the per-payment max only; `AGENT_DAILY_LIMIT_PHRS` is kept in the environment template as a clear Phase 2 policy extension point.

## Receipt Verification Behavior

Receipts are stored in `AgentReceiptRegistry` with:

- receipt ID
- payer
- recipient
- token marker
- amount
- service ID
- request hash
- payment transaction hash
- timestamp

`verifyPaymentReceipt({ id, payer, recipient, amountWei, serviceId })` calls the registry and returns whether the stored receipt matches those fields.

## Pharos Integration

The Skill uses Pharos Atlantic Testnet for payment settlement and receipt proof.

- RPC: `https://atlantic.dplabs-internal.com`
- Chain ID: `688689`
- Native token: `PHRS`
- Explorer: `https://atlantic.pharosscan.xyz`

The payment transaction and receipt transaction are both returned with explorer links so judges, services, and agents can inspect them.

## Demo Flow

1. Start the server:

```bash
npm run demo:server
```

2. Request the premium report:

```bash
GET http://localhost:4020/premium-report
```

3. Server returns HTTP `402` with a PHRS payment requirement.

4. Run the full x402 flow:

```bash
npm run demo:x402
```

5. The Skill pays, stores a receipt, sends the proof back to the server, and prints the unlocked report.

6. Verify a receipt:

```bash
npm run demo:verify -- 1 0xPayerAddress 0xRecipientAddress 10000000000000000 premium-report
```

## Phase 2 Roadmap

- Signed x402 requests and nonce validation.
- Daily and per-service spend limits.
- Service-side proof verification middleware.
- Receipt dashboard for agents and services.
- Agent framework adapters.
- Session keys and account abstraction.
- Production key management and policy storage.
