# AgentKit Highlights

## You don't write gate logic

With SIWX, you write the entire gate function yourself — parse header, verify signature, check condition, grant or deny. AgentKit gives you `createAgentkitHooks()` — one function that handles signature verification, AgentBook lookup, usage tracking, and access decisions. You configure it, not build it.

## Built-in access modes

Three modes out of the box. No custom logic needed.

| Mode | What it does |
|------|-------------|
| `free` | Human-backed agents never pay |
| `free-trial` | First N calls free per human, then paid |
| `discount` | N% off for human-backed agents |

```typescript
// That's it. Three lines.
const hooks = createAgentkitHooks({
  agentBook,
  mode: { type: "free-trial", uses: 3 },
  storage: new InMemoryAgentKitStorage(),
});
```

## No database required

`InMemoryAgentKitStorage` tracks usage counts in memory. No MongoDB, no Redis, no connection strings. For production you'd implement the `AgentKitStorage` interface with a persistent backend, but for getting started it's zero-dependency.

## Sybil-resistant by design

Usage is tracked per human, not per wallet. One person with 100 wallets still gets only 3 free calls. This is what makes "first call free" actually work — World ID biometric proof ties every wallet back to a real human.

## It's an x402 extension, not a replacement

AgentKit plugs into x402's existing hook system. Register the extension, wire up the hook, done. Your x402 payment flow stays exactly the same — AgentKit just adds an identity layer on top.
