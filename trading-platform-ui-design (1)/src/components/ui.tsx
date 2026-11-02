import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

/* ── labels ────────────────────────────────────────────────── */
export function Micro({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`micro ${className}`}>{children}</span>;
}

export function Screw({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block h-[5px] w-[5px] shrink-0 rounded-full bg-[#2b333b] ${className}`}
    />
  );
}

export function Lamp({
  on,
  color = "amber",
  className = "",
  pulse,
}: {
  on: boolean;
  color?: "amber" | "mint" | "blood";
  className?: string;
  pulse?: boolean;
}) {
  const base = color === "mint" ? "bg-mint" : color === "blood" ? "bg-blood" : "bg-amber";
  return (
    <span
      aria-hidden
      className={`block h-[6px] w-[6px] shrink-0 rounded-full transition-all duration-500 ${
        on ? `${base} ${color === "mint" ? "lamp-mint" : "lamp-on"}` : "bg-[#2b333b]"
      } ${pulse && on ? "animate-blink" : ""} ${className}`}
    />
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass ${className}`}>{children}</div>;
}

/* ── card: soft glass surface with a titled header ─────────── */
export function Card({
  title,
  kicker,
  tools,
  children,
  className = "",
  bodyClass = "",
}: {
  title?: ReactNode;
  kicker?: ReactNode;
  tools?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={`card hairline relative flex flex-col overflow-hidden ${className}`}>
      {title || tools ? (
        <header className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-3">
          <div className="flex min-w-0 items-baseline gap-3">
            {title ? (
              <h3 className="truncate text-[13px] font-semibold tracking-[-0.01em] text-bone">{title}</h3>
            ) : null}
            {kicker ? <Micro className="shrink-0 text-dim">{kicker}</Micro> : null}
          </div>
          {tools ? <div className="flex shrink-0 items-center gap-2">{tools}</div> : null}
        </header>
      ) : null}
      <div className={`min-w-0 flex-1 ${bodyClass}`}>{children}</div>
    </section>
  );
}

/* ── controls ──────────────────────────────────────────────── */
export function Btn({
  children,
  onClick,
  variant = "ghost",
  className = "",
  href,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "mint" | "blood" | "ghost" | "quiet";
  className?: string;
  href?: string;
  type?: "button" | "submit";
}) {
  const v = {
    primary:
      "border-amber bg-amber text-ink font-semibold hover:shadow-[0_10px_30px_-12px_rgba(217,255,77,.75)] hover:brightness-105",
    mint: "border-mint/45 bg-mint/12 text-mint hover:bg-mint/20",
    blood: "border-blood/45 bg-blood/12 text-blood hover:bg-blood/20",
    ghost: "border-white/10 bg-white/[0.035] text-bone hover:border-white/25 hover:bg-white/[0.07]",
    quiet: "border-transparent bg-transparent text-dim hover:text-bone",
  }[variant];
  const cls = `inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 font-mono text-[11px] tracking-[0.14em] uppercase transition-all duration-200 active:translate-y-px ${v} ${className}`;
  if (href)
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function Pill({
  children,
  active,
  onClick,
  tone = "amber",
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  tone?: "amber" | "mint";
}) {
  const on = active
    ? tone === "mint"
      ? "border-mint/45 bg-mint/14 text-mint"
      : "border-amber/45 bg-amber/14 text-amber"
    : "border-white/8 bg-white/[0.02] text-dim hover:border-white/20 hover:text-bone";
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors duration-200 ${on}`}
    >
      {children}
    </button>
  );
}

