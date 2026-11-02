export function handleFrom(input: string) {
  const cleaned = input.trim().replace(/^@/, "").replace(/^https?:\/\/(x|twitter)\.com\//, "").replace(/\/.*$/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(cleaned)) throw new Error("X handle must be 1–15 chars: letters, numbers, underscore.");
  return cleaned.toLowerCase();
}

export function hypeToUsd(rate: number, hype: number) {
  return Math.round(hype * rate * 100) / 100;
}
