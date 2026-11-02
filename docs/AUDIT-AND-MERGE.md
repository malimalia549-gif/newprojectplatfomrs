# Audit repository dan keputusan penggabungan

Tanggal pemeriksaan: **2 November 2026**
Baseline Git: `1f6388c7e8299173b30da8cffcf129754f80a4a2`
Hasil: **`platform/` — Forge Unified**, berbasis Elysium (5).

## 1. Kesimpulan

**Gunakan `platform/` untuk pengembangan berikutnya.** Jika harus memilih satu proyek asli tanpa perubahan, pilih **`elysium-network-launchpad-platform (5)`** sebagai fondasi aplikasi, dengan **Trading UI (4)** sebagai referensi terminal dan **Trading UI (2)** sebagai referensi edukasi ekonomi.

Alasannya bukan sekadar jumlah halaman. Elysium (5) sudah memiliki pemisahan route, komponen, domain engine, schema database, dan API. Varian trading lebih kaya pada pengalaman pasar tertentu, tetapi mencampurkan state, data, dan pada T4 juga signing key di aplikasi browser. Menggabungkan semuanya sebagai dua aplikasi terpisah akan menghasilkan dua akun, dua saldo, dan dua sumber kebenaran. Implementasi gabungan memakai satu backend dan satu ledger sandbox.

**Tidak ada varian asli yang layak langsung dipakai untuk dana nyata.** Build yang berhasil tidak membuktikan kebenaran finansial, keamanan kunci, integrasi blockchain, atau kepatuhan operasional.

## 2. Ruang lingkup dan metode

Pemeriksaan mencakup 11 direktori proyek, bukan hanya kandidat terbaru:

1. Inventaris manifest, script, dependency, konfigurasi TypeScript/Next/Vite, struktur source, schema, API, state client, dan aset.
2. Perbandingan isi file dan perubahan antarvarian; pembacaan terarah pada autentikasi, pembayaran, curve, swap, perpetual, staking, lifecycle, faucet, notifikasi, chart, dan signing.
3. Instalasi dependency seluruh proyek asli, lalu typecheck dan build. Enam proyek Elysium juga menjalankan ESLint. Lima proyek Trading tidak mempunyai script lint.
4. Pencarian pola jaringan, penyimpanan browser, simulasi transaksi, polling, dan penggunaan key.
5. Pembuatan aplikasi gabungan, migrasi PostgreSQL, pengujian unit/API/ledger/browser, serta pemeriksaan dependency aktif.

Batas kejujuran: ini **bukan review manual setiap baris** dari lebih dari 70 ribu baris source. Sebagian file sangat panjang dibaca melalui bagian yang relevan dan pencarian pola. Tidak dilakukan audit smart contract independen, penetration test, load test, uji disaster recovery, atau verifikasi klaim protokol ke jaringan live. Tidak ada mainnet transaction yang dikirim.

Ukuran source dihitung dari file `.ts`, `.tsx`, `.css` di `src/`, tanpa dependency, build output, dan generated `next-env.d.ts`. Angka lengkap: [`audit-source-counts.json`](audit-source-counts.json). Jumlah baris adalah indikator ukuran, **bukan skor kualitas**.

## 3. Perbandingan seluruh varian

Notasi: E0–E5 mengikuti urutan nama folder Elysium tanpa sufiks lalu `(1)`–`(5)`. T0–T4 mengikuti urutan yang sama untuk Trading UI.

