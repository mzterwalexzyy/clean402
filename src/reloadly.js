// Reloadly Airtime client. Sandbox by default; set RELOADLY_ENV=production to go live.
// Endpoints and error shapes verified against the live API.
import { env } from "./env.js";

const ENVS = {
  sandbox: "https://topups-sandbox.reloadly.com",
  production: "https://topups.reloadly.com",
};

const BASE = ENVS[env("RELOADLY_ENV", "sandbox")] ?? ENVS.sandbox;
const ACCEPT = "application/com.reloadly.topups-v1+json";

export const reloadlyConfigured = () =>
  Boolean(process.env.RELOADLY_CLIENT_ID && process.env.RELOADLY_CLIENT_SECRET);

let token = null; // { value, expiresAt }

async function getToken() {
  if (token && Date.now() < token.expiresAt - 60_000) return token.value;
  const res = await fetch("https://auth.reloadly.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env("RELOADLY_CLIENT_ID"),
      client_secret: env("RELOADLY_CLIENT_SECRET"),
      grant_type: "client_credentials",
      audience: BASE,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`reloadly auth ${res.status}: ${body.message ?? body.errorCode ?? "unknown"}`);
  token = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return token.value;
}

async function call(path, init = {}) {
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      Accept: ACCEPT,
      "Content-Type": "application/json",
      Authorization: `Bearer ${await getToken()}`,
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!res.ok) {
    const err = new Error(body.message ?? `reloadly ${res.status}`);
    err.status = res.status;
    err.errorCode = body.errorCode;
    err.body = body;
    throw err;
  }
  return body;
}

/** Detect the mobile operator for a phone number. `phone` is the local number, no country code. */
export const detectOperator = (phone, iso = "NG") =>
  call(`/operators/auto-detect/phone/${encodeURIComponent(phone)}/countries/${iso}`);

/** Remaining float in the Reloadly wallet. */
export const accountBalance = () => call("/accounts/balance");

/**
 * Send a top-up.
 * @param operatorId  from detectOperator
 * @param amount      amount in the operator's local currency when useLocalAmount is true
 * @param phone       local number, no country code
 * @param callingCode e.g. "234"
 * @param reference   our idempotency key, echoed back by Reloadly
 */
export const sendTopup = ({ operatorId, amount, phone, callingCode = "234", reference, useLocalAmount = true }) =>
  call("/topups", {
    method: "POST",
    body: JSON.stringify({
      operatorId,
      amount,
      useLocalAmount,
      customIdentifier: reference,
      recipientPhone: { countryCode: callingCode === "234" ? "NG" : callingCode, number: `+${callingCode}${phone.replace(/^0/, "")}` },
    }),
  });

export const reloadlyEnv = () => (BASE === ENVS.production ? "production" : "sandbox");
