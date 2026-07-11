// Phase 1 gate: make ONE real x402 payment end-to-end and print the settle tx hash.
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { env } from "./env.js";

const account = privateKeyToAccount(env("PAYER_PRIVATE_KEY"));
const base = env("PUBLIC_URL", "http://localhost:4021");

const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: "eip155:*", client: new ExactEvmScheme(account) }],
});

const messy = `um, so   basically the  the meeting is at 3pm...  “we should , like, ship it” — that's what   he said. i mean, it works!!`;

console.log("Payer:", account.address);
console.log("POST", base + "/clean");

const res = await fetchWithPayment(base + "/clean", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text: messy, mode: "transcript" }),
});

console.log("HTTP", res.status);
if (res.status === 402) {
  const pr = res.headers.get("PAYMENT-REQUIRED");
  const reason = pr ? JSON.parse(Buffer.from(pr, "base64").toString()).error : "unknown";
  console.error("Payment rejected:", reason);
  process.exit(1);
}
const body = await res.json();
console.log("Body:", JSON.stringify(body, null, 2));

const header = res.headers.get("PAYMENT-RESPONSE") || res.headers.get("X-PAYMENT-RESPONSE");
if (header) {
  const receipt = decodePaymentResponseHeader(header);
  console.log("Settlement:", JSON.stringify(receipt, null, 2));
  const tx = receipt?.transaction ?? receipt?.txHash;
  if (tx) console.log("Celoscan: https://celoscan.io/tx/" + tx);
} else {
  console.log("No PAYMENT-RESPONSE header (payment may not have settled).");
}
