import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
const root = "dist";
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png" };
const srv = createServer((req, res) => {
  let p = join(root, decodeURIComponent(req.url.split("?")[0]));
  if (!existsSync(p) || p.endsWith("/")) p = join(root, "index.html");
  res.writeHead(200, { "Content-Type": types[extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
}).listen(4173);
const routes = (process.argv[2] || "/").split(",");
const w = Number(process.argv[3] || 1440), h = Number(process.argv[4] || 900);
const full = process.argv[5] === "full";
const scrollY = full ? 0 : Number(process.argv[5]) || 0;
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
for (const r of routes) {
  await page.goto(`http://localhost:4173/#${r}`, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(2600);
  if (full) {
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 420) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 140)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);
  }
  if (scrollY) { await page.evaluate((y) => window.scrollTo(0, y), scrollY); await page.waitForTimeout(1400); }
  const name = `/tmp/shot_${r.replace(/[^a-z0-9]/gi, "_") || "home"}_${w}.png`;
  await page.screenshot({ path: name, fullPage: full });
  console.log("saved", name);
}
await browser.close(); srv.close();
