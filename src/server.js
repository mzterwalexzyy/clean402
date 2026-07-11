import express from "express";
import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { cleanText } from "./clean.js";
import { env } from "./env.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = join(root, "data");
mkdirSync(dataDir, { recursive: true });
const activityFile = join(dataDir, "activity.jsonl");

const PAY_TO = env("WALLET_ADDRESS");
const API_KEY = env("FACILITATOR_API_KEY");
const PORT = Number(env("PORT", "4021"));

// Celo mainnet USDC (native, Circle) — EIP-3009 capable
const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
const PRICE_ATOMIC = "1000"; // 0.001 USDC (6 decimals)

const facilitator = new HTTPFacilitatorClient({
  url: "https://api.x402.celo.org",
  createAuthHeaders: async () => ({
    verify: { "X-API-Key": API_KEY },
    settle: { "X-API-Key": API_KEY },
  }),
});

const resourceServer = new x402ResourceServer(facilitator).register(
  "eip155:42220",
  new ExactEvmScheme(),
);

const app = express();
app.use(express.json({ limit: "256kb" }));

app.use(
  paymentMiddleware(
    {
      "POST /clean": {
        accepts: {
          scheme: "exact",
          network: "eip155:42220",
          payTo: PAY_TO,
          price: {
            amount: PRICE_ATOMIC,
            asset: USDC,
            extra: { name: "USDC", version: "2" },
          },
          maxTimeoutSeconds: 120,
        },
        description:
          "Clean402 — deterministic text/transcript cleaner. POST { text, mode?: 'text'|'transcript', stripSpeakers?: boolean }",
        mimeType: "application/json",
      },
    },
    resourceServer,
  ),
);

let served = 0;

app.post("/clean", (req, res) => {
  const { text, mode, stripSpeakers } = req.body ?? {};
  if (typeof text !== "string" || text.length === 0) {
    return res.status(400).json({ error: "body must include non-empty 'text' string" });
  }
  const result = cleanText(text, {
    mode: mode === "transcript" ? "transcript" : "text",
    stripSpeakers: !!stripSpeakers,
  });
  served += 1;
  appendFileSync(
    activityFile,
    JSON.stringify({ t: new Date().toISOString(), n: served, ...result.stats }) + "\n",
  );
  res.json(result);
});

// Free routes
app.get("/", (_req, res) => {
  res.json({
    service: "Clean402",
    what: "x402 pay-per-request text/transcript cleaner on Celo",
    price: "0.001 USDC per call (x402, HTTP 402 flow)",
    payTo: PAY_TO,
    network: "eip155:42220 (Celo mainnet)",
    facilitator: "https://api.x402.celo.org",
    endpoints: { paid: "POST /clean", feed: "GET /feed", health: "GET /health" },
    source: "https://github.com/mzterwalexzyy/clean402",
  });
});

app.get("/health", (_req, res) => res.json({ ok: true, served }));

app.get("/feed", (_req, res) => {
  let lines = [];
  if (existsSync(activityFile)) {
    const raw = readFileSync(activityFile, "utf8").trim();
    if (raw) lines = raw.split("\n").slice(-100).map((l) => JSON.parse(l));
  }
  res.json({ recent: lines.reverse(), totalServed: served });
});

app.listen(PORT, () => {
  console.log(`Clean402 listening on :${PORT} — payTo ${PAY_TO}, 0.001 USDC per /clean call`);
});
