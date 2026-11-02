import { emptyPaperAccount, openPaper, closePaper, validPaperAccount } from "../src/lib/paper-trading";
import { aggregateMarks } from "../src/lib/chart";
import test from "node:test";
import assert from "node:assert/strict";
import { CURVE, buyQuote, sellQuote, feeSplit, poolSeed, virtualHype0 } from "../src/lib/curve";
import { liqPrice, unrealizedPnl, fundingForHour, nextMark, buildBook } from "../src/lib/perp";
import { hashPassword, verifyPassword, sessionKey, addressFor } from "../src/lib/identity";
import { handleFrom, hypeToUsd } from "../src/lib/payment-format";
import { apyFor, tierFor } from "../src/lib/tokenomics";
import { normalizePerpMarkets, normalizeSpotMarkets, normalizeBook, normalizeTrades, normalizeCandles, hlInfo, hyperliquidSpotIconCandidates, loadPerpMarkets, hyperliquidCoinIconUrl, normalizePerpContextBatches } from "../src/lib/hyperliquid";

const close = (a: number, b: number, tolerance = 1e-7) => assert.ok(Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const empty = { sold: 0, raised: 0, graduationHype: 60 };

test("curve: full absorption charges only the capacity, not the oversized input", () => {
  const q = buyQuote(empty, 10000);
  close(q.out, CURVE.sellable);
  close(q.net, 60);
  close(q.spent, 60 / 0.99);
  assert.ok(q.spent < 10000);
  close(q.raisedAfter, 60);
});
test("curve: buy/sell preserve reserve accounting and fee split", () => {
  const buy = buyQuote(empty, 5);
  const state = { ...empty, sold: buy.soldAfter, raised: buy.raisedAfter };
  const sell = sellQuote(state, buy.out);
  close(sell.raisedAfter, 0);
  close(sell.out + sell.fee, buy.net);
  const split = feeSplit(buy.fee);
  close(split.creator + split.treasury, buy.fee);
  close(split.creator, buy.fee * 0.25);
  assert.ok(sell.priceAfter > 0);
});
test("curve: fractional and oversized sells cannot create reserves", () => {
  const buy = buyQuote(empty, 1);
  const state = { ...empty, sold: buy.out, raised: buy.net };
  const sell = sellQuote(state, buy.out * 0.25);
  assert.ok(sell.raisedAfter >= 0);
  assert.ok(sell.out < state.raised);
  assert.throws(() => sellQuote(state, buy.out * 2));
  assert.throws(() => buyQuote(empty, -1));
  assert.throws(() => buyQuote(empty, NaN));
});
test("curve: graduation uses net reserves and the 200M book allocation", () => {
  const buy = buyQuote(empty, 10000);
  const pool = poolSeed({ ...empty, sold: buy.out, raised: buy.net });
  assert.equal(pool.tokens, 200_000_000);
  close(pool.liquidityHype, 60);
  assert.ok(virtualHype0(60) > 0);
});
test("perps: long/short PnL signs and liquidation sides", () => {
  const long = { side: "long" as const, entryPrice: 100, size: 2 };
  assert.equal(unrealizedPnl(long, 110), 20);
  assert.equal(unrealizedPnl({ ...long, side: "short" }, 110), -20);
  assert.ok(liqPrice(100, 10, "long") < 100);
  assert.ok(liqPrice(100, 10, "short") > 100);
  close(fundingForHour(0.0001, 3), 0.0003);
});
test("perps: deterministic bounded marks and crossed-book prevention", () => {
  const mark = { indexPrice: 100, anchorPrice: 100, markPrice: 100, vol: 0.001, fundingHour: 0, lastTickAt: Date.now() - 1000 };
  const a = nextMark(mark, 42), b = nextMark(mark, 42);
  close(a.markPrice, b.markPrice);
  assert.ok(a.markPrice > 0 && Number.isFinite(a.markPrice));
  const book = buildBook("TEST", 100, 0.01, 1);
  assert.ok(book.bids[0].price < book.asks[0].price);
  assert.ok(book.bids.every((r) => r.price > 0 && r.size > 0));
});
test("auth: salted scrypt, wrong password, malformed hash and hashed sessions", () => {
  const a = hashPassword("correct horse battery"), b = hashPassword("correct horse battery");
  assert.notEqual(a, b);
  assert.ok(verifyPassword("correct horse battery", a));
  assert.ok(!verifyPassword("wrong", a));
  assert.ok(!verifyPassword("wrong", "broken"));
  assert.match(sessionKey("secret"), /^[a-f0-9]{64}$/);
  assert.notEqual(sessionKey("secret"), "secret");
  assert.match(addressFor("demo"), /^0x[a-f0-9]{40}$/);
});
test("payments: handle validation and decimal currency rounding", () => {
  assert.equal(handleFrom("@Valid_123"), "valid_123");
  assert.throws(() => handleFrom("not a handle"));
  assert.throws(() => handleFrom("a".repeat(16)));
  assert.equal(hypeToUsd(28.4, 0.05), 1.42);
});
test("tokenomics: bounded APY and ordered eligibility tiers", () => {
  assert.ok(apyFor(0) >= apyFor(1e12));
  assert.ok(apyFor(1e12) >= 6);
  assert.equal(tierFor(0).tier, "genesis");
  assert.equal(tierFor(6000).tier, "og");
});

test("chart: sandbox marks aggregate into honest display candles", () => {
  const bars = aggregateMarks([10, 12, 11, 13, 9], 100_000, 3, 5_000);
  assert.equal(bars.length, 2);
  assert.deepEqual(bars[0], { t: 75_000, o: 10, h: 12, l: 10, c: 11, v: 0 });
  assert.deepEqual(bars[1], { t: 90_000, o: 13, h: 13, l: 9, c: 9, v: 0 });
  assert.deepEqual(aggregateMarks([Number.NaN, -1, 0]), []);
});

test("hyperliquid: perp contexts normalize funding/OI/24h and skip delisted or invalid rows", () => {
  const raw = [
    { universe: [
      { name: "BTC", szDecimals: 5, maxLeverage: 50 },
      { name: "ETH", szDecimals: 4, maxLeverage: 50 },
      { name: "OLD", szDecimals: 2, maxLeverage: 10, isDelisted: true },
      { name: "BAD", szDecimals: 2, maxLeverage: 10 },
      { name: "km:TEST", szDecimals: 2, maxLeverage: 5, marginMode: "strictIsolated" },
    ] },
    [
      { markPx: "100000", oraclePx: "99990", midPx: "100001", prevDayPx: "99000", dayNtlVlm: "5000000", openInterest: "12.5", funding: "0.0001" },
      { markPx: "3000", prevDayPx: "3100", dayNtlVlm: "9000000", openInterest: "100", funding: "-0.0002" },
      { markPx: "1", prevDayPx: "1", dayNtlVlm: "1", openInterest: "1", funding: "0" },
      { markPx: "0", prevDayPx: "0", dayNtlVlm: "0", openInterest: "0", funding: "0" },
      { markPx: "2", prevDayPx: "2", dayNtlVlm: "10", openInterest: "3", funding: "0.001" },
    ],
  ];
  const markets = normalizePerpMarkets(raw);
  assert.deepEqual(markets.map((m) => m.coin), ["ETH", "BTC", "km:TEST"]);
  const btc = markets.find((m) => m.coin === "BTC")!;
  close(btc.change24h, ((100000 - 99000) / 99000) * 100);
  close(btc.openInterestUsd, 1_250_000);
  close(btc.fundingHour, 0.0001);
  assert.equal(markets.find((m) => m.coin === "km:TEST")!.symbol, "TEST");
  assert.equal(markets.find((m) => m.coin === "km:TEST")!.onlyIsolated, true);
  assert.deepEqual(normalizePerpMarkets(null), []);
  assert.deepEqual(normalizePerpMarkets([{}, []]), []);
});

test("hyperliquid: spot pairs resolve token indices and canonical names", () => {
  const raw = [
    { tokens: [{ name: "USDC", index: 0, szDecimals: 8 }, { name: "HYPE", index: 107, szDecimals: 2 }, { name: "PURR", index: 1, szDecimals: 0 }],
      universe: [
        { name: "PURR/USDC", tokens: [1, 0], index: 0, isCanonical: true },
        { name: "@107", tokens: [107, 0], index: 1, isCanonical: false },
        { name: "BROKEN", tokens: [999, 0], index: 2 },
      ] },
    [
      { markPx: "0.01", prevDayPx: "0.009", dayNtlVlm: "1000", midPx: "0.0101" },
      { markPx: "28.4", prevDayPx: "27", dayNtlVlm: "9000000", midPx: null },
      { markPx: "1", prevDayPx: "1", dayNtlVlm: "1" },
    ],
  ];
  const spots = normalizeSpotMarkets(raw);
  assert.deepEqual(spots.map((s) => s.coin), ["@107", "PURR/USDC"]);
  const hype = spots[0]!;
  assert.equal(hype.symbol, "HYPE/USDC");
  assert.equal(hype.base, "HYPE");
  assert.equal(hype.quote, "USDC");
  close(hype.midPrice, 28.4);
  close(hype.change24h, ((28.4 - 27) / 27) * 100);
  assert.equal(spots[1]!.isCanonical, true);
  assert.deepEqual(normalizeSpotMarkets({}), []);
});

test("hyperliquid: orderbook cumulatives, spread and imbalance are derived from real levels", () => {
  const book = normalizeBook({ levels: [
    [{ px: "100", sz: "2", n: 3 }, { px: "99", sz: "3", n: 2 }, { px: "0", sz: "10" }, { px: "98", sz: "0" }],
    [{ px: "101", sz: "1", n: 1 }, { px: "102", sz: "4", n: 2 }],
  ] });
  assert.ok(book);
  assert.deepEqual(book.bids.map((b) => b.total), [2, 5]);
  assert.deepEqual(book.asks.map((a) => a.total), [1, 5]);
  close(book.mid, 100.5);
  close(book.spreadBps, 100);
  close(book.imbalance, 0);
  assert.equal(normalizeBook({ levels: [[], []] }), null);
  assert.equal(normalizeBook(null), null);
});

test("hyperliquid: trades and candles are sorted, filtered and side-normalized", () => {
  const trades = normalizeTrades([
    { coin: "BTC", side: "A", px: "101", sz: "1", time: 20, tid: 2 },
    { coin: "BTC", side: "B", px: "100", sz: "2", time: 10, tid: 1 },
    { coin: "BTC", side: "B", px: "0", sz: "2", time: 30, tid: 3 },
    null,
  ]);
  assert.deepEqual(trades.map((t) => t.side), ["sell", "buy"]);
  assert.deepEqual(trades.map((t) => t.time), [20, 10]);
  const candles = normalizeCandles([
    { t: 20, o: "10", h: "12", l: "9", c: "11", v: "5" },
    { t: 10, o: "9", h: "11", l: "8", c: "10", v: "4" },
    { t: 30, o: "10", h: "9", l: "12", c: "11", v: "5" },
    { t: 40, o: "0", h: "12", l: "9", c: "11", v: "5" },
  ]);
  assert.deepEqual(candles.map((c) => c.t), [10, 20]);
  assert.deepEqual(normalizeTrades({}), []);
  assert.deepEqual(normalizeCandles(null), []);
});

test("hyperliquid: info client surfaces HTTP and malformed responses without leaking secrets", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (async () => new Response("rate limited", { status: 429 })) as typeof fetch;
    await assert.rejects(() => hlInfo({ type: "metaAndAssetCtxs" }), /Hyperliquid API rate limit \(429\)/);
    globalThis.fetch = (async () => new Response("<html>bad</html>", { status: 200 })) as typeof fetch;
    await assert.rejects(() => hlInfo({ type: "metaAndAssetCtxs" }), /Respons Hyperliquid tidak valid/);
    globalThis.fetch = (async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
    assert.deepEqual(await hlInfo({ type: "metaAndAssetCtxs" }), { ok: true });
  } finally {
    globalThis.fetch = original;
  }
});

