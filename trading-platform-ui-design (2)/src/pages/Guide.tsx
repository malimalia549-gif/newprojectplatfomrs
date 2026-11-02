import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, ExternalLink, RotateCcw, X } from "lucide-react";
import { PageHeading, Reveal, SectionHeading } from "@/components/UI";
import { useDemo } from "@/context/DemoContext";
import { cn } from "@/utils/cn";

const questions = [
  { q: "Apakah Tickerforge ini sudah terhubung ke mainnet?", a: "Belum. Situs ini adalah prototype antarmuka interaktif. Harga, orderbook, perdagangan, saldo, posisi, serta market yang dibuat adalah simulasi lokal. Tidak ada wallet yang diminta dan tidak ada transaksi yang dikirim ke jaringan mana pun." },
  { q: "Apakah aset yang saya buat otomatis menjadi perpetual HIP-3?", a: "Tidak. Pembuatan aset spot dan deployment market perpetual adalah dua proses berbeda. HIP-3 memiliki syarat deployer, stake, definisi oracle, dan pengoperasian market tersendiri. Prototype ini menampilkan bagaimana pengalaman kedua sisi tersebut dapat dirangkai tanpa menyatakan hubungan onchain otomatis." },
  { q: "Apa saja syarat utama deployer HIP-3?", a: "Menurut dokumentasi resmi Hyperliquid yang dirujuk di bawah, deployer harus memenuhi persyaratan staking mainnet 500.000 HYPE dan bertanggung jawab atas definisi market, oracle, leverage, serta operasionalnya. Ketentuan protokol bisa berubah; periksa sumber resmi sebelum mengambil keputusan." },
  { q: "Kapan harus mengikuti lelang untuk market perpetual?", a: "Spesifikasi HIP-3 menyatakan tiga aset pertama pada sebuah perp DEX tidak memerlukan lelang. Aset berikutnya melalui Dutch auction atau dapat memanfaatkan reserve deployment yang tersedia sesuai aturan protokol. Jadi, pembelian slot ticker bukan prasyarat untuk setiap market." },
  { q: "Apakah data dan posisi demo saya tersimpan?", a: "Ya. Draft launch studio, watchlist, saldo, aktivitas spot, dan posisi perpetual disimpan di localStorage browser ini. Data tidak dikirim ke server. Kamu bisa menghapus semuanya melalui tombol Reset data demo di bawah." },
  { q: "Apakah estimasi likuidasi dan pendapatan di sini akurat?", a: "Tidak untuk penggunaan nyata. Estimasi likuidasi pada terminal hanya ilustrasi yang tidak mencakup seluruh komponen margin dan fee. Kalkulator biaya menggunakan asumsi sederhana yang tidak mewakili formula protokol atau imbal hasil yang dijamin." },
  { q: "Apa yang harus saya lakukan setelah graduasi spot?", a: "Graduasi spot tidak mewajibkan market perpetual. Builder dapat menilai kebutuhan pengguna, kualitas sumber harga, kelayakan risiko, dan persyaratan HIP-3. Jika tidak memenuhi syarat, aset tetap dapat menjadi market spot tanpa cabang perp." },
];

