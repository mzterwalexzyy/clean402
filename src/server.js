import { app } from "./app.js";
import { env } from "./env.js";

const PORT = Number(env("PORT", "4021"));
app.listen(PORT, () => {
  console.log(`Clean402 listening on :${PORT} — 0.001 USDC per /clean call`);
});