| Varian | Source | Kekuatan utama | Kekurangan / keputusan |
|---|---:|---|---|
| E0 — `elysium-network-launchpad-platform` | 31 file / 7.041 baris | Konsep lifecycle lengkap dalam app Next.js; terminal besar | Komponen sangat panjang, state tersentralisasi, integrasi finansial masih simulasi; bukan fondasi merge |
| E1 — `(1)` | 31 / 4.155 | Copy E0 dengan penyederhanaan UI, font lokal, dan sebagian klaim diperhalus | **Bukan salinan identik E0**: 14 file source berbeda setelah normalisasi whitespace; fitur terminal dipangkas |
| E2 — `(2)` | 47 / 7.339 | Awal arsitektur App Router + Drizzle/API yang lebih terpisah | Masih ada kekurangan atomicity/ownership dan UI belum selengkap penerusnya |
| E3 — `(3)` | 53 / 11.367 | Pengembangan besar halaman produk dan engine | Fondasi penting, tetapi masih menjadi tahap antara menuju E5 |
| E4 — `(4)` | 53 / 11.385 | Perbaikan workstation dan navigasi | Perubahan dari E3 relatif kecil; E5 lebih lengkap |
| **E5 — `(5)`** | **55 / 11.603** | Backend paling lengkap; launch/create/token, swap, perps, staking, dashboard, docs; Chart.js | **Fondasi terpilih**, tetapi lint asli gagal dan banyak invariant keuangan belum aman |
| T0 — `trading-platform-ui-design` | 15 / 4.096 | UI awal ringkas | Tidak memiliki kelengkapan backend/produk E5 |
| T1 — `(1)` | 22 / 5.384 | Shell, market rows, orderbook, animasi | Banyak state/data lokal; referensi visual saja |
| **T2 — `(2)`** | **19 / 2.272** | `Fees.tsx`, `Mechanism.tsx`, penjelasan ekonomi | **Diambil kalkulator fee-nya**, bukan seluruh app; angka adalah asumsi edukasi |
| T3 — `(3)` | 23 / 6.052 | Pengembangan terminal dan koneksi pasar | Tahap antara menuju T4 |
| **T4 — `(4)`** | **26 / 7.985** | Candle chart/crosshair, terminal, REST/WS HyperLiquid, EIP-712 | **Diambil pola chart/terminal-nya saja**; live signing tidak dimasukkan |

Perbandingan source menunjukkan E2→E3→E4→E5 merupakan evolusi dengan banyak file bersama. T1→T3→T4 juga memiliki hubungan evolusi; T4 tetap mempertahankan sebagian besar struktur T3 sambil menambah integrasi. T2 adalah cabang desain yang lebih ringkas, bukan sekadar T4 dengan beberapa file dihapus.

### Hasil pemeriksaan proyek asli

Semua angka berikut adalah exit code proses. `0` berarti lulus; `1` berarti gagal. `—` berarti script tidak tersedia, bukan lulus.

| Proyek | Install | Typecheck | Lint | Build |
|---|---:|---:|---:|---:|
| E0 | 0 | 0 | 1 | 0 |
| E1 | 0 | 0 | 1 | 0 |
| E2 | 0 | 0 | 1 | 0 |
| E3 | 0 | 0 | 1 | 0 |
| E4 | 0 | 0 | 1 | 0 |
| E5 | 0 | 0 | 1 | 0 |
| T0 | 0 | 0 | — | 0 |
| T1 | 0 | 0 | — | 0 |
| T2 | 0 | 0 | — | 0 |
| T3 | 0 | 0 | — | 0 |
| T4 | 0 | 0 | — | 0 |

Lint E5 asli mempunyai 17 error dan 2 warning. Jumlah finding berbeda pada setiap varian. Kesalahan umum berupa assignment state sinkron dalam effect, pembacaan ref saat render, inisialisasi browser storage saat render, dan dependensi hook. Tidak ada suite pengujian finansial substansial pada proyek asli; deklarasi dependency Playwright tidak sama dengan adanya test browser yang lengkap.

Data mentah: [`audit-baseline.json`](audit-baseline.json). Build original menggunakan konfigurasi environment dummy bila diperlukan; itu menguji kompilasi, **bukan** koneksi database atau kebenaran transaksi. Instalasi baseline memakai `--ignore-scripts` untuk mengurangi risiko selama audit.

## 4. Temuan penting pada source asli

