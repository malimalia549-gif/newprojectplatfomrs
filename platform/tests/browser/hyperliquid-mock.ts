import type { Page } from "@playwright/test";

export type HlMockOptions = { fail?: boolean; failIcons?: boolean; failHip3?: boolean; failCandles?: boolean };

/** Deterministic Hyperliquid mainnet fixtures. The sandbox has no outbound access to the real API. */
export async function mockHyperliquid(page: Page, options: HlMockOptions = {}) {
  const requests: Array<Record<string, unknown>> = [];
  await page.route("https://app.hyperliquid.xyz/coins/*.svg", async (route) => {
    const url = new URL(route.request().url());
    const asset = decodeURIComponent(url.pathname.split("/").pop()?.replace(/\.svg$/i, "") ?? "TOKEN");
    if (options.failIcons) {
      await route.fulfill({ status: 404, contentType: "text/plain", body: "missing official icon" });
      return;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="${asset} official icon"><circle cx="16" cy="16" r="15" fill="#1d472f"/><text x="16" y="21" text-anchor="middle" font-family="Arial" font-size="12" fill="#fff">${asset.slice(0, 3)}</text></svg>`;
    await route.fulfill({ status: 200, contentType: "image/svg+xml", headers: { "Cache-Control": "public, max-age=3600" }, body: svg });
  });
  await page.route("https://api.hyperliquid.xyz/info", async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } });
      return;
    }
    const body = request.postDataJSON() as Record<string, unknown>;
    requests.push(body);
    if (options.fail || (options.failHip3 && body.dex === "xyz") || (options.failCandles && body.type === "candleSnapshot")) {
      await route.fulfill({ status: 503, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ error: "mock outage" }) });
      return;
    }
    const now = Date.now();
    const coin = typeof body.coin === "string" ? body.coin : "BTC";
    const base = coin.includes("TSLA") ? 409 : coin.includes("NVDA") ? 204 : coin.includes("ETH") ? 3000 : coin.includes("HYPE") || coin === "@107" ? 28.4 : 100000;
    let data: unknown;
    switch (body.type) {
      case "perpDexs":
        data = [null, { name: "xyz", fullName: "XYZ" }];
        break;
      case "metaAndAssetCtxs":
      case "allPerpMetas": {
        const core = [
          { universe: [
            { name: "BTC", szDecimals: 5, maxLeverage: 50 },
            { name: "ETH", szDecimals: 4, maxLeverage: 50 },
            { name: "HYPE", szDecimals: 2, maxLeverage: 10 },
          ] },
          [
            { markPx: "100000", oraclePx: "99995", midPx: "100001", prevDayPx: "99000", dayNtlVlm: "5000000000", openInterest: "12000", funding: "0.0001" },
            { markPx: "3000", oraclePx: "2999", midPx: "3000.5", prevDayPx: "3100", dayNtlVlm: "2000000000", openInterest: "90000", funding: "-0.0002" },
            { markPx: "28.4", oraclePx: "28.39", midPx: "28.41", prevDayPx: "27", dayNtlVlm: "900000000", openInterest: "1000000", funding: "0.0003" },
          ],
        ];
        const hip3 = [
          { universe: [
            { name: "xyz:TSLA", szDecimals: 3, maxLeverage: 20, marginMode: "strictIsolated" },
            { name: "xyz:NVDA", szDecimals: 3, maxLeverage: 20, marginMode: "strictIsolated" },
          ] },
          [
            { markPx: "409", oraclePx: "409.1", midPx: "409.04", prevDayPx: "400", dayNtlVlm: "29000000", openInterest: "100000", funding: "0.0006" },
            { markPx: "204", oraclePx: "204.1", midPx: "204.04", prevDayPx: "200", dayNtlVlm: "19000000", openInterest: "90000", funding: "0.0005" },
          ],
        ];
        data = body.type === "allPerpMetas" ? [core[0], hip3[0]] : body.dex === "xyz" ? hip3 : core;
        break;
      }
      case "spotMetaAndAssetCtxs":
        data = [
          { tokens: [{ name: "USDC", index: 0, szDecimals: 8 }, { name: "HYPE", index: 107, szDecimals: 2 }, { name: "PURR", index: 1, szDecimals: 0 }, { name: "UBTC", index: 197, szDecimals: 5, fullName: "Unit Bitcoin", tokenId: "0x8f254b963e8468305d409b33aa137c67" }],
            universe: [
              { name: "PURR/USDC", tokens: [1, 0], index: 0, isCanonical: true },
              { name: "@107", tokens: [107, 0], index: 1, isCanonical: false },
              { name: "@142", tokens: [197, 0], index: 142, isCanonical: false },
            ] },
          [
            { coin: "PURR/USDC", markPx: "0.01", midPx: "0.0101", prevDayPx: "0.009", dayNtlVlm: "1000000" },
            { coin: "@107", markPx: "28.4", midPx: "28.41", prevDayPx: "27", dayNtlVlm: "900000000" },
            { coin: "@142", markPx: "76861", midPx: "76860.5", prevDayPx: "78000", dayNtlVlm: "28769509.12" },
          ],
        ];
        break;
      case "l2Book":
        data = { coin, time: now, levels: [
          Array.from({ length: 20 }, (_, i) => ({ px: String(base - (i + 1) * base * 0.0001), sz: String(1 + i * 0.25), n: 2 })),
          Array.from({ length: 20 }, (_, i) => ({ px: String(base + (i + 1) * base * 0.0001), sz: String(1.2 + i * 0.2), n: 2 })),
        ] };
        break;
      case "recentTrades":
        data = Array.from({ length: 30 }, (_, i) => ({ coin, side: i % 2 ? "A" : "B", px: String(base + (i % 5) * base * 0.00002), sz: String(0.1 + i * 0.01), time: now - i * 1500, tid: i + 1 }));
        break;
      case "candleSnapshot": {
        const req = body.req as { interval?: string } | undefined;
        const step = req?.interval === "1h" ? 3600000 : req?.interval === "1d" ? 86400000 : req?.interval === "5m" ? 300000 : req?.interval === "1m" ? 60000 : req?.interval === "4h" ? 14400000 : 900000;
        data = Array.from({ length: 140 }, (_, i) => {
          const o = base * (1 + Math.sin(i / 9) * 0.01);
          const c = o * (1 + Math.cos(i / 7) * 0.002);
          return { t: now - (140 - i) * step, T: now - (139 - i) * step, s: coin, i: req?.interval ?? "15m", o: String(o), c: String(c), h: String(Math.max(o, c) * 1.001), l: String(Math.min(o, c) * 0.999), v: String(100 + i), n: 10 };
        });
        break;
      }
      default:
        data = [];
    }
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(data) });
  });
  return requests;
}
