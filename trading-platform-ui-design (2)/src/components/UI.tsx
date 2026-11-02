import { type ReactNode, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Info, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { percent } from "@/lib/market";

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <Link to="/" aria-label="Tickerforge - beranda" className={cn("inline-flex items-center gap-2.5 whitespace-nowrap", large && "gap-3.5")}>
      <svg viewBox="0 0 40 40" aria-hidden="true" className={cn("shrink-0", large ? "h-10 w-10" : "h-8 w-8")}>
        <defs>
          <linearGradient id="tf-brand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="10" fill="url(#tf-brand)" />
        <path d="M13 14h14v4h-5v10h-4V18h-5z" fill="#05070a" />
      </svg>
      <span className={cn("font-display font-bold tracking-[-0.06em] text-text", large ? "text-[21px]" : "text-[17px]")}>
        TICKER<span className="gradient-text">FORGE</span>
      </span>
    </Link>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-7 border-b border-line-soft pb-11 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div>
        <div className="eyebrow mb-5">{eyebrow}</div>
        <h1 className="display max-w-[900px] text-[clamp(2.5rem,5vw,4.8rem)] font-bold text-text">{title}</h1>
        <p className="mt-5 max-w-[640px] text-[14px] leading-[1.8] text-muted sm:text-[15px]">{description}</p>
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkText,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="eyebrow mb-4">{eyebrow}</div>
        <h2 className="display max-w-[740px] text-[clamp(2rem,3.6vw,3.4rem)] font-bold text-text">{title}</h2>
        {description && <p className="mt-4 max-w-[590px] text-[14px] leading-[1.8] text-muted">{description}</p>}
      </div>
      {href && linkText && (
        <Link to={href} className="button-plain shrink-0 pb-1">
          {linkText} <ArrowRight size={15} strokeWidth={2} />
        </Link>
      )}
    </div>
  );
}

export function DemoLabel({ compact = false }: { compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-mono text-[10px] font-medium tracking-[0.1em] text-faint uppercase", compact && "text-[9px]")}>
      <span className="relative flex h-1.5 w-1.5">
        <span className="ping-soft absolute inset-0 rounded-full bg-accent" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-accent" />
      </span>
      Mode demo
    </span>
  );
}

export function AssetMark({ symbol, color, size = "md" }: { symbol: string; color: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full border font-display font-bold tracking-[-0.06em]",
        size === "sm" ? "h-8 w-8 text-[11px]" : size === "lg" ? "h-14 w-14 text-[18px]" : "h-10 w-10 text-[13px]"
      )}
      style={{ color, borderColor: `${color}55`, background: `linear-gradient(145deg, ${color}2e, ${color}14)` }}
      aria-hidden="true"
    >
      {symbol.slice(0, 2)}
    </span>
  );
}

export function Change({ value, className }: { value: number; className?: string }) {
  return <span className={cn("nums font-mono text-[12px] font-medium", value >= 0 ? "text-up" : "text-down", className)}>{percent(value)}</span>;
}

export function ProgressTrack({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-[4px] overflow-hidden rounded-full bg-white/[0.08]", className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-gradient-to-r from-[#a78bfa] to-[#22d3ee] transition-[width] duration-500" style={{ width: `${Math.max(1, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Status({ graduated = false }: { graduated?: boolean }) {
  return graduated ? (
    <span className="micro text-amber">Graduated</span>
  ) : (
    <span className="micro text-accent-dim">Bonding</span>
  );
}

export function InlineNotice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "success" | "error" }) {
  const toneClass = tone === "error" ? "border-down/30 bg-down/10 text-down" : tone === "success" ? "border-accent/30 bg-accent/10 text-accent" : "border-line bg-surface text-muted";
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[12px] leading-[1.6]", toneClass)}>
      {tone === "success" ? <Check size={15} className="mt-0.5 shrink-0" /> : <Info size={15} className="mt-0.5 shrink-0" />}
      {children}
    </div>
  );
}

export function Toast({ message, onClose, tone = "success" }: { message: string; onClose: () => void; tone?: "success" | "error" }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => closeRef.current(), 4200);
    return () => clearTimeout(id);
  }, [message]);
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10 }}
          className={cn("fixed right-4 bottom-5 z-[80] flex max-w-[370px] items-start gap-3 rounded-xl border px-4 py-3.5 shadow-[0_24px_70px_#000a] backdrop-blur-xl sm:right-7 sm:bottom-7", tone === "error" ? "border-down/50 bg-[#1c1216]/95" : "border-accent/40 bg-[#12151f]/95")}
          role="status"
        >
          {tone === "error" ? <Info size={18} className="mt-0.5 shrink-0 text-down" /> : <Check size={18} className="mt-0.5 shrink-0 text-up" />}
          <span className="text-[12px] leading-[1.6] text-text">{message}</span>
          <button onClick={onClose} aria-label="Tutup notifikasi" className="ml-2 text-faint hover:text-text"><X size={15} /></button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.65, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