export function Tag({
  children,
  tone = "dim",
}: {
  children: ReactNode;
  tone?: "dim" | "amber" | "mint" | "blood";
}) {
  const t = {
    dim: "border-white/10 text-dim",
    amber: "border-amber/35 bg-amber/10 text-amber",
    mint: "border-mint/35 bg-mint/10 text-mint",
    blood: "border-blood/35 bg-blood/10 text-blood",
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[9px] tracking-[0.14em] uppercase ${t}`}
    >
      {children}
    </span>
  );
}

/* ── tabs ──────────────────────────────────────────────────── */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className = "",
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 border-b border-white/[0.06] ${className}`} role="tablist">
      {tabs.map((t) => {
        const on = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.id)}
            className={`relative px-4 py-2.5 font-mono text-[10px] tracking-[0.16em] uppercase transition-colors duration-200 ${
              on ? "text-amber" : "text-dim hover:text-bone"
            }`}
          >
            {t.label}
            {t.count != null && <span className="tnum ml-2 text-dim">{t.count}</span>}
            {on && (
              <motion.span
                layoutId="tabline"
                className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-amber"
                transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── data table ────────────────────────────────────────────── */
export type Col<T> = {
  key: string;
  head: ReactNode;
  align?: "left" | "right";
  sort?: (row: T) => number | string;
  cell: (row: T) => ReactNode;
  hide?: string;
  width?: string;
};

export function DataTable<T>({
  rows,
  cols,
  initialSort,
  onRow,
  empty = "TIDAK ADA DATA",
  dense,
}: {
  rows: T[];
  cols: Col<T>[];
  initialSort?: { key: string; dir: 1 | -1 };
  onRow?: (row: T) => void;
  empty?: string;
  dense?: boolean;
}) {
  const [sort, setSort] = useState(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = cols.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    const get = col.sort;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (typeof x === "number" && typeof y === "number") return (x - y) * sort.dir;
      return String(x).localeCompare(String(y)) * sort.dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {cols.map((c) => {
              const sortable = !!c.sort;
              const on = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  className={`${c.align === "right" ? "text-right" : "text-left"} ${c.hide ?? ""} ${
                    c.width ?? ""
                  } px-4 py-2.5 font-normal`}
                >
                  {sortable ? (
                    <button
                      onClick={() =>
                        setSort((s) =>
                          s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: -1 },
                        )
                      }
                      className={`micro inline-flex items-center gap-1 transition-colors ${
                        on ? "text-amber" : "text-dim hover:text-bone"
                      }`}
                    >
                      {c.head}
                      <span className="text-[8px]">{on ? (sort!.dir === 1 ? "▲" : "▼") : "◆"}</span>
                    </button>
                  ) : (
                    <Micro className="text-dim">{c.head}</Micro>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={cols.length} className={`px-4 text-center ${dense ? "py-8" : "py-16"}`}>
                <Micro className="text-dim">{empty}</Micro>
              </td>
            </tr>
          )}
          {sorted.map((r, i) => (
            <tr
              key={i}
              onClick={onRow ? () => onRow(r) : undefined}
              className={`border-b border-white/[0.045] last:border-0 transition-colors duration-150 ${
                onRow ? "cursor-pointer" : ""
              } hover:bg-white/[0.035]`}
            >
              {cols.map((c) => (
                <td
                  key={c.key}
                  className={`${c.align === "right" ? "text-right" : "text-left"} ${c.hide ?? ""} ${
                    c.width ?? ""
                  } ${dense ? "px-4 py-2" : "px-4 py-3"} align-middle`}
                >
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── segmented meter ───────────────────────────────────────── */
export function Meter({
  value,
  tone = "amber",
  segments = 30,
  className = "",
}: {
  value: number;
  tone?: "amber" | "mint";
  segments?: number;
  className?: string;
}) {
  const filled = Math.round(Math.min(1, Math.max(0, value)) * segments);
  const c = tone === "mint" ? "bg-mint" : "bg-amber";
  return (
    <div className={`flex h-[6px] items-stretch gap-[3px] ${className}`} aria-hidden>
      {Array.from({ length: segments }).map((_, i) => (
        <span
          key={i}
          className={`flex-1 rounded-full transition-colors duration-300 ${i < filled ? c : "bg-white/[0.07]"}`}
          style={
            i === filled - 1 && tone === "amber"
              ? { boxShadow: "0 0 10px rgba(217,255,77,.7)" }
              : undefined
          }
        />
      ))}
    </div>
  );
}

/* ── key/value rows ────────────────────────────────────────── */
export function KV({
  k,
  v,
  tone,
  className = "",
}: {
  k: ReactNode;
  v: ReactNode;
  tone?: "mint" | "amber" | "blood";
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 border-b border-white/[0.06] py-2.5 last:border-0 ${className}`}>
      <Micro className="text-dim">{k}</Micro>
      <span
        className={`tnum font-mono text-[12px] ${
          tone === "mint"
            ? "text-mint"
            : tone === "amber"
              ? "text-amber"
              : tone === "blood"
                ? "text-blood"
                : "text-bone"
        }`}
      >
        {v}
      </span>
    </div>
  );
}

export function MetaRow({ k, v, tone }: { k: string; v: string; tone?: "mint" | "amber" }) {
  return <KV k={k} v={v} tone={tone} />;
}

/* ── page masthead ─────────────────────────────────────────── */
export function PageHeader({
  crumb,
  index,
  kicker,
  title,
  lead,
  meta,
  actions,
}: {
  crumb: string;
  index: string;
  kicker: string;
  title: ReactNode;
  lead?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  const parts = crumb.split("/");
  return (
    <header className="relative overflow-hidden border-b border-white/[0.06]">
      <div aria-hidden className="aurora pointer-events-none absolute -top-40 right-[8%] h-[420px] w-[560px] opacity-70" />
      <div aria-hidden className="grid-veil pointer-events-none absolute inset-0 opacity-70" />
      <div className="wrap relative pt-10 pb-9 md:pt-14">
        <nav aria-label="breadcrumb" className="flex items-center gap-2">
          {parts.map((p, i) => (
            <span key={p} className="flex items-center gap-2">
              {i > 0 && <span className="font-mono text-[10px] text-edge">/</span>}
              <Micro className={i === parts.length - 1 ? "text-amber" : "text-dim"}>{p}</Micro>
            </span>
          ))}
        </nav>

        <div className="mt-5 grid gap-8 lg:grid-cols-[1.55fr_0.45fr] lg:items-end">
          <div>
            <div className="flex items-baseline gap-4">
              <Micro className="text-amber">{index}</Micro>
              <Micro className="text-dim">{kicker}</Micro>
            </div>
            <h1 className="grad-text mt-3 text-[clamp(1.9rem,5.4vw,4rem)] font-bold leading-[0.92] tracking-[-0.035em]">
              {title}
            </h1>
            {lead ? <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-dim">{lead}</p> : null}
            {actions ? <div className="mt-6 flex flex-wrap gap-3">{actions}</div> : null}
          </div>
          {meta ? (
            <div className="border-t border-white/[0.06] pt-5 lg:border-t-0 lg:border-l lg:border-white/[0.06] lg:pt-0 lg:pl-6">
              {meta}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

/* ── section heading ───────────────────────────────────────── */
export function SectionHead({
  index,
  kicker,
  title,
  lead,
  right,
}: {
  index?: string;
  kicker: string;
  title: ReactNode;
  lead?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-5 border-b border-white/[0.06] pb-4">
      <div>
        <div className="flex items-baseline gap-3">
          {index ? <Micro className="text-amber">{index}</Micro> : null}
          <Micro className="text-dim">{kicker}</Micro>
        </div>
        <h2 className="mt-2 text-[clamp(1.35rem,3.2vw,2.1rem)] font-bold leading-[0.98] tracking-[-0.03em]">
          {title}
        </h2>
        {lead ? <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-dim">{lead}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="my-8 flex items-center gap-4">
      <Micro className="text-dim">{label}</Micro>
      <span className="h-px flex-1 bg-white/[0.07]" />
    </div>
  );
}

/* ── scroll reveal ─────────────────────────────────────────── */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ── page pager ────────────────────────────────────────────── */
export function PageNav({
  prev,
  next,
}: {
  prev?: { label: string; to: string };
  next?: { label: string; to: string };
}) {
  return (
    <div className="mt-12 grid gap-3 sm:grid-cols-2">
      {prev ? (
        <a href={`#${prev.to}`} className="card card-hover group px-5 py-5">
          <Micro className="text-dim">← SEBELUMNYA</Micro>
          <div className="mt-1.5 text-[15px] font-semibold tracking-tight text-bone transition-colors group-hover:text-amber">
            {prev.label}
          </div>
        </a>
      ) : (
        <div />
      )}
      {next ? (
        <a href={`#${next.to}`} className="card card-hover group px-5 py-5 text-right">
          <Micro className="text-dim">SELANJUTNYA →</Micro>
          <div className="mt-1.5 text-[15px] font-semibold tracking-tight text-bone transition-colors group-hover:text-amber">
            {next.label}
          </div>
        </a>
      ) : (
        <div />
      )}
    </div>
  );
}

/* ── formatting ────────────────────────────────────────────── */
export const fmt = {
  usd(n: number, d = 2) {
    if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2).replace(".", ",")} M`;
    if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2).replace(".", ",")} JT`;
    if (Math.abs(n) >= 1e4) return `$${(n / 1e3).toFixed(1).replace(".", ",")} RBU`;
    return "$" + n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
  },
  compact(n: number) {
    if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2).replace(".", ",")}B`;
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2).replace(".", ",")}M`;
    if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1).replace(".", ",")}K`;
    return n.toFixed(0);
  },
  price(n: number) {
    if (n >= 1000) return "$" + n.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 1) return "$" + n.toLocaleString("id-ID", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    return "$" + n.toLocaleString("id-ID", { minimumFractionDigits: 6, maximumFractionDigits: 7 });
  },
  n(n: number, d = 0) {
    return n.toLocaleString("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
  },
  pct(n: number, d = 2) {
    return `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(d).replace(".", ",")}%`;
  },
};

export const num = (v: number, tone: boolean) => (
  <span className={`tnum font-mono ${tone ? "text-mint" : "text-blood"}`}>{fmt.pct(v)}</span>
);
