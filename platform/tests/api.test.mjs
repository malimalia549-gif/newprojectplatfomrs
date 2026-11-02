import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const run = randomUUID().slice(0, 8);
const password = 'Regression-test-2026!';
let sequence = 0;
async function account(label) {
  const jar = new Map();
  const call = async (path, json, options = {}) => {
    const headers = { 'content-type': 'application/json', ...options.headers };
    if (json !== undefined && !headers['idempotency-key']) headers['idempotency-key'] = randomUUID();
    if (jar.size) headers.cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const response = await fetch(base + path, { method: json === undefined ? 'GET' : 'POST', headers, body: json === undefined ? undefined : JSON.stringify(json), signal: AbortSignal.timeout(20000) });
    for (const cookie of response.headers.getSetCookie()) { const [part] = cookie.split(';'); const i = part.indexOf('='); jar.set(part.slice(0, i), part.slice(i + 1)); }
    const text = await response.text(); let data; try { data = JSON.parse(text); } catch { throw new Error(`${path}: non-JSON ${response.status}: ${text.slice(0, 100)}`); }
    if (options.status !== undefined) assert.equal(response.status, options.status, JSON.stringify(data));
    else assert.ok(response.ok, `${path}: ${response.status} ${JSON.stringify(data)}`);
    return { data, response };
  };
  const email = `qa-${label}-${run}-${++sequence}@example.test`;
  const { data } = await call('/api/auth/register', { email, password, name: `QA ${label}` });
  return { call, user: data.user, email };
}
const me = async (a) => (await a.call('/api/auth/me')).data.user;
const near = (a, b, eps = 1e-5) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

// Sequential by design: these are real HTTP + PostgreSQL regressions against a disposable sandbox.
test('HTTP health, read-only markets, auth, CSRF and input validation', async () => {
  const health = await fetch(base + '/api/health'); assert.equal(health.status, 200); assert.equal((await health.json()).liveTrading, false);
  const a = await account('auth');
  assert.ok(!('passwordHash' in a.user));
  assert.equal((await a.call('/api/auth/profile', { name: 'Updated QA' })).data.user.name, 'Updated QA');
  await a.call('/api/auth/profile', {}, { status: 403, headers: { origin: 'https://evil.example', 'idempotency-key': randomUUID() } });
  await a.call('/api/swap', { action: 'execute', from: 'HYPE', to: 'USDC', amount: -1 }, { status: 400 });
  await a.call('/api/swap', { action: 'execute', from: 'HYPE', to: 'USDC', amount: 1e10 }, { status: 402 });
  const before = await me(a);
  const marks = (await a.call('/api/perp')).data.markets;
  await new Promise((r) => setTimeout(r, 100));
  assert.deepEqual((await a.call('/api/perp')).data.markets, marks, 'GET must not tick markets');
  near((await me(a)).hype, before.hype);
  await a.call('/api/auth/logout', {});
  assert.equal((await a.call('/api/auth/me')).data.user, null);
  const login = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: a.email, password }) });
  assert.equal(login.status, 200); assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
});

test('idempotency: simultaneous retries credit a payment exactly once and bind key to payload', async () => {
  const a = await account('payment');
  const intent = (await a.call('/api/x', { action: 'checkout', usd: 25, purpose: 'stake_topup', handle: 'qa_payment' })).data;
  assert.equal(intent.live, false);
  const before = await me(a); const key = randomUUID();
  const payload = { action: 'confirm', reference: intent.reference, code: intent.code };
  const results = await Promise.all([a.call('/api/x', payload, { headers: { 'idempotency-key': key } }), a.call('/api/x', payload, { headers: { 'idempotency-key': key } })]);
  assert.equal(results[0].data.creditedHype, results[1].data.creditedHype);
  near((await me(a)).hype - before.hype, intent.amountHype);
  near((await me(a)).usdc, before.usdc);
  await a.call('/api/x', { ...payload, code: '000000' }, { status: 409, headers: { 'idempotency-key': key } });
  await a.call('/api/x', payload, { status: 409 });
  const b = await account('payment-other');
  await b.call('/api/x', payload, { status: 404 });
  const margin = (await a.call('/api/x', { action: 'checkout', usd: 12, purpose: 'perp_margin', handle: 'qa_payment' })).data;
  const usdcBefore = (await me(a)).usdc;
  const credit = (await a.call('/api/x', { action: 'confirm', reference: margin.reference, code: margin.code })).data;
  assert.equal(credit.creditedHype, 0); assert.equal(credit.creditedUsdc, 12); near((await me(a)).usdc, usdcBefore + 12);
});

