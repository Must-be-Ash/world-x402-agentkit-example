import {
  paymentProxyFromHTTPServer,
  x402ResourceServer,
  x402HTTPResourceServer,
} from "@x402/next";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import {
  declareAgentkitExtension,
  agentkitResourceServerExtension,
  createAgentkitHooks,
  createAgentBookVerifier,
  InMemoryAgentKitStorage,
} from "@worldcoin/agentkit";

const payTo = "0xF7C645b7600Fb6AaE07Fd0Cf31112A7788BE8F85";

const FREE_USES = parseInt(process.env.AGENTKIT_FREE_USES || "3", 10);

const agentBook = createAgentBookVerifier();
const storage = new InMemoryAgentKitStorage();

const hooks = createAgentkitHooks({
  storage,
  agentBook,
  mode: { type: "free-trial", uses: FREE_USES },
});

const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

const resourceServer = new x402ResourceServer(facilitatorClient)
  .register("eip155:84532", new ExactEvmScheme())
  .registerExtension(agentkitResourceServerExtension);

const routes = {
  "GET /api/random": {
    accepts: [
      {
        scheme: "exact" as const,
        price: "$0.02",
        network: "eip155:84532" as const,
        payTo,
      },
    ],
    extensions: declareAgentkitExtension({
      statement: "Verify your agent is backed by a real human for free access",
      mode: { type: "free-trial", uses: FREE_USES },
    }),
  },
};

const httpServer = new x402HTTPResourceServer(resourceServer, routes)
  .onProtectedRequest(hooks.requestHook);

export const middleware = paymentProxyFromHTTPServer(httpServer);

export const runtime = "nodejs";

export const config = {
  matcher: ["/api/:path*"],
};
