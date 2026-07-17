// Clean402 demand agent — pays the API per request, 24/7, doing real observable work.
// Source of real inputs: Hacker News (new comments + titles via the public Firebase API).
// Every job: fetch real text -> pay 0.001 USDC via x402 -> log result + settle tx hash publicly.
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, http, erc20Abi, formatUnits } from "viem";
import { celo } from "viem/chains";
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { appendFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { env } from "./env.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
mkdirSync(join(root, "data"), { recursive: true });
const logFile = join(root, "data", "agent-log.jsonl");

const account = privateKeyToAccount(env("PAYER_PRIVATE_KEY"));
const base = env("PUBLIC_URL", "http://localhost:4021");
const REQUESTS_PER_HOUR = Number(env("REQUESTS_PER_HOUR", "60"));
const LOW_BALANCE_USDC = 0.05; // warn threshold, in USDC

const HN = "https://hacker-news.firebaseio.com/v0";
const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
const USDT = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";
const chain = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });

const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: "eip155:*", client: new ExactEvmScheme(account) }],
});

const stripHtml = (s) =>
  s
    .replace(/<p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");

let cursor = 0; // last processed HN item id
let jobs = 0, paid = 0, failures = 0;

async function nextItems(count) {
  const max = await fetch(`${HN}/maxitem.json`).then((r) => r.json());
  if (!cursor) cursor = max - count;
  const ids = [];
  for (let id = cursor + 1; id <= max && ids.length < count; id++) ids.push(id);
  const items = await Promise.all(
    ids.map((id) => fetch(`${HN}/item/${id}.json`).then((r) => r.json()).catch(() => null)),
  );
  if (ids.length) cursor = ids[ids.length - 1];
  return items.filter((it) => it && !it.deleted && !it.dead && (it.text || it.title));
}

async function usdcBalance() {
  // spendable stablecoin balance: USDT + USDC (both accepted by the paid endpoint)
  const [t, c] = await Promise.all([
    chain.readContract({ address: USDT, abi: erc20Abi, functionName: "balanceOf", args: [account.address] }),
    chain.readContract({ address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [account.address] }),
  ]);
  return Number(formatUnits(t + c, 6));
}

function log(entry) {
  appendFileSync(logFile, JSON.stringify({ t: new Date().toISOString(), ...entry }) + "\n");
}

async function runJob(item) {
  const raw = stripHtml(item.text || item.title).slice(0, 4000);
  if (raw.trim().length < 20) return; // skip trivial items
  jobs += 1;
  try {
    const res = await fetchWithPayment(`${base}/clean`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: raw, mode: "text" }),
    });
    if (res.status !== 200) {
      failures += 1;
      const pr = res.headers.get("PAYMENT-REQUIRED");
      const reason = pr ? JSON.parse(Buffer.from(pr, "base64").toString()).error : `http_${res.status}`;
      log({ job: jobs, hn: item.id, ok: false, reason });
      console.error(`job ${jobs} FAILED: ${reason}`);
      return;
    }
    const body = await res.json();
    paid += 1;
    const header = res.headers.get("PAYMENT-RESPONSE") || res.headers.get("X-PAYMENT-RESPONSE");
    const receipt = header ? decodePaymentResponseHeader(header) : null;
    const tx = receipt?.transaction ?? receipt?.txHash ?? null;
    log({
      job: jobs, hn: item.id, hnType: item.type, ok: true,
      inChars: body.stats.inputChars, outChars: body.stats.outputChars, tx,
    });
    console.log(`job ${jobs} OK hn=${item.id} tx=${tx ?? "?"} (paid total: ${paid})`);
  } catch (e) {
    failures += 1;
    log({ job: jobs, hn: item.id, ok: false, reason: e.message?.slice(0, 200) });
    console.error(`job ${jobs} ERROR:`, e.message);
  }
}

const intervalMs = Math.max(3_000, Math.round(3_600_000 / REQUESTS_PER_HOUR));
console.log(`Clean402 agent: payer ${account.address}, ${REQUESTS_PER_HOUR} req/h (every ${intervalMs / 1000}s), target ${base}`);

let lastBalanceCheck = 0;
let balance = null;
for (;;) {
  const started = Date.now();
  try {
    // periodic balance check (every 10 min; every loop while unfunded)
    if (balance === null || balance < 0.001 || Date.now() - lastBalanceCheck > 600_000) {
      lastBalanceCheck = Date.now();
      balance = await usdcBalance();
      console.log(`[balance] ${balance} USDC | jobs=${jobs} paid=${paid} failures=${failures}`);
      log({ balance, jobs, paid, failures });
      if (balance < LOW_BALANCE_USDC) console.error(`[LOW BALANCE] ${balance} USDC — top up ${account.address}`);
    }
    if (balance < 0.001) {
      // unfunded: don't hammer the facilitator with doomed verifies
      await new Promise((r) => setTimeout(r, 60_000));
      continue;
    }
    const items = await nextItems(3);
    if (items.length) await runJob(items[0]);
  } catch (e) {
    console.error("loop error:", e.message);
  }
  const wait = intervalMs - (Date.now() - started);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
}
