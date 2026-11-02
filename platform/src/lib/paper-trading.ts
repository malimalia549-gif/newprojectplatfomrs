export type PaperPosition = { id: string; coin: string; kind: "spot" | "perp"; side: "buy" | "sell"; entry: number; quantity: number; margin: number; leverage: number };
export type PaperAccount = { cash: number; positions: PaperPosition[] };
export const emptyPaperAccount = (): PaperAccount => ({ cash: 10_000, positions: [] });
export const paperPnl = (p: PaperPosition, mark: number) => (mark - p.entry) * p.quantity * (p.side === "buy" ? 1 : -1);

/** Local training ledger only. Never sends an exchange action or moves real funds. */
export function openPaper(a: PaperAccount, p: Omit<PaperPosition, "quantity">): PaperAccount {
  if (!Number.isFinite(p.entry) || p.entry <= 0 || !Number.isFinite(p.margin) || p.margin <= 0 || p.margin > a.cash) throw new Error("Margin must be positive and within the paper balance.");
  if (!Number.isInteger(p.leverage) || p.leverage < 1 || p.leverage > 20 || (p.kind === "spot" && (p.leverage !== 1 || p.side !== "buy"))) throw new Error("Invalid paper leverage or spot direction.");
  if (!p.coin || !p.id || a.positions.some(x => x.id === p.id)) throw new Error("Invalid paper position.");
  return { cash: a.cash - p.margin, positions: [...a.positions, { ...p, quantity: p.margin * p.leverage / p.entry }] };
}
export function closePaper(a: PaperAccount, id: string, mark: number): PaperAccount {
  const p = a.positions.find(x => x.id === id);
  if (!p || !Number.isFinite(mark) || mark <= 0) throw new Error("Position or fresh price unavailable.");
  // Isolated training position: loss cannot exceed reserved collateral.
  return { cash: a.cash + Math.max(0, p.margin + paperPnl(p, mark)), positions: a.positions.filter(x => x.id !== id) };
}
export function validPaperAccount(v: unknown): v is PaperAccount {
  if (!v || typeof v !== "object") return false;
  const a = v as PaperAccount;
  return Number.isFinite(a.cash) && a.cash >= 0 && Array.isArray(a.positions) && a.positions.length <= 1000 && a.positions.every(p => p && typeof p.id === "string" && typeof p.coin === "string" && ["spot", "perp"].includes(p.kind) && ["buy", "sell"].includes(p.side) && Number.isFinite(p.entry) && p.entry > 0 && Number.isFinite(p.margin) && p.margin > 0 && Number.isFinite(p.quantity) && p.quantity > 0 && Number.isInteger(p.leverage) && p.leverage >= 1 && p.leverage <= 20);
}
