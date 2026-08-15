// Express app (no listener) — shared by local server.js and the Vercel serverless entry.
import express from "express";
import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { cleanText } from "./clean.js";
import { LANDING_HTML } from "./landing.js";
import { env } from "./env.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// on serverless the repo dir is read-only — fall back to tmp for the activity log
const dataDir = process.env.VERCEL ? join(tmpdir(), "clean402-data") : join(root, "data");
mkdirSync(dataDir, { recursive: true });
const activityFile = join(dataDir, "activity.jsonl");

// payTo is public (it's the on-chain receiving address); the facilitator API key is
// a real secret — on hosts where it isn't configured yet, free routes still work and
// the paid lane returns a clear error from the facilitator instead of crashing.
const PAY_TO = env("WALLET_ADDRESS", "0x7F3cE1fC7599012b7da97e1e14F5D33257A6e1f4");
const API_KEY = env("FACILITATOR_API_KEY", "");

// Celo mainnet stablecoins — both EIP-3009 capable, both supported by the facilitator
const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
// USDT has no version() on-chain; its EIP-712 domain is exactly name "Tether USD", version "1"
const USDT = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";
const PRICE_ATOMIC = "1000"; // 0.001 (6 decimals, both tokens)

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

export const app = express();
app.use(express.json({ limit: "256kb" }));

app.use(
  paymentMiddleware(
    {
      "POST /clean": {
        accepts: [
          {
            scheme: "exact",
            network: "eip155:42220",
            payTo: PAY_TO,
            price: {
              amount: PRICE_ATOMIC,
              asset: USDT,
              extra: { name: "Tether USD", version: "1" },
            },
            maxTimeoutSeconds: 120,
          },
          {
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
        ],
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
  try {
    appendFileSync(
      activityFile,
      JSON.stringify({ t: new Date().toISOString(), n: served, ...result.stats }) + "\n",
    );
  } catch { /* ephemeral fs on serverless — feed is best-effort there */ }
  res.json(result);
});

// Live on-chain stats — incoming stablecoin transfers to the payTo wallet,
// straight from Blockscout (facilitator settles + direct payments). 60s cache.
let statsCache = { at: 0, data: null };
app.get("/stats", async (_req, res) => {
  if (Date.now() - statsCache.at < 60_000 && statsCache.data) return res.json(statsCache.data);
  try {
    const PER_PAGE = 1000;
    let payments = 0, volumeMicro = 0n, lastTx = null;
    for (let page = 1; page <= 5; page++) {
      const rows = await fetch(
        `https://celo.blockscout.com/api?module=account&action=tokentx&address=${PAY_TO}&page=${page}&offset=${PER_PAGE}&sort=desc`,
        { signal: AbortSignal.timeout(6000) },
      ).then((x) => x.json()).then((j) => j.result ?? []);
      for (const tx of rows) {
        if (tx.to?.toLowerCase() === PAY_TO.toLowerCase() && (tx.tokenSymbol === "USDT" || tx.tokenSymbol === "USDC")) {
          payments += 1;
          volumeMicro += BigInt(tx.value);
          if (!lastTx) lastTx = tx.hash;
        }
      }
      if (rows.length < PER_PAGE) break;
    }
    statsCache = {
      at: Date.now(),
      data: { payments, volumeUsd: Number(volumeMicro) / 1e6, lastTx, payTo: PAY_TO, source: "celo.blockscout.com", at: new Date().toISOString() },
    };
    res.json(statsCache.data);
  } catch (e) {
    res.status(502).json({ error: "stats upstream unavailable", detail: e.message?.slice(0, 120) });
  }
});

// Free routes
const infoJson = {
  service: "AirLo",
  what: "x402 pay-per-request agent on Celo — text cleaning now, airtime top-ups next",
  price: "0.001 USDT/USDC per call (x402, HTTP 402 flow)",
  network: "eip155:42220 (Celo mainnet)",
  facilitator: "https://api.x402.celo.org",
  endpoints: { paid: "POST /clean", stats: "GET /stats", feed: "GET /feed", health: "GET /health" },
  source: "https://github.com/mzterwalexzyy/clean402",
};

app.get("/", (req, res, next) => {
  const wantsHtml = (req.headers.accept || "").includes("text/html");
  if (!wantsHtml) return res.json({ ...infoJson, payTo: PAY_TO });
  next();
});

app.get("/", (_req, res) => {
  res.type("html").send(LANDING_HTML);
});

app.get("/health", (_req, res) => res.json({ ok: true, served }));

app.get("/feed", (_req, res) => {
  let lines = [];
  try {
    if (existsSync(activityFile)) {
      const raw = readFileSync(activityFile, "utf8").trim();
      if (raw) lines = raw.split("\n").slice(-100).map((l) => JSON.parse(l));
    }
  } catch { /* best-effort */ }
  res.json({ recent: lines.reverse(), totalServed: served });
});

// Vercel's Express auto-detection requires the app as default export
export default app;
