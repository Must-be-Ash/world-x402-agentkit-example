/**
 * Quick test — pays $0.02 USDC via x402 and gets a random number.
 * No AgentKit/World ID needed — just a funded wallet.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";

const key = process.env.X402_WALLET_PRIVATE_KEY as `0x${string}`;
const account = privateKeyToAccount(key);
const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
const signer = toClientEvmSigner(account, publicClient);

const client = new x402Client().register("eip155:84532", new ExactEvmScheme(signer));
const fetchWithPay = wrapFetchWithPayment(fetch, client);

async function main() {
  console.log(`Wallet: ${account.address}`);
  console.log("Making paid call to /api/random...\n");

  const res = await fetchWithPay("http://localhost:3000/api/random");
  console.log(`Status: ${res.status}`);

  if (res.ok) {
    const data = await res.json();
    console.log(`Response: ${JSON.stringify(data)}`);
  } else {
    const body = await res.text();
    console.log(`Body: ${body}`);
  }
}

main().catch(console.error);
