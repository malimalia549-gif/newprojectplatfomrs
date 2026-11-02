import { useEffect, useState } from "react";
import { cn } from "@/utils/cn";
import { Icon } from "./primitives";

type Node = {
  id: string;
  label: string;
  kicker: string;
  icon: (p: { className?: string }) => React.ReactElement;
  tone: "mint" | "gold" | "ice";
  title: string;
  body: string;
  metrics: { k: string; v: string }[];
  tag: string;
};

const NODES: Node[] = [
  {
    id: "create",
    label: "Create",
    kicker: "Step 01",
    icon: Icon.Layers,
    tone: "mint",
    tag: "onchain",
    title: "Create — deploy market spot dalam ±40 detik",
    body: "Pilih ticker, unggah metadata, tentukan kurva ikatan dan target graduasi. Kontrak vault + bonding curve di-deploy otomatis, liquidity awal di-seed dari deposit pertama. Tidak ada izin, tidak ada listing fee di muka.",
    metrics: [
      { k: "Deploy time", v: "~40s" },
      { k: "Biaya awal", v: "$0" },
      { k: "Kurva", v: "Exponential" },
    ],
  },
  {
    id: "trading",
    label: "Trading",
    kicker: "Step 02",
    icon: Icon.Curve,
    tone: "mint",
    tag: "live",
    title: "Trading — bonding curve sampai target tercapai",
    body: "Publik beli/jual langsung ke kurva. Harga naik mengikuti suplai, progress graduasi terisi real-time, dan setiap fill tercatat di feed on-chain. Bot sniping dibatasi oleh anti-bundle window di 6 blok pertama.",
    metrics: [
      { k: "Slippage guard", v: "1.5%" },
      { k: "Anti-bundle", v: "6 blok" },
      { k: "Fee kurva", v: "0.9%" },
    ],
  },
  {
    id: "graduate",
    label: "Graduate",
    kicker: "Step 03",
    icon: Icon.Gauge,
    tone: "gold",
    tag: "trigger",
    title: "Graduate — likuiditas diangkat ke DEX",
    body: "Begitu progress menyentuh 100%, vault menutup kurva, menukar cadangan ke pasangan pool, dan menambahkan LP. Token LP dikunci permanen di kontrak graduasi — tidak bisa di-rug oleh deployer.",
    metrics: [
      { k: "Target", v: "$180K MC" },
      { k: "LP lock", v: "Permanen" },
      { k: "Gas", v: "Ditanggung vault" },
    ],
  },
  {
    id: "uniswap",
    label: "Uniswap Pool",
    kicker: "Step 04",
    icon: Icon.Pool,
    tone: "ice",
    tag: "amm",
    title: "Uniswap Pool — spot market yang sesungguhnya",
    body: "Pool v3 dengan range terkonsentrasi di sekitar harga graduasi. Trader ritel masuk dari agregator mana pun, TVL terlihat publik, dan volume spot mulai terbentuk sebagai dasar harga untuk market perp.",
    metrics: [
      { k: "Fee tier", v: "0.30%" },
      { k: "Range", v: "±45%" },
      { k: "Agregator", v: "Auto-list" },
    ],
  },
  {
    id: "selesai",
    label: "Selesai",
    kicker: "Step 05",
    icon: Icon.Check,
    tone: "mint",
    tag: "done",
    title: "Selesai — jalur spot tuntas",
    body: "Launchpad konvensional berhenti di sini: token live, pool jalan, selesai. Tickerforge tidak. Dari titik ini cabang kedua terbuka — mengubah ticker spot yang sama menjadi market perpetual yang bisa di-long dan di-short.",
    metrics: [
      { k: "Status", v: "Terverifikasi" },
      { k: "Holders", v: "Publik" },
      { k: "Cabang", v: "Terbuka ↓" },
    ],
  },
  {
    id: "ticker",
    label: "Beli Ticker",
    kicker: "Cabang A",
    icon: Icon.Ticket,
    tone: "gold",
    tag: "reserve",
    title: "Beli Ticker — reservasi nama di HyperCore",
    body: "Ticker dibeli lewat order di HyperCore sehingga nama market terkunci atas nama builder. Siapa pun yang menawar lebih tinggi sebelum finalisasi bisa mengambil alih — mekanisme pasar terbuka, bukan antrean izin.",
    metrics: [
      { k: "Reservasi", v: "On-chain" },
      { k: "Settlement", v: "HyperCore" },
      { k: "Transferable", v: "Ya" },
    ],
  },
  {
    id: "orderbook",
    label: "HyperCore Orderbook",
    kicker: "Cabang B",
    icon: Icon.Book,
    tone: "ice",
    tag: "matching",
    title: "HyperCore Orderbook — kedalaman dari hari pertama",
    body: "Market builder dicocokkan oleh engine yang sama dengan market inti: CLOB on-chain, finalitas sub-detik, dan oracle harga ditarik dari pool Uniswap + aggregator sebagai basis mark price.",
    metrics: [
      { k: "Latency", v: "<0.4s" },
      { k: "Oracle", v: "TWAP Pool" },
      { k: "Margin", v: "Cross USDC" },
    ],
  },
  {
    id: "perp",
    label: "HIP-3 Perp",
    kicker: "Cabang C",
    icon: Icon.Perp,
    tone: "mint",
    tag: "live",
    title: "HIP-3 Perp — market live, builder dapat fee",
    body: "Perpetual dengan leverage sampai 20x, funding tiap jam, dan builder fee share yang mengalir ke alamat deployer setiap hari. Satu ticker, dua market: spot di Uniswap dan perp di HyperCore.",
    metrics: [
      { k: "Leverage", v: "sampai 20x" },
      { k: "Funding", v: "Per jam" },
      { k: "Builder fee", v: "0.10 – 1.50%" },
    ],
  },
];

