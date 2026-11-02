export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

/**
 * Group persisted sandbox mark prints into display-only candles.
 * These are not exchange OHLC bars and carry no real traded volume.
 */
export function aggregateMarks(trail: number[], now = Date.now(), group = 3, stepMs = 5_000): Candle[] {
  const values = trail.filter((v) => Number.isFinite(v) && v > 0);
  const size = Math.max(1, Math.floor(group));
  const bars: Candle[] = [];
  for (let i = 0; i < values.length; i += size) {
    const chunk = values.slice(i, i + size);
    bars.push({
      t: now - (values.length - i) * stepMs,
      o: chunk[0]!,
      c: chunk[chunk.length - 1]!,
      h: Math.max(...chunk),
      l: Math.min(...chunk),
      v: 0,
    });
  }
  return bars;
}
