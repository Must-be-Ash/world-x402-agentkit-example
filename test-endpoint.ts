/**
 * Test script for the x402-protected endpoint with AgentKit (World ID) gate.
 * Human-backed agents get their first N calls free. After that, standard x402 payment.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createPublicClient, http } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import {
  formatSIWEMessage,
} from "@worldcoin/agentkit";

const ENDPOINT = "http://localhost:3000/api/random";

const WALLET_KEY = process.env.X402_WALLET_PRIVATE_KEY as `0x${string}`;

if (!WALLET_KEY) {
  console.error("Missing X402_WALLET_PRIVATE_KEY in .env.local");
  process.exit(1);
}

const registeredAccount = privateKeyToAccount(WALLET_KEY);
const unregisteredAccount = privateKeyToAccount(generatePrivateKey());

const registeredPublicClient = createPublicClient({ chain: baseSepolia, transport: http() });
const registeredSigner = toClientEvmSigner(registeredAccount, registeredPublicClient);

console.log(`Registered wallet:   ${registeredAccount.address}`);
console.log(`Unregistered wallet: ${unregisteredAccount.address}\n`);

function decode402(header: string) {
  return JSON.parse(Buffer.from(header, "base64").toString());
}

/** Build a signed agentkit header from the 402 response */
async function getAgentkitHeader(
  signingAccount = registeredAccount,
): Promise<string | null> {
  const res = await fetch(ENDPOINT);
  const header = res.headers.get("payment-required");
  if (!header) return null;

  const decoded = decode402(header);
  const agentkitExt = decoded?.extensions?.["agentkit"];
  if (!agentkitExt?.info || !agentkitExt?.supportedChains?.length) return null;

  const chain = agentkitExt.supportedChains[0];
  const completeInfo = {
    ...agentkitExt.info,
    chainId: chain.chainId,
    type: chain.type,
  };

  // Format the SIWE message
  const message = formatSIWEMessage(completeInfo, signingAccount.address);

  // Sign the message
  const signature = await signingAccount.signMessage({ message });

  // Build the payload
  const payload = {
    domain: completeInfo.domain,
    address: signingAccount.address,
    statement: completeInfo.statement,
    uri: completeInfo.uri,
    version: completeInfo.version,
    chainId: chain.chainId,
    type: chain.type,
    nonce: completeInfo.nonce,
    issuedAt: completeInfo.issuedAt,
    expirationTime: completeInfo.expirationTime,
    resources: completeInfo.resources,
    signature,
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

// ─── Test 1: 402 response structure ───
async function test1() {
  console.log("═══ Test 1: 402 with agentkit extension ═══");
  const res = await fetch(ENDPOINT);
  console.log(`Status: ${res.status}`);

  const header = res.headers.get("payment-required");
  if (res.status !== 402 || !header) {
    console.log("FAIL\n");
    return false;
  }

  const decoded = decode402(header);
  const agentkit = decoded?.extensions?.["agentkit"];

  console.log(`agentkit extension: ${agentkit ? "present" : "MISSING"}`);

  const hasMode =
    agentkit?.mode?.type === "free-trial" && agentkit?.mode?.uses === 3;
  console.log(
    `mode: ${agentkit?.mode ? JSON.stringify(agentkit.mode) : "MISSING"}`,
  );
  console.log(`mode correct (free-trial, 3 uses): ${hasMode}`);

  const pass = !!agentkit && hasMode;
  console.log(pass ? "PASS\n" : "FAIL\n");
  return pass;
}

// ─── Test 2: Registered agent → free access (first call) ───
async function test2() {
  console.log("═══ Test 2: Registered agent → free access (first call) ═══");

  const agentkitHeaderValue = await getAgentkitHeader();
  if (!agentkitHeaderValue) {
    console.log("FAIL: Could not get agentkit challenge\n");
    return false;
  }

  const res = await fetch(ENDPOINT, {
    headers: { agentkit: agentkitHeaderValue },
  });
  console.log(`Status: ${res.status}`);

  if (res.ok) {
    const data = await res.json();
    console.log(`Response: ${JSON.stringify(data)}`);
    const hasNumber =
      typeof data.number === "number" && data.number >= 1 && data.number <= 9;
    console.log(`Valid number (1-9): ${hasNumber}`);
    console.log(
      hasNumber ? "PASS: Free access granted\n" : "FAIL: Invalid response\n",
    );
    return hasNumber;
  }

  console.log(`FAIL: Expected 200, got ${res.status}\n`);
  return false;
}

// ─── Test 3: Free trial exhaustion ───
async function test3() {
  console.log("═══ Test 3: Free trial exhaustion (4th call → 402) ═══");

  // Uses 2 and 3 (use 1 was consumed in test2)
  for (let i = 2; i <= 3; i++) {
    const header = await getAgentkitHeader();
    if (!header) {
      console.log(`FAIL: Could not get agentkit challenge for call ${i}\n`);
      return false;
    }
    const res = await fetch(ENDPOINT, {
      headers: { agentkit: header },
    });
    console.log(`  Call ${i}: status ${res.status}`);
    if (!res.ok) {
      console.log(`FAIL: Call ${i} should still be free\n`);
      return false;
    }
  }

  // 4th call — should be 402
  const header = await getAgentkitHeader();
  if (!header) {
    console.log("FAIL: Could not get agentkit challenge for call 4\n");
    return false;
  }
  const res = await fetch(ENDPOINT, {
    headers: { agentkit: header },
  });
  console.log(`  Call 4: status ${res.status}`);

  if (res.status === 402) {
    console.log("PASS: Free trial exhausted, payment required\n");
    return true;
  }
  console.log(`FAIL: Expected 402, got ${res.status}\n`);
  return false;
}

// ─── Test 4: Unregistered agent → 402 ───
async function test4() {
  console.log("═══ Test 4: Unregistered agent → 402 ═══");
  console.log(`Using unregistered wallet: ${unregisteredAccount.address}`);

  const agentkitHeaderValue = await getAgentkitHeader(unregisteredAccount);
  if (!agentkitHeaderValue) {
    console.log("FAIL: Could not get agentkit challenge\n");
    return false;
  }

  const res = await fetch(ENDPOINT, {
    headers: { agentkit: agentkitHeaderValue },
  });
  console.log(`Status: ${res.status}`);

  if (res.status === 402) {
    console.log("PASS: Unregistered agent falls through to payment\n");
    return true;
  }
  console.log(`FAIL: Expected 402, got ${res.status}\n`);
  return false;
}

// ─── Test 5: Exhausted free trial + payment → 200 ───
async function test5() {
  console.log("═══ Test 5: Exhausted free trial + payment → 200 ═══");

  const agentkitHeaderValue = await getAgentkitHeader();
  if (!agentkitHeaderValue) {
    console.log("FAIL: Could not get agentkit challenge\n");
    return false;
  }

  // Wrap fetch to always include agentkit header
  const fetchWithAgentkit = (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(
      input instanceof Request ? input.headers : init?.headers,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((v, k) => headers.set(k, v));
    }
    headers.set("agentkit", agentkitHeaderValue);
    return fetch(input, { ...init, headers });
  };

  const client = new x402Client().register(
    "eip155:84532",
    new ExactEvmScheme(registeredSigner),
  );
  const fetchWithPay = wrapFetchWithPayment(fetchWithAgentkit, client);

  try {
    const res = await fetchWithPay(ENDPOINT);
    console.log(`Status: ${res.status}`);

    if (res.ok) {
      const data = await res.json();
      console.log(`Response: ${JSON.stringify(data)}`);
      console.log("PASS: Paid after free trial exhausted\n");
      return true;
    }
    const body = await res.text();
    console.log(`Body: ${body}`);
    console.log("FAIL\n");
    return false;
  } catch (err) {
    console.log(`Error: ${err}`);
    console.log("FAIL\n");
    return false;
  }
}

// ─── Run ───
async function main() {
  const results: Record<string, boolean> = {};

  results["Test 1: 402 + agentkit extension"] = await test1();
  results["Test 2: Registered agent free access"] = await test2();
  results["Test 3: Free trial exhaustion"] = await test3();
  results["Test 4: Unregistered agent → 402"] = await test4();
  results["Test 5: Exhausted + payment → 200"] = await test5();

  console.log("═══ SUMMARY ═══");
  for (const [name, passed] of Object.entries(results)) {
    console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  }
}

main().catch(console.error);
