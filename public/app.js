const explorer = "https://atlantic.pharosscan.xyz";

const features = [
  ["AgentPay", "x402 parser, spending limit, native PHRS payment, receipt proof."],
  ["Crowdfund", "Raise PHRS for agent projects, datasets, and research tasks."],
  ["Escrow Pay", "Hold PHRS until an agent service is released or refunded."],
  ["Payment Requests", "Create invoice-style payment requests for paid services."],
  ["Payroll", "Fund recurring PHRS payouts for agents, operators, or contributors."],
  ["Wallet Intelligence", "Publish wallet risk labels and scores for agent decisions."],
  ["Agent Marketplace", "List paid agent endpoints and sell access on Pharos."],
  ["Trading Signals", "Publish agent-generated trading signals with confidence scores."]
];

const contracts = [
  ["AgentReceiptRegistry", "0x6aD56f3fA8D4957e0Eb38F154ea00B1EEE8a8Dd1"],
  ["Crowdfund", "0xD225D97d335059316071D5833889bF3f6aD81e36"],
  ["EscrowPay", "0x5FA1B37Dc9BeA6DbD548232121Dc8733172D5EB7"],
  ["PaymentRequestRegistry", "0x4051BefA7202db9b6768F6b136fC9F8D07800800"],
  ["Payroll", "0x6f281299127c72BF4fF5A4B16408CE615200aD7E"],
  ["WalletIntelligence", "0x971E756d5E756771e37e5beE14C5f49DFBba2670"],
  ["AgentMarketplace", "0x25f9f0C1308483bf0cB4637eda3105140E14FC94"],
  ["TradingSignalGenerator", "0xD634Ba983dE5cB66a65eBb113e4aBA36663af75E"]
];

function renderFeatures() {
  const grid = document.getElementById("feature-grid");
  grid.innerHTML = features
    .map(([title, body]) => `<article class="feature-card"><h3>${title}</h3><p>${body}</p></article>`)
    .join("");
}

function renderContracts() {
  const table = document.getElementById("contract-table");
  table.innerHTML = contracts
    .map(([name, address]) => `
      <div class="contract-row">
        <strong>${name}</strong>
        <code>${address}</code>
        <a href="${explorer}/address/${address}" target="_blank" rel="noreferrer">Open</a>
      </div>
    `)
    .join("");
}

async function callApi(path) {
  const output = document.getElementById("api-output");
  output.textContent = "Loading...";
  try {
    const response = await fetch(path);
    const body = await response.json();
    output.textContent = JSON.stringify({ status: response.status, body }, null, 2);
  } catch (error) {
    output.textContent = JSON.stringify({ error: error.message }, null, 2);
  }
}

function startBackground() {
  const canvas = document.getElementById("live-bg");
  const ctx = canvas.getContext("2d");
  const points = [];
  const count = 86;

  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function seed() {
    points.length = 0;
    for (let i = 0; i < count; i++) {
      points.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.34,
        vy: (Math.random() - 0.5) * 0.34
      });
    }
  }

  function frame() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.strokeStyle = "rgba(255,255,255,0.11)";

    for (const p of points) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
      if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const a = points[i];
        const b = points[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 138) {
          ctx.globalAlpha = 1 - distance / 138;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  resize();
  seed();
  frame();
  window.addEventListener("resize", () => {
    resize();
    seed();
  });
}

renderFeatures();
renderContracts();
startBackground();

document.getElementById("health-btn").addEventListener("click", () => callApi("/health"));
document.getElementById("report-btn").addEventListener("click", () => callApi("/premium-report"));