export default function Guide() {
  const [open, setOpen] = useState<number | null>(0);
  const { resetDemo } = useDemo();

  return (
    <div className="mx-auto max-w-[1600px] px-5 pt-16 pb-24 sm:px-8 lg:px-10 lg:pt-20">
      <PageHeading
        eyebrow="Bantuan / Panduan"
        title={<>Pahami produknya.<br /><span className="text-accent">Tahu batas demonya.</span></>}
        description="Panduan singkat untuk menggunakan prototype, memahami alur spot dan perpetual, serta membedakan konsep produk dari fitur protokol yang sesungguhnya."
        action={<Link to="/studio" className="button-primary px-5 py-3.5">Mulai dari studio <ArrowRight size={16} /></Link>}
      />

      <section className="pt-20 pb-24">
        <Reveal><SectionHeading eyebrow="01 / Mulai dalam tiga langkah" title={<>Kenali alurnya<br />dengan mencobanya.</>} /></Reveal>
        <div className="mt-12 grid border-y border-line-soft md:grid-cols-3">
          {[
            { n: "01", title: "Jelajahi", body: "Lihat aset di fase bonding dan yang sudah graduated. Cari, filter, lalu simpan favorit ke watchlist.", to: "/launchpad", label: "Buka launchpad" },
            { n: "02", title: "Buat", body: "Rancang aset, pilih harga awal dan target. Market demo langsung muncul di daftar setelah dibuat.", to: "/studio", label: "Masuk studio" },
            { n: "03", title: "Simulasikan", body: "Beli aset dengan saldo demo, lalu buka posisi Long atau Short di terminal perpetual terpisah.", to: "/perpetuals", label: "Buka terminal" },
          ].map((item, i) => <Reveal key={item.n} delay={i * .09} className="border-b border-line-soft py-7 last:border-b-0 md:border-r md:border-b-0 md:px-7 md:first:pl-0 md:last:border-r-0"><div className="font-mono text-[11px] text-accent">{item.n}</div><h3 className="display mt-5 text-[24px] font-semibold">{item.title}</h3><p className="mt-3 max-w-[360px] text-[13px] leading-[1.8] text-muted">{item.body}</p><Link to={item.to} className="button-plain mt-6">{item.label} <ArrowRight size={15} /></Link></Reveal>)}
        </div>
      </section>

      <section className="border-t border-line-soft py-20 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:gap-20">
          <Reveal><div className="eyebrow mb-5">02 / Yang perlu dibedakan</div><h2 className="display text-[clamp(2rem,3.6vw,3.7rem)] font-semibold">Antarmuka yang nyata. Dana yang tidak nyata.</h2><p className="mt-5 max-w-[430px] text-[13px] leading-[1.85] text-muted">Semua kontrol berfungsi untuk mengeksplorasi pengalaman produk. Tidak ada integrasi trading langsung, wallet, ataupun deployment kontrak pada prototype ini.</p></Reveal>
          <div className="border-t border-line-soft">
            {[
              { label: "Berfungsi di browser", value: "Pencarian, watchlist, buat market, trading spot demo, posisi perp demo, kalkulator.", yes: true },
              { label: "Disimpan lokal", value: "Aset buatanmu, saldo simulasi, watchlist, posisi, dan aktivitas sesi.", yes: true },
              { label: "Tidak terhubung", value: "Mainnet, wallet, API market live, kontrak, dan pool likuiditas sungguhan.", yes: false },
              { label: "Tidak dijanjikan", value: "Hasil investasi, fee riil, hak ticker, atau kelayakan deployment HIP-3.", yes: false },
            ].map((item) => <div key={item.label} className="flex gap-4 border-b border-line-soft py-5"><span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border", item.yes ? "border-accent/50 text-accent" : "border-line text-faint")}>{item.yes ? <Check size={13} /> : <X size={13} />}</span><div><div className="text-[14px] font-bold text-text">{item.label}</div><p className="mt-1.5 text-[13px] leading-[1.75] text-muted">{item.value}</p></div></div>)}
          </div>
        </div>
      </section>

      <section className="border-t border-line-soft py-20 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr] lg:gap-24">
          <Reveal><div className="eyebrow mb-5">03 / Pertanyaan umum</div><h2 className="display text-[clamp(2rem,3.5vw,3.4rem)] font-semibold">Jawaban, tanpa<br />huruf kecil.</h2><p className="mt-5 max-w-[410px] text-[13px] leading-[1.85] text-muted">Hal penting tentang rancangan produk, HIP-3, dan batas simulasi ini.</p><a href="https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals" target="_blank" rel="noreferrer" className="button-plain mt-7">Spesifikasi resmi HIP-3 <ExternalLink size={15} /></a></Reveal>
          <div className="border-t border-line-soft">
            {questions.map((item, i) => <div key={item.q} className="border-b border-line-soft"><button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-start gap-4 py-5 text-left"><span className="pt-0.5 font-mono text-[10px] text-faint">{String(i + 1).padStart(2, "0")}</span><span className={cn("flex-1 text-[14px] font-bold leading-[1.5] transition-colors sm:text-[15px]", open === i ? "text-accent" : "text-text hover:text-accent")}>{item.q}</span><ChevronDown size={17} className={cn("mt-0.5 shrink-0 text-faint transition-transform", open === i && "rotate-180 text-accent")} /></button><AnimatePresence initial={false}>{open === i && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .25 }} className="overflow-hidden"><p className="max-w-[680px] pb-6 pl-8 text-[13px] leading-[1.85] text-muted">{item.a}</p></motion.div>}</AnimatePresence></div>)}
          </div>
        </div>
      </section>

      <section className="border-t border-line-soft pt-16"><div className="flex flex-wrap items-center justify-between gap-6"><div><div className="micro text-faint">Pengaturan demo</div><h2 className="display mt-3 text-[25px] font-semibold">Butuh mulai dari awal?</h2><p className="mt-2 text-[12px] text-muted">Reset menghapus semua market, transaksi, posisi, dan watchlist yang tersimpan di browser ini.</p></div><button onClick={() => { if (window.confirm("Reset semua data demo di browser ini?")) resetDemo(); }} className="button-secondary px-5 py-3"><RotateCcw size={15} /> Reset data demo</button></div></section>
    </div>
  );
}