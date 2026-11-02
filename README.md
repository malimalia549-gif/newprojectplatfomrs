# Forge Unified — hasil audit & penggabungan repository

Repository ini berisi **11 proyek asli** dan satu aplikasi gabungan di [`platform/`](platform/). Rekomendasi saya: gunakan **Elysium (5) sebagai fondasi**, bukan memilih salah satu UI trading saja. Fondasi tersebut sudah mempunyai backend, database, akun, launchpad, swap, perpetual, portfolio, dan tokenomics; bagian terbaik dari varian lain dapat diintegrasikan tanpa menggabungkan dua framework aplikasi.

**Status: sandbox lokal yang dapat dijalankan dan diuji, bukan platform mainnet siap menerima uang.** Halaman `/trade` sekarang default memakai data pasar asli Hyperliquid mainnet secara read-only; saldo, order, dan posisi tetap simulasi. Tidak ada transaksi bursa, transfer X Money, bridge, atau deployment kontrak nyata dalam aplikasi gabungan.

## Hasil penggabungan

- Backend dan identitas visual: `elysium-network-launchpad-platform (5)`.
- Grafik candlestick, crosshair, dan struktur terminal: diadaptasi dari `trading-platform-ui-design (4)` menjadi bagian dari `/trade`.
- Kalkulator fee/volume: diadaptasi dari `trading-platform-ui-design (2)` menjadi `/economics`.
- Satu akun dan saldo backend untuk launchpad, curve, swap, perpetual Launchpad, staking, pembayaran sandbox, dan portfolio. Paper trading Hyperliquid memakai saldo latihan lokal terpisah (lihat batasan di bawah).
- PostgreSQL lokal otomatis, 20 tabel, migrasi SQL, seed demo, transaksi keuangan atomik, dan pengujian regresi.
- Seluruh source asli tetap tersedia. Jangan menjadikannya dependency aplikasi gabungan.

## Menjalankan

Prasyarat: **Node.js 22.12+**, npm, Linux x64 untuk paket embedded PostgreSQL yang digunakan preview ini. Tidak perlu memasang PostgreSQL terpisah untuk mode lokal.

```bash
npm ci
npm run dev
```

Buka `http://localhost:3000`. Di preview Arena, gunakan panel **Forge Unified Platform**. Next.js bind ke `0.0.0.0:3000`; PostgreSQL hanya bind ke loopback port `55432`.

Launcher menjalankan migrasi sebelum Next.js. Database lokal berada di `platform/.local/postgres` dan tidak dimasukkan ke Git. Menghentikan launcher juga menghentikan database. Jika port bentrok, set `LOCAL_DB_PORT`.

Akun demo:

- Email: `demo@forge.xyz`
- Password: `forge1234`
- Atau klik **Sign in → Continue as demo**.

Kredensial ini hanya untuk akun sandbox publik. Jangan memakai ulang password tersebut.

## Rute utama

| Rute | Fungsi |
|---|---|
| `/` | Ringkasan platform dan launch terbaru |
| `/launch`, `/create`, `/token/[slug]` | Discovery, launch studio, curve dan lifecycle |
| `/trade` | Satu workstation: data pasar live Hyperliquid (read-only) atau sandbox swap/perpetual, candlestick/line/depth, watchlist, TP/SL, posisi dan order |
| `/pro`, `/terminal` | Redirect ke `/trade`; tidak ada terminal terpisah |
| `/economics` | Kalkulator ekonomi dengan asumsi terbuka |
| `/stoke` | Staking, lock, airdrop, vesting |
| `/dashboard` | Portfolio dan riwayat akun |
| `/docs`, `/about` | Dokumentasi produk dan batas integrasi |

## Pemeriksaan

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit

# Dengan npm run dev aktif dan database sandbox disposable:
npm run test:api
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55432/elysium_sandbox \
  npm run test:ledger --workspace=elysium-unified-platform

