import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Info } from "lucide-react";
import { PageHeading, Reveal, SectionHeading } from "@/components/UI";
import { compact, money } from "@/lib/market";

const considerations = [
  { n: "01", title: "Stake deployer bukan biaya listing", body: "Dokumentasi HIP-3 saat ini menyebut persyaratan staking 500.000 HYPE untuk mainnet. Stake terkait keamanan operasi perp DEX; jangan diperlakukan sebagai estimasi pendapatan atau biaya sekali bayar." },
  { n: "02", title: "Slot awal dan aset berikutnya berbeda", body: "Tiga aset pertama dari sebuah perp DEX tidak perlu mengikuti lelang. Slot berikutnya dapat mengikuti Dutch auction atau mekanisme reserve sesuai aturan protokol." },
  { n: "03", title: "Fee efektif mengikuti banyak variabel", body: "Tier volume, diskon staking, referral, collateral, dan konfigurasi deployer dapat mengubah fee riil. Kalkulator di atas sengaja disederhanakan untuk eksplorasi skenario." },
];

export default function Fees() {
  const [volume, setVolume] = useState(2_500_000);
  const [feeBps, setFeeBps] = useState(4);
  const [builderShare, setBuilderShare] = useState(30);

  const takerRatio = .5;
  const takerVolume = volume * takerRatio;
  const totalIllustrativeFees = takerVolume * feeBps / 10_000;
  const daily = totalIllustrativeFees * builderShare / 100;
  const monthly = daily * 30;

  return (
    <div className="mx-auto max-w-[1600px] px-5 pt-16 pb-24 sm:px-8 lg:px-10 lg:pt-20">
      <PageHeading
        eyebrow="Platform / Ekonomi market"
        title={<>Angkanya harus<br /><span className="text-accent">terlihat jelas.</span></>}
        description="Eksplorasi skenario pendapatan market dengan asumsi yang bisa kamu ubah. Ini adalah model edukatif yang disederhanakan, bukan proyeksi imbal hasil atau formula fee resmi HIP-3."
        action={<Link to="/mechanism" className="button-secondary px-5 py-3.5">Pahami alurnya <ArrowRight size={16} /></Link>}
      />

      <section className="pt-16 pb-24">
        <Reveal><SectionHeading eyebrow="01 / Kalkulator skenario" title={<>Atur asumsi.<br />Lihat perhitungannya.</>} description="Model ini mengalikan volume taker, fee efektif, dan porsi builder. Rasio volume taker diasumsikan 50% dari total volume harian untuk ilustrasi." /></Reveal>
        <div className="mt-10 grid border border-line bg-base-2 lg:grid-cols-[1fr_.82fr]">
          <div className="space-y-10 border-b border-line px-6 py-9 sm:px-9 lg:border-r lg:border-b-0">
            <div>
              <div className="mb-5 flex items-end justify-between gap-4"><label htmlFor="volume" className="text-[13px] font-bold text-text">Volume market / hari</label><span className="nums font-mono text-[19px] font-semibold text-text">{compact(volume)}</span></div>
              <input id="volume" type="range" min="50000" max="10000000" step="50000" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="range" style={{ ["--fill" as string]: `${(volume - 50000) / 9950000 * 100}%` }} />
              <div className="mt-3 flex justify-between font-mono text-[10px] text-faint"><span>$50K</span><span>$10M</span></div>
            </div>
            <div>
              <div className="mb-5 flex items-end justify-between gap-4"><label htmlFor="effective-fee" className="text-[13px] font-bold text-text">Asumsi fee efektif</label><span className="nums font-mono text-[19px] font-semibold text-text">{feeBps} bps</span></div>
              <input id="effective-fee" type="range" min="2" max="10" step="1" value={feeBps} onChange={(event) => setFeeBps(Number(event.target.value))} className="range" style={{ ["--fill" as string]: `${(feeBps - 2) / 8 * 100}%` }} />
              <div className="mt-3 flex justify-between font-mono text-[10px] text-faint"><span>2 bps</span><span>10 bps</span></div>
            </div>
            <div>
              <div className="mb-5 flex items-end justify-between gap-4"><label htmlFor="share" className="text-[13px] font-bold text-text">Asumsi bagian builder</label><span className="nums font-mono text-[19px] font-semibold text-text">{builderShare}%</span></div>
              <input id="share" type="range" min="10" max="50" step="5" value={builderShare} onChange={(event) => setBuilderShare(Number(event.target.value))} className="range" style={{ ["--fill" as string]: `${(builderShare - 10) / 40 * 100}%` }} />
              <div className="mt-3 flex justify-between font-mono text-[10px] text-faint"><span>10%</span><span>50%</span></div>
            </div>
          </div>

          <div className="flex flex-col justify-between bg-surface px-6 py-9 sm:px-9">
            <div><div className="micro text-accent">Hasil ilustratif</div><div className="mt-7 font-mono text-[12px] text-muted">Perkiraan bagian builder / hari</div><div className="nums mt-2 font-mono text-[clamp(2.7rem,4.3vw,4.8rem)] leading-none font-semibold tracking-[-.09em] text-accent">{money(daily, 0)}</div><div className="mt-8 border-t border-line pt-6"><div className="font-mono text-[11px] text-faint">Estimasi 30 hari pada volume tetap</div><div className="nums mt-1.5 font-mono text-[27px] font-semibold tracking-[-.05em] text-text">{money(monthly, 0)}</div></div></div>
            <div className="mt-10 space-y-3 border-t border-line pt-6 font-mono text-[11px]"><div className="flex justify-between gap-3 text-faint"><span>Volume taker (50%)</span><span className="nums text-text">{compact(takerVolume)}</span></div><div className="flex justify-between gap-3 text-faint"><span>Fee ilustratif dari taker</span><span className="nums text-text">{money(totalIllustrativeFees, 0)}</span></div><div className="flex justify-between gap-3 text-faint"><span>Bagian builder ({builderShare}%)</span><span className="nums text-accent">{money(daily, 0)}</span></div></div>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2.5 font-mono text-[10px] leading-[1.8] text-faint"><Info size={14} className="mt-[2px] shrink-0" /><span>Rumus edukatif: volume x 50% taker x asumsi fee bps x asumsi bagian builder. Tidak memperhitungkan diskon, tier, fee protokol, perubahan volume, atau konfigurasi market yang berlaku.</span></div>
      </section>

      <section className="border-t border-line-soft py-20 sm:py-24">
        <div className="grid gap-14 lg:grid-cols-[.8fr_1.2fr] lg:gap-24">
          <Reveal><div className="eyebrow mb-5">02 / Realitas operasional</div><h2 className="display text-[clamp(2rem,3.5vw,3.6rem)] font-semibold">Tiga angka yang tidak boleh tercampur.</h2><p className="mt-5 max-w-[470px] text-[13px] leading-[1.85] text-muted">Stake, biaya mendapatkan slot, dan fee trading adalah hal yang berbeda. Memisahkannya membuat penilaian kelayakan market lebih masuk akal.</p><a href="https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals" target="_blank" rel="noreferrer" className="button-plain mt-7">Verifikasi di dokumentasi resmi <ExternalLink size={15} /></a></Reveal>
          <div className="border-t border-line-soft">{considerations.map((item, i) => <Reveal key={item.n} delay={i * .07} className="grid gap-4 border-b border-line-soft py-6 sm:grid-cols-[55px_1fr]"><span className="font-mono text-[11px] text-accent">{item.n}</span><div><h3 className="text-[16px] font-bold tracking-[-.03em] text-text">{item.title}</h3><p className="mt-2 max-w-[630px] text-[13px] leading-[1.85] text-muted">{item.body}</p></div></Reveal>)}</div>
        </div>
      </section>

      <section className="border-t border-line-soft pt-20"><div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"><Reveal><div className="eyebrow mb-5">Siap melihat market?</div><h2 className="display max-w-[750px] text-[clamp(2rem,3.7vw,3.8rem)] font-semibold">Simulasikan posisi.<br /><span className="text-accent">Tanpa risiko dana nyata.</span></h2></Reveal><Reveal delay={.1}><Link to="/perpetuals" className="button-primary px-6 py-3.5">Buka terminal demo <ArrowRight size={16} /></Link></Reveal></div></section>
    </div>
  );
}