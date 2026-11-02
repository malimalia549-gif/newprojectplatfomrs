import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ALL_ROUTES, NAV_MORE, NAV_PRIMARY, isActive, useApp } from "../store";
import { APP_URL, fmtPx, shortAddr, useAccount, useMarkets } from "../lib/hl";
import { Glyph, Identicon } from "./terminal";
import { fmt } from "./ui";

function Logo() {
  return (
    <a href="#/" className="flex shrink-0 items-center gap-2.5" aria-label="Graduate — beranda">
      <span className="grid h-7 w-7 place-items-center rounded-[9px] bg-amber shadow-[0_6px_20px_-8px_rgba(217,255,77,.7)]">
        <svg viewBox="0 0 28 28" className="h-4 w-4" aria-hidden>
          <path
            d="M4 22 L11 22 L11 15 L17 15 L17 8 L24 8"
            fill="none"
            stroke="#07090b"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-[-0.02em]">Graduate</span>
    </a>
  );
}

function More({ route }: { route: string }) {
  const [open, setOpen] = useState(false);
  const on = NAV_MORE.some((n) => isActive(route, n.path));
  useEffect(() => setOpen(false), [route]);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
          on || open ? "text-bone" : "text-dim hover:text-bone"
        }`}
      >
        Lainnya
        <svg viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[71]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-10 z-[72] w-[230px] rounded-2xl border border-white/10 bg-[#0c1014]/95 p-1.5 shadow-2xl backdrop-blur-xl"
            >
              {NAV_MORE.map((n) => (
                <a
                  key={n.path}
                  href={`#${n.path}`}
                  className="block rounded-xl px-3 py-2.5 text-[13px] text-dim transition-colors hover:bg-white/[0.05] hover:text-bone"
                >
                  {n.label}
                </a>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export function NetSwitch() {
  const { net, setNet } = useApp();
  return (
    <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5">
      {(["mainnet", "testnet"] as const).map((n) => (
        <button
          key={n}
          onClick={() => setNet(n)}
          className={`flex items-center gap-1.5 rounded-[9px] px-2.5 py-1 text-[12px] font-medium transition-colors ${
            net === n ? "bg-white/[0.08] text-bone" : "text-dim hover:text-bone"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${n === "mainnet" ? "bg-mint" : "bg-lilac"} ${net === n ? "" : "opacity-40"}`} />
          {n === "mainnet" ? "Mainnet" : "Testnet"}
        </button>
      ))}
    </div>
  );
}