test("hyperliquid: official icon URLs are derived from live symbols, not a hardcoded logo map", () => {
  assert.equal(hyperliquidCoinIconUrl("BTC"), "https://app.hyperliquid.xyz/coins/BTC.svg");
  assert.equal(hyperliquidCoinIconUrl("HYPE"), "https://app.hyperliquid.xyz/coins/HYPE.svg");
  assert.equal(hyperliquidCoinIconUrl("kPEPE"), "https://app.hyperliquid.xyz/coins/kPEPE.svg");
  assert.equal(hyperliquidCoinIconUrl("km:TEST"), "https://app.hyperliquid.xyz/coins/km:TEST.svg");
  assert.equal(hyperliquidCoinIconUrl("xyz:TSLA"), "https://app.hyperliquid.xyz/coins/xyz:TSLA.svg");
  assert.equal(hyperliquidCoinIconUrl(" NEW.LIST-1 "), "https://app.hyperliquid.xyz/coins/NEW.LIST-1.svg");
  assert.equal(hyperliquidCoinIconUrl("../evil"), null);
  assert.equal(hyperliquidCoinIconUrl("https://evil.example/x.svg"), null);
  assert.equal(hyperliquidCoinIconUrl(""), null);
  assert.equal(hyperliquidCoinIconUrl(null), null);
});

