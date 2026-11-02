/* ── identitas visual token launchpad ──────────────────────── */

const PAL: [string, string][] = [
  ["#d9ff4d", "#3edc99"],
  ["#9b8cff", "#5ad1ff"],
  ["#ffb36b", "#ff6f91"],
  ["#5ad1ff", "#3edc99"],
  ["#ffd96b", "#ff8f5a"],
  ["#c48cff", "#ff7ad9"],
  ["#7cf2c9", "#4d8bff"],
  ["#e9ecef", "#9aa3ab"],
];

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function TokenAvatar({ t, size = 48, className = "" }: { t: string; size?: number; className?: string }) {
  const h = hashStr(t);
  const [a, b] = PAL[h % PAL.length];
  const shape = (h >>> 5) % 4;
  const id = `ta-${t}-${size}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={`shrink-0 ${className}`} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#${id})`} />
      {shape === 0 && <circle cx="36" cy="12" r="12" fill="#07090b" fillOpacity=".13" />}
      {shape === 1 && <path d="M0 34 L48 16 L48 48 L0 48Z" fill="#07090b" fillOpacity=".11" />}
      {shape === 2 && (
        <g fill="none" stroke="#07090b" strokeOpacity=".15" strokeWidth="3">
          <circle cx="24" cy="24" r="17" />
          <circle cx="24" cy="24" r="9" />
        </g>
      )}
      {shape === 3 && <rect x="27" y="-8" width="13" height="64" transform="rotate(28 24 24)" fill="#07090b" fillOpacity=".11" />}
      <text
        x="24"
        y="29.5"
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill="#07090b"
        style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.04em" }}
      >
        {t.slice(0, 2)}
      </text>
    </svg>
  );
}

export const STAGES = ["Create", "Trading", "Graduate", "Uniswap pool", "Selesai"];

/* Pelacak lima tahap: 0 Create · 1 Trading · 2 Graduate · 3 Pool · 4 Selesai */
export function StageTracker({ stage, progress = 0 }: { stage: number; progress?: number }) {
  const fill = Math.min(4, stage + (stage === 1 ? Math.min(0.98, progress) : 0));
  return (
    <div className="relative grid grid-cols-5">
      <div className="absolute left-[10%] right-[10%] top-[13px] h-[2px] rounded-full bg-white/[0.08]" />
      <div
        className="absolute left-[10%] top-[13px] h-[2px] rounded-full bg-amber shadow-[0_0_12px_rgba(217,255,77,.6)] transition-all duration-700"
        style={{ width: `${fill * 20}%` }}
      />
      {STAGES.map((s, i) => (
        <div key={s} className="relative flex flex-col items-center gap-2">
          <span
            className={`grid h-7 w-7 place-items-center rounded-full border text-[11px] font-semibold transition-colors ${
              i < stage
                ? "border-amber bg-amber text-ink"
                : i === stage
                  ? "border-amber bg-ink text-amber shadow-[0_0_0_4px_rgba(217,255,77,.12)]"
                  : "border-white/15 bg-ink text-dim"
            }`}
          >
            {i < stage ? "✓" : i + 1}
          </span>
          <span className={`text-center text-[11.5px] leading-tight ${i <= stage ? "text-bone" : "text-dim"}`}>{s}</span>
        </div>
      ))}
    </div>
  );
}
