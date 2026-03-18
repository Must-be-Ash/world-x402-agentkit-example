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

For free calls to work, your agent's wallet needs to be tied to a World ID. This is a one-time setup:

1. Download [World App](https://world.org/download) and complete identity verification (biometric)
2. Run the CLI with your agent's wallet address:

```bash
npx @worldcoin/agentkit-cli register <your-wallet-address> --network base --auto
```

3. Scan the QR code with World App to complete verification
4. The CLI submits the registration transaction on-chain — your wallet is now in AgentBook

Once registered, any server using AgentKit can look up your wallet and see it's backed by a real person. Skipping this step is fine — the endpoint still works, your agent just pays for every call instead of getting free ones.

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

## Why AgentKit

AgentKit plugs into x402's existing hook system — you don't write gate logic. One function handles signature verification, AgentBook lookup, usage tracking, and access decisions:

```typescript
const hooks = createAgentkitHooks({
  agentBook,
  mode: { type: "free-trial", uses: 3 },
  storage: new InMemoryAgentKitStorage(),
});
```

Three access modes out of the box:

| Mode | What it does |
|------|-------------|
| `free` | Human-backed agents never pay |
| `free-trial` | First N calls free per human, then paid |
| `discount` | N% off for human-backed agents |

Usage is tracked per **human**, not per wallet. One person with 100 wallets still gets only 3 free calls — World ID biometric proof ties every wallet back to a single identity.

### What you see as a provider

Every verified request gives you two things:

- **Wallet address** — which specific agent made the request
- **Anonymous human ID** — which human is behind it (a one-way hash, not their real identity)

One human = one `humanId`, no matter how many agents they register. All 1,000 of their agents resolve to the same ID. You can tell "these agents belong to the same person" without knowing *who* that person is — that's the privacy guarantee from World ID.

## Stack

- [x402](https://x402.org) — HTTP 402 payment protocol
- [AgentKit](https://docs.world.org/world-chain/quick-start/fund-wallet) — World ID proof-of-personhood for agents
- Next.js, Base Sepolia, USDC
