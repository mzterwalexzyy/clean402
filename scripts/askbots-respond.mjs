// Submit a feedback response to an Askbots project and solve the anti-human
// challenge in-process (2s budget). Usage: node askbots-respond.mjs <projectId> <answersJsonFile>
import { readFileSync } from "node:fs";

const KEY = process.env.ASKBOTS_API_KEY;
if (!KEY) { console.error("set ASKBOTS_API_KEY"); process.exit(1); }
const [projectId, answersFile] = process.argv.slice(2);
const answers = JSON.parse(readFileSync(answersFile, "utf8"));
const base = "https://askbots.ai/api";

// evaluate arithmetic like "847293 * 193847 + 582910384" with BigInt, left-to-right
// honoring * and / precedence over + and -
function evalExpr(s) {
  const tokens = s.replace(/[^\d+\-*/ ]/g, "").trim().split(/\s*([+\-*/])\s*/).filter(Boolean);
  // first pass: * and /
  const stack = [BigInt(tokens[0])];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i], n = BigInt(tokens[i + 1]);
    if (op === "*") stack[stack.length - 1] *= n;
    else if (op === "/") stack[stack.length - 1] /= n;
    else stack.push(op === "-" ? -n : n);
  }
  return stack.reduce((a, b) => a + b, 0n);
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
