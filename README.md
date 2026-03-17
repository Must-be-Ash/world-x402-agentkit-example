# First Call Free — x402 + AgentKit (World ID)

An x402-protected API that gives human-backed agents their first calls for free using [AgentKit](https://docs.world.org/world-chain/quick-start/fund-wallet) (World ID proof-of-personhood). After the free trial, standard x402 payment kicks in.

Sybil-resistant — one human = one identity, even across multiple wallets.

## How it works

```
GET /api/random (no headers)
  → 402 + agentkit challenge + payment info

GET /api/random + agentkit header (signed challenge)
  ├─ human-backed + free uses left  → 200 free access
  ├─ human-backed + trial exhausted → 402 pay $0.02
  └─ not in AgentBook               → 402 pay $0.02

GET /api/random + agentkit header + PAYMENT
  └─ 200 paid access
```

## Setup

```bash
npm install
cp .env.example .env.local  # add your wallet keys
npm run dev
```

### Register your agent in AgentBook

Your test wallet needs to be tied to a World ID (one-time setup):

```bash
npx @worldcoin/agentkit-cli register <your-wallet-address> --network base --auto
```

Scan the QR code with World App to complete biometric verification.

### Environment variables

```env
X402_WALLET_ADDRESS=0x...
X402_WALLET_PRIVATE_KEY=0x...
AGENTKIT_FREE_USES=3
```

## Test scripts

| Command | Script | What it does | Needs AgentBook? |
|---------|--------|-------------|-----------------|
| `npm test` | `test-endpoint.ts` | Full suite — 5 tests covering 402 structure, free access, trial exhaustion, unregistered agent, and exhausted + payment | Yes (tests 2/3/5) |
| `npm run test:quick` | `test-first-call-free.ts` | Quick check — signs an agentkit challenge and tries to get free access | Yes |
| `npm run test:paid` | `test-paid.ts` | Pays $0.02 USDC and gets the random number — no AgentKit needed | No |

Start with `npm run test:paid` to verify the endpoint and payment flow work. The other tests require your wallet to be registered in AgentBook first.

## Stack

- [x402](https://x402.org) — HTTP 402 payment protocol
- [AgentKit](https://docs.world.org/world-chain/quick-start/fund-wallet) — World ID proof-of-personhood for agents
- Next.js, Base Sepolia, USDC
# world-x402-agentkit-example
