import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/utils/cn";

const stages = [
  { label: "Create", number: "01", title: "Rancang aset baru.", detail: "Definisikan identitas aset, parameter kurva, dan target graduasi. Pada prototype ini, pembuatan market disimpan secara lokal sebagai simulasi." },
  { label: "Trading", number: "02", title: "Harga menemukan pasarnya.", detail: "Pembelian dan penjualan pertama berlangsung di bonding curve. Aktivitas dan progress menuju target terlihat secara terbuka." },
  { label: "Graduate", number: "03", title: "Likuiditas siap beralih.", detail: "Saat syarat yang ditentukan terpenuhi, alur produk mengarahkan likuiditas spot ke pool. Perpindahan ini masih berupa konsep produk, bukan transaksi onchain pada demo." },
  { label: "Uniswap Pool", number: "04", title: "Spot market tetap hidup.", detail: "Pool menyediakan venue spot. Ketersediaan harga spot bukan jaminan kelayakan oracle perpetual; kualitas dan ketahanan feed harus dinilai terpisah." },
  { label: "Selesai", number: "05", title: "Akhir jalur spot. Bukan akhir produk.", detail: "Setelah fase spot, builder yang memenuhi persyaratan protokol dapat mengevaluasi peluang membangun pasar derivatif di HyperCore." },
  { label: "Beli ticker*", number: "06", title: "Siapkan slot market HIP-3.", detail: "Menurut spesifikasi HIP-3, tiga aset pertama dalam satu perp DEX tidak perlu mengikuti lelang. Aset berikutnya menggunakan mekanisme Dutch auction atau hak reserve yang tersedia." },
  { label: "HyperCore", number: "07", title: "Orderbook dengan mesin HyperCore.", detail: "Market HIP-3 menggunakan infrastruktur orderbook dan margin HyperCore. Deployer tetap bertanggung jawab terhadap definisi market, oracle, dan pengoperasiannya." },
  { label: "HIP-3 Perp", number: "08", title: "Pasar perpetual dapat diperdagangkan.", detail: "Deployer yang memenuhi syarat stake dapat menjalankan perp DEX dengan market, parameter, dan pengelolaan risiko miliknya. Alur ini bukan deployment otomatis dari token spot." },
];

export function FlowMap({ detailed = false }: { detailed?: boolean }) {
  const [selected, setSelected] = useState(0);

  const node = (index: number) => {
    const stage = stages[index];
    return (
      <button
        key={stage.number}
        onClick={() => setSelected(index)}
        className={cn("group relative min-w-[145px] flex-1 border-t px-1 pt-4 pb-2 text-left transition-colors duration-200", selected === index ? "border-accent" : "border-line hover:border-muted")}
        aria-pressed={selected === index}
      >
        <span className={cn("micro transition-colors", selected === index ? "text-accent" : "text-faint group-hover:text-muted")}>{stage.number} / {index < 5 ? "SPOT" : "PERP"}</span>
        <span className={cn("mt-2 block text-[13px] font-bold transition-colors sm:text-[14px]", selected === index ? "text-text" : "text-muted group-hover:text-text")}>{stage.label}</span>
        {selected === index && <motion.span layoutId="flow-marker" className="absolute -top-[3px] left-0 h-[5px] w-[5px] rounded-full bg-accent" />}
      </button>
    );
  };

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[825px]">
          <div className="flex items-start gap-5">
            {stages.slice(0, 5).map((_, i) => (
              <div key={i} className="flex flex-1 items-start gap-4">
                {node(i)}
                {i < 4 && <ArrowRight size={14} className="mt-[29px] shrink-0 text-faint" />}
              </div>
            ))}
          </div>
          <div className="flex h-11 items-center justify-end pr-[68px] text-accent-dim">
            <span className="mr-3 font-mono text-[10px] tracking-[.12em] text-faint uppercase">lanjutan opsional</span>
            <ArrowDownRight size={19} strokeWidth={1.4} />
          </div>
          <div className="ml-auto flex w-[64%] items-start gap-5">
            {stages.slice(5).map((_, i) => (
              <div key={i} className="flex flex-1 items-start gap-4">
                {node(i + 5)}
                {i < 2 && <ArrowRight size={14} className="mt-[29px] shrink-0 text-faint" />}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-7 flex min-h-[120px] flex-col gap-2 border-t border-line-soft pt-6 sm:flex-row sm:gap-10">
        <div className="w-[140px] shrink-0 font-mono text-[11px] text-accent">{stages[selected].number} / {stages[selected].label}</div>
        <AnimatePresence mode="wait">
          <motion.div key={selected} initial={{ opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: .22 }}>
            <div className="text-[17px] font-bold tracking-[-.03em] text-text sm:text-[20px]">{stages[selected].title}</div>
            <p className="mt-2 max-w-[710px] text-[13px] leading-[1.8] text-muted">{stages[selected].detail}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      {detailed && <p className="mt-3 font-mono text-[10px] leading-relaxed text-faint">* Penggunaan slot atau lelang mengikuti ketentuan resmi HIP-3 dan persyaratan staking. Ilustrasi ini menggambarkan rancangan alur produk, bukan hubungan otomatis antarprotokol.</p>}
    </div>
  );
}