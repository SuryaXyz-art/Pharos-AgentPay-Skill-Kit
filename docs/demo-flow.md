# Demo Flow

## 1. Configure

```bash
cp .env.example .env
```

Set:

- `PRIVATE_KEY`
- `RECEIPT_REGISTRY_ADDRESS`
- `TEST_RECIPIENT`

## 2. Deploy Registry

```bash
npm run compile
npm run deploy
```

Copy the deployed registry address into `RECEIPT_REGISTRY_ADDRESS`.

## 3. Run Demo Server

```bash
npm run demo:server
```

Open:

```bash
curl http://localhost:4020/premium-report
```

The server returns HTTP `402` with a PHRS payment requirement.

## 4. Execute Full x402 Flow

```bash
npm run demo:x402
```

The example:

1. Requests `/premium-report`.
2. Detects HTTP `402`.
3. Passes the response JSON into `agentPaySkill({ x402 })`.
4. Sends native `PHRS`.
5. Stores a receipt on-chain.
6. Retries `/premium-report` with `x-payment-proof`.
7. Prints the unlocked report.

## 5. Verify Later

```bash
npm run demo:verify -- 1 0xPAYER 0xRECIPIENT 10000000000000000 premium-report
```

Expected output:

```json
{
  "receiptId": "1",
  "id": "1",
  "verified": true
}
```
