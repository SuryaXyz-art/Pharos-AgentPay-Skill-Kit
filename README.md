# Pharos AgentPay Skill Kit

Reusable x402 payment, spending-limit, and receipt-proof Skill module that lets AI agents safely pay for APIs and services on Pharos while creating verifiable on-chain receipts.

## Problem Statement

AI agents increasingly need to access paid APIs, premium datasets, inference tools, and agent-to-agent services. Today, most payment flows are built for humans: browser wallets, manual confirmations, screenshots, invoices, or centralized API credits. That does not fit autonomous agents that need clear limits, machine-readable payment requests, and proof that a payment happened.

The missing piece is a reusable payment Skill that an agent can call safely, not a one-off dApp.

## Solution

Pharos AgentPay Skill Kit is a TypeScript Skill module for agent runtimes. It accepts an x402-style payment requirement or a direct payment instruction, checks a configured per-payment PHRS spending limit, sends native PHRS on Pharos Atlantic Testnet, stores a receipt in a Solidity registry, and returns clean JSON proof with explorer links.

The core Skill remains focused on safe agent payments. The project also includes separate MVP contracts for common agent-economy workflows: crowdfunding, escrow pay, payment requests, payroll, wallet intelligence, agent marketplace listings, and trading signal publishing.

All features are pipelined through `runAgenticAction()` and `runAgenticPipeline()` so an agent can execute the full suite through one typed interface while still keeping each contract separate and auditable.

Core flow:

```text
Paid API returns HTTP 402
        |
        v
AI agent passes x402 JSON to agentPaySkill()
        |
        v
Skill validates chain, currency, recipient, amount, and serviceId
        |
        v
Skill checks max spend policy
        |
        v
Skill sends native PHRS payment on Pharos
        |
        v
AgentReceiptRegistry stores receipt metadata on-chain
        |
        v
Agent receives JSON proof and unlocks the service
```

## Why AI Agents Need This

Agents need payment tools that are programmable, bounded, and auditable. This Skill gives agents a safe way to:

- Pay for premium APIs without manual wallet interaction.
- Enforce max payment limits before funds move.
- Produce verifiable receipts for downstream workflows.
- Reuse the same payment module across many services.
- Compose payments with planning, retrieval, trading, data, and automation agents.

## Why Pharos

Pharos is a strong fit for agent payments because the network supports fast, low-cost testnet experimentation with EVM tooling. This project uses the Pharos Atlantic Testnet as the settlement and receipt layer for AI-agent commerce.

- RPC: `https://atlantic.dplabs-internal.com`
- Chain ID: `688689`
- Native token: `PHRS`
- Explorer: `https://atlantic.pharosscan.xyz`

## Key Features

Core AgentPay Skill:

- x402-style `402 Payment Required` parsing.
- Direct payment mode for agent-controlled payments.
- Native PHRS transfer with `ethers.js`.
- Per-payment spending limit check before payment.
- On-chain receipt storage through `AgentReceiptRegistry`.
- Receipt verification by ID, payer, recipient, amount, and service.
- Express demo server with `/premium-report`.
- CLI demos for direct payment, full x402 flow, and receipt verification.
- Clean JSON outputs designed for agent runtimes.

Agent economy extension contracts:

- `Crowdfund` - agents or teams can raise native PHRS for a campaign.
- `EscrowPay` - payer deposits PHRS and releases or refunds after service completion.
- `PaymentRequestRegistry` - service providers can create payable PHRS requests.
- `Payroll` - employers can fund recurring native PHRS payments to workers or agents.
- `WalletIntelligence` - reporters can publish simple wallet risk labels and scores.
- `AgentMarketplace` - agent builders can list paid agent endpoints.
- `TradingSignalGenerator` - signal agents can publish trading ideas with confidence scores.

Agentic pipeline:

- `runAgenticAction(action)` executes one typed action.
- `runAgenticPipeline(actions)` executes a sequence of agent actions.
- Actions return clean JSON with `ok`, `action`, `contract`, `txHash`, `id`, `gasUsed`, and `explorerUrl`.

## Architecture Diagram

