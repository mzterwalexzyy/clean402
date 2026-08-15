// Sweeps accumulated stablecoin revenue from the service (payTo) wallet back to the
// payer wallet so the demand agent's budget recycles. Every sweep tx carries the
// ERC-8021 attribution tag, and gas is paid in USDT via Celo fee abstraction —
// the service wallet needs no CELO at all.
import { createPublicClient, createWalletClient, http, erc20Abi, formatUnits, parseUnits } from "viem";
import { celo } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { toDataSuffix } from "@celo/attribution-tags";
import { feeCurrencyGas } from "./celoGas.js";
import { env } from "./env.js";

const TOKENS = {
  USDT: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
  USDC: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
};
// Celo FeeCurrencyDirectory entry for Tether USD — lets USDT pay for gas
const USDT_FEE_CURRENCY = "0x0E2A3e05bc9A16F5292A6170456A710cb89C6f72";
// Celo debits the FULL max fee (gas limit x price) in the fee currency up front, not the
// actual usage, so a thin fixed buffer under-reserves and the transfer reverts with
// "amount exceeds balance". Reserve the larger of 0.03 USDT or 20% of the balance.
const MIN_GAS_RESERVE = parseUnits("0.03", 6);
const gasReserve = (balance) => {
  const proportional = balance / 5n;
  return proportional > MIN_GAS_RESERVE ? proportional : MIN_GAS_RESERVE;
};

const TAG = env("ATTRIBUTION_TAG");
const MIN_SWEEP = parseUnits(env("MIN_SWEEP_USDC", "0.02"), 6);

const service = privateKeyToAccount(env("WALLET_PRIVATE_KEY"));
const payerAddress = env("PAYER_ADDRESS");
const transport = http("https://forno.celo.org");
const pub = createPublicClient({ chain: celo, transport });
const wallet = createWalletClient({ account: service, chain: celo, transport });

for (const [symbol, token] of Object.entries(TOKENS)) {
  const bal = await pub.readContract({
    address: token, abi: erc20Abi, functionName: "balanceOf", args: [service.address],
  });
  // keep a gas reserve only in USDT (the fee token)
  const reserve = gasReserve(bal);
  const sweepable = symbol === "USDT" ? (bal > reserve ? bal - reserve : 0n) : bal;
  if (sweepable < MIN_SWEEP) {
    console.log(`${symbol}: nothing to sweep (${formatUnits(bal, 6)} held, ${formatUnits(sweepable, 6)} sweepable)`);
    continue;
  }
  console.log(`${symbol}: sweeping ${formatUnits(sweepable, 6)} ${service.address} -> ${payerAddress} (tag ${TAG})`);
  const hash = await wallet.writeContract({
    address: token,
    abi: erc20Abi,
    functionName: "transfer",
    args: [payerAddress, sweepable],
    dataSuffix: toDataSuffix(TAG),
    ...(await feeCurrencyGas(pub, USDT_FEE_CURRENCY)),
  });
  const receipt = await pub.waitForTransactionReceipt({ hash });
  console.log(`${symbol}: ${receipt.status} | https://celoscan.io/tx/${hash}`);
}
