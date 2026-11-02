"use client";
import { useState, useSyncExternalStore } from "react";
import { fmtUsd } from "@/lib/util";

/** Adapted from trading-platform-ui-design (2), Fees.tsx. Assumptions are explicit, not a revenue forecast. */
export function FeeCalculator() {
  const ready = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [volume, setVolume] = useState(2_500_000);
  const [feeBps, setFeeBps] = useState(4);
  const [share, setShare] = useState(30);
  const [taker, setTaker] = useState(50);
  const takerVolume = volume * taker / 100;
  const fees = takerVolume * feeBps / 10000;
  const daily = fees * share / 100;
  return <div className="econ-grid"><section className="econ-controls" aria-label="Asumsi kalkulator">
    {([
      { id: "volume", label: "Volume harian", value: volume, set: setVolume, min: 50000, max: 10000000, step: 50000, display: fmtUsd(volume), hint: "Skenario volume, bukan data bursa aktual." },
      { id: "taker", label: "Porsi volume taker", value: taker, set: setTaker, min: 0, max: 100, step: 5, display: `${taker}%`, hint: "Hanya sisi taker yang dihitung dalam model sederhana ini." },
      { id: "fee", label: "Fee efektif", value: feeBps, set: setFeeBps, min: 0, max: 20, step: 0.5, display: `${feeBps} bps`, hint: "1 bps = 0,01%. Fee aktual bergantung aturan venue dan tier akun." },
      { id: "share", label: "Alokasi untuk builder", value: share, set: setShare, min: 0, max: 100, step: 5, display: `${share}%`, hint: "Asumsi bebas untuk eksplorasi, bukan pembagian fee resmi HIP-3." },
    ] as const).map((field) => <div className="econ-control" key={field.id}><label htmlFor={field.id}>{field.label}<b>{field.display}</b></label><input id={field.id} disabled={!ready} type="range" min={field.min} max={field.max} step={field.step} value={field.value} onChange={(e) => field.set(Number(e.target.value))} /><small>{field.hint}</small></div>)}
  </section><section className="econ-result" aria-live="polite"><div className="pro-eyebrow">Hasil ilustratif / bukan proyeksi</div><p className="mt-6 text-sm text-[#b1c4a6]">Alokasi builder per hari</p><h2>{fmtUsd(daily)}</h2><dl><div><dt>Volume taker</dt><dd>{fmtUsd(takerVolume)}</dd></div><div><dt>Total fee skenario</dt><dd>{fmtUsd(fees)}</dd></div><div><dt>30 hari volume konstan</dt><dd>{fmtUsd(daily * 30)}</dd></div></dl><p className="mt-7 text-xs leading-7 text-[#b1c4a6]">Belum memperhitungkan biaya operasional, oracle, insentif, diskon, referral, atau perubahan volume. Angka ini bukan janji pendapatan.</p></section></div>;
}
