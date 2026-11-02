import { Btn, fmt } from "../components/ui";
import { AreaCurve } from "../components/charts";
import { AccountPanel, Identicon } from "../components/terminal";
import { APP_URL, shortAddr, useAccount, usePortfolioHistory } from "../lib/hl";
import { useApp } from "../store";

export default function PortfolioPage() {
  const { net, wallet, agent, connect, enableTrading, toast } = useApp();
  const user = wallet?.address ?? null;
  const { account } = useAccount(net, user, "");
  const hist = usePortfolioHistory(net, user);

  if (!wallet)
    return (
      <div className="wrap py-16 md:py-24">
        <div className="card relative mx-auto max-w-[680px] overflow-hidden px-6 py-12 text-center md:px-12">
          <div aria-hidden className="aurora pointer-events-none absolute left-1/2 top-[-55%] h-[320px] w-[620px] -translate-x-1/2 opacity-60" />
          <span className="relative mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <svg viewBox="0 0 16 16" className="h-5 w-5 text-amber" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
              <path d="M2 4.5h10a2 2 0 0 1 2 2V12a2 2 0 0 1-2 2H2zM11 9.25h1" strokeLinecap="round" />
            </svg>
          </span>
          <h1 className="relative mt-5 text-[28px] font-semibold tracking-[-0.04em]">Hubungkan dompet untuk melihat portofolio</h1>
          <p className="relative mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-dim">
            Graduate membaca ekuitas, posisi, order, dan riwayat langsung dari HyperCore. Tidak ada akun, tidak ada kustodi —
            hanya alamat dompet Anda.
          </p>
          <Btn variant="primary" onClick={connect} className="relative mt-7 px-5 py-3">
            Hubungkan dompet
          </Btn>
          <div className="relative mt-10 grid gap-3 text-left sm:grid-cols-3">
            {[
              ["Data langsung", "clearinghouseState, order, dan fills dari API publik."],
              ["Satu akun", "Spot, perp inti, dan HIP-3 dalam satu tampilan."],
              ["Tanpa kustodi", "Dana tetap di akun HyperCore Anda sendiri."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="text-[13px] font-semibold">{t}</div>
                <p className="mt-1 text-[12px] leading-relaxed text-dim">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );

  const upnl = account?.positions.reduce((s, p) => s + p.upnl, 0) ?? 0;
  const values = (hist.data ?? []).map((h) => h.v);
  const first = values[0] ?? 0;
  const lastV = values[values.length - 1] ?? 0;
  const change = first > 0 ? ((lastV - first) / first) * 100 : 0;

  return (
    <div className="wrap py-8 md:py-10">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <Identicon addr={wallet.address} size={48} />
          <div>
            <div className="text-[12.5px] font-medium text-amber">Portofolio</div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(wallet.address);
                toast("Alamat disalin.", "mint");
              }}
              className="font-mono text-[18px] font-medium hover:text-amber"
            >
              {shortAddr(wallet.address)} ⧉
            </button>
            <div className="mt-0.5 flex items-center gap-2 text-[12px] text-dim">
              <span className={`h-1.5 w-1.5 rounded-full ${net === "mainnet" ? "bg-mint" : "bg-lilac"}`} />
              {net === "mainnet" ? "HyperCore mainnet" : "HyperCore testnet"} ·{" "}
              <span className={agent ? "text-mint" : "text-amber"}>{agent ? "trading aktif" : "trading belum aktif"}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!agent && (
            <Btn variant="primary" onClick={enableTrading}>
              Aktifkan trading
            </Btn>
          )}
          <Btn href={`${APP_URL[net]}/portfolio`} variant="ghost">
            Deposit / tarik ↗
          </Btn>
          <Btn href="#/trade" variant="ghost">
            Buka terminal
          </Btn>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Ekuitas", fmt.usd(account?.equity ?? 0, 2), ""],
          ["PnL belum direalisasi", `${upnl >= 0 ? "+" : "−"}${fmt.usd(Math.abs(upnl), 2)}`, upnl >= 0 ? "text-mint" : "text-blood"],
          ["Margin terpakai", fmt.usd(account?.marginUsed ?? 0, 2), ""],
          ["Bisa ditarik", fmt.usd(account?.withdrawable ?? 0, 2), ""],
        ].map(([k, v, tone]) => (
          <div key={k} className="card p-4">
            <div className="text-[12px] text-dim">{k}</div>
            <div className={`num mt-1.5 text-[20px] font-semibold tracking-[-0.02em] ${tone}`}>{v}</div>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-5">
        <div className="flex items-center justify-between">
          <span className="text-[13.5px] font-semibold">Nilai akun · 30 hari</span>
          {values.length > 1 && (
            <span className={`num text-[12.5px] ${change >= 0 ? "text-mint" : "text-blood"}`}>{fmt.pct(change)}</span>
          )}
        </div>
        {values.length > 1 ? (
          <div className="mt-4">
            <AreaCurve values={values} height={180} />
          </div>
        ) : (
          <div className="mt-4 grid h-[180px] place-items-center rounded-xl border border-dashed border-white/10 text-[12.5px] text-dim">
            {hist.live ? "Belum ada riwayat nilai akun di jaringan ini." : "Memuat riwayat dari HyperCore…"}
          </div>
        )}
      </div>

      <div className="tpanel mt-4 min-h-[320px] overflow-hidden">
        <AccountPanel />
      </div>
    </div>
  );
}