test("hyperliquid: context batches include native and HIP-3 DEXs without dropping the official coin id", () => {
  const core = [
    { universe: [{ name: "BTC", szDecimals: 5, maxLeverage: 50 }] },
    [{ markPx: "100000", prevDayPx: "99000", dayNtlVlm: "5000000000", openInterest: "12000", funding: "0.0001" }],
  ];
  const hip3 = [
    { universe: [{ name: "xyz:TSLA", szDecimals: 3, maxLeverage: 20, marginMode: "strictIsolated" }] },
    [{ markPx: "409", prevDayPx: "400", dayNtlVlm: "29000000", openInterest: "100000", funding: "0.0006" }],
  ];
  const markets = normalizePerpContextBatches([core, hip3]);
  assert.deepEqual(markets.map((m) => m.coin), ["BTC", "xyz:TSLA"]);
  const tsla = markets.find((m) => m.coin === "xyz:TSLA")!;
  assert.equal(tsla.symbol, "TSLA");
  assert.equal(tsla.dex, "xyz");
  assert.equal(tsla.isHip3, true);
  assert.equal(tsla.onlyIsolated, true);
  assert.equal(hyperliquidCoinIconUrl(tsla.coin), "https://app.hyperliquid.xyz/coins/xyz:TSLA.svg");
  assert.deepEqual(normalizePerpContextBatches(null), []);
  assert.deepEqual(normalizePerpContextBatches([null, {}]), []);
});

