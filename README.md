# Clean402

**x402 pay-per-request text/transcript cleaner on Celo mainnet, with a 24/7 demand agent.**

Built for the [Celo Agentic Payments & DeFAI Hackathon](https://celobuilders.xyz) (Jul 7–20, 2026).
Live leaderboard: [dune.com/celo/agentic-payments-defai-hackathon](https://dune.com/celo/agentic-payments-defai-hackathon)

## What it is

- **Supply side** — a public HTTP API (`POST /clean`) that cleans messy text and transcripts
  (unicode normalization, filler-word removal, timestamp stripping, spacing/casing fixes).
  Each call costs **0.001 USDC**, paid via the [x402 protocol](https://x402.org) and settled
  on **Celo mainnet** through the official [Celo x402 facilitator](https://x402.celo.org)
  (gasless EIP-3009 `transferWithAuthorization` — the buyer signs off-chain, the facilitator
  submits on-chain and pays gas).
- **Demand side** — an autonomous agent that continuously processes real public text through
  the paid API, paying per request from its own wallet, and publishes everything it does to a
  public activity feed (`GET /feed`).

Everything is real: real Celo mainnet settlements, real USDC, no mocks, no testnet.

## Architecture

```
┌────────────┐  1. POST /clean            ┌─────────────┐
│  Demand    │ ─────────────────────────▶ │  Clean402   │
│  agent     │  2. 402 PAYMENT-REQUIRED   │  API server │
│  (payer    │ ◀───────────────────────── │  (payTo     │
│   wallet)  │  3. sign EIP-3009 auth     │   wallet)   │
│            │ ─────────────────────────▶ │             │
└────────────┘     PAYMENT-SIGNATURE      └──────┬──────┘
                                                 │ 4. /verify + /settle (X-API-Key)
                                                 ▼
                                   ┌──────────────────────────┐
                                   │  Celo x402 facilitator   │
                                   │  api.x402.celo.org       │
                                   └────────────┬─────────────┘
                                                │ 5. transferWithAuthorization
                                                ▼
                                     Celo mainnet USDC
                                     payer ──▶ payTo (on-chain)
```

## Run it

```bash
npm install
cp .env.example .env   # fill in wallets + facilitator API key
node src/server.js     # supply side
node src/pay-once.js   # one paid request end-to-end (prints settle tx hash)
```

## Endpoints

| Route | Price | Description |
|---|---|---|
| `POST /clean` | 0.001 USDC (x402) | `{ text, mode?: "text"\|"transcript", stripSpeakers? }` → cleaned text + stats |
| `GET /feed` | free | recent activity (public proof of real work) |
| `GET /health` | free | liveness |
| `GET /` | free | service info |

## Stack

- [`@x402/express`](https://www.npmjs.com/package/@x402/express) + [`@x402/evm`](https://www.npmjs.com/package/@x402/evm) + [`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch) (x402 protocol v2)
- Celo x402 facilitator (`https://api.x402.celo.org`, exact scheme, `eip155:42220`)
- USDC on Celo: `0xcebA9300f2b948710d2653dD7B07f33A8B32118C`
- [`@celo/attribution-tags`](https://github.com/celo-org/attribution-tags) — ERC-8021 attribution suffix on the agent's own transactions
