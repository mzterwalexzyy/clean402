# Deploying Clean402 to the VPS (Ubuntu ARM)

```bash
# once
sudo apt update && sudo apt install -y git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2

git clone https://github.com/mzterwalexzyy/clean402.git && cd clean402
npm install
# create .env from .env.example with real keys (never committed)

pm2 start ecosystem.config.cjs
pm2 save && pm2 startup   # survive reboots
```

- `clean402-server` — the paid API (port 4021; put behind caddy/nginx or expose directly).
- `clean402-agent` — the 24/7 demand loop (set `PUBLIC_URL` in `.env` to the server's public URL).
- `clean402-sweep` — every 30 min, returns accumulated USDC revenue to the payer wallet
  in a transaction tagged with our ERC-8021 attribution tag (needs a little CELO for gas
  in the service wallet).

Health: `curl localhost:4021/health` • Activity: `curl localhost:4021/feed` • Logs: `pm2 logs`.
Rate: tune `REQUESTS_PER_HOUR` in `.env` (default 60/h). At 60/h, 7 days ≈ 10,080 payments ≈
$10.08 in facilitator fees (first 500 settlements free); the 0.001 USDC payments themselves
recycle payer ↔ service.
