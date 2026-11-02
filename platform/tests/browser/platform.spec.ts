import { test, expect } from "@playwright/test";
import { mockHyperliquid } from "./hyperliquid-mock";

test("home renders database-backed launches and a local hero asset", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /From first mint/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Lava Cat/ }).first()).toBeVisible();
  await expect(page.locator(".hero-art-image")).toBeVisible();
  expect(await page.locator(".hero-art-image").evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByText("SANDBOX", { exact: true }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("Trade combines candlestick, watchlist, TP/SL and demo perpetual order", async ({ page }) => {
  const hydrationErrors: string[] = [];
  page.on("console", (msg) => { if (msg.type() === "error" && /hydration|didn't match|server rendered/i.test(msg.text())) hydrationErrors.push(msg.text()); });
  page.on("pageerror", (e) => { if (/hydration|didn't match|server rendered/i.test(e.message)) hydrationErrors.push(e.message); });
  await page.goto("/trade?mode=perp&m=hip3_kntq_seed");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Trade", exact: true })).toHaveAttribute("href", "/trade");
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Pro", exact: true })).toHaveCount(0);
  await expect(page.locator("#main-content").getByText("Trade & Markets", { exact: true })).toBeVisible();
  await expect(page.getByTestId("trade-candlestick")).toBeVisible();
  await expect(page.getByRole("img", { name: "Grafik candlestick mark sandbox" })).toBeVisible();
  await page.getByPlaceholder("Search symbol…").fill("KNTQ");
  await expect(page.locator(".ex-market-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Star KNTQ", exact: true }).first().click();
  await page.getByRole("button", { name: "★ Watchlist", exact: true }).click();
  await expect(page.locator(".ex-market-row")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "★ Watchlist", exact: true }).click();
  await expect(page.locator(".ex-market-row")).toHaveCount(1);
  await page.getByPlaceholder("Take profit").fill("5");
  await page.getByPlaceholder("Stop loss").fill("2");
  await page.getByRole("button", { name: "Sign in to trade", exact: true }).click();
  await page.getByRole("button", { name: "Continue as demo" }).click();
  await expect(page.getByRole("button", { name: /^Long KNTQ$/ })).toBeEnabled();
  await page.getByRole("button", { name: /^Long KNTQ$/ }).click();
  await page.getByRole("button", { name: /Positions \(/ }).click();
  await expect(page.locator(".ex-table tbody tr").first()).toBeVisible();
  await page.locator(".ex-table tbody").first().getByRole("button", { name: "Close", exact: true }).first().click();
  await expect(page.getByText("No open perpetual positions.", { exact: false })).toBeVisible();
  expect(hydrationErrors).toEqual([]);
});

test("Docs navigation has no Pro tab and HTML is not cacheable", async ({ request, page }) => {
  const response = await request.get("/docs");
  expect(response.headers()["cache-control"]).toContain("no-store");
  const html = await response.text();
  expect(html).toContain('href="/trade"');
  expect(html).not.toContain('href="/pro"');
  await page.goto("/docs");
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(nav.getByRole("link", { name: "Trade", exact: true })).toHaveAttribute("href", "/trade");
  await expect(nav.getByRole("link", { name: "Pro", exact: true })).toHaveCount(0);
});

test("old Pro and terminal addresses redirect to the single Trade page", async ({ page }) => {
  await mockHyperliquid(page);
  await page.goto("/pro");
  await expect(page).toHaveURL(/\/trade$/);
  await expect(page.locator("#main-content").getByText("Trade & Markets", { exact: true })).toBeVisible();
  await page.goto("/terminal?mode=perp");
  await expect(page).toHaveURL(/\/trade\?mode=perp$/);
  await expect(page.getByRole("tab", { name: /Perpetuals/ })).toHaveAttribute("aria-selected", "true");
});

test("economics calculator recalculates from disclosed assumptions", async ({ page }) => {
  await page.goto("/economics");
  const result = page.locator(".econ-result h2");
  await expect(result).toHaveText("$150.00");
  await page.getByLabel("Fee efektif").fill("8");
  await expect(result).toHaveText("$300.00");
  await expect(page.getByText("bukan proyeksi", { exact: false })).toBeVisible();
});

test("swap workstation quotes and executes a sandbox coin swap", async ({ page }) => {
  await page.goto("/trade?mode=swap&from=HYPE&to=USDC");
  await expect(page.getByRole("button", { name: "Sign in to swap", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign in to swap", exact: true }).click();
  await page.getByRole("button", { name: "Continue as demo" }).click();
  await expect(page.getByRole("button", { name: /Swap HYPE|Confirm swap|Swap now/ }).first()).toBeVisible();
  await page.getByRole("button", { name: /Swap HYPE|Confirm swap|Swap now/ }).first().click();
  await expect(page.getByText(/Swapped .*HYPE/).first()).toBeVisible();
});

test("mobile navigation and unified Trade layout have no horizontal page overflow", async ({ page }) => {
  await mockHyperliquid(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: /^Trade/ }).click();
  await expect(page.locator("#main-content").getByText("Trade & Markets", { exact: true })).toBeVisible();
  await expect.poll(() => page.locator(".ex-market-row").count()).toBeGreaterThanOrEqual(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: "test-results/mobile-trade.png", fullPage: true });
});

test("Trade uses market-source tabs and live-price paper orders without exchange mutations", async ({ page }) => {
  const requests = await mockHyperliquid(page);
  const mutationRequests: string[] = [];
  page.on("request", (req) => { if (req.url().includes("/api/") && req.method() !== "GET" && !req.url().includes("/api/simulation") && !req.url().includes("/api/auth/")) mutationRequests.push(`${req.method()} ${req.url()}`); });
  await page.goto("/trade?data=live");
  await expect(page.locator("#main-content").getByText("Data pasar asli:", { exact: false })).toBeVisible();
  await expect(page.getByText("BTC-PERP", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("img", { name: "BTC logo" }).first()).toHaveAttribute("src", "https://app.hyperliquid.xyz/coins/BTC.svg");
  await expect(page.getByRole("img", { name: "xyz:TSLA logo" }).first()).toHaveAttribute("src", "https://app.hyperliquid.xyz/coins/xyz:TSLA.svg");
  await expect(page.getByRole("img", { name: "Grafik candlestick Hyperliquid mainnet" })).toBeVisible();
  await expect(page.getByText("Funding / 1h", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Open interest", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /^Place paper/ })).toBeEnabled();
  await expect(page.locator(".ex-book-row").first()).toBeVisible();
  await page.getByRole("tab", { name: "Spot", exact: true }).click();
  await expect(page.getByText("HYPE/USDC", { exact: true }).first()).toBeVisible();
  await expect(page.locator("#main-content .ex-instrument-id").getByRole("img", { name: "HYPE logo" })).toHaveAttribute("src", "https://app.hyperliquid.xyz/coins/HYPE_spot.svg");
  expect(mutationRequests).toEqual([]);
  await page.getByRole("tab", { name: "Launchpad", exact: true }).click();
  await expect(page).toHaveURL(/data=sandbox/);
  await expect(page.getByRole("tab", { name: "Hyperliquid", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Hyperliquid", exact: true }).click();
  await expect(page).toHaveURL(/data=live/);
  await expect(page.getByRole("button", { name: /^Place paper/ })).toBeEnabled();
  expect(requests.some((r) => r.type === "metaAndAssetCtxs")).toBe(true);
  expect(requests.some((r) => r.type === "metaAndAssetCtxs" && r.dex === "xyz")).toBe(true);
  expect(requests.some((r) => r.type === "spotMetaAndAssetCtxs")).toBe(true);
  expect(requests.some((r) => r.type === "candleSnapshot")).toBe(true);
});

test("Trade live feed shows an honest outage instead of falling back to fake prices", async ({ page }) => {
  await mockHyperliquid(page, { fail: true });
  await page.goto("/trade?data=live");
  await expect(page.getByText("OFFLINE", { exact: true }).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Hyperliquid API 503", { exact: false })).toBeVisible();
  await expect(page.locator(".ex-market-row")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Place paper/ })).toBeDisabled();
  await page.getByRole("tab", { name: "Launchpad", exact: true }).click();
  await expect(page).toHaveURL(/data=sandbox/);
  await expect(page.getByRole("tab", { name: "Hyperliquid", exact: true })).toBeVisible();
});

test("Trade uses official Hyperliquid asset icons and never substitutes an aggregator logo", async ({ page }) => {
  const externalImages: string[] = [];
  page.on("request", (req) => {
    if (req.resourceType() === "image" && !req.url().startsWith("http://127.0.0.1:3000")) externalImages.push(req.url());
  });
  await mockHyperliquid(page);
  await page.goto("/trade?data=live");
  await expect(page.getByRole("img", { name: "BTC logo" }).first()).toBeVisible();
  await expect(page.getByRole("img", { name: "ETH logo" }).first()).toHaveAttribute("src", "https://app.hyperliquid.xyz/coins/ETH.svg");
  await expect(page.getByText("Logo aset dimuat langsung dari CDN resmi Hyperliquid", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Market info", exact: true }).click();
  await expect(page.getByText("Logo source", { exact: true })).toBeVisible();
  await expect(page.getByText("HIP-3 · xyz", { exact: false }).first()).toBeVisible();
  await expect(page.getByTestId("official-icon-status")).toHaveText("Loaded from Hyperliquid");
  await expect(page.getByRole("link", { name: "https://app.hyperliquid.xyz/coins/BTC.svg" })).toHaveAttribute("href", "https://app.hyperliquid.xyz/coins/BTC.svg");
  expect(externalImages.length).toBeGreaterThan(0);
  expect(externalImages.every((url) => url.startsWith("https://app.hyperliquid.xyz/coins/"))).toBe(true);
  expect(externalImages.some((url) => /coingecko|coinmarketcap|cryptologos|brandfetch/i.test(url))).toBe(false);
});

test("Trade falls back to a monogram when the official Hyperliquid icon is missing", async ({ page }) => {
  await mockHyperliquid(page, { failIcons: true });
  await page.goto("/trade?data=live");
  await expect(page.getByText("BTC-PERP", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".hl-token-icon")).toHaveCount(0);
  await expect(page.locator(".ex-market-row .token-glyph").first()).toBeVisible();
  await expect(page.getByRole("img", { name: "Grafik candlestick Hyperliquid mainnet" })).toBeVisible();
  await page.getByRole("button", { name: "Market info", exact: true }).click();
  await expect(page.getByTestId("official-icon-status")).toHaveText("Unavailable · monogram shown");
});

test("shared shell hydrates cleanly and exposes one build id across pages", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydration|hydrat|did not match/i.test(message.text())) errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.getByText("Saldo & order simulasi · tanpa dana nyata", { exact: true })).toBeVisible();
  const homeBuild = await page.locator('meta[name="forge-build"]').getAttribute("content");
  expect(homeBuild).toBeTruthy();
  await page.goto("/trade?data=sandbox");
  await expect(page.getByText("Saldo & order simulasi · tanpa dana nyata", { exact: true })).toBeVisible();
  expect(await page.locator('meta[name="forge-build"]').getAttribute("content")).toBe(homeBuild);
  await page.goto("/docs");
  await expect(page.getByText("Saldo & order simulasi · tanpa dana nyata", { exact: true })).toBeVisible();
  expect(await page.locator('meta[name="forge-build"]').getAttribute("content")).toBe(homeBuild);
  expect(errors).toEqual([]);
});

test("Hyperliquid paper orders reserve local balance, survive reload and close without sending exchange actions", async ({ page }) => {
  await mockHyperliquid(page);
  const actions: string[] = [];
  page.on("request", req => {
    if ((req.url().includes("/exchange") || req.url().includes("/api/perp")) && req.method() === "POST") actions.push(req.url());
  });
  await page.goto("/trade");
  await expect(page.getByRole("button", { name: "Place paper long", exact: true })).toBeEnabled();
  await page.getByLabel("Paper margin (USD)").fill("100");
  await page.getByRole("button", { name: "Place paper long", exact: true }).click();
  await expect(page.getByTestId("paper-cash")).toHaveText("$9,900.00");
  await page.reload();
  await expect(page.getByRole("button", { name: "Close paper position", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Close paper position", exact: true }).click();
  await expect(page.getByTestId("paper-cash")).toHaveText("$10,000.00");
  await expect(page.getByRole("button", { name: "Close paper position", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open sandbox trading" })).toHaveCount(0);
  expect(actions).toEqual([]);
});

test("native perpetuals survive a failed HIP-3 context feed", async ({ page }) => {
  await mockHyperliquid(page, { failHip3: true });
  await page.goto("/trade");
  await expect(page.getByText("BTC-PERP", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("HIP-3 feeds unavailable: xyz", { exact: false })).toBeVisible();
  await expect(page.getByRole("img", { name: "Grafik candlestick Hyperliquid mainnet" })).toBeVisible();
});

test("a candle endpoint failure exposes the asset and HTTP error instead of a silent blank", async ({ page }) => {
  await mockHyperliquid(page, { failCandles: true });
  await page.goto("/trade");
  await expect(page.locator("#main-content .ex-chart-body")).toContainText("Candles (BTC, 15m): Hyperliquid API 503");
  await expect(page.getByRole("button", { name: /^Place paper/ })).toBeDisabled();
  await expect.poll(() => page.getByRole("img", { name: "BTC logo" }).first().evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator("#main-content").getByLabel("Select market")).toBeHidden();
});

test("UBTC resolves official artwork through spot candidates and metadata, not a hardcoded BTC substitution", async ({ page }) => {
  await mockHyperliquid(page);
  const attempted: string[] = [];
  // Missing CDN files may return HTTP 200 with the SPA HTML: that is NOT an image.
  await page.route(/https:\/\/app\.hyperliquid\.xyz\/coins\/UBTC[^/]*\.svg/, async route => {
    attempted.push(new URL(route.request().url()).pathname);
    await route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><html><body>Hyperliquid app</body></html>" });
  });
  await page.goto("/trade");
  await page.getByRole("tab", { name: "Spot", exact: true }).click();
  await page.locator(".ex-market-main").filter({ hasText: "UBTC/USDC" }).click();
  const selectedIcon = page.locator(".ex-instrument-id").getByRole("img", { name: "UBTC logo" });
  await expect(selectedIcon).toHaveAttribute("src", "https://app.hyperliquid.xyz/coins/BTC.svg");
  await expect.poll(() => selectedIcon.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Market info", exact: true }).click();
  await expect(page.getByTestId("official-icon-status")).toHaveText("Loaded from Hyperliquid");
  await expect(page.getByRole("link", { name: "https://app.hyperliquid.xyz/coins/BTC.svg" })).toBeVisible();
  for (const path of ["/coins/UBTC_spot.svg", "/coins/UBTC_USDC.svg", "/coins/UBTC.svg"]) expect(attempted).toContain(path);
  await page.locator(".ex-market-main").filter({ hasText: "HYPE/USDC" }).click();
  await expect(page.locator(".ex-instrument-id").getByRole("img", { name: "HYPE logo" })).toHaveAttribute("src", "https://app.hyperliquid.xyz/coins/HYPE_spot.svg");
});