function WalletButton() {
  const { wallet, agent, net, connect, disconnect, enableTrading, resetAgent, toast } = useApp();
  const { account } = useAccount(net, wallet?.address ?? null, "");
  const [menu, setMenu] = useState(false);

  if (!wallet)
    return (
      <button
        onClick={connect}
        className="rounded-xl bg-amber px-3.5 py-2 text-[13px] font-semibold text-ink transition-all hover:shadow-[0_10px_28px_-12px_rgba(217,255,77,.8)]"
      >
        Hubungkan dompet
      </button>
    );

  return (
    <div className="relative">
      <button
        onClick={() => setMenu((m) => !m)}
        className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] py-1.5 pl-1.5 pr-3 transition-colors hover:border-white/20"
      >
        <Identicon addr={wallet.address} size={24} />
        <span className="font-mono text-[12px]">{shortAddr(wallet.address)}</span>
        <span className="hidden h-4 w-px bg-white/10 md:block" />
        <span className="num hidden text-[12px] text-dim md:block">{fmt.usd(account?.equity ?? 0, 2)}</span>
        {!agent && <span className="h-1.5 w-1.5 rounded-full bg-amber" title="Trading belum aktif" />}
      </button>
      <AnimatePresence>
        {menu && (
          <>
            <div className="fixed inset-0 z-[71]" onClick={() => setMenu(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 z-[72] w-[300px] rounded-2xl border border-white/10 bg-[#0c1014]/95 p-3 shadow-[0_40px_80px_-30px_rgba(0,0,0,.9)] backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <Identicon addr={wallet.address} size={36} />
                <div className="min-w-0">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(wallet.address);
                      toast("Alamat disalin.", "mint");
                    }}
                    className="font-mono text-[13px] text-bone hover:text-amber"
                  >
                    {shortAddr(wallet.address)} ⧉
                  </button>
                  <div className="text-[11.5px] text-dim">
                    {net === "mainnet" ? "HyperCore mainnet" : "HyperCore testnet"} · chain {wallet.chainId}
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/[0.03] p-2.5">
                  <div className="text-[11px] text-dim">Ekuitas</div>
                  <div className="num mt-0.5 text-[14px] font-semibold">{fmt.usd(account?.equity ?? 0, 2)}</div>
                </div>
                <div className="rounded-xl bg-white/[0.03] p-2.5">
                  <div className="text-[11px] text-dim">Bisa ditarik</div>
                  <div className="num mt-0.5 text-[14px] font-semibold">{fmt.usd(account?.withdrawable ?? 0, 2)}</div>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-white/[0.07] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium">Trading</span>
                  <span className={`text-[11.5px] ${agent ? "text-mint" : "text-amber"}`}>{agent ? "Aktif" : "Belum aktif"}</span>
                </div>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-dim">
                  {agent
                    ? `Agen ${shortAddr(agent.address)} menandatangani order di browser ini. Agen tidak bisa menarik dana.`
                    : "Setujui agen trading sekali (1 tanda tangan). Setelah itu order dikirim tanpa pop-up."}
                </p>
                {agent ? (
                  <button onClick={resetAgent} className="mt-2 text-[11.5px] font-medium text-dim hover:text-blood">
                    Hapus agen dari browser ini
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      setMenu(false);
                      await enableTrading();
                    }}
                    className="mt-2.5 w-full rounded-lg bg-amber py-2 text-[12.5px] font-semibold text-ink"
                  >
                    Aktifkan trading
                  </button>
                )}
              </div>
              <div className="mt-2 space-y-0.5">
                <a
                  href={`${APP_URL[net]}/portfolio`}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-lg px-2 py-2 text-[12.5px] text-dim hover:bg-white/[0.04] hover:text-bone"
                >
                  Deposit & tarik dana di Hyperliquid ↗
                </a>
                {net === "testnet" && (
                  <a
                    href={`${APP_URL.testnet}/drip`}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-lg px-2 py-2 text-[12.5px] text-dim hover:bg-white/[0.04] hover:text-bone"
                  >
                    Faucet USDC testnet ↗
                  </a>
                )}
                <a href="#/portofolio" onClick={() => setMenu(false)} className="block rounded-lg px-2 py-2 text-[12.5px] text-dim hover:bg-white/[0.04] hover:text-bone">
                  Buka portofolio
                </a>
                <button
                  onClick={() => {
                    setMenu(false);
                    disconnect();
                  }}
                  className="block w-full rounded-lg px-2 py-2 text-left text-[12.5px] text-dim hover:bg-white/[0.04] hover:text-blood"
                >
                  Putuskan dompet
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function PaletteBody({ close }: { close: () => void }) {
  const { net, setMarketKey } = useApp();
  const { main, hip3 } = useMarkets(net);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);
  const s = q.trim().toLowerCase();
  const pages = ALL_ROUTES.filter((r) => !s || r.label.toLowerCase().includes(s)).slice(0, 5);
  const mkts = useMemo(
    () =>
      [...main, ...hip3]
        .filter((m) => !s || m.key.toLowerCase().includes(s))
        .sort((a, b) => b.vol - a.vol)
        .slice(0, 7),
    [main, hip3, s],
  );
  return (
    <motion.div
      className="glass w-full max-w-[580px] overflow-hidden rounded-2xl"
      initial={{ y: -14, opacity: 0, scale: 0.98 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: -10, opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
        <svg viewBox="0 0 16 16" className="h-4 w-4 text-dim" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <circle cx="7" cy="7" r="4.5" />
          <path d="M10.5 10.5 14 14" strokeLinecap="round" />
        </svg>
        <input
          ref={ref}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari pasar atau halaman…"
          className="w-full bg-transparent text-[14px] text-bone outline-none placeholder:text-dim/70"
        />
        <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-dim">ESC</span>
      </div>
      <div className="max-h-[52vh] overflow-y-auto p-1.5">
        {mkts.length > 0 && <div className="px-3 pb-1 pt-2 text-[11px] font-medium text-dim">Pasar HyperCore</div>}
        {mkts.map((m) => (
          <a
            key={m.key}
            href="#/trade"
            onClick={() => {
              setMarketKey(m.key);
              close();
            }}
            className="flex items-center justify-between gap-4 rounded-xl px-3 py-2 transition-colors hover:bg-white/[0.05]"
          >
            <span className="flex min-w-0 items-center gap-3">
              <Glyph name={m.key} size={22} />
              <span className="truncate text-[13.5px]">{m.base}-USD</span>
              {m.dex && <span className="rounded border border-white/10 px-1 text-[10px] text-dim">{m.dex}</span>}
            </span>
            <span className="flex items-center gap-3">
              <span className="num text-[12px] text-bone">{fmtPx(m.mark, m.szDecimals)}</span>
              <span className={`num w-16 text-right text-[12px] ${m.change >= 0 ? "text-mint" : "text-blood"}`}>{fmt.pct(m.change)}</span>
            </span>
          </a>
        ))}
        {pages.length > 0 && <div className="px-3 pb-1 pt-3 text-[11px] font-medium text-dim">Halaman</div>}
        {pages.map((r) => (
          <a
            key={r.path}
            href={`#${r.path}`}
            onClick={close}
            className="flex items-center justify-between rounded-xl px-3 py-2.5 text-[13.5px] transition-colors hover:bg-white/[0.05]"
          >
            {r.label}
            <span className="font-mono text-[11px] text-dim">{r.path}</span>
          </a>
        ))}
        {!mkts.length && !pages.length && (
          <div className="px-4 py-10 text-center text-[12.5px] text-dim">Tidak ada hasil untuk “{q}”.</div>
        )}
      </div>
    </motion.div>
  );
}

function Toasts() {
  const { toasts, dismiss } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[95] flex w-[320px] max-w-[calc(100vw-40px)] flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.button
            key={t.id}
            layout
            initial={{ opacity: 0, x: 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 28 }}
            transition={{ duration: 0.24, ease: [0.2, 0.7, 0.2, 1] }}
            onClick={() => dismiss(t.id)}
            className="glass pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3 text-left"
          >
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                t.tone === "mint" ? "bg-mint" : t.tone === "blood" ? "bg-blood" : "bg-amber"
              }`}
            />
            <span className="text-[12.5px] leading-relaxed text-bone">{t.msg}</span>
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function Shell({ route, children }: { route: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setOpen(false);
        setDrawer(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => setDrawer(false), [route]);

  return (
    <div className="min-h-screen">
      <header className="fixed inset-x-0 top-0 z-[70] h-14 border-b border-white/[0.06] bg-ink/80 backdrop-blur-xl">
        <div className="flex h-full items-center gap-3 px-3 md:px-5">
          <button
            onClick={() => setDrawer(true)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-dim transition-colors hover:text-bone lg:hidden"
            aria-label="Buka navigasi"
          >
            <svg viewBox="0 0 16 16" className="h-4 w-4" stroke="currentColor" strokeWidth="1.4" fill="none" aria-hidden>
              <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
            </svg>
          </button>
          <Logo />
          <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
            {NAV_PRIMARY.map((n) => {
              const on = isActive(route, n.path);
              return (
                <a
                  key={n.path}
                  href={`#${n.path}`}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    on ? "bg-white/[0.07] text-bone" : "text-dim hover:text-bone"
                  }`}
                >
                  {n.label}
                </a>
              );
            })}
            <More route={route} />
          </nav>

          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <button
              onClick={() => setOpen(true)}
              className="hidden items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-left transition-colors hover:border-white/20 md:flex"
              aria-label="Cari"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 text-dim" stroke="currentColor" strokeWidth="1.5" fill="none" aria-hidden>
                <circle cx="7" cy="7" r="4.5" />
                <path d="M10.5 10.5 14 14" strokeLinecap="round" />
              </svg>
              <span className="hidden text-[12.5px] text-dim xl:inline">Cari pasar…</span>
              <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-dim">⌘K</span>
            </button>
            <div className="hidden sm:block">
              <NetSwitch />
            </div>
            <WalletButton />
          </div>
        </div>
      </header>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              className="fixed inset-0 z-[80] bg-ink/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
            />
            <motion.div
              className="fixed bottom-0 left-0 top-0 z-[85] flex w-[280px] flex-col gap-6 overflow-y-auto border-r border-white/[0.07] bg-[#0a0d10]/98 p-4 backdrop-blur-xl lg:hidden"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <Logo />
              <nav className="flex flex-col gap-0.5">
                {ALL_ROUTES.map((n) => {
                  const on = isActive(route, n.path);
                  return (
                    <a
                      key={n.path}
                      href={`#${n.path}`}
                      className={`rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors ${
                        on ? "bg-white/[0.07] text-bone" : "text-dim hover:text-bone"
                      }`}
                    >
                      {n.label}
                    </a>
                  );
                })}
              </nav>
              <div className="mt-auto">
                <div className="mb-2 text-[11px] text-dim">Jaringan</div>
                <NetSwitch />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[90] flex items-start justify-center bg-ink/70 px-4 pt-[12vh] backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <PaletteBody close={() => setOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <Toasts />

      <main className="relative pt-14">{children}</main>
    </div>
  );
}