test("paper: mark-price fills reserve collateral and close once with long/short PnL", () => {
  const initial = emptyPaperAccount();
  const long = openPaper(initial, { id: "a", coin: "BTC", kind: "perp", side: "buy", entry: 100, margin: 100, leverage: 2 });
  assert.equal(long.cash, 9900);
  assert.equal(long.positions[0].quantity, 2);
  const closed = closePaper(long, "a", 110);
  assert.equal(closed.cash, 10020);
  assert.throws(() => closePaper(closed, "a", 110));
  const short = openPaper(initial, { id: "b", coin: "BTC", kind: "perp", side: "sell", entry: 100, margin: 100, leverage: 2 });
  assert.equal(closePaper(short, "b", 90).cash, 10020);
  assert.equal(closePaper(short, "b", 1000).cash, 9900);
});
test("paper: rejects invalid prices, overspend, leverage and leveraged/short spot", () => {
  const base = { id: "a", coin: "BTC", kind: "perp" as const, side: "buy" as const, entry: 100, margin: 100, leverage: 1 };
  for (const entry of [0, -1, NaN, Infinity]) assert.throws(() => openPaper(emptyPaperAccount(), { ...base, entry }));
  for (const margin of [0, -1, NaN, Infinity, 10001]) assert.throws(() => openPaper(emptyPaperAccount(), { ...base, margin }));
  for (const leverage of [0, 1.5, 21, NaN]) assert.throws(() => openPaper(emptyPaperAccount(), { ...base, leverage }));
  assert.throws(() => openPaper(emptyPaperAccount(), { ...base, kind: "spot", leverage: 2 }));
  assert.throws(() => openPaper(emptyPaperAccount(), { ...base, kind: "spot", side: "sell" }));
  const spot = openPaper(emptyPaperAccount(), { ...base, kind: "spot" });
  assert.equal(closePaper(spot, "a", 110).cash, 10010);
});
test("paper: persisted local account is validated before hydration", () => {
  assert.equal(validPaperAccount(emptyPaperAccount()), true);
  for (const value of [null, {}, { cash: -1, positions: [] }, { cash: 100, positions: [{}] }]) assert.equal(validPaperAccount(value), false);
});