const toneMap = {
  mint: { text: "text-mint-300", border: "border-mint-500/60", glow: "shadow-[0_0_36px_-8px_rgba(63,220,165,0.55)]", bg: "bg-mint-500/10" },
  gold: { text: "text-gold-300", border: "border-gold-500/55", glow: "shadow-[0_0_36px_-8px_rgba(230,165,44,0.5)]", bg: "bg-gold-500/10" },
  ice: { text: "text-ice-300", border: "border-ice-500/55", glow: "shadow-[0_0_36px_-8px_rgba(77,159,232,0.5)]", bg: "bg-ice-500/10" },
};

function Connector({ active, reverse, vertical }: { active: boolean; reverse?: boolean; vertical?: boolean }) {
  return vertical ? (
    <div className="relative mx-auto h-9 w-px shrink-0 bg-line lg:hidden">
      {active && (
        <i
          className="absolute inset-0 block h-1/2 w-px bg-gradient-to-b from-transparent via-mint-400 to-transparent [animation:slide-y_1.8s_linear_infinite]"
          style={{ animationDirection: reverse ? "reverse" : "normal" }}
        />
      )}
      <span
        className={cn(
          "absolute -bottom-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border-r border-b transition-colors duration-500",
          active ? "border-mint-400" : "border-line"
        )}
      />
    </div>
  ) : (
    <div className="relative hidden h-px w-6 shrink-0 bg-line lg:block">
      {active && (
        <i
          className="absolute inset-0 block w-1/3 bg-gradient-to-r from-transparent via-mint-400 to-transparent [animation:slide-x_1.9s_linear_infinite]"
          style={{ animationDirection: reverse ? "reverse" : "normal" }}
        />
      )}
      <span
        className={cn(
          "absolute top-1/2 h-1.5 w-1.5 -translate-y-1/2 rotate-45 transition-all duration-500",
          reverse ? "left-[-3px] border-l border-b" : "right-[-3px] border-r border-t",
          active ? "border-mint-400" : "border-line"
        )}
      />
    </div>
  );
}

