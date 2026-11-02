import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, ChevronLeft, Info, RotateCcw } from "lucide-react";
import { useDemo, type CreateAssetInput } from "@/context/DemoContext";
import { BASE_PERPS, compact, priceFormat } from "@/lib/market";
import { AssetMark, DemoLabel, InlineNotice, PageHeading } from "@/components/UI";
import { cn } from "@/utils/cn";

type Draft = CreateAssetInput;
const blank: Draft = { name: "", symbol: "", description: "", category: "Infrastructure", color: "#b7dcb3", price: 0.02, graduationTarget: 100000 };
const colors = ["#b7dcb3", "#ddc2a9", "#b6c9e3", "#d7d1a5", "#c0bddf", "#e4b6a8"];
const categories = ["Infrastructure", "DeFi", "Community", "Social", "RWA", "Culture", "Other"];

function getDraft(): Draft {
  try {
    const saved = window.localStorage.getItem("tickerforge:v2:studioDraft");
    return saved ? { ...blank, ...(JSON.parse(saved) as Partial<Draft>) } : blank;
  } catch { return blank; }
}

export default function Studio() {
  const navigate = useNavigate();
  const { assets, createAsset } = useDemo();
  const [draft, setDraft] = useState<Draft>(getDraft);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  useEffect(() => {
    try { window.localStorage.setItem("tickerforge:v2:studioDraft", JSON.stringify(draft)); } catch { /* Draft persistence is best effort. */ }
  }, [draft]);

  const update = <K extends keyof Draft>(field: K, value: Draft[K]) => { setDraft((current) => ({ ...current, [field]: value })); setError(""); };

  const validate = (currentStep: number) => {
    if (currentStep === 1) {
      if (draft.name.trim().length < 3) return "Nama aset minimal 3 karakter.";
      if (!/^[A-Z0-9]{2,8}$/.test(draft.symbol)) return "Ticker harus 2-8 huruf kapital atau angka.";
      if (assets.some((item) => item.symbol === draft.symbol) || BASE_PERPS.some((item) => item.symbol === draft.symbol)) return "Ticker sudah digunakan. Coba ticker lain.";
      if (draft.description.trim().length < 20) return "Deskripsi minimal 20 karakter supaya tujuan aset jelas.";
    }
    if (currentStep === 2 && (!Number.isFinite(draft.price) || draft.price <= 0 || draft.price > 10)) return "Harga awal harus lebih besar dari 0 dan paling tinggi $10.";
    return "";
  };

  const next = () => {
    const problem = validate(step);
    if (problem) { setError(problem); return; }
    setStep((current) => Math.min(3, current + 1));
  };

  const submit = () => {
    const problem = validate(1) || validate(2);
    if (problem) { setError(problem); return; }
    const result = createAsset(draft);
    if (!result.ok) { setError(result.message); return; }
    try { window.localStorage.removeItem("tickerforge:v2:studioDraft"); } catch { /* Ignore storage errors. */ }
    navigate(`/launchpad/${draft.symbol}`);
  };

  const reset = () => { setDraft(blank); setStep(1); setError(""); };

  return (
    <div className="mx-auto max-w-[1440px] px-5 pt-16 pb-24 sm:px-8 lg:px-10 lg:pt-20">
      <PageHeading
        eyebrow="Launch studio / Buat market"
        title={<>Setiap market dimulai<br /><span className="text-accent">dari sebuah ide.</span></>}
        description="Rancang identitas dan parameter awal asetmu. Studio ini adalah preview produk: market yang dibuat hanya tersimpan di browser dan tidak dikirim ke blockchain."
        action={<DemoLabel />}
      />

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_370px] lg:gap-14">
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-2 border-b border-line-soft pb-6 sm:justify-start">
            {[{ n: 1, title: "Identitas" }, { n: 2, title: "Parameter" }, { n: 3, title: "Tinjau" }].map((item, index) => (
              <div key={item.n} className="flex items-center sm:flex-1">
                <button onClick={() => { if (item.n < step) { setStep(item.n); setError(""); } }} disabled={item.n > step} className={cn("flex items-center gap-1.5 text-left text-[10px] font-bold transition-colors sm:gap-2.5 sm:text-[12px]", item.n === step ? "text-text" : item.n < step ? "text-accent" : "text-faint", item.n < step && "hover:text-text")}>
                  <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full border font-mono text-[11px]", item.n === step ? "border-accent bg-accent text-base" : item.n < step ? "border-accent/50 text-accent" : "border-line text-faint")}>{item.n < step ? <Check size={13} /> : item.n}</span>{item.title}
                </button>
                {index < 2 && <div className="mx-5 hidden h-px flex-1 bg-line sm:block" />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="pt-8">
              <div className="micro text-accent">01 / Identitas aset</div>
              <h2 className="display mt-3 text-[27px] font-semibold">Beri market ini sebuah nama.</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">Identitas yang jelas membantu orang memahami apa yang mereka perdagangkan.</p>
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <label className="block"><span className="mb-2 block text-[12px] font-bold text-muted">Nama aset <span className="text-accent">*</span></span><input className="field" value={draft.name} onChange={(event) => update("name", event.target.value)} maxLength={32} placeholder="Contoh: Atlas Network" /></label>
                <label className="block"><span className="mb-2 block text-[12px] font-bold text-muted">Ticker <span className="text-accent">*</span></span><div className="relative"><input className="field pr-28 font-mono uppercase" value={draft.symbol} onChange={(event) => update("symbol", event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} maxLength={8} placeholder="ATLS" /><span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[10px] text-faint">2-8 karakter</span></div></label>
                <label className="block sm:col-span-2"><span className="mb-2 block text-[12px] font-bold text-muted">Deskripsi <span className="text-accent">*</span></span><textarea className="field min-h-[115px]" value={draft.description} onChange={(event) => update("description", event.target.value)} maxLength={280} placeholder="Jelaskan tujuan market dan apa yang membuat aset ini berbeda..." /><span className="mt-1.5 block text-right font-mono text-[10px] text-faint">{draft.description.length} / 280</span></label>
                <label className="block"><span className="mb-2 block text-[12px] font-bold text-muted">Kategori</span><select value={draft.category} onChange={(event) => update("category", event.target.value)} className="field appearance-none">{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
                <div><span className="mb-2 block text-[12px] font-bold text-muted">Warna identitas</span><div className="flex h-[44px] items-center gap-2">{colors.map((color) => <button key={color} onClick={() => update("color", color)} aria-label={`Pilih warna ${color}`} aria-pressed={draft.color === color} className={cn("grid h-7 w-7 place-items-center rounded-full border transition-transform hover:scale-110", draft.color === color ? "scale-110 border-text" : "border-transparent")}><span className="h-5 w-5 rounded-full" style={{ background: color }} /></button>)}</div></div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="pt-8">
              <div className="micro text-accent">02 / Parameter market</div>
              <h2 className="display mt-3 text-[27px] font-semibold">Atur awal perdagangannya.</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">Parameter demo ini menentukan harga awal dan target progress pada bonding curve lokal.</p>
              <div className="mt-8 space-y-8">
                <div><label htmlFor="start-price" className="mb-2 block text-[12px] font-bold text-muted">Harga awal per token (USDC)</label><div className="relative max-w-[360px]"><input id="start-price" type="number" min="0.0001" max="10" step="0.0001" className="field pr-20 font-mono" value={draft.price} onChange={(event) => update("price", Number(event.target.value))} /><span className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-[11px] text-faint">USDC</span></div><p className="mt-2 font-mono text-[10px] text-faint">Suplai ilustratif: 10.000.000 token. Market cap awal: {compact(draft.price * 10_000_000)}.</p></div>
                <div><div className="mb-3 text-[12px] font-bold text-muted">Target graduasi (volume beli demo)</div><div className="grid grid-cols-3 gap-2.5">{[50000, 100000, 200000].map((target) => <button key={target} onClick={() => update("graduationTarget", target)} className={cn("border px-3 py-3.5 text-left transition-colors", draft.graduationTarget === target ? "border-accent bg-accent/8" : "border-line hover:border-muted")}><span className={cn("block font-mono text-[15px] font-semibold", draft.graduationTarget === target ? "text-accent" : "text-text")}>{compact(target)}</span><span className="mt-1 block text-[10px] text-faint">Total pembelian</span></button>)}</div><p className="mt-3 text-[11px] leading-[1.7] text-faint">Untuk demo, progress bertambah saat user melakukan pembelian; nilai target ini digunakan dalam perhitungannya.</p></div>
                <InlineNotice>Pembuatan aset spot di sini tidak otomatis memberikan slot HIP-3. Deployment perpetual mengikuti aturan staking, oracle, dan slot market yang ditentukan protokol.</InlineNotice>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="pt-8">
              <div className="micro text-accent">03 / Konfirmasi</div>
              <h2 className="display mt-3 text-[27px] font-semibold">Periksa sebelum memulai.</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">Market akan langsung muncul di launchpad demo dan bisa diperdagangkan menggunakan saldo simulasi.</p>
              <div className="mt-8 divide-y divide-line-soft border-y border-line-soft">
                {[
                  ["Aset", `${draft.name} (${draft.symbol})`],
                  ["Kategori", draft.category],
                  ["Harga awal", priceFormat(draft.price)],
                  ["Suplai ilustratif", "10.000.000"],
                  ["Target graduasi", compact(draft.graduationTarget)],
                  ["Lingkungan", "Demo lokal, bukan mainnet"],
                ].map(([label, value]) => <div key={label} className="flex flex-wrap items-center justify-between gap-2 py-3.5 text-[12px]"><span className="text-muted">{label}</span><span className="nums font-mono text-text">{value}</span></div>)}
              </div>
              <div className="mt-6 flex items-start gap-3 border-l-2 border-accent pl-4"><Info size={16} className="mt-0.5 shrink-0 text-accent" /><p className="text-[12px] leading-[1.8] text-muted">Tombol ini tidak membuat token sungguhan, tidak memerlukan wallet, dan tidak membuat pool Uniswap atau pasar HIP-3. Ini adalah prototype interaktif untuk menguji alur produk.</p></div>
            </div>
          )}

          {error && <div className="mt-6 rounded-md border border-down/40 bg-down/5 px-4 py-3 text-[12px] text-down" role="alert">{error}</div>}
          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-line-soft pt-6">
            {step > 1 && <button onClick={() => { setStep((current) => current - 1); setError(""); }} className="button-secondary px-5 py-3"><ChevronLeft size={16} /> Kembali</button>}
            <button onClick={step === 3 ? submit : next} className="button-primary px-6 py-3">{step === 3 ? "Buat market demo" : "Lanjutkan"} <ArrowRight size={16} /></button>
            <button onClick={reset} className="ml-auto flex items-center gap-2 py-2 text-[11px] text-faint hover:text-text"><RotateCcw size={13} /> Reset draft</button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-[98px] lg:h-fit">
          <div className="border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-4"><span className="micro text-faint">Preview market</span><DemoLabel compact /></div>
            <div className="p-5"><div className="flex items-center gap-3"><AssetMark symbol={draft.symbol || "TF"} color={draft.color} size="lg" /><div className="min-w-0"><div className="truncate text-[16px] font-bold text-text">{draft.name || "Nama aset"}</div><div className="mt-1 font-mono text-[11px] text-faint">{draft.symbol || "TICKER"} / USDC</div></div></div><p className="mt-5 min-h-[52px] text-[12px] leading-[1.7] text-muted">{draft.description || "Deskripsi asetmu akan muncul di sini saat kamu mulai menulis."}</p><div className="mt-6 space-y-3 border-t border-line pt-5 font-mono text-[11px]"><div className="flex justify-between"><span className="text-faint">Harga awal</span><span className="nums text-text">{priceFormat(draft.price || 0)}</span></div><div className="flex justify-between"><span className="text-faint">Target graduasi</span><span className="nums text-text">{compact(draft.graduationTarget)}</span></div><div className="flex justify-between"><span className="text-faint">Kategori</span><span className="text-text">{draft.category}</span></div><div className="flex justify-between"><span className="text-faint">Status awal</span><span className="text-accent">Bonding</span></div></div></div>
          </div>
          <div className="mt-5 border-t border-line-soft pt-5"><div className="micro text-faint">Setelah dibuat</div><div className="mt-4 space-y-3 font-mono text-[11px]"><div className="flex items-center gap-2.5 text-accent"><Check size={14} /><span>Market tampil di launchpad demo</span></div><div className="flex items-center gap-2.5 text-accent"><Check size={14} /><span>Trading simulasi dapat dimulai</span></div><div className="flex items-center gap-2.5 text-faint"><ArrowRight size={14} /><span>HIP-3 memerlukan proses terpisah</span></div></div></div>
          <Link to="/mechanism" className="button-plain mt-7"><ArrowLeft size={15} /> Pelajari alurnya</Link>
        </aside>
      </div>
    </div>
  );
}