```text
examples/full-x402-flow.ts
        |
        v
demo/server.ts
  GET /premium-report
        |
        v
HTTP 402 payment requirement
        |
        v
src/index.ts
  agentPaySkill()
        |
        +--> src/x402.ts
        |      parseX402Requirement()
        |
        +--> src/spendingLimit.ts
        |      checkSpendingLimit()
        |
        +--> src/pay.ts
        |      executeNativePayment()
        |
        +--> src/receipt.ts
               storePaymentReceipt()
               getPaymentReceipt()
               verifyPaymentReceipt()
        |
        +--> src/agentic.ts
               runAgenticAction()
               runAgenticPipeline()
        |
        v
contracts/AgentReceiptRegistry.sol
        |
        v
Pharos Atlantic Testnet
```

Extension contracts are intentionally separate:

```text
contracts/
  AgentReceiptRegistry.sol       Core receipt proof
  Crowdfund.sol                  Native PHRS campaigns
  EscrowPay.sol                  Native PHRS escrow
  PaymentRequestRegistry.sol     Payment invoices/requests
  Payroll.sol                    Recurring PHRS payroll
  WalletIntelligence.sol         Wallet labels and risk signals
  AgentMarketplace.sol           Paid agent listings
  TradingSignalGenerator.sol     On-chain trading signals
```

## Folder Structure

```text
contracts/   Solidity receipt registry and feature contracts
scripts/     Deployment scripts
src/         Reusable TypeScript Skill modules
examples/    CLI demos for payment and verification
demo/        Express paid API demo
test/        Hardhat contract tests
docs/        Supporting architecture and demo notes
```

## Smart Contract Explanation

`contracts/AgentReceiptRegistry.sol` is intentionally simple and judge-readable. It has no owner, admin, upgrade, or permission layer.

It stores:

- `id`
- `payer`
- `recipient`
- `token`
- `amount`
- `serviceId`
- `requestHash`
- `paymentTxHash`
- `timestamp`

`msg.sender` is always recorded as the payer. The contract rejects zero recipient and zero amount. Native PHRS payments use the zero address as the token marker.

Main functions:

- `storeReceipt(...) returns (uint256)` stores a receipt and emits `ReceiptStored`.
- `getReceipt(id)` returns the full receipt.
- `verifyReceipt(id, payer, recipient, amount, serviceId)` returns `true` only when the stored receipt matches.

Additional contracts are separate by design:

- `Crowdfund.sol`: create campaigns, contribute PHRS, claim if the goal is met, refund if it is not.
- `EscrowPay.sol`: create funded escrow, release to payee, or refund to payer.
- `PaymentRequestRegistry.sol`: create an invoice-style request and accept exact native PHRS payment.
- `Payroll.sol`: create, fund, pay, and cancel simple recurring payroll streams.
- `WalletIntelligence.sol`: publish wallet risk scores and labels for agent decision support.
- `AgentMarketplace.sol`: list paid agent endpoints and purchase access.
- `TradingSignalGenerator.sol`: publish simple trading signals with confidence and metadata.

These contracts are MVP building blocks for the Pharos on-chain agent economy. They avoid ERC-20 support and complex role systems to keep the submission simple and auditable.

## Skill Modules Explanation

- `src/x402.ts` validates x402-style payment requirements and creates a deterministic `requestHash`.
- `src/spendingLimit.ts` checks payment amount against `AGENT_MAX_PAYMENT_PHRS`. `AGENT_DAILY_LIMIT_PHRS` is included as a Phase 2 policy extension point, but the Phase 1 MVP intentionally enforces only the per-payment max.
- `src/pay.ts` sends native PHRS using `PRIVATE_KEY` and `PHAROS_RPC_URL`.
- `src/receipt.ts` writes and verifies receipts against `AgentReceiptRegistry`.
- `src/agentic.ts` exposes every feature contract as agent-callable actions.
- `src/index.ts` exposes `agentPaySkill(input)`, the main composable Skill entrypoint.

## Agentic Pipeline Example

```ts
import { runAgenticPipeline } from "./src";

const results = await runAgenticPipeline([
  {
    action: "walletIntel.submit",
    wallet: "0xWallet",
    riskScore: 15,
    label: "trusted-demo-wallet"
  },
  {
    action: "marketplace.list",
    name: "Premium Report Agent",
    endpoint: "https://example.com/agent",
    pricePhars: "0.01"
  },
  {
    action: "tradingSignal.publish",
    symbol: "PHRS/USD",
    direction: "WATCH",
    confidence: 72,
    targetPrice: 0
  }
]);
```

Run the demo:

```bash
npm run demo:agentic
```

## Setup Instructions

```bash
npm install
cp .env.example .env
```

Fill `.env` with a funded Pharos Atlantic Testnet wallet and deployed registry address.

## Environment Variables

