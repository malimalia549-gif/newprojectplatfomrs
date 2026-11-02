import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";
import { Icon } from "./primitives";

const STEPS = [
  {
    n: "01",
    icon: Icon.Layers,
    title: "Deploy vault, bukan cuma token",
    body: "Satu klik mendirikan dua kontrak: vault kolateral dan bonding curve eksponensial. Metadata ticker dicatat ke registry HyperCore sejak detik pertama, jadi nama yang kamu pilih langsung ter-reserve secara on-chain dan tidak bisa diserobot orang lain di tengah jalan.",
    spec: [
      ["kontrak", "vault + curve"],
      ["registry", "HyperCore"],
      ["waktu", "±40 detik"],
    ],
  },
  {
    n: "02",
    icon: Icon.Curve,
    title: "Trading dengan pagar pengaman",
    body: "Publik membeli langsung ke kurva. Enam blok pertama dilindungi anti-bundle window supaya sniping bot tidak menyapu suplai, slippage guard menahan pergerakan di atas 1,5%, dan setiap fill disiarkan ke feed on-chain yang bisa kamu pantau di terminal.",
    spec: [
      ["fee kurva", "0.9%"],
      ["anti-bundle", "6 blok"],
      ["slippage", "maks 1.5%"],
    ],
  },
  {
    n: "03",
    icon: Icon.Gauge,
    title: "Graduasi atomik ke Uniswap",
    body: "Begitu market cap menyentuh target, satu transaksi melakukan semuanya: menutup kurva, menukar cadangan ke pasangan pool, menambah likuiditas di range terkonsentrasi, lalu mengunci LP permanen. Kalau satu langkah gagal, seluruhnya batal — tidak ada keadaan setengah jadi.",
    spec: [
      ["target", "$180K MC"],
      ["fee tier", "0.30%"],
      ["LP", "dikunci 100%"],
    ],
  },
  {
    n: "04",
    icon: Icon.Bridge,
    title: "Harga spot berubah jadi oracle",
    body: "Pool Uniswap bukan sekadar tujuan akhir — ia menjadi sumber kebenaran. TWAP 30 menit dari pool dipakai sebagai basis mark price perp, digabung dua feed eksternal supaya tidak bisa dimanipulasi dengan satu transaksi besar di venue spot.",
    spec: [
      ["sumber", "TWAP + 2 feed"],
      ["window", "30 menit"],
      ["deviasi", "guard 3%"],
    ],
  },
  {
    n: "05",
    icon: Icon.Ticket,
    title: "Beli ticker, bukan minta izin",
    body: "Tidak ada formulir listing, tidak ada komite. Kamu menempatkan bid untuk ticker di HyperCore orderbook; siapa pun boleh menawar lebih tinggi selama window lelang terbuka. Bid tertinggi saat finalisasi memegang hak deploy market perp atas nama mereka.",
    spec: [
      ["mekanisme", "lelang terbuka"],
      ["settlement", "HyperCore"],
      ["transfer", "boleh"],
    ],
  },
  {
    n: "06",
    icon: Icon.Perp,
    title: "Perp live, fee mengalir tiap hari",
    body: "Market perpetual kamu berdiri sejajar dengan BTC dan ETH di venue yang sama: leverage sampai 20x, funding per jam, likuidasi oleh risk engine HyperCore. Builder fee share dari setiap taker fill dikirim ke alamatmu setiap hari, tanpa invoice.",
    spec: [
      ["leverage", "sampai 20x"],
      ["funding", "per jam"],
      ["payout", "harian"],
    ],
  },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = refs.current.indexOf(e.target as HTMLDivElement);
            if (i >= 0) setActive(i);
          }
        });
      },
      { rootMargin: "-46% 0px -46% 0px", threshold: 0 }
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const step = STEPS[active];
  const ActiveIcon = step.icon;

  return (
    <section className="relative border-t border-line py-20 sm:py-28">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16">
          {/* sticky rail */}
          <div className="lg:sticky lg:top-28 lg:h-fit">
            <div className="eyebrow flex items-center gap-2.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute h-full w-full rounded-full bg-mint-400 opacity-70 [animation:pulse-ring_2.2s_ease-out_infinite]" />
                <span className="h-1.5 w-1.5 rounded-full bg-mint-400" />
              </span>
              04 · anatomi alur
            </div>
            <h2 className="headline mt-4 text-[clamp(2rem,4.4vw,3.3rem)]">
              Enam tahap,
              <br />
              <span className="text-mint-400">satu ticker.</span>
            </h2>
            <p className="mt-5 max-w-[42ch] text-[14.5px] leading-relaxed text-muted">
              Setiap tahap bisa diaudit sendiri: alamat kontrak, tx hash, dan parameter market
              semuanya terbuka. Gulir untuk mengikuti alurnya.
            </p>

            <div className="mt-8 hidden items-start gap-4 lg:flex">
              <div className="relative flex flex-col gap-1.5 pt-1">
                <span className="absolute top-2 bottom-2 left-[13px] w-px bg-line" />
                <span
                  className="absolute left-[13px] w-px bg-mint-500 transition-all duration-500"
                  style={{ top: 8, height: `${((active + 1) / STEPS.length) * 100 - 4}%` }}
                />
                {STEPS.map((s, i) => (
                  <button
                    key={s.n}
                    onClick={() => refs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" })}
                    className="relative z-10 flex cursor-pointer items-center gap-3 py-1.5 pr-3 text-left"
                  >
                    <span
                      className={cn(
                        "grid h-[27px] w-[27px] place-items-center rounded-full border font-mono text-[10px] transition-all duration-400",
                        i === active
                          ? "scale-110 border-mint-500 bg-mint-500/15 text-mint-300"
                          : i < active
                            ? "border-mint-700/60 bg-ink-900 text-mint-600"
                            : "border-line bg-ink-900 text-faint"
                      )}
                    >
                      {s.n}
                    </span>
                    <span
                      className={cn(
                        "text-[13px] transition-colors",
                        i === active ? "text-paper" : "text-faint hover:text-muted"
                      )}
                    >
                      {s.title.split(" ").slice(0, 3).join(" ")}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 hidden rounded-[11px] border border-line bg-ink-900/70 p-4 lg:block">
              <div className="flex items-center gap-2.5">
                <ActiveIcon className="h-4 w-4 text-mint-400" />
                <span className="font-mono text-[10px] tracking-[0.16em] text-faint uppercase">
                  tahap aktif {step.n}
                </span>
              </div>
              <p className="mt-2 font-display text-[16px] leading-tight font-bold">{step.title}</p>
            </div>
          </div>

          {/* scrolling steps */}
          <div className="flex flex-col gap-4">
            {STEPS.map((s, i) => {
              const Ico = s.icon;
              const on = i === active;
              return (
                <div
                  key={s.n}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  className={cn(
                    "relative overflow-hidden rounded-[13px] border p-6 transition-all duration-500 sm:p-8",
                    on
                      ? "border-mint-600/45 bg-ink-850 shadow-[0_30px_70px_-50px_rgba(63,220,165,0.6)]"
                      : "border-line bg-ink-900/55"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0 left-0 h-full w-[2px] transition-all duration-500",
                      on ? "bg-mint-500" : "bg-transparent"
                    )}
                  />
                  <span
                    className={cn(
                      "pointer-events-none absolute -top-10 -right-6 font-display text-[110px] leading-none font-extrabold transition-all duration-600 select-none",
                      on ? "text-mint-500/[0.09]" : "text-white/[0.025]"
                    )}
                  >
                    {s.n}
                  </span>

                  <div className="relative flex items-center gap-3">
                    <span
                      className={cn(
                        "grid h-9 w-9 place-items-center rounded-[9px] border transition-colors duration-500",
                        on ? "border-mint-500/60 bg-mint-500/12 text-mint-300" : "border-line text-faint"
                      )}
                    >
                      <Ico className="h-4 w-4" />
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.2em] text-faint uppercase">
                      tahap {s.n}
                    </span>
                  </div>

                  <h3
                    className={cn(
                      "relative mt-4 max-w-[26ch] font-display text-[clamp(1.35rem,2.6vw,1.85rem)] leading-[1.08] font-bold tracking-[-0.03em] transition-colors duration-500",
                      on ? "text-paper" : "text-muted"
                    )}
                  >
                    {s.title}
                  </h3>
                  <p
                    className={cn(
                      "relative mt-3 max-w-[62ch] text-[14px] leading-[1.75] transition-colors duration-500",
                      on ? "text-muted" : "text-faint"
                    )}
                  >
                    {s.body}
                  </p>

                  <div className="relative mt-5 flex flex-wrap gap-2">
                    {s.spec.map(([k, v]) => (
                      <span
                        key={k}
                        className={cn(
                          "rounded-[7px] border px-2.5 py-1.5 font-mono text-[10.5px] transition-colors duration-500",
                          on ? "border-mint-700/50 bg-mint-500/[0.07] text-mint-300" : "border-line text-faint"
                        )}
                      >
                        {k}: <span className="text-paper">{v}</span>
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