# Browser pertama kali:
npx playwright install chromium
npm run test:e2e
```

`test:api` membuat akun/token uji di database yang sedang berjalan. `test:ledger` memakai transaksi PostgreSQL lalu rollback. Jangan menjalankan pengujian terhadap database produksi. Hasil verifikasi environment ini: **50 test: 23 unit + 6 API + 5 ledger + 16 browser**, semuanya lulus; lihat [laporan audit](docs/AUDIT-AND-MERGE.md).

Untuk database eksternal, set `DATABASE_URL`. Launcher tidak akan membuat embedded PostgreSQL jika variabel itu tersedia. Migrasi eksplisit: `npm run db:migrate`. Lihat [`platform/.env.example`](platform/.env.example).

## Sebelum produksi

Jangan hanya mengganti label `sandbox` menjadi `mainnet`. Dibutuhkan audit independen; ledger decimal/integer dengan double-entry; pembukuan fee dan supply yang dapat direkonsiliasi; kontrak dan oracle sebenarnya; kunci signing di luar browser; integrasi pembayaran terverifikasi; pembatasan akses dan rate limit di edge; backup/restore; monitoring; serta pengujian beban dan kegagalan jaringan. Daftar terperinci ada di laporan audit.

## Dokumen dan bukti

- [`docs/AUDIT-AND-MERGE.md`](docs/AUDIT-AND-MERGE.md): audit, perbandingan 11 varian, keputusan merge, temuan dan blocker produksi.
- [`docs/audit-baseline.json`](docs/audit-baseline.json): hasil install/typecheck/lint/build proyek asli.
- [`docs/audit-source-counts.json`](docs/audit-source-counts.json): ukuran source dengan metode penghitungan yang konsisten.
- [`platform/tests/`](platform/tests/): regresi yang dapat dijalankan ulang.

## Data pasar asli di `/trade`

- Default `/trade` atau `/trade?data=live`: harga, candle, orderbook, trades, funding, dan open interest dibaca langsung dari `https://api.hyperliquid.xyz/info` (Hyperliquid mainnet) oleh browser. Tidak ada API key, wallet, private key, atau order nyata.
- Logo aset live diambil langsung dari CDN resmi Hyperliquid (`https://app.hyperliquid.xyz/coins/<COIN_ID>.svg`) berdasarkan coin id dari API live. Untuk HIP-3, prefix DEX dipertahankan (`xyz:TSLA` -> `coins/xyz:TSLA.svg`). Tidak ada map logo per-token yang di-hardcode, tidak ada CoinGecko/agregator, dan listing baru otomatis mengikuti sumber resmi. Jika ikon resmi tidak tersedia, UI memakai monogram fallback. Tab **Market info** menampilkan status ikon (Loaded / Unavailable / Loading) beserta URL resmi yang bisa dibuka langsung untuk pemeriksaan.
- Daftar perpetual live memakai `metaAndAssetCtxs` + discovery `perpDexs` dan context per DEX, sehingga mencakup HyperCore native dan builder-deployed HIP-3, bukan hanya DEX utama.
- Preview produksi memakai build stabil dan build-id guard untuk mengurangi risiko HTML/JS berbeda versi (hydration mismatch akibat bundle lama).
- `/trade?data=sandbox` atau tautan dengan `m`, `from`, `to`, `mode=swap`: workstation sandbox lama dengan saldo/order/posisi simulasi. Navigasi memakai tab **Hyperliquid / Launchpad** di daftar pasar; tombol Open sandbox trading dihapus.
- Jika API publik gagal/rate-limit, UI menampilkan status `STALE`/`OFFLINE` dan pesan error, bukan menggantinya diam-diam dengan harga palsu.
- Sandbox server/CI tidak memiliki akses keluar ke Hyperliquid; pengujian browser memakai fixture yang mem-mock endpoint tersebut. Di preview pengguna, browser mengambil data langsung dari API publik.

Angka pasar sandbox, alamat, tx hash, saldo, dan hasil staking pada aplikasi gabungan adalah simulasi. Data live Hyperliquid hanya dibaca, bukan bukti bahwa platform terhubung untuk eksekusi order atau compliance protokol. Kalkulator ekonomi bukan proyeksi pendapatan.

## Revisi navigasi Trade dan paper trading Hyperliquid

- Tab **Hyperliquid / Launchpad** ada di daftar pasar, tanpa tombol Open sandbox trading.
- Hyperliquid: harga asli + paper order dengan 10.000 paper USD lokal. Long/short perpetual 1–20x (dibatasi market), beli spot 1x; close memakai mark terbaru. Order diblokir bila feed tidak fresh.
- Akun latihan Hyperliquid disimpan di localStorage browser, **bukan** ledger backend Launchpad, tidak tersinkron ke akun/perangkat lain dan tidak muncul di Portfolio backend. Data lokal dapat diubah pengguna; bukan sumber kebenaran finansial.
- Fill instan pada mark. Belum ada fee, slippage, funding, limit/stop order, likuidasi otomatis. Kerugian saat close dibatasi margin.
- **Belum tuntas:** dua renderer workstation masih terpisah di source. Tab bukan penyatuan struktur internal sepenuhnya. Penyatuan shell, ticket, dan ledger adalah pekerjaan lanjutan; jangan mengklaim refactor ini sudah selesai hanya karena tombol lama dihapus.

### Koreksi kontrak feed perpetual dan diagnostik (2026-11-03)

