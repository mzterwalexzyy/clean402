// Sweeps accumulated USDC revenue from the service (payTo) wallet back to the payer wallet
// so the demand agent's budget recycles. Every sweep tx carries the ERC-8021 attribution tag.
// Run periodically (cron / pm2). Needs a little CELO in the service wallet for gas.
import { createPublicClient, createWalletClient, http, erc20Abi, formatUnits, parseUnits } from "viem";
import { celo } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { toDataSuffix } from "@celo/attribution-tags";
import { env } from "./env.js";

const USDC = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C";
const TAG = env("ATTRIBUTION_TAG");
const MIN_SWEEP = parseUnits(env("MIN_SWEEP_USDC", "0.05"), 6);

const service = privateKeyToAccount(env("WALLET_PRIVATE_KEY"));
const payerAddress = env("PAYER_ADDRESS");
const transport = http("https://forno.celo.org");
const pub = createPublicClient({ chain: celo, transport });
const wallet = createWalletClient({ account: service, chain: celo, transport });

const bal = await pub.readContract({
  address: USDC, abi: erc20Abi, functionName: "balanceOf", args: [service.address],
});

if (bal < MIN_SWEEP) {
  console.log(`nothing to sweep: ${formatUnits(bal, 6)} USDC < min ${formatUnits(MIN_SWEEP, 6)}`);
  process.exit(0);
}

console.log(`sweeping ${formatUnits(bal, 6)} USDC ${service.address} -> ${payerAddress} (tag ${TAG})`);
const hash = await wallet.writeContract({
  address: USDC,
  abi: erc20Abi,
  functionName: "transfer",
  args: [payerAddress, bal],
  dataSuffix: toDataSuffix(TAG),
});
console.log("tx:", hash);
const receipt = await pub.waitForTransactionReceipt({ hash });
console.log("status:", receipt.status, "| https://celoscan.io/tx/" + hash);
