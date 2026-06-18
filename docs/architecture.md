# Architecture

Pharos AgentPay Skill Kit is a reusable payment Skill for AI agents. The core logic lives in `src/` and can be imported by agent runtimes, while `demo/` and `examples/` only show one way to use it.

## Components

- `src/x402.ts` parses x402-style `402 Payment Required` responses.
- `src/spendingLimit.ts` enforces the Phase 1 per-payment PHRS limit.
- `src/pay.ts` sends native `PHRS` with `ethers.js`.
- `src/receipt.ts` stores and verifies on-chain receipt records.
- `src/index.ts` exposes `agentPaySkill()`, the main Skill entrypoint.
- `src/agentic.ts` routes every feature through typed agent actions.
- `contracts/AgentReceiptRegistry.sol` stores receipt metadata on Pharos.
- `contracts/Crowdfund.sol` manages native PHRS campaigns.
- `contracts/EscrowPay.sol` manages native PHRS escrow payments.
- `contracts/PaymentRequestRegistry.sol` manages invoice-style PHRS requests.
- `contracts/Payroll.sol` manages funded recurring PHRS payments.
- `contracts/WalletIntelligence.sol` stores wallet labels and risk signals.
- `contracts/AgentMarketplace.sol` lists paid agent endpoints.
- `contracts/TradingSignalGenerator.sol` stores agent trading signals.
- `demo/server.ts` provides the `/premium-report` paid API demo.

## Flow

```text
AI agent requests /premium-report
        |
        v
Demo server returns HTTP 402 payment JSON
        |
        v
agentPaySkill({ x402 })
        |
        +--> validate x402 fields
        +--> check max PHRS payment
        +--> send native PHRS
        +--> store receipt on-chain
        |
        v
JSON proof returned to agent
        |
        v
Agent retries /premium-report with x-payment-proof
```

## Receipt Model

`AgentReceiptRegistry` stores:

- receipt ID
- payer
- recipient
- token marker
- amount
- service ID
- request hash
- payment transaction hash
- timestamp

Native PHRS is represented by the zero address token marker:

```text
0x0000000000000000000000000000000000000000
```

## Trust Boundaries

The Skill verifies request shape, chain ID, currency, recipient, amount, and spending policy before payment. The demo server and Vercel endpoint parse `x-payment-proof` and verify the receipt against `AgentReceiptRegistry` before unlocking paid data.

## Extension Contract Design

The additional feature contracts are intentionally independent. This keeps the core AgentPay Skill reusable while allowing agent projects to compose only the modules they need:

```text
Crowdfund                raise PHRS for an agent task
EscrowPay                hold PHRS until service completion
PaymentRequestRegistry   create payable service requests
Payroll                  fund recurring agent or worker payouts
WalletIntelligence       publish wallet risk metadata
AgentMarketplace         list and buy access to agent services
TradingSignalGenerator   publish agent-generated trading signals
```

They are MVP contracts for native PHRS flows and on-chain metadata. They avoid ERC-20 payment support and heavyweight admin logic in this phase.

## Agentic Pipeline

Agents can call:

```text
runAgenticAction(action)
runAgenticPipeline(actions[])
```

The router maps intent-like action names to contracts:

```text
agentPay                  -> AgentPay Skill
crowdfund.*               -> Crowdfund
escrow.*                  -> EscrowPay
paymentRequest.*          -> PaymentRequestRegistry
payroll.*                 -> Payroll
walletIntel.submit        -> WalletIntelligence
marketplace.*             -> AgentMarketplace
tradingSignal.publish     -> TradingSignalGenerator
```

This aligns the project with the Phase 1 focus on reusable Skill quality: agents get one clean TypeScript interface while contracts stay independent on Pharos.

## Network

- RPC: `https://atlantic.dplabs-internal.com`
- Chain ID: `688689`
- Native token: `PHRS`
- Explorer: `https://atlantic.pharosscan.xyz`