### Kritis untuk dana nyata

1. **Simulasi diberi presentasi seperti integrasi live.** Alamat token, hash transaksi, block head, bridge, listing, dan saldo pada Elysium dihasilkan aplikasi. Label/mainnet checklist bukan bukti deployment atau settlement on-chain.
2. **T4 menyimpan agent private key di localStorage.** `src/lib/hl.ts` sekitar baris 547–624 membaca/menulis slot agent; `src/store.tsx` memilih mainnet secara default. XSS atau ekstensi browser dapat mengambil key. Karena itu modul `hl.ts`/`hlsign.ts` tidak disalin ke aplikasi gabungan.
3. **Pembayaran dapat memberi kredit berulang atau memakai receipt untuk tujuan berbeda.** Settlement, kepemilikan intent, kode konfirmasi, dan konsumsi receipt belum menjadi satu operasi yang kuat.
4. **Curve dan swap tidak atomik.** Debit, kredit, reserve, holder, dan riwayat dapat terpisah ketika operasi gagal. Beberapa perhitungan memakai saldo lama.
5. **Perpetual tidak mempunyai invariant ledger lengkap.** Ditemukan risiko funding ganda, trigger tidak memesan margin, TP/SL tidak dieksekusi dengan benar, dan pembulatan/clamping yang menyembunyikan kerugian.

### Tinggi / sedang

- Sell curve menaikkan reserve alih-alih menguranginya; pembelian yang melampaui kapasitas tetap ditagih penuh pada implementasi awal.
- Pengelompokan holder dapat memecah pengguna yang sama menjadi beberapa baris.
- Lifecycle settlement belum memeriksa creator/keeper secara konsisten; budget ticker tidak selalu didebit.
- Lock staking tidak benar-benar mencegah penarikan awal; klaim airdrop/vesting kurang kuat terhadap pengulangan dan akses silang akun.
- Faucet menerima input multiplier/boost yang tidak layak dipercaya; notifikasi kurang membatasi ownership.
- GET pasar memicu perubahan harga/funding, sehingga pembacaan mempunyai efek finansial.
- Sesi, CSRF, rate limit, secure cookie, validasi body, dan penanganan error belum memadai untuk layanan publik.
- E5 tidak menyertakan migration SQL yang siap dijalankan, font yang dirujuk tidak lengkap, dan kegagalan seed dapat tersamarkan.
- T2 memakai contoh seperti porsi taker 50% dan stake 500.000 HYPE. Itu bukan jaminan aturan HIP-3 terbaru; kalkulator gabungan memberi label asumsi dan bukan proyeksi.

## 5. Apa yang benar-benar digabungkan

| Bagian | Sumber | Hasil di `platform/` |
|---|---|---|
| App Router, schema, domain engine, launchpad, portfolio | E5 | Fondasi tunggal; bukan iframe atau tempelan dua aplikasi |
| Candle chart dengan sumbu piksel dan crosshair | T4 `PriceChart.tsx` | `components/heritage-price-chart.tsx`, dipakai di dalam `/trade` |
| Susunan market/chart/order ticket | T4 dan workstation E5 | Satu workstation `/trade`: candlestick, watchlist tersimpan, pencarian, market/limit, TP/SL, posisi dan pembatalan |
| Kalkulator fee/volume | T2 `Fees.tsx` | `components/fee-calculator.tsx`, route `/economics` |
| Identitas visual | E5 | Tema terang editorial; area Pro gelap; navigasi/footer bersama |
| Font | dependensi Fontsource | Inter/Manrope self-hosted; tidak bergantung pada Google Fonts saat runtime |
| Ilustrasi hero | aset baru | `public/images/forge-orbit.png`; gambar hasil generasi, bukan dokumentasi jaringan |

Seluruh folder asli dipertahankan. Perubahan generated `next-env.d.ts` yang muncul selama audit original dikembalikan/dibersihkan; source original tidak dijadikan tempat perbaikan unified.

