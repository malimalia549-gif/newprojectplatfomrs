import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";
import { cn } from "@/utils/cn";

/* ------------------------------------------------------------------ hooks */

export function useInView<T extends HTMLElement>(threshold = 0.18, once = true) {
  const ref = useRef<T | null>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          if (once) io.disconnect();
        } else if (!once) setSeen(false);
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once]);
  return { ref, seen };
}

export function Reveal({
  children,
  delay = 0,
  className,
  y = 22,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const { ref, seen } = useInView<HTMLDivElement>(0.14);
  return (
    <div
      ref={ref}
      className={cn("reveal", seen && "reveal-in", className)}
      style={{ transitionDelay: `${delay}ms`, ["--ty" as string]: `${y}px` }}
    >
      {children}
    </div>
  );
}

export function useCountUp(target: number, run: boolean, dur = 1500, decimals = 0) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setV(target * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, dur]);
  return decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString("en-US");
}

export function useMedia(q: string) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(q);
    setM(mq.matches);
    const h = () => setM(mq.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, [q]);
  return m;
}

export function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? h.scrollTop / max : 0);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);
  return p;
}

/* ------------------------------------------------------------------ icons */

type I = SVGProps<SVGSVGElement>;
const base = (p: I) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const Icon = {
  Logo: (p: I) => (
    <svg viewBox="0 0 32 32" fill="none" {...p}>
      <path
        d="M16 1.6 29 9v14L16 30.4 3 23V9L16 1.6Z"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity=".45"
      />
      <path d="M9 20.5V15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M14 20.5V11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M19 20.5v-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M23.5 9.5v11"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        opacity=".55"
      />
      <path d="M8 12.5 15 7l4.5 4L24 5" stroke="currentColor" strokeWidth="1.3" opacity=".7" />
    </svg>
  ),
  Curve: (p: I) => (
    <svg {...base(p)}>
      <path d="M3 20c5.5 0 7.5-2 9.5-6.5S16 4 21 4" />
      <path d="M3 20h18" opacity=".35" />
      <circle cx="12.6" cy="13" r="1.9" fill="currentColor" stroke="none" />
    </svg>
  ),
  Book: (p: I) => (
    <svg {...base(p)}>
      <path d="M4 6h6M4 10h9M4 14h5M4 18h8" />
      <path d="M20 6h-4M20 10h-6M20 14h-3M20 18h-7" opacity=".45" />
    </svg>
  ),
  Pool: (p: I) => (
    <svg {...base(p)}>
      <path d="M12 3.2c3.4 4 5.4 6.8 5.4 9.4A5.4 5.4 0 0 1 12 18a5.4 5.4 0 0 1-5.4-5.4c0-2.6 2-5.4 5.4-9.4Z" />
      <path d="M8.6 21h6.8" opacity=".5" />
      <path d="M12 9.6v4.2" opacity=".6" />
    </svg>
  ),
  Perp: (p: I) => (
    <svg {...base(p)}>
      <path d="M7.5 8.5c3 0 3 7 6 7s3-7 6-7-3.6 2.4-3.6 7 3.6 4.5 3.6 4.5" opacity=".9" />
      <path d="M3 12h1.8M19.2 12H21" opacity=".45" />
      <path d="M6 5.5 12 3l6 2.5" opacity=".4" />
    </svg>
  ),
  Bolt: (p: I) => (
    <svg {...base(p)}>
      <path d="M13.5 2.5 5 13.4h5.2L9.8 21.5 19 10.3h-5.4l-.1-7.8Z" />
    </svg>
  ),
  Shield: (p: I) => (
    <svg {...base(p)}>
      <path d="M12 2.8 20 6v6.2c0 4.3-3.2 7.6-8 9-4.8-1.4-8-4.7-8-9V6l8-3.2Z" />
      <path d="m8.6 12.2 2.3 2.3 4.5-4.6" />
    </svg>
  ),
  Gauge: (p: I) => (
    <svg {...base(p)}>
      <path d="M3.6 17.5a9.4 9.4 0 1 1 16.8 0" />
      <path d="m12 13.6 4-3.4" />
      <circle cx="12" cy="14.4" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  ),
  Coins: (p: I) => (
    <svg {...base(p)}>
      <ellipse cx="12" cy="6.6" rx="7" ry="3.1" />
      <path d="M5 6.6v5c0 1.7 3.1 3.1 7 3.1s7-1.4 7-3.1v-5" />
      <path d="M5 11.8v4.9c0 1.7 3.1 3.1 7 3.1s7-1.4 7-3.1v-4.9" opacity=".55" />
    </svg>
  ),
  Bridge: (p: I) => (
    <svg {...base(p)}>
      <path d="M2.5 15.5c4-6 15-6 19 0" />
      <path d="M6.5 15.5v4M12 13.6v5.9M17.5 15.5v4" opacity=".55" />
      <path d="M2.5 19.5h19" opacity=".3" />
    </svg>
  ),
  Terminal: (p: I) => (
    <svg {...base(p)}>
      <rect x="2.6" y="4" width="18.8" height="16" rx="2" />
      <path d="m6.6 9.4 3 2.7-3 2.7M12.6 15.2h4.6" />
    </svg>
  ),
  Layers: (p: I) => (
    <svg {...base(p)}>
      <path d="m12 3 8.5 4.4L12 11.8 3.5 7.4 12 3Z" />
      <path d="m3.5 12.2 8.5 4.4 8.5-4.4" opacity=".6" />
      <path d="m3.5 16.8 8.5 4.4 8.5-4.4" opacity=".35" />
    </svg>
  ),
  Clock: (p: I) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 6.8V12l3.4 2.2" />
    </svg>
  ),
  Check: (p: I) => (
    <svg {...base(p)}>
      <path d="m4.5 12.6 4.7 4.6L19.5 6.8" />
    </svg>
  ),
  Cross: (p: I) => (
    <svg {...base(p)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  ),
  Arrow: (p: I) => (
    <svg {...base(p)}>
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </svg>
  ),
  Chevron: (p: I) => (
    <svg {...base(p)}>
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
    </svg>
  ),
  Play: (p: I) => (
    <svg {...base(p)}>
      <path d="M7.5 4.8 19 12 7.5 19.2V4.8Z" />
    </svg>
  ),
  Pause: (p: I) => (
    <svg {...base(p)}>
      <path d="M8.5 5v14M15.5 5v14" strokeWidth="2.2" />
    </svg>
  ),
  Reset: (p: I) => (
    <svg {...base(p)}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20.4 4.4v4.4H16" />
    </svg>
  ),
  Ticket: (p: I) => (
    <svg {...base(p)}>
      <path d="M3 8.4V6.2h18v2.2a2.6 2.6 0 0 0 0 5.2v2.2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2.2a2.6 2.6 0 0 0 0-5.2Z" />
      <path d="M12 7.6v1.8M12 11.1v1.8M12 14.6v1.8" opacity=".6" />
    </svg>
  ),
  Users: (p: I) => (
    <svg {...base(p)}>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.8 19.6c.5-3.3 3.1-5.2 6.2-5.2s5.7 1.9 6.2 5.2" />
      <path d="M16.4 5.2a3.4 3.4 0 0 1 0 6.6M18 14.9c2.1.6 3.4 2.3 3.7 4.7" opacity=".5" />
    </svg>
  ),
};

