/**
 * Quick test — checks if the test wallet gets free access via AgentKit (World ID).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { privateKeyToAccount } from "viem/accounts";
import { formatSIWEMessage } from "@worldcoin/agentkit";

const ENDPOINT = "http://localhost:3000/api/random";
const PRIVATE_KEY = process.env.X402_WALLET_PRIVATE_KEY as `0x${string}`;

if (!PRIVATE_KEY) {
  console.error("Missing X402_WALLET_PRIVATE_KEY in .env.local");
  process.exit(1);
}

const account = privateKeyToAccount(PRIVATE_KEY);

function decode402(header: string) {
  return JSON.parse(Buffer.from(header, "base64").toString());
}

async function main() {
  console.log(`Wallet: ${account.address}`);

  // Step 1: Get 402 + agentkit challenge
  const res402 = await fetch(ENDPOINT);
  if (res402.status !== 402) {
    console.log(`Expected 402, got ${res402.status}`);
    return;
  }

  const header = res402.headers.get("payment-required");
  if (!header) {
    console.log("No payment-required header");
    return;
  }

  const decoded = decode402(header);
  const agentkitExt = decoded?.extensions?.["agentkit"];
  if (!agentkitExt?.info) {
    console.log("No agentkit extension in 402 response");
    return;
  }

  console.log(`Mode: ${JSON.stringify(agentkitExt.mode)}`);

  // Step 2: Sign agentkit challenge
  const chain = agentkitExt.supportedChains[0];
  const completeInfo = {
    ...agentkitExt.info,
    chainId: chain.chainId,
    type: chain.type,
  };

  const message = formatSIWEMessage(completeInfo, account.address);
  const signature = await account.signMessage({ message });

  const payload = {
    domain: completeInfo.domain,
    address: account.address,
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

  const agentkitHeader = Buffer.from(JSON.stringify(payload)).toString(
    "base64",
  );

  // Step 3: Send agentkit-only request
  const res = await fetch(ENDPOINT, {
    headers: { agentkit: agentkitHeader },
  });

  console.log(`Status: ${res.status}`);

  if (res.ok) {
    const data = await res.json();
    console.log(`Free access granted! Result: ${JSON.stringify(data)}`);
  } else {
    console.log("Not registered in AgentBook — payment required.");
  }
}

main().catch(console.error);