## 6. Perbaikan unified dan batasnya

### Database dan transaksi

- PostgreSQL nyata, bukan array in-memory atau PGlite palsu yang disebut PostgreSQL.
- 20 tabel dengan migration awal dan migration tambahan untuk binding cashtag receipt.
- `ledgerTransaction()` memakai transaksi PostgreSQL dan advisory transaction lock. Helper domain membaca koneksi transaksi yang sama melalui `AsyncLocalStorage`.
- Debit/kredit, reserve, holder, fee, payment consumption, dan order reservation berada dalam satu transaksi.
- Idempotency key terikat pada user, path, dan fingerprint body; retry concurrent mengembalikan receipt yang sama, bukan kredit kedua.
- Client memakai key yang sama ketika mengulang kegagalan transport/502/503/504. Operasi baru mendapat key baru.

**Batas:** global advisory lock sengaja dipilih untuk kebenaran sandbox, bukan throughput produksi. Saldo masih `double precision`; produksi perlu integer/decimal, double-entry ledger, account-scoped locking, outbox, dan rekonsiliasi. Receipt/idempotency belum mempunyai kebijakan retensi produksi.

### Curve, swap, lifecycle

- Pembelian di atas kapasitas curve hanya menagih HYPE yang diperlukan.
- Penjualan mengurangi reserve; fee dicatat terpisah.
- Saldo dibaca ulang di dalam transaksi; overspend ditolak.
- Quote yang ditampilkan dikirim sebagai `expectedOut`; eksekusi menolak perubahan harga di luar toleransi.
- Input sell curve sekarang selalu jumlah token; konversi persen dilakukan sekali di client.
- Holder dikelompokkan per akun; jumlah holder dihitung dari saldo positif.
- Lifecycle creator/keeper, debit ticker budget, dan konsumsi receipt cashtag diperiksa.
- Cashtag receipt terikat ke launch, simbol, pemilik, kode, dan minimum fee; konfirmasi dan listing dilakukan atomik.

**Batas:** ini simulasi bonding curve/AMM, bukan kontrak Uniswap atau orderbook HyperCore. Seed history/holder merupakan ilustrasi awal, bukan bukti transaksi historis. Lifecycle bridge/outbox adalah state machine lokal. Tidak ada klaim bahwa pool benar-benar terkunci on-chain.

### Perpetual

- GET pasar tidak lagi menjalankan tick.
- `/api/simulation` adalah clock eksplisit dengan throttle lintas viewer; client hanya mengirim heartbeat saat tab terlihat.
- Funding dicatat sekali berdasarkan waktu, bukan dipotong dua kali dari margin dan PnL.
- Market order memeriksa leverage, notional, saldo, dan arah posisi.
- Limit/stop order memesan margin dan biaya; cancel mengembalikan reservation sekali.
- Sweep mengeksekusi TP/SL dan likuiditasi berdasarkan mark-to-market; close tidak dapat membayar posisi yang sama dua kali.
- Open interest dihitung ulang dari posisi terbuka setelah aktivitas pengguna.

**Batas:** harga, depth, tape, dan funding adalah simulasi. Likuiditasi sandbox memakai harga likuidasi model, bukan matching engine bursa nyata; gap/slippage ekstrem, insurance fund, ADL, cross-margin, dan counterparties belum dimodelkan. OI/volume seed awal adalah ilustrasi dan dapat berubah saat posisi nyata sandbox dibuka.

### Akun, pembayaran, staking