/* ------------------------------------------------------------------ atoms */

export function Eyebrow({
  children,
  className,
  dot = true,
}: {
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <div className={cn("eyebrow flex items-center gap-2.5", className)}>
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-mint-400 opacity-70 [animation:pulse-ring_2.2s_ease-out_infinite]" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint-400" />
        </span>
      )}
      {children}
    </div>
  );
}

export function Chip({
  children,
  tone = "mint",
  className,
}: {
  children: ReactNode;
  tone?: "mint" | "gold" | "ice" | "coral" | "neutral";
  className?: string;
}) {
  const tones: Record<string, string> = {
    mint: "text-mint-300 border-mint-600/45 bg-mint-500/10",
    gold: "text-gold-300 border-gold-500/40 bg-gold-500/10",
    ice: "text-ice-300 border-ice-500/40 bg-ice-500/10",
    coral: "text-coral-400 border-coral-500/40 bg-coral-500/10",
    neutral: "text-muted border-line bg-white/[0.03]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] font-mono text-[10.5px] tracking-[0.14em] uppercase",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Btn({
  children,
  variant = "mint",
  className,
  ...rest
}: {
  children: ReactNode;
  variant?: "mint" | "ghost";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-[8px] px-5 py-3 text-[14px] tracking-tight disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:transform-none",
        variant === "mint" ? "btn-mint" : "btn-ghost",
        className
      )}
    >
      {children}
    </button>
  );
}

export function BtnLink({
  href,
  children,
  variant = "mint",
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: "mint" | "ghost";
  className?: string;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[8px] px-5 py-3 text-[14px] tracking-tight",
        variant === "mint" ? "btn-mint" : "btn-ghost",
        className
      )}
    >
      {children}
    </a>
  );
}

export function Link({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a href={href} className={cn("link-underline text-muted hover:text-paper", className)}>
      {children}
    </a>
  );
}

export function SectionHead({
  kicker,
  title,
  lede,
  align = "left",
  className,
}: {
  kicker: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className
      )}
    >
      <Eyebrow>{kicker}</Eyebrow>
      <h2 className="headline max-w-[16ch] text-[clamp(2rem,4.6vw,3.5rem)] text-paper">{title}</h2>
      {lede && <p className="max-w-[58ch] text-[15px] leading-relaxed text-muted">{lede}</p>}
    </div>
  );
}