Klaim sebelumnya bahwa allPerpMetas berisi pasangan metadata dan asset contexts adalah salah. Fixture lama ikut mengkodekan asumsi yang salah, sehingga test hijau tidak menjamin feed asli bekerja. Loader kini menggunakan metaAndAssetCtxs native, perpDexs discovery (cache 5 menit), lalu metaAndAssetCtxs per DEX dengan concurrency maksimal 3. Kegagalan HIP-3 tidak menghapus perpetual native; warning menyebut feed yang gagal. Polling daftar pasar 60 detik, stale threshold 90 detik; instrumen tetap 6 detik. Rate budget bergantung jumlah DEX dan tab/IP bersama, bukan jaminan bebas rate-limit.

Spot contexts dicocokkan lewat coin id jika tersedia, atau index pasar jika respons tidak membawa coin id, bukan semata posisi baris. Regression test memeriksa respons yang urutannya berbeda.

Error candle kini menyebut coin, interval, dan HTTP error; respons candle kosong tidak diperlakukan sebagai sukses lengkap. Depth tidak lagi disembunyikan oleh pesan candle kosong. Ikon tetap CDN resmi dengan no-referrer; status gagal dan tombol retry terlihat di notice, bukan hanya tab info. Perubahan referrer/retry **bukan bukti** akar kegagalan CDN di browser pengguna sudah teratasi. Sandbox tidak dapat menguji endpoint/CDN asli; test browser menggunakan fixture kontrak yang diperbaiki. Logo tidak dijamin tersedia untuk setiap listing.

### Resolver logo spot: UBTC dan namespace CDN (2026-11-03)

Alur produksi diperbaiki, bukan hanya menambahkan pesan error:

1. Simpan `baseFullName` dan `baseTokenId` dari `spotMetaAndAssetCtxs`, bukan hanya ticker tampilan.
2. Kandidat spot di CDN Hyperliquid: `{base}_spot.svg`, `{base}_{quote}.svg`, `{base}.svg`.
3. Tambahkan `{underlying}.svg` hanya untuk metadata fullName berawalan `Unit `, nama L1 `U...`, dan underlying hasil pelepasan satu prefix U cocok persis dengan simbol native perp live. Tidak ada map UBTC->BTC atau artwork per-token. Ini aturan penamaan dengan guard metadata/live-symbol, **bukan registry identitas issuer yang diverifikasi secara kriptografis**. Token Unit dengan alias yang tidak mengikuti aturan tidak ditebak (misalnya UFART vs FARTCOIN).
4. Kandidat dicoba berurutan melalui image decoding; status HTTP 200 berisi HTML tidak dianggap gambar. Semua kandidat wajib origin `https://app.hyperliquid.xyz/coins/`; tidak menggunakan agregator atau file mirror GitHub saat runtime.
5. Market info memperlihatkan fullName, token ID, kandidat, dan URL terakhir/berhasil. Asset/candidate changes me-reset state agar logo sebelumnya tidak tertinggal.

Bukti penelitian:
- Dokumentasi issuer Unit, [Token Metadata](https://docs.hyperunit.xyz/developers/key-addresses/mainnet/token-metadata), mencatat BTC / UBTC / Unit Bitcoin (terkonfirmasi via hasil indeks halaman resmi; fetch langsung docs gagal pada environment ini).
- [LI.FI Hyperliquid assetLogo resolver](https://github.com/lifinance/perps-sdk/blob/53d78b6d83c9f709414d9f5b4bd7a33e85c0b744/packages/perps-sdk-provider-hyperliquid/src/utils/assetLogo.ts) dan test-nya memberi bukti implementasi independen untuk namespace `_spot` serta Unit artwork fallback. Ini **bukan source aplikasi resmi Hyperliquid**. Override hardcoded, Debank, dan alias table dari source tersebut tidak disalin.
- Kandidat `_USDC` juga ditemukan di beberapa integrasi publik independen. Kami membentuk quote suffix dari metadata aktual (tidak menganggap semua pair USDC), dan hanya memakai gambar bila benar-benar berhasil didecode.

Verifikasi baru: regression UBTC memaksa tiga path UBTC membalas HTTP 200 HTML, membuktikan resolver melanjutkan BTC.svg, naturalWidth > 0, URL source di info benar, dan pergantian ke HYPE me-reset gambar. Test unit menolak pelepasan U tanpa fullName Unit atau tanpa native ticker cocok.

Batas: koneksi langsung ke CDN dari sandbox tetap diblokir (SSL_ERROR_SYSCALL); hasil fixture bukan bukti semua file CDN tersedia di browser pengguna. Tidak ada jaminan semua token memiliki artwork. Perubahan nyata ini memperbaiki alur resolusi dan membuktikan fallback bekerja, bukan mengklaim observasi live yang tidak dilakukan.