- Password scrypt dengan salt; sesi acak disimpan sebagai hash; cookie HttpOnly/SameSite, Secure sesuai environment.
- Pemeriksaan origin dan batas ukuran body; throttle login/register persisted di database.
- Tidak ada endpoint transfer X Money nyata. `LIVE=false` secara eksplisit.
- Top-up HYPE hanya menambah HYPE; top-up margin hanya menambah USDC. Receipt memiliki pemilik, tujuan, expiry, dan konsumsi sekali.
- Stake lock benar-benar menolak penarikan sebelum unlock; airdrop mempunyai constraint unik per akun/tier; vesting dan notifikasi dibatasi pemilik.
- Multiplier faucet otomatis dan manfaat tier yang belum diimplementasikan tidak lagi dijanjikan sebagai fitur aktif. Query boost yang tidak dipakai dihapus.
- Founder buy di atas 3 HYPE ditolak, bukan diam-diam dipotong. Deployment perp sandbox diberi label gratis tanpa klaim stake 500.000 HYPE yang sebenarnya tidak didebit.
- Input kalkulator ekonomi menunggu hidrasi sebelum menerima perubahan, sehingga input awal tidak hilang saat JavaScript baru dimuat.

**Batas:** akun demo memakai password publik dan saldo bersama; jangan memakai mode demo sebagai akun pelanggan nyata. Email belum diverifikasi, belum ada MFA/password reset, dan proteksi edge/WAF belum dipasang. Klaim X handle tidak memverifikasi kepemilikan akun X.

## 7. Verifikasi aplikasi gabungan

| Pemeriksaan | Hasil |
|---|---|
| TypeScript | Lulus |
| ESLint | Lulus, tanpa suppression untuk menutup finding |
| Unit | **23/23** |
| HTTP + PostgreSQL API | **6/6** |
| Ledger transaction rollback | **5/5** |
| Browser Chromium | **16/16** |
| Production build Next.js | Lulus |
| `npm audit` seluruh dependency aktif | **0 vulnerability** setelah upgrade/override |
| `npm audit --omit=dev` | **0 vulnerability** |

Versi aplikasi gabungan memakai Next.js **16.4.3**, bukan 16.2.6 milik original. Audit awal menemukan advisory kritis/high pada Next/PostCSS/sharp; upgrade menanganinya. Override `minimatch@11.0.3` dan nested `esbuild@0.25.12` menangani advisory tooling. Lint dan generator migrasi diuji ulang setelah override. Ini hasil registry pada tanggal audit, bukan jaminan bebas kerentanan selamanya.

Cakupan pengujian:

- Unit: curve cap/reserve/fee/pool, tanda PnL, liquidation side, mark/book, password/session hashing, handle/payment formatting, tier/APY, normalizer Hyperliquid (perp/spot/book/trades/candle) dan error client info.
- API: auth/cookie/CSRF/input, GET tanpa tick, retry pembayaran concurrent, key/payload binding, ownership receipt, single credit HYPE/USDC, capped curve buy, lifecycle sampai perp/cashtag, wrong code/replay, swap balances/overspend/stale quote, margin reservation/refund/close, stake lock, airdrop repeat, notification ownership, faucet cooldown.
- Ledger: funding sekali, TP benar-benar profit, SL benar-benar close rugi, liquidation tidak dapat dicairkan dua kali, limit fill memakai reservation sekali.
- Browser: home dan gambar lokal, search/watchlist/login demo/order/close sandbox, kalkulator ekonomi, swap klasik, navigasi mobile dan overflow, redirect Pro/terminal, navigasi Docs tanpa Pro, data live Hyperliquid read-only dengan fixture, toggle live/sandbox, outage tanpa fallback harga palsu, logo resmi Hyperliquid termasuk HIP-3 tanpa agregator, fallback monogram saat ikon resmi hilang, dan hydration/build-id lintas halaman.

Pengujian browser memakai Chromium headless yang tersedia di sandbox melalui override executable; konfigurasi juga mendukung instalasi Playwright biasa. Screenshot/trace pengujian tidak dimasukkan ke Git. Pengujian API meninggalkan akun/token disposable pada database lokal; jangan gunakan database produksi. Ledger test melakukan rollback seluruh skenario.

