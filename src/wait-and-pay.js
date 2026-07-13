// Watches the payer wallet for USDC on Celo mainnet; fires the first paid request when funded.
import { createPublicClient, http, erc20Abi, formatUnits } from "viem";
import { celo } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { execFileSync } from "node:child_process";
import { env } from "./env.js";

const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
const payer = privateKeyToAccount(env("PAYER_PRIVATE_KEY")).address;
const client = createPublicClient({ chain: celo, transport: http("https://forno.celo.org") });

const POLL_MS = 20_000;
console.log(`Watching USDC balance of ${payer} on Celo mainnet (every ${POLL_MS / 1000}s)...`);

for (;;) {
  try {
    const bal = await client.readContract({
      address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [payer],
    });
    if (bal >= 1000n) {
      console.log(`FUNDED: ${formatUnits(bal, 6)} USDC at ${new Date().toISOString()}`);
      console.log("Firing first x402 payment...");
      const out = execFileSync(process.execPath, ["src/pay-once.js"], { encoding: "utf8" });
      console.log(out);
      break;
    }
    process.stdout.write(`balance ${formatUnits(bal, 6)} USDC @ ${new Date().toISOString()}\n`);
  } catch (e) {
    console.error("poll error:", e.message);
  }
  await new Promise((r) => setTimeout(r, POLL_MS));
}
