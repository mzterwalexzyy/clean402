// On-chain refund. If a payment settles but fulfillment fails, the buyer gets their
// money back automatically, tagged, with gas paid in USDT so no CELO is ever needed.
import { createPublicClient, createWalletClient, http, erc20Abi } from "viem";
import { celo } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { toDataSuffix } from "@celo/attribution-tags";
import { feeCurrencyGas } from "./celoGas.js";
import { env } from "./env.js";

const USDT = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e";
const USDT_FEE_CURRENCY = "0x0E2A3e05bc9A16F5292A6170456A710cb89C6f72";

const transport = http("https://forno.celo.org");
const pub = createPublicClient({ chain: celo, transport });

/** Decode the buyer's address out of the x402 payment header they sent. */
export function payerFromHeader(header) {
  if (!header) return null;
  try {
    const payload = JSON.parse(Buffer.from(header, "base64").toString());
    return payload?.payload?.authorization?.from ?? null;
  } catch {
    return null;
  }
}

/**
 * Refund `amountAtomic` of USDT to `to`. Returns the tx hash.
 * Throws if the service wallet cannot cover it, so callers can log a manual-review event.
 */
export async function refund({ to, amountAtomic, token = USDT }) {
  const service = privateKeyToAccount(env("WALLET_PRIVATE_KEY"));
  const wallet = createWalletClient({ account: service, chain: celo, transport });

  const held = await pub.readContract({
    address: token, abi: erc20Abi, functionName: "balanceOf", args: [service.address],
  });
  if (held < amountAtomic) {
    throw new Error(`refund short: hold ${held} < owed ${amountAtomic}`);
  }

  const hash = await wallet.writeContract({
    address: token,
    abi: erc20Abi,
    functionName: "transfer",
    args: [to, amountAtomic],
    dataSuffix: toDataSuffix(env("ATTRIBUTION_TAG")),
    ...(await feeCurrencyGas(pub, USDT_FEE_CURRENCY)),
  });
  return hash;
}