Perbaikan yang ditemukan **oleh test**, bukan diasumsikan berhasil: menu mobile kalah prioritas CSS sehingga tersembunyi; eksekusi TP/SL mengambil mark lama dari database alih-alih mark sweep; pembayaran cashtag sebelumnya melewati endpoint top-up; dan beberapa asumsi test perlu menyesuaikan aturan otorisasi/simbol yang benar. Perbaikan tersebut sudah diuji ulang. Ringkasan dan output perintah akhir tersedia di [`verification/`](verification/).

## 8. Cara menjalankan dan keputusan operasional

Lihat [README utama](../README.md) dan [`platform/.env.example`](../platform/.env.example).

- `npm run dev` menjalankan embedded PostgreSQL lokal, migrasi, lalu Next.js.
- Database hanya loopback; web bind ke `0.0.0.0` untuk preview.
- Data lokal dan credentials environment tidak masuk Git.
- `DATABASE_URL` eksternal melewati embedded database.
- Untuk reverse proxy, set `APP_ORIGIN` dan pastikan proxy menimpa header forwarding dari client, bukan meneruskan nilai sembarang.
- Untuk preview HTTPS lintas situs, `COOKIE_SAMESITE=none` menghasilkan cookie Secure/Partitioned. Untuk deployment first-party gunakan konfigurasi Secure standar.
- Build produksi: `npm run build`; start memerlukan `DATABASE_URL` dan migrasi yang sudah diterapkan.

## 9. Blocker sebelum produksi

**Wajib sebelum menerima dana atau order nyata:**

1. Tentukan jaringan, produk, badan usaha, yurisdiksi, serta tanggung jawab kustodian. Jangan mengasumsikan semua integrasi tersedia atau diizinkan.
2. Ganti ledger floating-point dengan unit integer/decimal dan jurnal double-entry; rekonsiliasi saldo, fee, reserve, reward, supply, dan posisi setiap hari.
3. Implementasikan kontrak/adapter protokol yang benar, oracle terverifikasi, nonce/reorg/finality handling, serta outbox idempotent.
4. Pindahkan signing ke wallet pengguna melalui batas izin yang jelas atau signer service terisolasi/HSM. Jangan menyimpan private key di localStorage.
5. Integrasi pembayaran merchant resmi dengan webhook bertanda tangan, verifikasi amount/asset/purpose, replay protection, refund, dan reconciliation. Jangan menganggap kode yang dimasukkan user sebagai bukti transfer.
6. Tambahkan verifikasi email, reset password, MFA untuk peran istimewa, session revocation, RBAC/admin audit log, edge rate limiting, dan abuse controls.
7. Pisahkan demo dari akun pelanggan; hilangkan kredensial publik dan pemberian saldo bebas pada lingkungan produksi.
8. Tambahkan backup terenkripsi, restore drill, observability, alerting, secret management, maintenance mode, dan incident response.
9. Uji beban serta kegagalan: koneksi putus setelah debit, retry bersamaan, database failover, stale oracle, harga gap, likuiditasi massal, dan payment webhook ganda.
10. Audit keamanan dan ekonomi independen, pengujian invariant/property-based yang lebih luas, serta review legal/compliance.

**Rekomendasi akhir:** lanjutkan dari `platform/` sebagai sandbox produk terpadu. Jangan menggabungkan kembali source original secara manual dan jangan mengaktifkan live trading hanya dengan menambahkan API key. Urutan berikutnya adalah memilih target deployment, menuntaskan model ledger dan integrasi terverifikasi, lalu melakukan audit independen.


## 10. Revisi setelah umpan balik pengguna: satu halaman Trade

Terminal Pro terpisah dihapus karena menduplikasi fungsi perpetual dan memakai tema gelap yang tidak konsisten. Fitur candlestick/crosshair dan watchlist dipindahkan ke workstation Trade yang sudah ada. Tema grafik disesuaikan dengan tema terang platform. `/pro` dan `/terminal` sekarang redirect permanen ke `/trade` sambil mempertahankan query string. Tidak ada dua UI trading yang perlu dipelihara.