```bash
PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
PRIVATE_KEY=your_test_wallet_private_key
RECEIPT_REGISTRY_ADDRESS=0x6aD56f3fA8D4957e0Eb38F154ea00B1EEE8a8Dd1
CROWDFUND_ADDRESS=0xD225D97d335059316071D5833889bF3f6aD81e36
ESCROW_PAY_ADDRESS=0x5FA1B37Dc9BeA6DbD548232121Dc8733172D5EB7
PAYMENT_REQUEST_REGISTRY_ADDRESS=0x4051BefA7202db9b6768F6b136fC9F8D07800800
PAYROLL_ADDRESS=0x6f281299127c72BF4fF5A4B16408CE615200aD7E
WALLET_INTELLIGENCE_ADDRESS=0x971E756d5E756771e37e5beE14C5f49DFBba2670
AGENT_MARKETPLACE_ADDRESS=0x25f9f0C1308483bf0cB4637eda3105140E14FC94
TRADING_SIGNAL_GENERATOR_ADDRESS=0xD634Ba983dE5cB66a65eBb113e4aBA36663af75E
AGENT_MAX_PAYMENT_PHRS=0.05
AGENT_DAILY_LIMIT_PHRS=0.25
TEST_RECIPIENT=0xYourRecipientAddress
TEST_TOKEN_ADDRESS=0x0000000000000000000000000000000000000000
EXPLORER_BASE_URL=https://atlantic.pharosscan.xyz
```

## Commands

Compile:

```bash
npm run compile
```

Test:

```bash
npm test
```

Deploy:

```bash
npm run deploy
```

`npm run deploy` deploys all contracts and prints their addresses. Use the printed `AgentReceiptRegistry` address as `RECEIPT_REGISTRY_ADDRESS`.

Run demo server:

```bash
npm run demo:server
```

Run direct payment demo:

```bash
npm run demo:pay -- --recipient 0xYourRecipientAddress --amount 0.01 --service premium-report
```

Run x402 demo:

```bash
npm run demo:x402
```

Verify receipt:

```bash
npm run demo:verify -- 1 0xPayerAddress 0xRecipientAddress 10000000000000000 premium-report
```

Run agentic feature pipeline:

```bash
npm run demo:agentic
```

## Easy Step-by-Step Deployment

1. Install dependencies:

```bash
npm install
```

2. Create `.env`:

```bash
cp .env.example .env
```

3. Add your funded Pharos Atlantic private key:

```bash
PRIVATE_KEY=0xyour_funded_testnet_private_key
```

4. Confirm network values:

```bash
PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
EXPLORER_BASE_URL=https://atlantic.pharosscan.xyz
```

5. Compile contracts:

```bash
npm run compile
```

6. Run tests:

```bash
npm test
```

7. Deploy all contracts to Pharos Atlantic:

```bash
npm run deploy
```

8. Copy printed addresses into `.env`:

```bash
RECEIPT_REGISTRY_ADDRESS=...
CROWDFUND_ADDRESS=...
ESCROW_PAY_ADDRESS=...
PAYMENT_REQUEST_REGISTRY_ADDRESS=...
PAYROLL_ADDRESS=...
WALLET_INTELLIGENCE_ADDRESS=...
AGENT_MARKETPLACE_ADDRESS=...
TRADING_SIGNAL_GENERATOR_ADDRESS=...
```

9. Run the local paid API demo:

```bash
npm run demo:server
```

10. In another terminal, execute the x402 payment flow:

```bash
npm run demo:x402
```

11. Run the agentic feature pipeline:

```bash
npm run demo:agentic
```

12. Optional Vercel deployment:

```bash
npx vercel login
npx vercel --prod
```

Set Vercel env vars for read-only hosted verification:

```bash
PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
RECEIPT_REGISTRY_ADDRESS=0x6aD56f3fA8D4957e0Eb38F154ea00B1EEE8a8Dd1
TEST_RECIPIENT=0xYourRecipientAddress
EXPLORER_BASE_URL=https://atlantic.pharosscan.xyz
```

## Vercel Deployment

The project includes a professional black-and-white UI plus Vercel serverless endpoints for the paid report demo:

- `GET /`
- `GET /health`
- `GET /premium-report`

The Vercel endpoint verifies `x-payment-proof` against the deployed `AgentReceiptRegistry` before unlocking the report. It does not need `PRIVATE_KEY` on Vercel.

Set these Vercel environment variables:

```bash
PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
RECEIPT_REGISTRY_ADDRESS=0x6aD56f3fA8D4957e0Eb38F154ea00B1EEE8a8Dd1
TEST_RECIPIENT=0xYourRecipientAddress
EXPLORER_BASE_URL=https://atlantic.pharosscan.xyz
```

Deploy:

```bash
npx vercel --prod
```

To run the x402 demo against the hosted endpoint:

```bash
npm run demo:x402
```

## UI Testing

Local UI:

```bash
npm run demo:server
```

Open:

```text
http://localhost:4020
```

Check:

- The animated black-and-white background is visible.
- Feature cards render for AgentPay, Crowdfund, Escrow, Payment Requests, Payroll, Wallet Intelligence, Agent Marketplace, and Trading Signals.
- Contract links open the Pharos Atlantic explorer.
- `GET /health` returns status `200`.
- `GET /premium-report` returns status `402` until a verified proof is supplied.

Vercel UI:

```bash
npx vercel login
npx vercel --prod
```

Open the production URL printed by Vercel and repeat the same checks.

## Full Feature Testing Checklist

1. Compile all contracts:

```bash
npm run compile
```

2. Run all tests:

```bash
npm test
```

3. Test the direct payment Skill:

```bash
npm run demo:pay -- --recipient 0xYourRecipientAddress --amount 0.01 --service premium-report
```

4. Test the x402 payment and receipt flow:

```bash
npm run demo:server
npm run demo:x402
```

5. Test the agentic feature pipeline:

```bash
npm run demo:agentic
```

6. Test hosted Vercel endpoints:

```powershell
$env:DEMO_BASE_URL="https://your-vercel-app.vercel.app"
npm run demo:x402
```

7. Verify a receipt:

```bash
npm run demo:verify -- 1 0xPayerAddress 0xRecipientAddress 10000000000000000 premium-report
```

Set `DEMO_BASE_URL` to your Vercel URL before running the command. In PowerShell:

```powershell
$env:DEMO_BASE_URL="https://your-vercel-app.vercel.app"
npm run demo:x402
```

## Example Outputs

HTTP 402 from `/premium-report`:

```json
{
  "error": "Payment Required",
  "amount": "0.01",
  "currency": "PHRS",
  "recipient": "0xYourRecipientAddress",
  "serviceId": "premium-report",
  "chainId": 688689,
  "description": "Premium AI market report"
}
```

Agent payment proof:

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
    "currency": "PHRS",
    "serviceId": "premium-report",
    "chainId": 688689,
    "requestHash": "0x..."
  }
}
```

Unlocked report:

```json
{
  "status": "unlocked",
  "report": "This is the premium report unlocked by Pharos AgentPay Skill Kit.",
  "proof": "{\"receiptId\":\"1\"}",
  "timestamp": "2026-06-16T00:00:00.000Z"
}
```

## Reusability and Composability

This project is built as a Skill module first. Any agent framework can import `agentPaySkill()` and combine it with its own planning, tool use, API calls, memory, policy engine, or wallet management.

Composable use cases:

- Paid API unlocks.
- Agent-to-agent service payments.
- Data marketplace access.
- Premium model routing.
- Auditable research workflows.
- Post-payment receipt verification.

## Phase 2 Roadmap

- Full x402 compatibility with signed payment requirements.
- Daily spend accounting and persistent policy storage.
- Service-side proof verification middleware.
- Agent policy presets for risk tiers.
- Multi-agent receipt dashboards.
- SDK adapters for popular agent frameworks.
- Optional account abstraction and session keys.

## Deployed Pharos Atlantic Contracts

- Demo video: `TODO: add demo video link`
- AgentReceiptRegistry: `0x6aD56f3fA8D4957e0Eb38F154ea00B1EEE8a8Dd1`
- Crowdfund: `0xD225D97d335059316071D5833889bF3f6aD81e36`
- EscrowPay: `0x5FA1B37Dc9BeA6DbD548232121Dc8733172D5EB7`
- PaymentRequestRegistry: `0x4051BefA7202db9b6768F6b136fC9F8D07800800`
- Payroll: `0x6f281299127c72BF4fF5A4B16408CE615200aD7E`
- WalletIntelligence: `0x971E756d5E756771e37e5beE14C5f49DFBba2670`
- AgentMarketplace: `0x25f9f0C1308483bf0cB4637eda3105140E14FC94`
- TradingSignalGenerator: `0xD634Ba983dE5cB66a65eBb113e4aBA36663af75E`
