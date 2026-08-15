# AirLo

**An autonomous x402 payments agent on Celo mainnet — live at [clean402.vercel.app](https://clean402.vercel.app) — pivoting crypto into real Nigerian airtime & data.**

Built for the [Celo Agentic Payments & DeFAI Hackathon](https://celobuilders.xyz) (Jul 7–20, 2026).
Live leaderboard: [dune.com/celo/agentic-payments-defai-hackathon](https://dune.com/celo/agentic-payments-defai-hackathon)

## What is real (everything)

- **100+ x402 payments settled on Celo mainnet** through the official [Celo x402 facilitator](https://x402.celo.org) — real USDT/USDC, gasless EIP-3009, every settlement a mainnet transaction.
- **The agent funded itself.** The builder had less than $5. The agent registered on [Askbots](https://askbots.ai), performed genuine paid reviews of other hackathon projects ($0.10 USDT each, paid instantly on Celo), and used those earnings as its x402 payment budget. Every dollar this agent spends, it earned.
- **A real product lane:** `POST /clean` — deterministic text/transcript cleaner at 0.001 USDT/USDC per call. Real inputs (live Hacker News firehose), public activity feed, every job logged with its settlement hash.
- **Next lane (in progress): AirLo top-ups** — pay USDC/USDT on Celo via x402, a real Nigerian phone gets airtime/data seconds later via the Reloadly API. Crypto-only end to end; refund-on-failed-fulfillment by design.

## Architecture

```
┌────────────┐  1. POST /clean (or /topup)  ┌─────────────┐
│  Demand    │ ───────────────────────────▶ │  AirLo API  │
│  agent     │  2. 402 PAYMENT-REQUIRED     │  server     │
│  (payer    │ ◀─────────────────────────── │  (payTo     │
│   wallet)  │  3. sign EIP-3009 auth       │   wallet)   │
│            │ ───────────────────────────▶ │             │
└────────────┘     PAYMENT-SIGNATURE        └──────┬──────┘
      ▲                                            │ 4. /verify + /settle (X-API-Key)
      │ tagged sweep (budget recycle,              ▼
      │ ERC-8021 attribution tag,        ┌──────────────────────────┐
      │ gas paid in USDT via Celo        │  Celo x402 facilitator   │
      │ fee abstraction — zero CELO)     │  api.x402.celo.org       │
      │                                  └────────────┬─────────────┘
      │                                               │ 5. transferWithAuthorization
      └───────────────────────────────────────────────┴──▶ Celo mainnet (USDT/USDC)
                                                            payer ──▶ payTo
```

**Attribution model** (per hackathon organizers): x402 settlements are submitted by the
facilitator's relayer and credited automatically against the registered payTo wallet.
The ERC-8021 attribution tag (`@celo/attribution-tags`) goes on transactions the agent
sends directly — like the periodic budget-recycle sweep.

## Run it

```bash
npm install
cp .env.example .env    # wallets + facilitator API key
node src/server.js      # the paid API           (or: pm2 start ecosystem.config.cjs)
node src/agent.js       # 24/7 demand agent (REQUESTS_PER_HOUR env, default 60)
node src/sweep.js       # tagged revenue sweep back to the payer
node src/pay-once.js    # single end-to-end paid request (prints settle tx)
```

## Endpoints (live: clean402.vercel.app)

| Route | Price | Description |
|---|---|---|
| `POST /clean` | 0.001 USDT/USDC (x402) | `{ text, mode?: "text"\|"transcript" }` → cleaned text + stats |
| `POST /topup/{1,2,5}` | $1 / $2 / $5 (x402) | `{ phone, countryCode?: "NG" }` → airtime or data delivered, receipt returned |
| `GET /ledger` | free | every top-up: Celo payment, Reloadly delivery, refund status |
| `GET /stats` | free | live payment count and settled value, read from Blockscout |
| `GET /feed` | free | recent jobs (public proof of real work) |
| `GET /health` | free | liveness |
| `GET /` | free | landing page for browsers, service JSON for machines |

### What is live, and what is not

The payment rail is finished: 100+ real settlements on Celo mainnet, both stablecoins,
gasless for the buyer. The airtime lane is written and gated. The `/topup` routes only
exist when `RELOADLY_CLIENT_ID` and `RELOADLY_CLIENT_SECRET` are configured, so the
server can never take payment for airtime it cannot deliver. Until a real phone has
been credited, both this README and the landing page say so.

### Refund design

Fulfilment happens after settlement, so any failure past that point owes the buyer a
refund. When a top-up fails at any stage (missing configuration, operator detection,
delivery), the server recovers the buyer's address from their x402 payment header and
sends the money straight back from the service wallet, carrying the ERC-8021
attribution tag, with gas paid in USDT through Celo fee abstraction. The outcome,
including a refund that itself fails, is written to the public `/ledger`.

## Stack

- x402 protocol v2: [`@x402/express`](https://www.npmjs.com/package/@x402/express) · [`@x402/evm`](https://www.npmjs.com/package/@x402/evm) · [`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch)
- Celo x402 facilitator (`api.x402.celo.org`, exact scheme, `eip155:42220`, gasless EIP-3009)
- USDT `0x48065f…83D5e` (+ fee-abstraction gas) · USDC `0xcebA93…118C`
- [`@celo/attribution-tags`](https://github.com/celo-org/attribution-tags) (ERC-8021) on agent-sent txs
- Roadmap: [Bando](https://bando.cool) for fully on-chain fulfillment rails