test("hyperliquid: perpetual loader uses contexts per discovered DEX, never allPerpMetas as prices", async () => {
  const original = globalThis.fetch;
  const requests: Record<string, unknown>[] = [];
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    requests.push(body);
    if (body.type === "allPerpMetas") return Response.json([{ universe: [{ name: "BTC" }] }]);
    if (body.type === "perpDexs") return Response.json([null, { name: "xyz" }]);
    if (body.type === "metaAndAssetCtxs") return Response.json([
      { universe: [{ name: body.dex ? "xyz:TSLA" : "BTC", maxLeverage: 20 }] },
      [{ markPx: "100", prevDayPx: "99", dayNtlVlm: "1000" }],
    ]);
    throw new Error("Unexpected API request");
  };
  try {
    const result = await loadPerpMarkets();
    assert.deepEqual(result.markets.map(m => m.coin).sort(), ["BTC", "xyz:TSLA"]);
    assert.equal(result.warning, null);
    assert.equal(requests.some(r => r.type === "allPerpMetas"), false);
    assert.equal(requests.some(r => r.type === "metaAndAssetCtxs" && r.dex === "xyz"), true);
  } finally { globalThis.fetch = original; }
});

test("hyperliquid: spot context identity wins over array position", () => {
  const rows = normalizeSpotMarkets([
    { tokens: [{ name: "USDC", index: 0 }, { name: "WOW", index: 5 }, { name: "HYPE", index: 150 }], universe: [
      { name: "@109", index: 109, tokens: [5, 0] }, { name: "@107", index: 107, tokens: [150, 0] },
    ] },
    [{ coin: "@107", markPx: "84", dayNtlVlm: "1000" }, { coin: "@109", markPx: "0.001", dayNtlVlm: "1" }],
  ]);
  assert.equal(rows.find(r => r.base === "WOW")?.markPrice, 0.001);
  assert.equal(rows.find(r => r.base === "HYPE")?.markPrice, 84);
});

test("hyperliquid: spot icon namespace and metadata-gated Unit fallback, no per-token alias table", () => {
  const root = "https://app.hyperliquid.xyz/coins/";
  assert.deepEqual(hyperliquidSpotIconCandidates({ base: "UBTC", quote: "USDC", baseFullName: "Unit Bitcoin" }, ["BTC"]), ["UBTC_spot", "UBTC_USDC", "UBTC", "BTC"].map(k => root + k + ".svg"));
  assert.equal(hyperliquidSpotIconCandidates({ base: "UBTC", quote: "USDC", baseFullName: null }, ["BTC"]).includes(root + "BTC.svg"), false);
  assert.equal(hyperliquidSpotIconCandidates({ base: "UBTC", quote: "USDC", baseFullName: "Unit Bitcoin" }, []).includes(root + "BTC.svg"), false);
  assert.deepEqual(hyperliquidSpotIconCandidates({ base: "PURR", quote: "USDH", baseFullName: null }), ["PURR_spot", "PURR_USDH", "PURR"].map(k => root + k + ".svg"));
});