## 11. Revisi data pasar asli: Hyperliquid read-only di Trade

Permintaan pengguna: perpetual dan market memakai data asli, bukan hanya angka sandbox. Implementasi menjaga satu halaman `/trade` dan tema terang yang sama.

- `platform/src/lib/hyperliquid.ts`: client POST read-only ke `https://api.hyperliquid.xyz/info`, timeout, abort, dan normalizer `metaAndAssetCtxs`, `spotMetaAndAssetCtxs`, `l2Book`, `recentTrades`, `candleSnapshot`.
- `platform/src/components/use-hyperliquid.ts`: polling pasar 12 detik dan instrument 6 detik, visibility gating, stale/offline eksplisit, partial failure, tanpa signing.
- `platform/src/components/hyperliquid-workstation.tsx`: market rail, candlestick/line/depth/info, orderbook/trades, funding/OI, watchlist lokal, mobile selector, dan ticket yang menegaskan **Real orders disabled**.
- `platform/src/components/hyperliquid-token-icon.tsx`: logo aset dari CDN resmi Hyperliquid, dibentuk dinamis dari coin id live (`app.hyperliquid.xyz/coins/<COIN_ID>.svg`). Prefix HIP-3 dipertahankan (`xyz:TSLA`), bukan hardcoded per-token dan bukan CoinGecko/agregator. Fallback monogram hanya jika ikon resmi gagal dimuat. Tab Market info menampilkan status ikon dan URL resmi aktif supaya kegagalan pemuatan bisa didiagnosis tanpa menebak.
- `platform/src/components/build-guard.tsx` dan build-id produksi: mencegah bundle lama terus dipakai setelah preview diperbarui; AppShell tidak lagi menjadi client component yang tidak perlu.
- `/trade` default live; `/trade?data=sandbox` atau deep link sandbox (`m`, `from`, `to`, `mode=swap`) membuka workstation simulasi. Toggle mengubah query `data`, bukan membuat halaman baru.
- Batas: tidak ada wallet, private key, agent signing, deposit, withdrawal, atau order nyata. Data live hanya dibaca. Sandbox server/CI tidak dapat mencapai Hyperliquid, sehingga browser test memakai mock endpoint; preview pengguna mengambil langsung dari browser.
- Verifikasi: **50 test (23 unit + 6 API + 5 ledger + 16 browser)**, `npm run check` lulus, production build dynamic, `npm audit`/`npm audit --omit=dev` 0 vulnerability.

## 12. Revisi tab sumber pasar dan paper execution (tahap pertama)

Keputusan pengguna: Hyperliquid / Launchpad sebagai tab di market list, bukan tombol perpindahan seluruh halaman; Hyperliquid mendukung paper trading dengan harga asli.

Implementasi: shared MarketSourceTabs menggantikan tombol Open sandbox trading / Live market data. HyperliquidPaperTicket memakai pure ledger paper-trading.ts untuk reserve margin, long/short, spot buy, close sekali dan cap kerugian pada margin. Saldo awal 10.000 paper USD. UI memblokir aksi saat feed stale/offline. Browser test memeriksa reserve, reload persistence, close, serta tidak adanya POST ke exchange atau backend perp.

Batas eksplisit: saldo Hyperliquid hanya localStorage perangkat, terpisah dari backend Launchpad dan Portfolio. Tidak ada fee, slippage, funding, limit/stop atau likuidasi otomatis; bukan simulasi matching engine lengkap. API Hyperliquid tetap info-only, tidak ada exchange action nyata.

**Belum selesai:** dua renderer workstation masih dipilih oleh TradeRouter. Ini tahap navigasi + paper ticket, bukan klaim bahwa satu shell/ticket/ledger sudah benar-benar menggantikan kedua renderer. Duplikasi internal masih perlu refactor lanjutan.

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