export function FlowDiagram() {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [prog, setProg] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const STEP = 3000;
    let raf = 0;
    let t0 = performance.now();
    const tick = (t: number) => {
      const p = (t - t0) / STEP;
      if (p >= 1) {
        setActive((a) => (a + 1) % NODES.length);
        t0 = t;
        setProg(0);
      } else setProg(p);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const pick = (i: number) => {
    setActive(i);
    setProg(0);
    setPlaying(false);
  };

  const node = NODES[active];
  const tone = toneMap[node.tone];

  const renderNode = (i: number) => {
    const n = NODES[i];
    const isActive = i === active;
    const isDone = i < active;
    const t = toneMap[n.tone];
    const Ico = n.icon;
    return (
      <button
        key={n.id}
        onClick={() => pick(i)}
        className={cn(
          "group relative w-full shrink-0 cursor-pointer overflow-hidden rounded-[9px] border px-2.5 py-2.5 text-left transition-all duration-400 lg:w-[calc((100%_-_96px)/5)]",
          isActive
            ? cn(t.border, t.bg, t.glow, "-translate-y-[3px]")
            : isDone
              ? "border-mint-700/40 bg-mint-500/[0.04] hover:border-mint-600/60"
              : "border-line bg-ink-900/60 hover:border-ink-500 hover:bg-ink-850"
        )}
      >
        <span className="flex items-center gap-2">
          <Ico
            className={cn(
              "h-[15px] w-[15px] transition-colors",
              isActive ? t.text : isDone ? "text-mint-600" : "text-faint group-hover:text-muted"
            )}
          />
          <span className="font-mono text-[9px] tracking-[0.18em] text-faint uppercase">
            {n.kicker}
          </span>
          {isDone && <Icon.Check className="ml-auto h-3 w-3 text-mint-600" />}
          {isActive && (
            <span className={cn("ml-auto h-1.5 w-1.5 rounded-full blink", n.tone === "gold" ? "bg-gold-400" : n.tone === "ice" ? "bg-ice-400" : "bg-mint-400")} />
          )}
        </span>
        <span
          className={cn(
            "mt-1.5 block font-display text-[13px] leading-[1.08] font-bold tracking-[-0.02em] break-words transition-colors lg:text-[12.5px]",
            isActive ? "text-paper" : isDone ? "text-muted" : "text-muted group-hover:text-paper"
          )}
        >
          {n.label}
        </span>
        {isActive && (
          <span className="absolute bottom-0 left-0 h-[2px] bg-current" style={{ width: `${prog * 100}%`, color: n.tone === "gold" ? "#e6a52c" : n.tone === "ice" ? "#4d9fe8" : "#3fdca5" }} />
        )}
      </button>
    );
  };

  return (
    <div className="panel relative overflow-hidden rounded-[14px] p-4 sm:p-5">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-50" />
      <div className="relative flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-[10px] tracking-[0.2em] text-faint uppercase">
            pipeline · v3.1
          </span>
          <span className="h-3 w-px bg-line" />
          <span className="font-mono text-[10px] tracking-[0.16em] text-mint-400 uppercase">
            {String(active + 1).padStart(2, "0")}/{String(NODES.length).padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="btn-ghost flex cursor-pointer items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase"
          >
            {playing ? <Icon.Pause className="h-2.5 w-2.5" /> : <Icon.Play className="h-2.5 w-2.5" />}
            {playing ? "Jeda" : "Putar"}
          </button>
          <span className="hidden font-mono text-[10px] tracking-[0.14em] text-faint uppercase sm:block">
            klik node
          </span>
        </div>
      </div>

      {/* pipeline */}
      <div className="relative pt-5">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:gap-0">
          {NODES.slice(0, 5).map((_, i) => (
            <div key={NODES[i].id} className="contents">
              {renderNode(i)}
              {i < 4 && <Connector active={i < active} />}
              {i < 4 && <Connector active={i < active} vertical />}
            </div>
          ))}
        </div>

        {/* vertical drop desktop */}
        <div className="mt-1 hidden justify-end lg:flex">
          <div className="flex flex-col items-center" style={{ marginRight: "calc((100% - 96px) / 10)" }}>
            <span className="font-mono text-[9px] tracking-[0.2em] text-faint uppercase">cabang</span>
            <div className="relative h-9 w-px bg-line">
              <i className="absolute inset-0 block h-1/2 bg-gradient-to-b from-transparent via-gold-400 to-transparent [animation:slide-y_1.8s_linear_infinite]" />
              <span className="absolute -bottom-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border-r border-b border-gold-400" />
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex flex-col gap-2.5 lg:mt-1 lg:flex-row-reverse lg:items-center lg:gap-0">
          {NODES.slice(5).map((_, k) => {
            const i = k + 5;
            return (
              <div key={NODES[i].id} className="contents">
                {renderNode(i)}
                {k < 2 && <Connector active={i < active} reverse />}
                {k < 2 && <Connector active={i < active} vertical reverse />}
              </div>
            );
          })}
        </div>
      </div>

      {/* detail */}
      <div key={node.id} className="pop relative mt-5 rounded-[11px] border border-line bg-ink-950/70 p-4 sm:p-5">
        <div
          className={cn("pointer-events-none absolute inset-x-0 top-0 h-px", node.tone === "gold" ? "bg-gold-500/60" : node.tone === "ice" ? "bg-ice-500/60" : "bg-mint-500/60")}
        />
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={cn("grid h-7 w-7 place-items-center rounded-[7px] border", tone.border, tone.bg)}>
            <node.icon className={cn("h-3.5 w-3.5", tone.text)} />
          </span>
          <span className="font-mono text-[10px] tracking-[0.2em] text-faint uppercase">{node.tag}</span>
        </div>
        <h3 className="mt-3 font-display text-[19px] leading-tight font-bold tracking-[-0.02em] text-paper sm:text-[22px]">
          {node.title}
        </h3>
        <p className="mt-2 max-w-[68ch] text-[13.5px] leading-relaxed text-muted">{node.body}</p>
        <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[9px] border border-line bg-line">
          {node.metrics.map((m) => (
            <div key={m.k} className="bg-ink-900 px-3 py-2.5">
              <div className="font-mono text-[9.5px] tracking-[0.16em] text-faint uppercase">{m.k}</div>
              <div className={cn("mt-1 font-display text-[15px] font-bold", tone.text)}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default FlowDiagram;
