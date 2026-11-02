"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/util";
import { useForge } from "@/components/providers";

const FieldContext = createContext<{ label: string; id: string; hintId: string } | null>(null);

/* ------------------------------------------------------------------ surfaces */

export function Panel({ children, className, glow }: { children: ReactNode; className?: string; glow?: boolean }) {
  return (
    <div className={cn("surface relative rounded-2xl", glow && "ring-1 ring-ice-400/10", className)}>
      {glow ? <div className="hero-glow pointer-events-none absolute inset-x-0 -top-px h-32 rounded-t-2xl" /> : null}
      <div className="relative">{children}</div>
    </div>
  );
}

export function SectionHead({ eyebrow, title, sub, right }: { eyebrow?: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="max-w-2xl">
        {eyebrow ? <div className="mb-3 text-xs font-medium text-slate-500">{eyebrow}</div> : null}
        <h2 className="font-serif-display text-3xl leading-tight text-white sm:text-4xl">{title}</h2>
        {sub ? <p className="mt-3 text-[15px] leading-relaxed text-slate-400">{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

/* -------------------------------------------------------------------- badges */

type Tone = "slate" | "ice" | "up" | "down" | "gold" | "violet";

export function Badge({ children, tone = "slate", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  const tones: Record<Tone, string> = {
    slate: "text-slate-300 bg-white/[0.06] ring-white/[0.08]",
    ice: "text-ice-400 bg-ice-400/[0.08] ring-ice-400/20",
    up: "text-up bg-up/[0.08] ring-up/20",
    down: "text-down bg-down/[0.08] ring-down/20",
    gold: "text-gold bg-gold/[0.08] ring-gold/20",
    violet: "text-aurora-400 bg-aurora-400/[0.08] ring-aurora-400/20",
  };
  return (
    <span className={cn("badge inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tones[tone], tone, className)}>
      {children}
    </span>
  );
}

export const stageTone: Record<string, Tone> = {
  created: "slate",
  trading: "ice",
  frozen: "gold",
  graduating: "violet",
  graduated: "up",
  perp_listed: "up",
};

export const stageText: Record<string, string> = {
  created: "Created",
  trading: "Curve live",
  frozen: "Sold out",
  graduating: "Graduating",
  graduated: "Pool live",
  perp_listed: "Perp live",
};

/* ------------------------------------------------------------------ controls */

export function Spinner({ className }: { className?: string }) {
  return <span className={cn("spin inline-block h-3.5 w-3.5 rounded-full border-[1.5px] border-current border-t-transparent", className)} />;
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  className,
  type = "button",
  href,
  full,
}: {
  children: ReactNode;
  onClick?: () => void | Promise<void>;
  variant?: "primary" | "ghost" | "danger" | "gold" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
  href?: string;
  full?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const variants: Record<string, string> = {
    primary: "bg-white text-ink-950 hover:bg-slate-200 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset,0_8px_24px_-12px_rgba(255,255,255,0.35)]",
    gold: "bg-gold text-ink-950 hover:brightness-110",
    danger: "bg-down/10 text-down ring-1 ring-inset ring-down/30 hover:bg-down/15",
    outline: "bg-white/[0.03] text-slate-100 ring-1 ring-inset ring-white/10 hover:bg-white/[0.07] hover:ring-white/20",
    ghost: "text-slate-400 hover:bg-white/[0.05] hover:text-white",
  };
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-[13px] gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-12 px-6 text-[15px] gap-2",
  };
  const isBusy = Boolean(busy) || Boolean(loading);
  const inner = (
    <span className="inline-flex items-center justify-center gap-2">
      {isBusy ? <Spinner /> : null}
      {children}
    </span>
  );
  const cls = cn(
    `forge-btn ${variant}`,
    "inline-flex select-none items-center justify-center rounded-full font-medium tracking-tight transition duration-200 disabled:cursor-not-allowed disabled:opacity-40",
    variants[variant],
    sizes[size],
    full && "w-full",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || isBusy}
      onClick={async () => {
        if (!onClick) return;
        setBusy(true);
        try {
          await onClick();
        } finally {
          setBusy(false);
        }
      }}
    >
      {inner}
    </button>
  );
}

export function Field({ label, hint, children, right }: { label: string; hint?: string; children: ReactNode; right?: ReactNode }) {
  const id = useId();
  const hintId = useId();
  return (
    <FieldContext.Provider value={{ label, id, hintId }}>
    <div className="form-field block">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={id} className="form-label text-[13px] font-medium text-slate-400">{label}</label>
        {right}
      </div>
      <div>{children}</div>
      {hint ? <p id={hintId} className="form-hint mt-1.5 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
    </FieldContext.Provider>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  suffix,
  className,
  disabled,
  maxLength,
  step,
}: {
  value: string | number;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  suffix?: ReactNode;
  className?: string;
  disabled?: boolean;
  maxLength?: number;
  step?: string;
}) {
  const field = useContext(FieldContext);
  return (
    <div
      className={cn(
        "field-control flex h-11 items-center gap-2 rounded-xl bg-ink-900 px-3.5 ring-1 ring-inset ring-white/[0.09] transition focus-within:bg-ink-800 focus-within:ring-ice-400/50",
        disabled && "opacity-50",
        className,
      )}
    >
      <input
        id={field?.id}
        aria-label={field?.label ?? placeholder ?? (type === "password" ? "Password" : "Value")}
        aria-describedby={field?.hintId}
        className="tabular w-full bg-transparent text-[15px] text-white outline-none placeholder:text-slate-600"
        value={value}
        type={type}
        step={step}
        maxLength={maxLength}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
      />
      {suffix ? <span className="shrink-0 text-xs font-medium text-slate-500">{suffix}</span> : null}
    </div>
  );
}

export function TextArea({ value, onChange, rows = 3, placeholder, maxLength }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string; maxLength?: number }) {
  const field = useContext(FieldContext);
  return (
    <textarea
      id={field?.id}
      aria-label={field?.label ?? placeholder ?? "Description"}
      aria-describedby={field?.hintId}
      className="field-control w-full resize-none rounded-xl bg-ink-900 px-3.5 py-3 text-[15px] leading-relaxed text-white outline-none ring-1 ring-inset ring-white/[0.09] placeholder:text-slate-600 focus:bg-ink-800 focus:ring-ice-400/50"
      value={value}
      rows={rows}
      maxLength={maxLength}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Pill segmented control. Use `underline` for tab-style navigation. */
export function Segmented<T extends string>({ value, onChange, options, size = "md", underline }: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  size?: "sm" | "md";
  underline?: boolean;
}) {
  return (
    <div className={underline ? "segment-tabs" : "segment"} role="tablist" aria-label="View options">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} data-active={value === o.value}
          className={cn("segment-option", !underline && size === "sm" && "small", !underline && size === "md" && "medium")}
          onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- display */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "up" | "down" | "gold" | "ice" | "violet" }) {
  const tones: Record<string, string> = { up: "text-up", down: "text-down", gold: "text-gold", ice: "text-ice-400", violet: "text-aurora-400" };
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className={cn("tabular mt-1.5 text-xl font-medium tracking-tight text-white", tone && tones[tone])}>{value}</div>
      {sub ? <div className="tabular mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

export function Delta({ pct, className }: { pct: number; className?: string }) {
  const up = pct >= 0;
  return <span className={cn("tabular font-medium", up ? "text-up" : "text-down", className)}>{`${up ? "+" : ""}${pct.toFixed(2)}%`}</span>;
}

export function Progress({ pct, accent = "#a7f3d6", height = 4 }: { pct: number; accent?: string; height?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-white/[0.07]" style={{ height }}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out" style={{ width: `${Math.max(0.5, Math.min(100, pct))}%`, background: accent }} />
    </div>
  );
}

export function Sparkline({ values, accent = "#a7f3d6", height = 44, fill = true }: { values: number[]; accent?: string; height?: number; fill?: boolean }) {
  const path = useMemo(() => {
    if (!values || values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 100 - ((v - min) / span) * 84 - 8] as const);
    const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    return { line, area: `${line} L100,100 L0,100 Z` };
  }, [values]);

  if (!path) return <div className="flex items-center text-xs text-slate-600" style={{ height }}>No trades yet</div>;
  const gid = `spark-${accent.replace("#", "")}-${height}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height }} className="w-full overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.18" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill ? <path d={path.area} fill={`url(#${gid})`} /> : null}
      <path d={path.line} fill="none" stroke={accent} strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

/** Monogram avatar for tokens. Hairline square, no gimmicks. */
export function TokenGlyph({ glyph, accent, size = 40 }: { glyph: string; accent: string; size?: number }) {
  return (
    <div
      className="token-glyph grid shrink-0 place-items-center rounded-xl font-medium ring-1 ring-inset ring-white/[0.08]"
      style={{ width: size, height: size, background: `linear-gradient(160deg, ${accent}1f, transparent 70%)`, color: accent, fontSize: size * 0.38 }}
    >
      {glyph}
    </div>
  );
}

export function Copyable({ text, label, className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { push } = useForge();
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1400);
        } catch {
          push({ kind: "error", title: "Clipboard blocked", body: text });
        }
      }}
      className={cn("tabular inline-flex max-w-full items-center gap-1.5 rounded-md text-xs text-slate-400 transition hover:text-white", className)}
      title={text}
    >
      <span className="truncate font-mono text-[12px]">{label ?? text}</span>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-60">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V5h10" />
      </svg>
      {copied ? <span className="text-up">Copied</span> : null}
    </button>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const active = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("input, button, a[href]")?.focus(), 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key !== "Tab") return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]') ?? []);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.clearTimeout(timer); window.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; active?.focus(); };
  }, [open]);

  if (!open) return null;
  return (
    <div className="modal-overlay fixed inset-0 z-50 grid place-items-end bg-black/60 backdrop-blur-[6px] sm:place-items-center sm:p-6" onClick={onClose}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId} data-wide={wide || undefined}
        className="modal-dialog rise surface max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-ink-900 p-6 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 id={titleId} className="modal-title font-serif-display text-2xl text-white">{title}</h3>
          <button onClick={onClose} className="close-button" aria-label="Close dialog"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty-state flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/[0.1] px-6 py-14 text-center">
      <div className="font-serif-display text-2xl text-white">{title}</div>
      {body ? <div className="max-w-md text-sm leading-relaxed text-slate-400">{body}</div> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function LiveRow({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="divide-y divide-white/[0.06]">
      {items.map((i) => (
        <div key={i.label} className="flex items-center justify-between gap-3 py-2 text-sm">
          <dt className="text-slate-500">{i.label}</dt>
          <dd className="tabular font-medium text-slate-100">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Price cell that briefly flashes on change. */
export function Live({ value, render, className }: { value: number; render?: (v: number) => string; className?: string }) {
  const prev = useRef(value);
  const [dir, setDir] = useState("");
  useEffect(() => {
    if (value === prev.current) return;
    setDir(value > prev.current ? "tick-up" : "tick-down");
    prev.current = value;
    const id = window.setTimeout(() => setDir(""), 720);
    return () => window.clearTimeout(id);
  }, [value]);
  return <span className={cn("tabular rounded-sm px-0.5", dir, className)}>{render ? render(value) : value.toFixed(6)}</span>;
}

export function Toasts() {
  const { toasts, dismiss } = useForge();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(92vw,380px)] flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className="toast rise pointer-events-auto surface rounded-xl bg-ink-800/95 p-4 shadow-2xl backdrop-blur">
          <div className="flex items-start gap-3">
            <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", t.kind === "success" ? "bg-up" : t.kind === "error" ? "bg-down" : t.kind === "tx" ? "bg-ice-400" : "bg-slate-500")} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white">{t.title}</div>
              {t.body ? <div className="tabular mt-0.5 break-words text-xs leading-relaxed text-slate-400">{t.body}</div> : null}
              {t.href ? (
                <Link href={t.href} className="mt-1.5 inline-block text-xs font-medium text-ice-400 hover:underline">
                  View →
                </Link>
              ) : null}
            </div>
            <button onClick={() => dismiss(t.id)} className="text-slate-500 transition hover:text-white" aria-label="Dismiss">
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
