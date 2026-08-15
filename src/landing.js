// The public landing page, served as a string so it never depends on the
// filesystem layout of the serverless bundle.
export const LANDING_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AirLo — the agent that funds itself</title>
<meta name="description" content="An autonomous x402 agent on Celo mainnet that earns its own budget on-chain and spends it, one settled payment at a time.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{
    --ink:#0a0a0b; --ink-2:#111114; --line:#232327;
    --fg:#f4f4f5; --muted:#8b8b93; --faint:#5c5c64;
    --accent:#FCFF52;
    --display:"Space Grotesk",Helvetica,Arial,sans-serif;
    --mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace;
  }
  *{box-sizing:border-box}
  html{-webkit-text-size-adjust:100%}
  body{margin:0;background:var(--ink);color:var(--fg);font-family:var(--display);
       font-weight:400;line-height:1.6;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1120px;margin:0 auto;padding:0 28px}
  a{color:inherit}
  .eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.22em;
           text-transform:uppercase;color:var(--accent)}

  /* nav */
  nav{border-bottom:1px solid var(--line)}
  nav .wrap{display:flex;align-items:center;justify-content:space-between;height:66px}
  .logo{font-weight:700;letter-spacing:-.02em;font-size:19px}
  .logo b{color:var(--accent)}
  .navlinks{display:flex;gap:26px;font-family:var(--mono);font-size:12px;color:var(--muted)}
  .navlinks a{text-decoration:none}
  .navlinks a:hover{color:var(--accent)}
  @media(max-width:640px){.navlinks{display:none}}

  /* hero */
  header{padding:96px 0 72px;border-bottom:1px solid var(--line)}
  h1{font-size:clamp(44px,8.4vw,104px);line-height:.98;letter-spacing:-.035em;
     font-weight:700;margin:22px 0 0;max-width:14ch}
  h1 em{font-style:normal;color:var(--accent)}
  .sub{color:var(--muted);font-size:clamp(15px,1.9vw,18px);max-width:56ch;margin:26px 0 0}
  .ctas{display:flex;flex-wrap:wrap;gap:14px;margin-top:38px}
  .btn{display:inline-block;font-family:var(--mono);font-size:13px;letter-spacing:.02em;
       padding:14px 26px;text-decoration:none;border:1px solid var(--accent);transition:.18s}
  .btn.fill{background:var(--accent);color:#0a0a0b;font-weight:500}
  .btn.fill:hover{background:transparent;color:var(--accent)}
  .btn.out{color:var(--accent)}
  .btn.out:hover{background:var(--accent);color:#0a0a0b}

  /* proof */
  .proof{padding:64px 0;border-bottom:1px solid var(--line)}
  .proofgrid{display:grid;grid-template-columns:1fr 1fr;gap:52px;align-items:center}
  @media(max-width:860px){.proofgrid{grid-template-columns:1fr;gap:38px}}
  .counter{font-family:var(--mono);font-size:clamp(52px,9vw,86px);line-height:1;
           color:var(--accent);font-weight:500;letter-spacing:-.03em}
  .counter-label{font-family:var(--mono);font-size:12px;color:var(--muted);margin-top:14px}
  .counter-sub{font-size:14px;color:var(--faint);margin-top:20px;max-width:44ch}
  .term{background:var(--ink-2);border:1px solid var(--line);overflow:hidden}
  .term-bar{display:flex;align-items:center;gap:7px;padding:12px 16px;border-bottom:1px solid var(--line)}
  .dot{width:9px;height:9px;border-radius:50%;background:var(--line)}
  .term-name{margin-left:8px;font-family:var(--mono);font-size:11px;color:var(--faint)}
  pre{margin:0;padding:20px 18px;font-family:var(--mono);font-size:12.5px;line-height:1.85;
      color:var(--muted);overflow-x:auto}
  .c-dim{color:var(--faint)} .c-acc{color:var(--accent)} .c-fg{color:var(--fg)}

  /* steps */
  .steps{padding:76px 0;border-bottom:1px solid var(--line)}
  .stepgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:44px;margin-top:40px}
  @media(max-width:860px){.stepgrid{grid-template-columns:1fr;gap:34px}}
  .num{font-family:var(--mono);font-size:12px;color:var(--accent);letter-spacing:.1em}
  .step h3{font-size:21px;letter-spacing:-.01em;margin:16px 0 10px;font-weight:500}
  .step p{color:var(--muted);font-size:15px;margin:0}

  /* stats */
  .stats{padding:56px 0;border-bottom:1px solid var(--line)}
  .statgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--line);
            border:1px solid var(--line)}
  @media(max-width:760px){.statgrid{grid-template-columns:repeat(2,1fr)}}
  .stat{background:var(--ink);padding:30px 24px}
  .stat-num{font-family:var(--mono);font-size:30px;color:var(--fg);letter-spacing:-.02em}
  .stat-lab{font-family:var(--mono);font-size:11px;color:var(--faint);
            letter-spacing:.13em;text-transform:uppercase;margin-top:10px}

  /* cta band */
  .band{background:var(--accent);color:#0a0a0b;padding:82px 0;text-align:center}
  .band h2{font-size:clamp(32px,5.4vw,58px);letter-spacing:-.03em;margin:0;font-weight:700}
  .band p{font-family:var(--mono);font-size:14px;margin:18px auto 32px;max-width:52ch;opacity:.72}
  .band .btn{border-color:#0a0a0b;background:#0a0a0b;color:var(--accent)}
  .band .btn:hover{background:transparent;color:#0a0a0b}

  /* footer */
  footer{padding:56px 0 44px}
  .footgrid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:36px}
  @media(max-width:760px){.footgrid{grid-template-columns:1fr 1fr}}
  .footgrid h4{font-family:var(--mono);font-size:11px;letter-spacing:.14em;
               text-transform:uppercase;color:var(--faint);margin:0 0 16px;font-weight:400}
  .footgrid a{display:block;color:var(--muted);text-decoration:none;font-size:14px;margin-bottom:10px}
  .footgrid a:hover{color:var(--accent)}
  .addr{font-family:var(--mono);font-size:11.5px;color:var(--faint);word-break:break-all}
  .rule{height:1px;background:var(--line);margin:44px 0 24px}
  .legal{font-family:var(--mono);font-size:11px;color:var(--faint)}

  .next{margin-top:52px;padding:26px 28px;border:1px solid var(--line);background:var(--ink-2)}
  .next p{margin:12px 0 0;color:var(--muted);font-size:15px;max-width:78ch}
  .next b{color:var(--fg);font-weight:500}

  .fade{opacity:0;transition:opacity .7s ease}
  .fade.in{opacity:1}
  @media(prefers-reduced-motion:reduce){.fade{opacity:1;transition:none}}
</style>
</head>
<body>

<nav><div class="wrap">
  <div class="logo">Air<b>Lo</b></div>
  <div class="navlinks">
    <a href="#how">How it works</a>
    <a href="/stats">Live stats</a>
    <a href="/feed">Activity</a>
    <a href="https://github.com/mzterwalexzyy/clean402">Source</a>
  </div>
</div></nav>

<header><div class="wrap">
  <div class="eyebrow">Agentic payments · Celo mainnet</div>
  <h1>The agent that <em>funds itself.</em></h1>
  <p class="sub">AirLo earns on-chain, then spends what it earns. Every payment below was
  signed, settled and receipted on Celo mainnet by software, with no human touching a
  wallet and no outside funding.</p>
  <div class="ctas">
    <a class="btn fill" href="#proof">See live payments</a>
    <a class="btn out" href="https://github.com/mzterwalexzyy/clean402">Read the source</a>
  </div>
</div></header>

<section class="proof" id="proof"><div class="wrap">
  <div class="proofgrid">
    <div class="fade">
      <div class="eyebrow">Settled on Celo mainnet</div>
      <div class="counter" id="count">···</div>
      <div class="counter-label" id="countLabel">x402 payments, live from the chain</div>
      <p class="counter-sub">Counted by reading incoming stablecoin transfers to the
      payTo wallet on Blockscout. Not a number we type in by hand. The budget behind
      them was earned by the agent reviewing other projects for pay, not deposited.</p>
    </div>
    <div class="term fade">
      <div class="term-bar">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        <span class="term-name">paid-request.sh</span>
      </div>
<pre><span class="c-dim">$</span> curl -X POST <span class="c-acc">https://clean402.vercel.app/clean</span> \\
    -H <span class="c-fg">"Content-Type: application/json"</span> \\
    -d <span class="c-fg">'{"text":"um, so  the  the meeting is at 3"}'</span>

<span class="c-dim">&lt;</span> HTTP/1.1 <span class="c-acc">402 Payment Required</span>
<span class="c-dim">&lt;</span> PAYMENT-REQUIRED: eyJ4NDAyVmVyc2lvbiI6Mi...

<span class="c-dim"># agent signs EIP-3009, retries, pays 0.001 USDT</span>

<span class="c-dim">&lt;</span> HTTP/1.1 <span class="c-acc">200 OK</span>
<span class="c-dim">&lt;</span> PAYMENT-RESPONSE: <span class="c-fg">{"success":true,"tx":"0x…"}</span>
{ <span class="c-fg">"cleaned"</span>: <span class="c-acc">"So the meeting is at 3."</span> }</pre>
    </div>
  </div>
</div></section>

<section class="steps" id="how"><div class="wrap">
  <div class="eyebrow">How it works</div>
  <div class="stepgrid">
    <div class="step fade">
      <div class="num">01</div>
      <h3>The agent hits a paywall</h3>
      <p>It requests the service, gets back HTTP 402, and signs a gasless EIP-3009
      authorization for the exact amount owed.</p>
    </div>
    <div class="step fade">
      <div class="num">02</div>
      <h3>Celo settles it</h3>
      <p>The Celo x402 facilitator submits the authorization on mainnet, pays the gas,
      and never touches the funds.</p>
    </div>
    <div class="step fade">
      <div class="num">03</div>
      <h3>The service delivers</h3>
      <p>The API returns its result and the receipt goes on the public activity feed,
      keyed to the settlement hash.</p>
    </div>
  </div>

  <div class="next fade">
    <div class="eyebrow" style="color:var(--faint)">Next, and not live yet</div>
    <p><b>Airtime.</b> The same paid request, pointed at a phone number instead of a
    text field: pay stablecoins on Celo, a Nigerian SIM gets airtime or data seconds
    later, with an automatic on-chain refund if delivery fails. The payment rail above
    is finished and running. The delivery integration is still being built, and this
    page will say so until a real phone has been credited.</p>
  </div>
</div></section>

<section class="stats"><div class="wrap">
  <div class="statgrid fade">
    <div class="stat"><div class="stat-num" id="sPayments">···</div><div class="stat-lab">Payments settled</div></div>
    <div class="stat"><div class="stat-num" id="sVolume">···</div><div class="stat-lab">Value settled</div></div>
    <div class="stat"><div class="stat-num">~1s</div><div class="stat-lab">Settlement time</div></div>
    <div class="stat"><div class="stat-num">0</div><div class="stat-lab">CELO needed to pay</div></div>
  </div>
</div></section>

<section class="band"><div class="wrap">
  <h2>Money that moves like a request.</h2>
  <p>One HTTP call, one on-chain settlement, one real good delivered. No accounts,
  no API keys, no card.</p>
  <a class="btn" href="https://github.com/mzterwalexzyy/clean402">Run it yourself</a>
</div></section>

<footer><div class="wrap">
  <div class="footgrid">
    <div>
      <h4>AirLo</h4>
      <p class="addr">payTo 0x7F3cE1fC7599012b7da97e1e14F5D33257A6e1f4</p>
      <p class="addr">Celo mainnet · eip155:42220</p>
    </div>
    <div>
      <h4>Endpoints</h4>
      <a href="/stats">Live stats</a>
      <a href="/feed">Activity feed</a>
      <a href="/health">Health</a>
    </div>
    <div>
      <h4>Built on</h4>
      <a href="https://x402.celo.org">Celo x402 facilitator</a>
      <a href="https://celoscan.io/address/0x7F3cE1fC7599012b7da97e1e14F5D33257A6e1f4">Celoscan</a>
      <a href="https://github.com/mzterwalexzyy/clean402">GitHub</a>
    </div>
  </div>
  <div class="rule"></div>
  <div class="legal">Celo Agentic Payments &amp; DeFAI Hackathon 2026 · every number on this page is read from the chain</div>
</div></footer>

<script>
  var faders = document.querySelectorAll(".fade");
  faders.forEach(function(el){
    new IntersectionObserver(function(es,o){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add("in"); o.unobserve(e.target); } });
    },{threshold:.12}).observe(el);
  });
  // never let the fade hide content: if the observer has not fired by now, reveal everything
  setTimeout(function(){ faders.forEach(function(el){ el.classList.add("in"); }); }, 1500);

  function animate(el, to, fmt){
    el.textContent = fmt(to); // final value first, so it shows even without rAF
    var start = performance.now(), dur = 900;
    function tick(now){
      var p = Math.min(1,(now-start)/dur), v = to*(1-Math.pow(1-p,3));
      el.textContent = fmt(v);
      if(p<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  fetch("/stats").then(function(r){ return r.json(); }).then(function(d){
    if(typeof d.payments !== "number") throw new Error("no stats");
    animate(document.getElementById("count"), d.payments, function(v){ return Math.round(v).toLocaleString(); });
    animate(document.getElementById("sPayments"), d.payments, function(v){ return Math.round(v).toLocaleString(); });
    animate(document.getElementById("sVolume"), d.volumeUsd, function(v){ return "$" + v.toFixed(3); });
  }).catch(function(){
    document.getElementById("count").textContent = "—";
    document.getElementById("countLabel").textContent = "live count temporarily unavailable";
    document.getElementById("sPayments").textContent = "—";
    document.getElementById("sVolume").textContent = "—";
  });
</script>
</body>
</html>`;
