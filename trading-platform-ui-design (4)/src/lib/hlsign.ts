/* ── HyperCore signing primitives (pure, framework-free) ──────────
   Mengikuti hyperliquid-python-sdk/utils/signing.py byte-per-byte:
     action_hash = keccak( msgpack(action) ‖ nonce:u64be ‖ 0x00 | 0x01‖vault [‖ 0x00‖expiresAfter:u64be] )
     L1  : EIP-712 Agent{source,connectionId}  domain Exchange/1/chainId 1337/0x0
     User: EIP-712 HyperliquidTransaction:*     domain HyperliquidSignTransaction/1/<signatureChainId>/0x0
   Diverifikasi terhadap vektor di tests/signing_test.py (lihat scripts/verify-signing). */

import { encode } from "@msgpack/msgpack";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { privateKeyToAccount } from "viem/accounts";

export const ZERO = "0x0000000000000000000000000000000000000000" as const;

const EIP712_DOMAIN = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

export type Sig = { r: string; s: string; v: number };

/* ── number → wire string (float_to_wire) ──────────────────── */
export function floatToWire(x: number): string {
  let s = x.toFixed(8);
  if (Math.abs(Number(s) - x) >= 1e-12 && Math.abs(Number(s) - x) / Math.max(1, Math.abs(x)) > 1e-9) {
    throw new Error(`Presisi angka terlalu tinggi: ${x}`);
  }
  s = s.replace(/\.?0+$/, "");
  if (s === "-0" || s === "") s = "0";
  return s;
}

/* Harga perp: maks 5 angka signifikan & maks (6 − szDecimals) desimal; bilangan bulat selalu valid */
export function roundPrice(px: number, szDecimals: number, perp = true): number {
  if (!Number.isFinite(px) || px <= 0) return 0;
  const maxDec = Math.max(0, (perp ? 6 : 8) - szDecimals);
  const sig = Number(px.toPrecision(5));
  return Number(sig.toFixed(maxDec));
}

/* Ukuran: dibulatkan ke bawah pada szDecimals agar tidak melebihi margin */
export function roundSize(sz: number, szDecimals: number): number {
  if (!Number.isFinite(sz) || sz <= 0) return 0;
  const f = 10 ** szDecimals;
  return Math.floor(sz * f + 1e-9) / f;
}

/* ── bytes helpers ─────────────────────────────────────────── */
function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
function u64(n: number | bigint) {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, BigInt(n));
  return b;
}
function hexToBytes(h: string) {
  const s = h.startsWith("0x") ? h.slice(2) : h;
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return out;
}
export const toHex = (b: Uint8Array) =>
  "0x" + Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

/* ── action hash → connectionId ────────────────────────────── */
export function actionHash(
  action: unknown,
  nonce: number,
  vault: string | null = null,
  expiresAfter: number | null = null,
): string {
  const parts: Uint8Array[] = [encode(action) as Uint8Array, u64(nonce)];
  if (vault) parts.push(new Uint8Array([1]), hexToBytes(vault));
  else parts.push(new Uint8Array([0]));
  if (expiresAfter != null) parts.push(new Uint8Array([0]), u64(expiresAfter));
  return toHex(keccak_256(concat(parts)));
}

export function l1TypedData(connectionId: string, isMainnet: boolean) {
  return {
    domain: { name: "Exchange", version: "1", chainId: 1337, verifyingContract: ZERO },
    types: {
      Agent: [
        { name: "source", type: "string" },
        { name: "connectionId", type: "bytes32" },
      ],
    },
    primaryType: "Agent" as const,
    message: { source: isMainnet ? "a" : "b", connectionId: connectionId as `0x${string}` },
  };
}

export function splitSig(sig: string): Sig {
  const h = sig.startsWith("0x") ? sig.slice(2) : sig;
  let v = parseInt(h.slice(128, 130), 16);
  if (v < 27) v += 27;
  return { r: "0x" + h.slice(0, 64), s: "0x" + h.slice(64, 128), v };
}

/* Tanda tangan L1 dengan kunci agen lokal (tanpa pop-up dompet) */
export async function signL1WithKey(
  privateKey: `0x${string}`,
  action: unknown,
  nonce: number,
  isMainnet: boolean,
  vault: string | null = null,
): Promise<Sig> {
  const account = privateKeyToAccount(privateKey);
  const cid = actionHash(action, nonce, vault);
  const td = l1TypedData(cid, isMainnet);
  const sig = await account.signTypedData(td);
  return splitSig(sig);
}

/* ── action builders — urutan key HARUS kanonik ────────────── */
export type OrderWire = {
  a: number;
  b: boolean;
  p: string;
  s: string;
  r: boolean;
  t: { limit: { tif: "Gtc" | "Ioc" | "Alo" } };
};

export function orderWire(
  asset: number,
  isBuy: boolean,
  px: number,
  sz: number,
  reduceOnly: boolean,
  tif: "Gtc" | "Ioc" | "Alo",
): OrderWire {
  return { a: asset, b: isBuy, p: floatToWire(px), s: floatToWire(sz), r: reduceOnly, t: { limit: { tif } } };
}

export const orderAction = (orders: OrderWire[]) => ({ type: "order", orders, grouping: "na" });
export const cancelAction = (cancels: { a: number; o: number }[]) => ({ type: "cancel", cancels });
export const leverageAction = (asset: number, isCross: boolean, leverage: number) => ({
  type: "updateLeverage",
  asset,
  isCross,
  leverage,
});

/* ── approveAgent (user-signed, ditandatangani dompet utama) ── */
export const APPROVE_AGENT_TYPES = [
  { name: "hyperliquidChain", type: "string" },
  { name: "agentAddress", type: "address" },
  { name: "agentName", type: "string" },
  { name: "nonce", type: "uint64" },
];

export function approveAgentPayload(
  agentAddress: string,
  agentName: string,
  nonce: number,
  isMainnet: boolean,
  signatureChainIdHex: string,
) {
  const action = {
    type: "approveAgent",
    signatureChainId: signatureChainIdHex,
    hyperliquidChain: isMainnet ? "Mainnet" : "Testnet",
    agentAddress,
    agentName,
    nonce,
  };
  /* EIP712Domain wajib disertakan untuk eth_signTypedData_v4 (MetaMask/Rabby) */
  const typedData = {
    domain: {
      name: "HyperliquidSignTransaction",
      version: "1",
      chainId: parseInt(signatureChainIdHex, 16),
      verifyingContract: ZERO,
    },
    types: {
      EIP712Domain: EIP712_DOMAIN,
      "HyperliquidTransaction:ApproveAgent": APPROVE_AGENT_TYPES,
    },
    primaryType: "HyperliquidTransaction:ApproveAgent",
    message: {
      hyperliquidChain: action.hyperliquidChain,
      agentAddress,
      agentName,
      nonce,
    },
  };
  return { action, typedData };
}
