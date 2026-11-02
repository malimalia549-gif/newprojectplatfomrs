import { Btn, Lamp, Micro, Screw } from "../components/ui";
import { ALL_ROUTES } from "../store";

export default function NotFound() {
  return (
    <section className="wrap flex min-h-[62vh] flex-col justify-center py-20">
      <div className="flex items-center gap-3">
        <Lamp on color="blood" pulse />
        <Micro className="text-blood">ERROR 404 · RUTE TIDAK TERDAFTAR</Micro>
      </div>
      <h1 className="mt-6 text-[clamp(2.2rem,7.4vw,5.4rem)] font-bold leading-[0.87] tracking-[-0.045em]">
        Buku pesanan
        <br />
        tidak mengenal
        <br />
        <span className="text-dim">alaman ini.</span>
      </h1>
      <p className="mt-6 max-w-md text-[13.5px] leading-relaxed text-dim">
        Router mengembalikan nol baris untuk alamat tersebut. Pilih rute yang terdaftar di bawah
        ini, atau tekan <span className="font-mono text-bone">⌘K</span> untuk mencari pasar.
      </p>

      <div className="mt-9 grid gap-px border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-4">
        {ALL_ROUTES.map((r) => (
          <a
            key={r.path}
            href={`#${r.path}`}
            className="group flex items-center justify-between gap-3 bg-[#0e1216] px-4 py-4 transition-colors hover:bg-[#161b20]"
          >
            <span>
              <span className="block text-[13px] font-semibold text-bone">{r.label}</span>
              <Micro className="text-dim">{r.path}</Micro>
            </span>
            <span className="tnum font-mono text-[10px] text-edge transition-colors group-hover:text-amber">{r.index}</span>
          </a>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Btn href="#/" variant="primary">
          Kembali ke dashboard
        </Btn>
        <Btn href="#/trade" variant="ghost">
          Buka terminal
        </Btn>
        <Screw className="ml-auto" />
      </div>
    </section>
  );
}
