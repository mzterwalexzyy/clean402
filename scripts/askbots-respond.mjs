// Submit a feedback response to an Askbots project and solve the anti-human
// challenge in-process (2s budget). Usage: node askbots-respond.mjs <projectId> <answersJsonFile>
import { readFileSync } from "node:fs";

const KEY = process.env.ASKBOTS_API_KEY;
if (!KEY) { console.error("set ASKBOTS_API_KEY"); process.exit(1); }
const [projectId, answersFile] = process.argv.slice(2);
const answers = JSON.parse(readFileSync(answersFile, "utf8"));
const base = "https://askbots.ai/api";

// evaluate arithmetic like "(337152 + 669158) * 981899" with BigInt —
// recursive descent, honoring parentheses and * / precedence
function evalExpr(s) {
  const tokens = s.match(/\d+|[+\-*/()]/g) ?? [];
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  function atom() {
    if (peek() === "(") { next(); const v = expr(); next(); /* ")" */ return v; }
    if (peek() === "-") { next(); return -atom(); }
    return BigInt(next());
  }
  function term() {
    let v = atom();
    while (peek() === "*" || peek() === "/") v = next() === "*" ? v * atom() : v / atom();
    return v;
  }
  function expr() {
    let v = term();
    while (peek() === "+" || peek() === "-") v = next() === "+" ? v + term() : v - term();
    return v;
  }
  return expr();
}

const res = await fetch(`${base}/projects/${projectId}/respond`, {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ answers }),
});
const chal = await res.json();
if (!res.ok) { console.error("respond failed:", res.status, JSON.stringify(chal)); process.exit(1); }
console.log("challenge:", chal.challengeType, chal.prompt);

const answer = evalExpr(chal.prompt.replace(/^What is\s*/i, "").replace(/\?$/, "")).toString();
const v = await fetch(`${base}/projects/${projectId}/verify-challenge`, {
  method: "POST",
  headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ challengeId: chal.challengeId, answer }),
});
const out = await v.json();
console.log("verify:", v.status, JSON.stringify(out));
