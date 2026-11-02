import Link from "next/link";
import { ArrowRight, Calculator, Info } from "lucide-react";
import { FeeCalculator } from "@/components/fee-calculator";
import { Badge } from "@/components/ui";

export const metadata = { title: "Kalkulator ekonomi — Forge Unified" };
export default function EconomicsPage() {
  return <div className="forge-page pt-14"><div className="flex flex-wrap items-end justify-between gap-5"><div><Badge tone="ice"><Calculator size={12} /> Economics lab</Badge><h1 className="page-heading mt-4">Pahami angkanya.<br />Bukan sekadar hasilnya.</h1><p className="mt-4 max-w-xl text-sm leading-7 text-[#65775c]">Eksplorasi hubungan volume, fee, dan alokasi builder. Semua asumsi bisa diubah dan diperlihatkan secara terbuka.</p></div><Link className="ui-link" href="/docs">Pelajari mekanisme <ArrowRight size={14} /></Link></div><FeeCalculator /><div className="econ-notes"><article><h3>01 / Volume ≠ pendapatan</h3><p>Volume adalah nilai transaksi. Pendapatan fee hanya bagian kecil darinya, dan tidak seluruh fee menjadi milik builder.</p></article><article><h3>02 / Stake bukan biaya listing</h3><p>Persyaratan staking HIP-3, tata kelola oracle, dan risiko pasar perlu diverifikasi ke dokumentasi resmi sebelum deployment nyata.</p></article><article><h3>03 / Uji sebelum mainnet</h3><p>Model ini tidak menggantikan pengujian invariant, audit independen, atau spesifikasi protokol terbaru.</p></article></div><p className="flex items-center gap-2 text-xs text-[#65775c]"><Info size={14} /> Diadaptasi dari modul Economics Trading UI (2), terhubung dengan navigasi dan desain Forge Unified.</p></div>;
}
