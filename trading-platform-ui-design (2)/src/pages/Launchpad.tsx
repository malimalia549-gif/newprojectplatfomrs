import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Search, SlidersHorizontal } from "lucide-react";
import { useDemo } from "@/context/DemoContext";
import { LaunchTable } from "@/components/MarketRows";
import { PageHeading, Reveal } from "@/components/UI";
import { cn } from "@/utils/cn";

type Filter = "all" | "bonding" | "almost" | "graduated" | "watchlist";
type Sort = "featured" | "volume" | "progress" | "change";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "bonding", label: "Bonding" },
  { value: "almost", label: "Mendekati lulus" },
  { value: "graduated", label: "Graduated" },
  { value: "watchlist", label: "Watchlist" },
];

export default function Launchpad() {
  const { assets, favorites } = useDemo();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("featured");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => assets.filter((item) => {
    const matchesSearch = `${item.name} ${item.symbol} ${item.category}`.toLowerCase().includes(search.trim().toLowerCase());
    const matchesFilter = filter === "all" ||
      (filter === "almost" && item.status === "bonding" && item.progress >= 65) ||
      (filter === "watchlist" && favorites.includes(item.symbol)) ||
      item.status === filter;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    if (sort === "volume") return b.volume - a.volume;
    if (sort === "progress") return b.progress - a.progress;
    if (sort === "change") return b.change - a.change;
    return 0;
  }), [assets, favorites, filter, search, sort]);

  return (
    <div className="mx-auto max-w-[1600px] px-5 pt-16 pb-24 sm:px-8 lg:px-10 lg:pt-20">
      <PageHeading
        eyebrow="Launchpad / Discover"
        title={<>Temukan aset<br /><span className="text-accent">lebih awal.</span></>}
        description="Ikuti market sejak fase bonding, lihat progress menuju graduasi, dan temukan aset yang sudah memasuki fase spot berikutnya. Seluruh data di sini adalah simulasi."
        action={<Link to="/studio" className="button-primary px-5 py-3.5">Buat market baru <ArrowRight size={16} /></Link>}
      />

      <div className="mt-12 border border-line bg-base-2">
        <div className="flex flex-col gap-4 border-b border-line px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex max-w-full items-center gap-6 overflow-x-auto whitespace-nowrap">
            {filters.map((item) => (
              <button key={item.value} onClick={() => setFilter(item.value)} className={cn("relative shrink-0 py-1.5 text-[12px] font-bold transition-colors", filter === item.value ? "text-text" : "text-faint hover:text-muted")}>
                {item.label}
                {filter === item.value && <span className="absolute right-0 -bottom-[17px] left-0 h-[2px] bg-accent" />}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="relative min-w-[190px] flex-1 sm:w-[230px] sm:flex-none">
              <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari aset atau ticker" className="field h-9 pl-9 text-[12px]" aria-label="Cari aset" />
            </label>
            <div className="relative flex items-center">
              <SlidersHorizontal size={14} className="pointer-events-none absolute left-3 text-faint" />
              <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} className="field h-9 w-[148px] appearance-none pl-8 text-[11px]" aria-label="Urutkan aset">
                <option value="featured">Terbaru</option>
                <option value="volume">Volume terbesar</option>
                <option value="progress">Progress tertinggi</option>
                <option value="change">Perubahan 24j</option>
              </select>
            </div>
          </div>
        </div>
        <LaunchTable assets={visible} empty={filter === "watchlist" ? "Watchlist masih kosong. Buka detail aset dan simpan market yang ingin dipantau." : "Tidak ada aset yang cocok. Coba kata kunci atau filter lain."} />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3.5 font-mono text-[10px] text-faint sm:px-6">
          <span>{visible.length} dari {assets.length} market ditampilkan</span>
          <span>Harga ilustratif · Bukan market live</span>
        </div>
      </div>

      <Reveal className="mt-24 grid gap-8 border-t border-line-soft pt-12 lg:grid-cols-[.95fr_1.05fr] lg:gap-24">
        <div>
          <div className="eyebrow mb-4">Dari kurva ke pasar</div>
          <h2 className="display text-[clamp(2rem,3.5vw,3.6rem)] font-semibold">Graduasi mengubah<br />cara aset diperdagangkan.</h2>
        </div>
        <div className="flex flex-col justify-end">
          <p className="max-w-[560px] text-[14px] leading-[1.85] text-muted">Di fase bonding, harga terbentuk di kurva. Ketika target terpenuhi, fase spot berikutnya dimulai. Peluang pasar perpetual adalah keputusan terpisah yang bergantung pada persyaratan HIP-3, kualitas oracle, dan pengelolaan market oleh deployer.</p>
          <Link to="/mechanism" className="button-plain mt-6 w-fit">Lihat siklus lengkap <ArrowUpRight size={16} /></Link>
        </div>
      </Reveal>
    </div>
  );
}