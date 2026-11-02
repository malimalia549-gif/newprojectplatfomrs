import { useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";
import { mulberry } from "@/lib/sim";
import { Chip, Icon, Reveal, SectionHead, useInView } from "./primitives";

function Card({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className={cn("h-full", className)}>
      <div className="card-hover group relative flex h-full flex-col overflow-hidden rounded-[13px] border border-line bg-ink-900/70 p-5 sm:p-6">
        <span className="pointer-events-none absolute inset-x-0 top-0 h-px w-full scale-x-0 bg-gradient-to-r from-transparent via-mint-500 to-transparent transition-transform duration-600 group-hover:scale-x-100" />
        {children}
      </div>
    </Reveal>
  );
}

function CardHead({
  icon: Ico,
  kicker,
  title,
  tone = "mint",
}: {
  icon: (p: { className?: string }) => React.ReactElement;
  kicker: string;
  title: string;
  tone?: "mint" | "gold" | "ice";
}) {
  const c =
    tone === "gold"
      ? "border-gold-500/45 bg-gold-500/10 text-gold-300"
      : tone === "ice"
        ? "border-ice-500/45 bg-ice-500/10 text-ice-300"
        : "border-mint-600/45 bg-mint-500/10 text-mint-300";
  return (
    <>
      <div className="flex items-center gap-3">
        <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border", c)}>
          <Ico className="h-4 w-4" />
        </span>
        <span className="font-mono text-[10px] tracking-[0.18em] text-faint uppercase">{kicker}</span>
      </div>
      <h3 className="mt-4 font-display text-[19px] leading-tight font-bold tracking-[-0.025em] text-paper sm:text-[21px]">
        {title}
      </h3>
    </>
  );
}

/* ------------------------------------------------------- dual venue visual */

function DualVenue() {
  const [pulse, setPulse] = useState<"spot" | "perp" | null>(null);
  return (
    <div className="relative mt-6 flex-1">
      <svg viewBox="0 0 520 190" className="w-full">
        <defs>
          <linearGradient id="lnk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4d9fe8" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#3fdca5" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#e6a52c" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        <rect x="6" y="52" width="150" height="86" rx="10" fill="#0a1114" stroke={pulse === "spot" ? "#4d9fe8" : "#1c2b2f"} strokeWidth="1.2" />
        <text x="81" y="80" textAnchor="middle" className="font-mono" fontSize="10" letterSpacing="1.6" fill="#5f7674">
          SPOT VENUE
        </text>
        <text x="81" y="103" textAnchor="middle" fontSize="15" fontWeight="700" fill="#b9dcff" fontFamily="Bricolage Grotesque, sans-serif">
          Uniswap v3
        </text>
        <text x="81" y="124" textAnchor="middle" className="font-mono" fontSize="10.5" fill="#90a7a4">
          TVL $2.41M
        </text>

        <rect x="364" y="52" width="150" height="86" rx="10" fill="#0a1114" stroke={pulse === "perp" ? "#e6a52c" : "#1c2b2f"} strokeWidth="1.2" />
        <text x="439" y="80" textAnchor="middle" className="font-mono" fontSize="10" letterSpacing="1.6" fill="#5f7674">
          PERP VENUE
        </text>
        <text x="439" y="103" textAnchor="middle" fontSize="15" fontWeight="700" fill="#ffdc9a" fontFamily="Bricolage Grotesque, sans-serif">
          HyperCore
        </text>
        <text x="439" y="124" textAnchor="middle" className="font-mono" fontSize="10.5" fill="#90a7a4">
          OI $8.62M
        </text>

        <path
          d="M156 82H364"
          stroke="url(#lnk)"
          strokeWidth="1.6"
          strokeDasharray="5 6"
          className="[animation:dash-flow_1.1s_linear_infinite]"
        />
        <path
          d="M364 108H156"
          stroke="url(#lnk)"
          strokeWidth="1.6"
          strokeDasharray="5 6"
          opacity="0.55"
          className="[animation:dash-flow_1.6s_linear_infinite_reverse]"
        />

        <circle cx="260" cy="95" r="34" fill="#07110e" stroke="#3fdca5" strokeWidth="1.4" />
        <text x="260" y="92" textAnchor="middle" fontSize="14" fontWeight="800" fill="#6fecc0" fontFamily="Bricolage Grotesque, sans-serif">
          $KMOD
        </text>
        <text x="260" y="108" textAnchor="middle" className="font-mono" fontSize="8.5" letterSpacing="1.2" fill="#5f7674">
          TICKER
        </text>
        <circle cx="260" cy="95" r="34" fill="none" stroke="#3fdca5" strokeWidth="1" opacity="0.5" className="[animation:pulse-ring_3s_ease-out_infinite]" />

        <text x="200" y="72" textAnchor="middle" className="font-mono" fontSize="9" fill="#5f7674">
          arbitrase →
        </text>
        <text x="320" y="128" textAnchor="middle" className="font-mono" fontSize="9" fill="#5f7674">
          ← TWAP oracle
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onMouseEnter={() => setPulse("spot")}
          onMouseLeave={() => setPulse(null)}
          className="cursor-pointer rounded-[7px] border border-ice-500/35 bg-ice-500/[0.07] px-3 py-1.5 font-mono text-[10.5px] text-ice-300 transition-colors hover:bg-ice-500/15"
        >
          spot: beli/jual 24/7
        </button>
        <button
          onMouseEnter={() => setPulse("perp")}
          onMouseLeave={() => setPulse(null)}
          className="cursor-pointer rounded-[7px] border border-gold-500/35 bg-gold-500/[0.07] px-3 py-1.5 font-mono text-[10.5px] text-gold-300 transition-colors hover:bg-gold-500/15"
        >
          perp: long/short 20x
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------- fee bar visual */

function FeeBars() {
  const { ref, seen } = useInView<HTMLDivElement>(0.4);
  const days = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const r = mulberry(4242);
  const vals = days.map(() => 34 + r() * 66);
  const max = Math.max(...vals);
  return (
    <div ref={ref} className="mt-6 flex h-[122px] flex-1 items-end gap-1.5">
      {vals.map((v, i) => (
        <div key={days[i]} className="group/bar flex flex-1 flex-col items-center gap-2">
          <div className="relative flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-[3px] bg-gradient-to-t from-mint-700 to-mint-400 transition-all duration-700 group-hover/bar:from-gold-500 group-hover/bar:to-gold-300"
              style={{
                height: seen ? `${(v / max) * 100}%` : "4%",
                transitionDelay: `${i * 70}ms`,
              }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 rounded-[5px] border border-line bg-ink-950 px-1.5 py-0.5 font-mono text-[9.5px] text-mint-300 opacity-0 transition-opacity group-hover/bar:opacity-100">
              ${(v * 41).toFixed(0)}
            </span>
          </div>
          <span className="font-mono text-[9px] text-faint">{days[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------- code block */

const CODE: { t: string; c: string }[] = [
  { t: "import", c: "text-gold-300" },
  { t: " { forge } ", c: "text-paper" },
  { t: "from", c: "text-gold-300" },
  { t: " '@tickerforge/sdk'", c: "text-mint-300" },
  { t: "\n\n", c: "" },
  { t: "const", c: "text-gold-300" },
  { t: " market = ", c: "text-paper" },
  { t: "await", c: "text-gold-300" },
  { t: " forge.", c: "text-paper" },
  { t: "deploy", c: "text-ice-300" },
  { t: "({\n", c: "text-paper" },
  { t: "  ticker", c: "text-paper" },
  { t: ": ", c: "text-faint" },
  { t: "'KMOD'", c: "text-mint-300" },
  { t: ",\n  collateral", c: "text-paper" },
  { t: ": ", c: "text-faint" },
  { t: "'USDC'", c: "text-mint-300" },
  { t: ",\n  curve", c: "text-paper" },
  { t: ": { type: ", c: "text-faint" },
  { t: "'exponential'", c: "text-mint-300" },
  { t: ", target: ", c: "text-faint" },
  { t: "180_000", c: "text-ice-300" },
  { t: " },\n  graduate", c: "text-paper" },
  { t: ": { dex: ", c: "text-faint" },
  { t: "'uniswap-v3'", c: "text-mint-300" },
  { t: ", lockLP: ", c: "text-faint" },
  { t: "true", c: "text-gold-300" },
  { t: " },\n  perp", c: "text-paper" },
  { t: ": { hip3: ", c: "text-faint" },
  { t: "true", c: "text-gold-300" },
  { t: ", leverage: ", c: "text-faint" },
  { t: "20", c: "text-ice-300" },
  { t: ", feeBps: ", c: "text-faint" },
  { t: "35", c: "text-ice-300" },
  { t: " },\n});", c: "text-paper" },
];

/* ---------------------------------------------------------------- section */

export function Features() {
  return (
    <section className="relative border-t border-line py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-[0.35]" />
      <div className="relative mx-auto max-w-[1280px] px-5 sm:px-8">
        <SectionHead
          kicker="05 · kenapa alur ini berbeda"
          title={
            <>
              Launchpad memberi kamu holder.
              <br />
              <span className="text-gold-300">Ini memberi kamu venue.</span>
            </>
          }
          lede="Semua yang membuat market perp serius — matching engine, risk engine, oracle, dan fee share — sudah ada di HyperCore. Tickerforge tinggal menyambungkan jalur dari launchpad ke sana."
        />

        <div className="mt-10 grid auto-rows-min grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Card className="lg:col-span-4 lg:row-span-2">
            <CardHead icon={Icon.Bridge} kicker="inti produk" title="Dua venue hidup dari satu ticker" />
            <p className="mt-3 max-w-[62ch] text-[13.5px] leading-relaxed text-muted">
              Lulusan launchpad biasanya kehilangan momentum begitu LP dikunci. Di sini justru
              sebaliknya: pool Uniswap menjadi sumber harga, dan HyperCore menjadi tempat leverage.
              Selisih di antara keduanya ditutup arbiter — kamu dapat volume di dua sisi.
            </p>
            <DualVenue />
          </Card>

          <Card delay={60} className="lg:col-span-2">
            <CardHead icon={Icon.Coins} kicker="pendapatan" title="Builder fee, dibayar harian" tone="gold" />
            <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
              Setiap taker fill di market kamu menyumbang 0,10–1,50% ke alamat deployer.
            </p>
            <FeeBars />
          </Card>

          <Card delay={110} className="lg:col-span-2">
            <CardHead icon={Icon.Shield} kicker="keamanan" title="Non-custodial, LP dikunci" />
            <ul className="mt-4 space-y-2.5">
              {[
                "Kunci privat tidak pernah menyentuh server kami",
                "LP token dikunci permanen di kontrak graduasi",
                "2 audit publik + program bug bounty $250K",
                "Risk engine & likuidasi ditangani HyperCore",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-muted">
                  <Icon.Check className="mt-[3px] h-3.5 w-3.5 shrink-0 text-mint-500" />
                  {t}
                </li>
              ))}
            </ul>
          </Card>

          <Card delay={60} className="lg:col-span-3">
            <CardHead icon={Icon.Terminal} kicker="developer" title="Deployer SDK dalam 11 baris" tone="ice" />
            <div className="mt-4 overflow-hidden rounded-[10px] border border-line bg-ink-950">
              <div className="flex items-center gap-2 border-b border-line px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-coral-500/70" />
                <span className="h-2 w-2 rounded-full bg-gold-500/70" />
                <span className="h-2 w-2 rounded-full bg-mint-500/70" />
                <span className="ml-2 font-mono text-[10px] text-faint">forge.ts</span>
              </div>
              <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[11.5px] leading-[1.75]">
                <code>
                  {CODE.map((c, i) => (
                    <span key={i} className={c.c}>
                      {c.t}
                    </span>
                  ))}
                  <span className="blink text-mint-400">▌</span>
                </code>
              </pre>
            </div>
          </Card>

          <Card delay={110} className="lg:col-span-3">
            <CardHead icon={Icon.Gauge} kicker="risk" title="Oracle TWAP, bukan harga terakhir" tone="gold" />
            <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
              Mark price perp ditarik dari TWAP 30 menit pool Uniswap plus dua feed eksternal.
              Deviasi di atas 3% membekukan kenaikan leverage otomatis sampai harga konvergen.
            </p>
            <svg viewBox="0 0 320 92" className="mt-4 w-full">
              <path
                d="M2 62C32 58 52 40 84 44s40 26 70 20 46-34 78-30 44 20 84 12"
                fill="none"
                stroke="#e6a52c"
                strokeWidth="1.8"
              />
              <path
                d="M2 66C34 64 56 52 88 54s44 14 74 10 44-18 74-16 42 10 82 6"
                fill="none"
                stroke="#3fdca5"
                strokeWidth="1.6"
                strokeDasharray="4 4"
              />
              <text x="4" y="16" className="font-mono" fontSize="9" fill="#e6a52c">
                spot price
              </text>
              <text x="4" y="30" className="font-mono" fontSize="9" fill="#3fdca5">
                TWAP oracle
              </text>
            </svg>
          </Card>

          <Card delay={40} className="lg:col-span-2">
            <CardHead icon={Icon.Bolt} kicker="fair launch" title="Anti-snipe window" />
            <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
              Enam blok pertama membatasi satu alamat satu posisi, plus cooldown 90 detik antar-buy.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <Chip tone="coral">bundle ditolak</Chip>
              <Chip tone="neutral">cooldown 90s</Chip>
            </div>
          </Card>

          <Card delay={90} className="lg:col-span-2">
            <CardHead icon={Icon.Pool} kicker="graduasi" title="Gas ditanggung vault" tone="ice" />
            <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
              Deployer tidak membayar gas graduasi. Biaya swap dan add-liquidity diambil dari fee
              kurva yang sudah terkumpul.
            </p>
            <div className="mt-4 font-display text-[26px] leading-none font-extrabold text-ice-300">
              $0<span className="ml-1.5 font-mono text-[11px] text-faint">biaya deployer</span>
            </div>
          </Card>

          <Card delay={140} className="lg:col-span-2">
            <CardHead icon={Icon.Layers} kicker="fleksibel" title="Bukan cuma memecoin" tone="gold" />
            <p className="mt-2.5 text-[13px] leading-relaxed text-muted">
              HIP-3 menerima aset apa pun dengan oracle yang bisa dipercaya: saham tunggal,
              komoditas, indeks, sampai market prediksi event.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {["equity", "commodity", "index", "event"].map((t) => (
                <Chip key={t} tone="neutral">
                  {t}
                </Chip>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default Features;