test('curve: capped buy, fractional sell, immutable receipts, lifecycle ownership and cashtag settlement', async () => {
  const a = await account('curve'); const symbol = `Q${run.slice(0, 5).toUpperCase()}`;
  const created = (await a.call('/api/launches', { action: 'create', name: `Regression ${run}`, symbol, description: 'Disposable regression token', graduationHype: 6, initialBuyHype: 0 })).data.detail;
  const before = await me(a);
  const bought = (await a.call(`/api/launches/${created.slug}/action`, { action: 'buy', amount: 20 })).data;
  assert.ok(bought.hypeOut < 6.1); near(bought.tokensOut, 800_000_000, 2);
  near(before.hype - (await me(a)).hype, bought.hypeOut);
  assert.equal(bought.detail.stage, 'frozen');
  const b = await account('intruder');
  await b.call(`/api/launches/${created.slug}/action`, { action: 'dispatch' }, { status: 403 });
  await a.call(`/api/launches/${created.slug}/action`, { action: 'graduate' });
  await b.call(`/api/launches/${created.slug}/action`, { action: 'dispatch' }, { status: 403 });
  await a.call(`/api/launches/${created.slug}/action`, { action: 'dispatch' });
  await a.call(`/api/launches/${created.slug}/action`, { action: 'confirm' });
  await a.call(`/api/launches/${created.slug}/action`, { action: 'deployPerp' });
  const listed = (await a.call(`/api/launches/${created.slug}`)).data.detail;
  assert.equal(listed.stage, 'perp_listed'); assert.ok(listed.poolLiquidityHype > 0);
  await a.call(`/api/launches/${created.slug}/action`, { action: 'listCashtag' }, { status: 402 });
  const payment = (await a.call(`/api/launches/${created.slug}/action`, { action: 'cashtagCheckout', handle: 'qa_creator', hype: 0.75 })).data;
  await a.call(`/api/launches/${created.slug}/action`, { action: 'listCashtag', paymentRef: payment.reference, code: 'wrong' }, { status: 403 });
  const result = (await a.call(`/api/launches/${created.slug}/action`, { action: 'listCashtag', paymentRef: payment.reference, code: payment.code })).data;
  assert.equal(result.detail.cashtag, symbol);
  await a.call(`/api/launches/${created.slug}/action`, { action: 'listCashtag', paymentRef: payment.reference, code: payment.code }, { status: 409 });
});

test('swaps: actual balances, overspend rollback, token round trip and stale quote rejection', async () => {
  const a = await account('swap'); const before = await me(a);
  const quote = (await a.call('/api/swap', { action: 'quote', from: 'HYPE', to: 'USDC', amount: 1 })).data.quote;
  const result = (await a.call('/api/swap', { action: 'execute', from: 'HYPE', to: 'USDC', amount: 1, expectedOut: quote.amountOut })).data;
  near(result.user.hype, before.hype - 1); near(result.user.usdc, before.usdc + result.amountOut);
  await a.call('/api/swap', { action: 'execute', from: 'HYPE', to: 'USDC', amount: 1, expectedOut: quote.amountOut * 100 }, { status: 409 });
  const buy = (await a.call('/api/swap', { action: 'execute', from: 'HYPE', to: 'LAVA', amount: 0.2 })).data;
  assert.ok(buy.amountOut > 0);
  const sell = (await a.call('/api/swap', { action: 'execute', from: 'LAVA', to: 'HYPE', amount: buy.amountOut / 2 })).data;
  assert.ok(sell.amountOut > 0);
  const balance = (await a.call('/api/swap')).data.assets.find((x) => x.symbol === 'LAVA').balance;
  near(balance, buy.amountOut / 2, 0.001);
});

test('perps: margin reservation, ownership, cancellation refund, close and no double close', async () => {
  const a = await account('perp'); const b = await account('perp-other');
  await a.call('/api/perp', { action: 'open', marketId: 'hip3_kntq_seed', side: 'long', notionalUsd: 100, leverage: 100 }, { status: 400 });
  const opened = (await a.call('/api/perp', { action: 'open', marketId: 'hip3_kntq_seed', side: 'long', notionalUsd: 50, leverage: 5 })).data;
  near((await me(a)).usdc, a.user.usdc - opened.margin - opened.fee);
  await b.call('/api/perp', { action: 'close', positionId: opened.position.id }, { status: 404 });
  const closed = (await a.call('/api/perp', { action: 'close', positionId: opened.position.id, fraction: 1 })).data;
  near((await me(a)).usdc, a.user.usdc - opened.fee - closed.fee + closed.pnl, 0.001);
  await a.call('/api/perp', { action: 'close', positionId: opened.position.id }, { status: 409 });
  const market = (await a.call('/api/perp/hip3_kntq_seed')).data.market;
  const pre = await me(a);
  const order = (await a.call('/api/perp', { action: 'limit', marketId: market.id, side: 'buy', kind: 'limit', limitPrice: market.markPrice * 0.8, size: 10 / (market.markPrice * 0.8), leverage: 5 })).data;
  near(pre.usdc - (await me(a)).usdc, order.reservedUsd);
  await b.call('/api/perp', { action: 'cancel', orderId: order.id }, { status: 404 });
  await a.call('/api/perp', { action: 'cancel', orderId: order.id });
  near((await me(a)).usdc, pre.usdc);
  await a.call('/api/perp', { action: 'cancel', orderId: order.id }, { status: 409 });
});

test('staking and claims: lock enforcement, owner isolation, single claim, notification isolation', async () => {
  const a = await account('stake'); const b = await account('stake-other');
  const stake = (await a.call('/api/stoke', { action: 'stake', amount: 100, lockDays: 30 })).data;
  await a.call('/api/stoke', { action: 'unstake', stakeId: stake.id }, { status: 409 });
  await b.call('/api/stoke', { action: 'unstake', stakeId: stake.id }, { status: 404 });
  const flexible = (await a.call('/api/stoke', { action: 'stake', amount: 10, lockDays: 0 })).data;
  const unlocked = (await a.call('/api/stoke', { action: 'unstake', stakeId: flexible.id })).data;
  assert.ok(unlocked.payout >= 10);
  const before = await me(a);
  await a.call('/api/stoke', { action: 'claim', tier: 'genesis' });
  near((await me(a)).stoke, before.stoke + 150);
  await a.call('/api/stoke', { action: 'claim', tier: 'genesis' }, { status: 409 });
  const notifications = (await a.call('/api/notifications')).data.notifications;
  assert.ok(notifications.length > 0);
  await b.call('/api/notifications', { id: notifications[0].id });
  assert.equal((await a.call('/api/notifications')).data.notifications.find((n) => n.id === notifications[0].id).read, false);
  await a.call('/api/launches', { action: 'create', name: 'Invalid founder buy', symbol: `X${run.slice(0, 5).toUpperCase()}`, initialBuyHype: 4 }, { status: 400 });
  const faucet = (await a.call('/api/faucet', {})).data;
  assert.equal(faucet.credited.hype, 5);
  await a.call('/api/faucet', { wallet: b.user.wallet, amount: 999 }, { status: 429 });
});
