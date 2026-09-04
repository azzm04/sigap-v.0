# CLAUDE.md

Panduan untuk Claude Code pada proyek ini. Baca sampai habis sebelum menulis kode.

**Nama kerja aplikasi: SIGAP.** Sistem pemantauan GL. Nama sementara, boleh diganti pemilik proyek. Pakai untuk nama proyek, judul di antarmuka, dan subdomain.

---

## 1. Konteks Proyek

Dashboard monitoring GL (Guarantee Letter / surat jaminan) untuk korban kecelakaan lalu lintas, milik Jasa Raharja cabang Semarang.

**Masalah yang diselesaikan.** Volume GL di wilayah ini tinggi. Sebagian GL mandek berhari-hari sampai berbulan tanpa ada yang menyadari, sehingga tagihan rumah sakit terlambat dibayar. Dashboard ini memunculkan GL yang melewati ambang waktu agar petugas meninjau ulang.

**Batas tegas.** Aplikasi lain sudah menangani pembuatan GL dan daftar GL berjalan. Aplikasi ini hanya memantau. Jangan usulkan atau bangun fitur pembuatan, pengubahan, atau pembatalan GL.

**Pengguna.** Satu orang, petugas monitoring di Semarang. Bukan orang teknis. Antarmuka harus sederhana dan tidak memerlukan pelatihan panjang.

**Dua peran PIC internal.** Sejak fitur pemetaan PIC (bagian 5, tabel `pic_rumah_sakit`), pemantauan dibagi ke dua peran per rumah sakit — bukan berarti aplikasi mulai "bertindak", ini tetap murni pencatatan siapa yang bertanggung jawab, bukan alur kerja baru yang dijalankan aplikasi:

- **PIC Task Force** — orang yang datang langsung ke rumah sakit, mengecek apakah korban sudah pulang. Mengisi `Tanggal Masuk` dan `Tanggal Pulang Pasien` di halaman detail GL (lihat bagian 7, Peringatan PIC Task Force).
- **PIC Pengajuan** — orang yang mengajukan GL bertahap `Verifikasi User`/`Done` ke DASI-JR setelah korban pulang (lihat bagian 7, Peringatan PIC Pengajuan). Butuh "Laporan Survei TKP" sebagai syarat dokumen — generator-nya masih Tahap 2 (bagian 6).

**Referensi tampilan.** Klien sudah punya dashboard Power BI bernama JRCARE. Aplikasi ini harus mencakup informasi serupa, ditambah kemampuan yang tidak dimiliki Power BI: mendeteksi GL yang mandek dan mencatat tindak lanjut petugas.

**Sumber data.** Data GL dibaca dari DASI (`dasi.jasaraharja.co.id`), sistem internal Jasa Raharja, bukan dari JRCare. JRCare hanya jadi acuan tampilan. Rincian teknis DASI ada di bagian 3 dan di `docs/domain-gl.md`.

---

## 2. Aturan Keras

Aturan berikut tidak boleh dilanggar tanpa persetujuan eksplisit dari pemilik proyek.

1. **Aplikasi tidak menyentuh sistem pusat sama sekali.** Data hanya masuk lewat unggahan berkas ekspor. Jangan bangun koneksi, scraping, atau pemanggilan otomatis apa pun ke DASI maupun JRCare. Semua tulisan masuk ke database lokal aplikasi ini.

2. **Ambang hari tidak boleh di-hardcode.** Nilai default 14, tetapi harus dapat diubah lewat halaman pengaturan. Jangan tulis angka 14 di dalam logika.

3. **Daftar nilai enum tidak boleh di-hardcode di kode.** Tahapan, Status Verifikasi, Tipe Cidera, dan sejenisnya disimpan di tabel referensi atau file konfigurasi. Data nyata sudah memunculkan nilai yang tidak disebut klien di awal (misalnya Status Verifikasi `Process`), jadi daftar ini bisa bertambah kapan saja.

4. **Data korban adalah data pribadi.** Nama korban, nomor ID jaminan, dan nomor surat jaminan tidak boleh masuk ke log aplikasi, pesan error, atau layanan pemantauan pihak ketiga. Gunakan ID internal saat mencatat log. Berkas ekspor yang diunggah memuat data korban, jadi simpan di lokasi yang tidak dapat diakses publik dan pertimbangkan menghapusnya setelah berhasil diproses. Konsekuensi dari aturan ini: URL halaman detail GL (`/gl/[token]`) TIDAK memuat Nomor ID Jaminan asli, melainkan token terenkripsi (`lib/gl/token-url.ts`, AES-256-CBC pakai `AUTH_SECRET`) — supaya URL yang ke-screenshot, ke-paste, atau tersimpan di riwayat browser tidak langsung membocorkan ID Jaminan korban. Token dibuat deterministik (ID Jaminan sama selalu jadi token sama) supaya `revalidatePath` tetap menyasar path yang benar.

5. **Seluruh teks antarmuka memakai bahasa Indonesia, format Indonesia.** Termasuk pesan error, label kolom, dan tombol. Tanggal `DD/MM/YYYY`. Angka uang diawali `Rp` dengan pemisah ribuan titik, contoh `Rp 2.636.400`. Zona waktu WIB. Nama variabel dan komentar kode boleh bahasa Inggris.

6. **Autentikasi cukup satu akun, di-set manual.** Tidak perlu halaman pendaftaran atau kelola pengguna. Kredensial diisi lewat variabel lingkungan atau seeder, bukan lewat antarmuka. Jangan bangun alur multi-pengguna kecuali diminta.

7. **Selama pengembangan gunakan data dummy.** Struktur dummy wajib mengikuti kolom asli di `docs/domain-gl.md` persis, termasuk nilai enum-nya. Sediakan seeder yang menghasilkan minimal 500 baris dengan sebaran tahapan dan umur yang bervariasi, termasuk kasus GL yang sudah lewat ambang dan beberapa baris `Cancel`.

8. **Jangan menambah fitur di luar daftar scope di bagian 6.** Kalau menurutmu ada fitur yang jelas kurang, tulis sebagai catatan, jangan langsung dibangun.

---

## 3. Stack

- Framework: Next.js 15, App Router, TypeScript
- Database aplikasi: PostgreSQL
- ORM: Drizzle ORM
- Autentikasi: Auth.js dengan Credentials provider
- UI: Tailwind CSS + shadcn/ui
- Tabel data: TanStack Table
- Grafik: Recharts
- Ekspor Excel: SheetJS
- Penjadwalan sinkronisasi: cron sistem memanggil API route terproteksi
- Deployment: Docker Compose di VPS

### Soal PostgreSQL dan Supabase

Aplikasi ini hanya butuh PostgreSQL biasa. Autentikasi ditangani Auth.js, akses data lewat Drizzle, dan tidak ada kebutuhan realtime, penyimpanan berkas, maupun REST API otomatis.

Karena itu cukup jalankan container `postgres:16` di Docker Compose. Supabase self-hosted membawa sekitar sepuluh container tambahan yang tidak satupun dipakai proyek ini. Beban server naik dan serah terima ke tim instansi jadi lebih rumit.

Kalau Supabase tetap dipakai, wajib versi self-hosted di VPS yang sama. **Jangan pakai Supabase Cloud.** Alasannya ada di bagian 8, dan itu bukan soal teknis melainkan soal kepatuhan.

### Konsekuensi stack ini

**Next.js tidak punya penjadwal bawaan.** Tidak masalah, karena sumber data masuk lewat impor manual, bukan sinkronisasi terjadwal. Tidak ada cron yang perlu dijalankan.

**Sumber data wajib di balik adapter.**

Drizzle hanya untuk database lokal. Data GL masuk lewat unggahan berkas ekspor dari JRCare, bukan koneksi langsung ke sistem pusat. Bungkus di balik adapter agar pengembangan bisa jalan dengan data dummy tanpa berkas asli.

Bangun satu antarmuka di `lib/sumber-data/index.ts`:

```ts
export interface SumberData {
  ambilGL(): Promise<BarisGL[]>;
}
```

Sediakan dua implementasi:

- `sumber-dummy.ts` — membangkitkan data contoh, dipakai selama pengembangan
- `sumber-impor.ts` — mem-parse berkas ekspor `.xlsx`/`.csv` yang diunggah petugas. **Jalur utama dan satu-satunya untuk produksi**

Keduanya menghasilkan bentuk `BarisGL[]` yang sama, lalu masuk ke normalizer yang sama.

**Kenapa impor manual, bukan akses otomatis.** Klien tidak memiliki teknisi IT. Akses otomatis ke DASI menuntut pemeliharaan sesi, cookie, dan penanganan galat yang tidak ada yang bisa pegang saat rusak. Impor manual dijalankan siapa saja tanpa pengetahuan teknis. Untuk satu pengguna dan ambang 14 hari, kesegaran data harian sudah memadai. Riwayat akses otomatis ke DASI disimpan di `docs/domain-gl.md` sebagai rujukan kalau suatu saat klien punya kapasitas teknis, tetapi bukan jalur yang dibangun sekarang.

### Keamanan Login

**Rate limiting.** Maksimal 5 percobaan login gagal per 15 menit per username. Implementasi in-memory (`lib/auth/rate-limit.ts`) — cukup untuk deployment satu server. Setelah batas terlampaui, formulir login menampilkan "Terlalu banyak percobaan, coba lagi dalam X menit" dan tidak meneruskan ke Auth.js. Hitungan direset otomatis setelah login berhasil atau setelah jendela 15 menit lewat.

**Ingat Saya.** Checkbox di halaman login (`components/login/login-form.tsx`). Dicentang = sesi JWT bertahan 30 hari. Tidak dicentang = sesi JWT bertahan 8 jam (satu hari kerja). Nilai disimpan sebagai `token.sessionExpiry` di JWT, diperiksa di callback `jwt` (`auth.config.ts`) setiap request — kalau lewat, token dikosongkan dan pengguna diarahkan ke halaman login. Petugas yang memakai komputer pribadi bisa centang supaya tidak perlu login setiap hari; di komputer bersama sebaiknya tidak dicentang.

**Alur login lewat Server Action.** Formulir login tidak lagi POST langsung ke `/api/auth/callback/credentials`. Sekarang memakai Server Action `app/login/actions.ts` yang: (1) verifikasi CAPTCHA (kalau aktif, lihat di bawah), (2) cek rate limit, (3) panggil `signIn()` dari Auth.js, (4) kembalikan pesan galat spesifik (CAPTCHA/rate limit/kredensial salah) lewat `useActionState`. CSRF ditangani otomatis oleh Next.js Server Action.

**CAPTCHA login (Cloudflare Turnstile).** `lib/auth/turnstile.ts` -- lapisan tambahan di depan rate limiting, supaya percobaan otomatis (bot) tidak sempat menyentuh rate limit maupun Auth.js sama sekali. Sengaja **opsional lewat env var**: kalau `TURNSTILE_SECRET_KEY` kosong, `turnstileAktif()` bernilai `false`, verifikasi selalu lolos, dan widget-nya (`components/login/login-form.tsx`) tidak dirender sama sekali -- form login tetap berfungsi normal tanpa CAPTCHA sebelum kunci Cloudflare didaftarkan (dev/staging). Kalau Cloudflare tidak bisa dihubungi saat verifikasi, dianggap GAGAL (bukan lolos) -- jangan sampai layanan pihak ketiga down malah jadi celah brute force. Kunci uji resmi Cloudflare (`1x00000000000000000000AA` / `1x0000000000000000000000000000000AA` = selalu lolos, `2x0000000000000000000000000000000AA` = selalu gagal) aman dipakai untuk tes lokal, JANGAN di produksi -- lihat `.env.example`.

**`AUTH_URL` WAJIB diisi di produksi.** Redirect setelah login (`signIn`, `app/login/actions.ts`) dan setelah logout (`signOut`, `components/layout/app-shell.tsx`) dibangun Auth.js sebagai URL **absolut**, bukan path relatif. Basisnya dari `createActionURL()` (`@auth/core/lib/utils/env.js`): kalau `AUTH_URL`/`NEXTAUTH_URL` kosong, dia menebak dari header `X-Forwarded-Host` lalu `Host`. Jadi kalau reverse proxy di VPS meneruskan `Host: localhost:3000` (nginx `proxy_pass http://localhost:3000;` tanpa `proxy_set_header Host $host;`), petugas terlempar ke `http://localhost:3000/login` begitu menekan Keluar -- sudah pernah kejadian di produksi. `trustHost: true` di `auth.config.ts` TIDAK menolong di sini, karena `createActionURL` memang tidak melihat opsi itu sama sekali. Isi `AUTH_URL=https://gltrackersemarang.com` di `.env` VPS supaya URL-nya tidak lagi bergantung pada header proxy. Jangan diisi URL produksi di `.env.local` untuk dev lokal.

### Cara mem-parse berkas ekspor di `sumber-impor.ts`

Berkas ekspor adalah `.xlsx` (atau `.csv` — SheetJS membaca dua-duanya lewat kode yang sama tanpa cabang khusus, sudah diuji di `sumber-impor.test.ts`) satu sheet. Bentuknya bukan tabel bersih dari baris pertama, jadi parser harus tahan terhadap strukturnya. Rincian kolom dan contoh nilai ada di `docs/domain-gl.md`.

**Boleh unggah banyak berkas sekaligus.** `app/kelola-data/actions.ts` (`unggahBerkas`) menerima beberapa file dalam satu `FormData`, diproses satu-satu, hasilnya dilaporkan per-berkas. Ekstensi divalidasi eksplisit (`.xlsx`/`.csv`) sebelum dicoba di-parse. Catatan: parser DASI (`sumber-dasi.ts`) BELUM mendukung `.csv` — kolom tanggalnya masih mengharuskan serial tanggal Excel (angka), yang tidak ada di CSV (selalu teks). Kalau DASI-CSV benar dibutuhkan, format tanggalnya harus dikonfirmasi dulu ke pemilik proyek (bagian 8), jangan ditebak.

**Lewati blok filter di atas.** Sekitar 14 baris pertama berisi ringkasan filter (Tipe Klaim, Tanggal, Username, dan sebagainya), bukan data. Jangan berasumsi header ada di baris pertama. Cari baris yang memuat teks `Tipe Klaim`, `Nomor ID Jaminan`, dan `Tahapan` sekaligus, itulah baris header sebenarnya. Data mulai satu baris di bawahnya.

**Buang baris total.** Baris terakhir memuat `Total Data Klaim` dan sebuah angka, bukan data GL. Kenali dan buang.

**Perlakukan `-` sebagai kosong.** Tanggal dan nilai yang kosong ditulis sebagai `-`, bukan sel kosong. Ubah menjadi null saat parsing, jangan sampai memicu galat konversi.

**Tanggal berformat `DD-MM-YYYY`.** Contoh `13-08-2026`. Parse eksplisit dengan format ini, jangan andalkan penerjemah tanggal bawaan yang bisa salah menebak bulan dan hari.

**Angka bisa berupa teks tanpa pemisah ribuan.** Contoh `2636400`. Konversi ke number saat impor.

**Toleran terhadap baris kosong di tengah.** Data contoh memuat satu baris yang seluruh selnya kosong. Lewati baris semacam ini, jangan menghentikan proses.

**Validasi sebelum menyimpan.** Kalau baris header tidak ditemukan atau jumlah kolom tak sesuai, tolak berkas dengan pesan jelas ke petugas, jangan menyimpan data separuh. Petugas bisa saja mengunggah berkas yang salah.

**Idempoten terhadap unggahan ganda.** Petugas bisa mengunggah berkas periode yang sama dua kali. Pakai Nomor ID Jaminan sebagai kunci agar impor ulang memperbarui baris yang ada, bukan menggandakannya.

**Semua query data GL berjalan di server.** Jangan kirim baris mentah ke client component. Kirim hanya kolom yang benar-benar ditampilkan. Ini konsekuensi dari aturan keras nomor 4 soal data pribadi.

**Sinkronisasi harus idempoten.** Cron bisa terpanggil dua kali. Pakai kunci sederhana di tabel pengaturan supaya dua proses sinkronisasi tidak berjalan bersamaan.

---

## 4. Perintah

```bash
npm run dev              # menjalankan aplikasi mode pengembangan
npm run build            # build produksi
npm run start            # menjalankan hasil build
npm run lint
npm run test

npx drizzle-kit generate # membuat berkas migrasi
npx drizzle-kit migrate  # menjalankan migrasi

npm run seed             # mengisi data dummy (600 baris GL palsu) + data referensi/konfigurasi
npm run seed:referensi   # HANYA data referensi/konfigurasi (nilai_referensi, pengaturan, pic_rumah_sakit) -- TIDAK menyentuh data GL, aman dijalankan di lingkungan yang sudah berisi data nyata
npm run buat-akun        # membuat/reset akun lewat ADMIN_USERNAME/ADMIN_PASSWORD di .env.local
```

**Migrasi tidak mengisi data.** `drizzle-kit migrate` cuma membuat struktur tabel, bukan isinya. Setiap kali skema menambah kategori `nilai_referensi` atau tabel referensi baru, jalankan `npm run seed:referensi` setelah migrasi supaya dropdown-nya tidak kosong -- ini baru pernah bikin bingung sekali (dropdown Tahap Proses kosong padahal kode sudah paling baru), jangan lupa lagi.

> Skrip `sinkronisasi` (untuk cron impor otomatis) belum pernah dibangun -- lihat aturan keras #1, impor tetap manual.

---

## 5. Model Data

Aplikasi punya database sendiri, terpisah dari pusat. Ini yang membedakannya dari sekadar tampilan Power BI.

### `gl_mirror`
Salinan data GL dari impor terakhir. Diperbarui setiap kali petugas mengunggah berkas ekspor JRCare.

Kolom mengikuti `docs/domain-gl.md`, ditambah:
- `id` — primary key lokal
- `id_jaminan` — Nomor ID Jaminan, dipakai sebagai kunci alami untuk mencocokkan baris antar-impor
- `diimpor_pada` — timestamp impor terakhir yang menyentuh baris ini
- `dihapus_pada` — soft delete dari "Hapus Semua Data" (bagian 6), `NULL` kalau aktif. Semua query tampilan wajib menyaring baris ini
- `tgl_kejadian`, `lokasi` — dari berkas DASI terpisah (`sumber-dasi.ts`), dicocokkan lewat nama korban. Nullable, hanya terisi kalau berkas DASI sudah diunggah dan cocok
- `tanggal_masuk`, `tanggal_pulang_pasien` — **manual**, diisi PIC Task Force lewat halaman detail GL, bukan dari berkas ekspor mana pun. Sengaja di luar kontrak `BarisGL` (`lib/sumber-data/index.ts`) supaya otomatis tidak tertimpa saat impor JRCare diulang -- pola yang sama dengan `tgl_kejadian`/`lokasi`. Lihat bagian 7, Peringatan PIC Task Force dan Peringatan PIC Pengajuan

### `gl_snapshot`
Riwayat perubahan antar-impor. **Ini inti dari nilai aplikasi.**

Berkas ekspor hanya memuat keadaan GL saat ini, bukan kapan tahapannya berubah. Dengan menyimpan snapshot tiap impor, aplikasi membangun riwayat yang tidak dimiliki berkas ekspor maupun Power BI. Dari sinilah deteksi stagnasi bekerja.

Kolom: `id`, `id_jaminan`, `tahapan`, `status_verifikasi`, `status_pembayaran`, `direkam_pada`

**Aturan penulisan.** Setiap impor, bandingkan nilai tiap GL dengan snapshot terakhirnya. Sisipkan baris baru **hanya jika ada nilai yang berubah**. Jangan menyisipkan baris di setiap impor, tabel akan membengkak.

**Catatan akurasi.** Karena riwayat dibangun dari selisih antar-impor, granularitasnya sehalus frekuensi impor. Kalau petugas mengimpor sekali sehari, perubahan tahapan tercatat dengan ketelitian harian. Itu cukup untuk ambang 14 hari.

### `impor_log`
Catatan tiap aktivitas yang mengubah `gl_mirror` secara massal, dibedakan lewat kolom `jenis`: `impor` (unggahan berkas, sukses atau ditolak beserta alasan), `hapus`/`pulihkan` (Hapus Semua Data dan pemulihannya dari Sampah), `hapus_permanen`. Kolom `nama_berkas` cuma relevan untuk jenis `impor`. Berguna untuk menunjukkan kapan data terakhir diperbarui dan riwayat aktivitas Kelola Data.

### `tinjauan`
Catatan tindak lanjut petugas, sekaligus status abaikan.

Kolom: `id`, `id_jaminan`, `user_id`, `catatan`, `perlu_tindak_lanjut`, `diabaikan`, `alasan_abaikan`, `ditinjau_pada`

`diabaikan = true` menyingkirkan GL dari papan peringatan secara permanen. Dipakai saat petugas memastikan GL sebenarnya sudah aman, misalnya sudah dibayar di pusat padahal berkas impor terakhir belum mencerminkannya. Juga dipakai OTOMATIS oleh `catatTahapProses()` (lihat `status_proses_pusat` di bawah) begitu tahap mencapai "Berkas Selesai".

Baris bisa diedit (perbaikan salah ketik) atau dihapus lewat halaman detail GL -- lihat `app/gl/[idJaminan]/actions.ts`, `perbaruiTinjauan`/`hapusTinjauan`. Menghapus baris yang `diabaikan = true` menghilangkan pengecualian permanennya; `status_pembayaran` di `gl_mirror` sendiri tidak ikut berubah.

### `pengaturan`
Key-value. Minimal berisi ambang hari peringatan (`ambang_hari_peringatan`).

### `pengguna`
Autentikasi. Cukup sederhana, penggunanya satu orang.

### `nilai_referensi`
Daftar nilai enum terbuka, wajib dibaca dari sini, bukan di-hardcode (aturan keras #3). Kolom: `id`, `kategori`, `nilai` (unique per pasangan). Kategori yang sudah ada: `tahap_proses_pusat` (10 nilai, lihat `status_proses_pusat` di bawah). Diisi lewat `npm run seed:referensi` (`lib/seed-data.ts`), idempoten.

### `status_proses_pusat`
Riwayat tahap proses GL di **sistem pusat** -- bukan tahapan JRCare. Diisi **manual** oleh petugas di halaman detail GL, karena aplikasi tidak menyentuh sistem pusat sama sekali (aturan keras #1). Kolom: `id`, `id_jaminan`, `tahap`, `loket_pelimpahan`, `user_id`, `dicatat_pada`. Tahap terkini = baris terbaru per `id_jaminan`.

Tiga tahap, urut sesuai alur kerja (`TAHAP_PROSES_PUSAT` di `lib/gl/tahap-proses.ts`): **"Berkas Belum Di Limpah"** → **"Berkas Diajukan Ke Pusat"** → **"Berkas Selesai"**.

Begitu tahap mencapai **"Berkas Selesai"**, `gl_mirror.status_pembayaran` otomatis diubah jadi `Paid` dan dikunci permanen lewat `tinjauan.diabaikan` (mekanisme yang sama seperti tombol Abaikan manual).

**`loket_pelimpahan` hanya terisi untuk tahap "Berkas Belum Di Limpah"**, null untuk tahap lain. Disimpan per baris riwayat (bukan di `gl_mirror`) supaya kelihatan loket mana yang dicatat saat itu kalau petugas mengoreksinya belakangan. Daftar 11 loket tujuannya ada di `lib/gl/pelimpahan.ts` -- file konfigurasi murni tanpa impor db, sengaja begitu supaya boleh diimpor client component (dropdown di form tahap dan filter halaman Pelimpahan).

**JANGAN campur `loket_pelimpahan` dengan `gl_mirror.loket`.** Yang kedua itu kode loket dari berkas ekspor JRCare (mis. `0400601`); yang pertama nama loket cabang tujuan pelimpahan yang dipilih petugas manual. Kebetulan sama-sama bernama "loket", tapi isinya beda bentuk dan beda sumber.

### `pic_rumah_sakit`
Pemetaan PIC per rumah sakit, dua peran (bagian 1): `pic_task_force`, `pic_pengajuan`. Kolom: `id`, `nama_rumah_sakit` (unique), `pic_task_force`, `pic_pengajuan`, `diperbarui_pada`. Diedit lewat halaman Pengaturan (CRUD penuh), bukan hardcode.

**Pencocokan nama rumah sakit harus EXACT (dinormalisasi trim+uppercase), bukan fuzzy/contains.** `nama_rumah_sakit` di sini harus persis sama dengan yang muncul di `gl_mirror.nama_rumah_sakit` (yang formatnya lengkap dengan kota, mis. `"RSUD TUGUREJO, KOTA SEMARANG"`, bukan singkatan seperti `"RS TUGUREJO"`). Kalau tidak cocok, PIC-nya diam-diam tidak muncul di tabel GL -- bukan error, tapi petugas perlu tahu untuk memperbaiki ejaannya lewat Pengaturan. Fuzzy match sengaja dihindari supaya rumah sakit yang namanya mirip (mis. "RS Banyumanik" vs "RS Banyumanik 2") tidak ketuker PIC-nya.

---

## 6. Scope

### Tahap 1 — dikerjakan sekarang

- Login, dengan rate limiting (maks 5 percobaan gagal per 15 menit) dan checkbox "Ingat Saya" (sesi 8 jam / 30 hari)
- Unggah berkas ekspor `.xlsx`/`.csv` (satu atau beberapa berkas sekaligus) dan impor ke database, deteksi otomatis JRCare vs DASI
- Perekaman snapshot tiap impor saat ada perubahan
- Tabel daftar GL dengan filter: loket, tahapan, status pembayaran, rentang tanggal
- Pencarian berdasarkan nama korban dan nomor ID jaminan
- Halaman detail GL, termasuk riwayat tahapan dari snapshot
- Papan peringatan GL yang lewat ambang umur — sekarang dua jenis: **Peringatan PIC Task Force** dan **Peringatan PIC Pengajuan** (bagian 7), masing-masing tab sendiri di halaman Laporan Peringatan
- Tandai sudah ditinjau, dengan catatan -- bisa diedit dan dihapus dari halaman detail GL (perbaikan salah ketik)
- Tombol abaikan untuk menyingkirkan GL dari peringatan (mis. ternyata sudah dibayar)
- Pencatatan tahap proses di sistem pusat (Sub Pra-Verifikasi s.d. Berkas Selesai) di halaman detail GL, manual, memicu `status_pembayaran` jadi `Paid` otomatis begitu mencapai "Berkas Selesai" (bagian 5, `status_proses_pusat`)
- Halaman **Pelimpahan**: daftar GL yang tahap terkininya "Berkas Belum Di Limpah", dengan kolom Loket Cabang tujuan, rekap jumlah per loket yang bisa diklik untuk menyaring, filter (loket, PIC Pengajuan, rentang Tgl GL, pencarian), dan ekspor Excel yang mengikuti filter aktif (bagian 7, Pelimpahan berkas antar-loket)
- Pencatatan `Tanggal Masuk`/`Tanggal Pulang Pasien` oleh PIC Task Force di halaman detail GL
- Pemetaan PIC per rumah sakit (Task Force, Pengajuan), CRUD penuh di halaman Pengaturan (bagian 5, `pic_rumah_sakit`)
- Kartu ringkasan dan 2 sampai 3 grafik
- Ekspor Excel hasil olahan
- URL halaman detail GL memakai token terenkripsi, bukan Nomor ID Jaminan asli (bagian 2, aturan keras #4)
- Hapus Semua Data (soft delete) di halaman Kelola Data, dengan modal konfirmasi, dan halaman Sampah untuk memulihkan. Ditambahkan atas permintaan eksplisit pemilik proyek setelah Tahap 1 awal selesai — lihat kolom `dihapusPada` di `gl_mirror` (bagian 5) dan `lib/gl/sampah.ts`. ID Jaminan yang di-soft-delete otomatis hidup lagi kalau muncul di impor berikutnya (berkas ekspor tetap sumber kebenaran paling baru).

### Tahap 2 — jangan dikerjakan dulu

- Deteksi stagnasi berbasis snapshot, melengkapi perhitungan umur
- Halaman sebaran per loket dan rumah sakit
- ~~Rekap email harian atau pengingat impor~~ — sempat dibangun (email SMTP + cron), lalu diminta dihapus total oleh pemilik proyek karena tidak akan dipakai. Jangan dibangun ulang tanpa diminta eksplisit lagi.
- Kelola pengguna
- Halaman log impor yang lebih rinci
- **Generator "Laporan Survei TKP"** — dokumen syarat pengajuan GL ke pusat lewat DASI-JR (dua dokumen wajib di luar JRCare: Laporan Survei TKP dan KSKK). PIC Pengajuan isi manual: Nomor LP, Alamat Korban, Uraian dan Kesimpulan, Nama+TTD Saksi. Sisanya (Nama Korban, Jenis Survey selalu "Kesterjaminan Korban", Tempat/Tgl Laka) diambil otomatis dari detail GL. TTD Kepala Cabang + Staff Administrasi sudah ada di template, tinggal pakai. Setelah generate, tersimpan ke database dan disebut di kolom DOKUMEN pada spreadsheet OneDrive (lihat item sinkronisasi di bawah)
- **Sinkronisasi 2 arah dengan spreadsheet Monitoring GL di OneDrive** — spreadsheet ini yang selama ini dipakai manual (kolom TGL MASUK, NAMA, NO GL, LOKASI LAKA, TANGGAL PASIEN PULANG, STATUS JR CARE, DOKUMEN, PIC, dst). Belum ada rencana teknis konkret, taruh di sini sebagai penanda kebutuhan, jangan mulai desain sebelum diminta eksplisit

Karena berkas ekspor ternyata memuat kolom Tahapan beserta Tgl Diajukan dan Tgl Verifikasi, deteksi stagnasi lebih layak daripada perkiraan awal. Tetap taruh di Tahap 2 karena butuh beberapa siklus impor dulu agar riwayatnya terisi. Bangun tabel snapshot-nya sejak Tahap 1 supaya riwayat mulai terkumpul lebih awal.

---

## 7. Aturan Domain

### Umur GL

```
umur_hari = tanggal_hari_ini - Tgl GL
```

Satuan hari kalender. `Tgl GL` adalah tanggal terbit GL di berkas ekspor, format `DD-MM-YYYY`. Dipakai untuk tampilan umum ("Umur GL" di kolom tabel dan halaman detail) dan urutan Papan Peringatan — **bukan** lagi satu-satunya dasar pemicu peringatan, lihat dua aturan di bawah.

### Dua peringatan, dua PIC

Sejak fitur PIC (bagian 1 dan 5), Papan Peringatan terbagi jadi dua aturan independen dengan tab terpisah di halaman Laporan Peringatan — jangan gabung logikanya jadi satu:

| | Peringatan PIC Task Force | Peringatan PIC Pengajuan |
| --- | --- | --- |
| Menandakan | Belum sempat/selesai kunjungan ke RS | Belum diajukan ke DASI-JR |
| Dasar umur | `Tanggal Masuk` (manual) | `Tanggal Pulang Pasien`, fallback `Tgl GL` |
| Berlaku di tahapan | SEBELUM `Verifikasi User`/`Done` | `Verifikasi User`/`Done` |
| Fungsi murni | `lib/gl/aturan-peringatan-task-force.ts` | `lib/gl/aturan-peringatan.ts` (nama fungsi tidak diganti, lihat catatan migrasi di bawah) |

**Catatan migrasi.** Fungsi `apakahMasukPeringatan` di `aturan-peringatan.ts` dan test-nya TIDAK diubah sama sekali — tetap menerima field `umurHari` sebagai basis threshold. Yang berubah cuma NILAI yang dikirim ke situ dari `lib/gl/peringatan.ts`: sekarang dihitung dari `Tanggal Pulang Pasien` (fallback `Tgl GL`), bukan dari `Tgl GL` langsung. Kalau menyentuh kode ini lagi, jangan bingung membaca nama field `umurHari` di pure function itu — nama historisnya bertahan, maknanya sudah bergeser jadi "umur untuk aturan ini secara spesifik".

### Peringatan PIC Task Force

**Prinsip.** Menandakan PIC Task Force belum sempat (atau belum selesai) kunjungan ke rumah sakit untuk memastikan korban masih dirawat atau sudah pulang. Berlaku SEBELUM GL sampai `Verifikasi User` — begitu sampai situ, otomatis dianggap kunjungan sudah selesai, giliran Peringatan PIC Pengajuan yang aktif.

```
umur_sejak_masuk = tanggal_hari_ini - Tanggal Masuk
```

`Tanggal Masuk` diisi manual oleh PIC Task Force di halaman detail GL saat kasus mulai dipantau — bukan Tgl GL, dan tidak otomatis dari mana pun.

Sebuah GL masuk Peringatan PIC Task Force bila **semua** kondisi berikut terpenuhi:

```
tipe_klaim      = 'GL'
gl_status       = 'Active'
Tanggal Masuk   sudah diisi (tidak NULL)
tahapan         BUKAN ('Verifikasi User', 'Done')
umur_sejak_masuk >= ambang_hari
(Tanggal Pulang Pasien kosong ATAU Lokasi LAKA kosong)
```

Dua field terakhir cukup **salah satu** kosong (OR, bukan AND) — keduanya sama-sama tanda data kunjungan belum lengkap. `Lokasi LAKA` sumbernya berkas DASI terpisah (bisa saja belum pernah ter-impor untuk korban ini), bukan diisi manual PIC Task Force.

### Peringatan PIC Pengajuan

**Prinsip.** Sistem hanya memperingatkan GL yang bolanya ada di tangan PIC Pengajuan, bukan yang masih diproses rumah sakit atau lapisan verifikasi. Sepanjang alur awal (penerbitan GL, pelengkapan data korban oleh RS, pengajuan klaim) adalah urusan pihak lain, jadi diabaikan meski lewat ambang hari. Yang ditindak hanya tahap **Verifikasi User** dan **Done**.

Alur bisnisnya: DASI menerbitkan GL, masuk ke JRCare, RS melengkapi data korban, korban pulang (PIC Task Force konfirmasi lewat `Tanggal Pulang Pasien`), RS mengajukan klaim, lalu RS meminta pembayaran ke Jasa Raharja, masuk Verifikasi User, lalu Done — PIC Pengajuan harus ajukan ke DASI-JR di titik ini (perlu Laporan Survei TKP, Tahap 2).

```
umur_pengajuan = tanggal_hari_ini - (Tanggal Pulang Pasien ATAU Tgl GL kalau kosong)
```

**Kenapa ada fallback ke Tgl GL.** Kalau `Tanggal Pulang Pasien` belum diisi PIC Task Force (kasus lama sebelum fitur ini ada, atau memang belum sempat diisi), GL tidak boleh diam-diam hilang dari pemantauan hanya gara-gara satu field kosong — jatuh balik ke `Tgl GL` sebagai estimasi. UI WAJIB menandai baris begini dengan badge "berdasarkan Tgl GL" (kolom Umur Pengajuan di tab Daftar GL), jangan diam-diam mencampur seperti pola stagnasi di bawah.

Sebuah GL masuk Peringatan PIC Pengajuan bila **semua** kondisi berikut terpenuhi:

```
tipe_klaim         = 'GL'
gl_status          = 'Active'
status_pembayaran  = 'Unpaid'
tahapan  IN ('Verifikasi User', 'Done')
umur_pengajuan    >= ambang_hari
```

Perhatikan `tahapan IN (...)`, bukan `!=`. Hanya dua tahap ini yang dipantau. Semua tahap lain masuk wilayah Peringatan PIC Task Force di atas.

Kenapa `Done` tetap ikut diperingatkan: `Done` di sini berarti proses selesai, tetapi belum tentu sudah dibayar. Yang menentukan aman atau tidak adalah `status_pembayaran`, bukan tahapan. GL berstatus `Done` tapi masih `Unpaid` dan sudah lewat ambang hari tetap perlu ditinjau.

Pengecualian yang wajib ditegakkan:

- **`status_pembayaran = 'Paid'` tidak pernah masuk peringatan.** Sudah dibayar berarti aman. Ini inti aturannya.
- **`gl_status = 'Cancel'` selalu dikeluarkan.** GL dibatalkan tidak perlu ditinjau.
- **`tipe_klaim = 'Reimbursement'` dikeluarkan.** Jalur klaim berbeda, bukan GL.
- **Baris kosong atau baris total dikeluarkan.** Sudah ditangani di lapisan impor, tapi papan peringatan tidak boleh berasumsi datanya bersih.

**Tombol abaikan.** Ada kalanya GL lewat ambang hari muncul di peringatan, lalu petugas mengecek dan ternyata sudah dibayar di pusat padahal berkas impor belum mencerminkannya. Untuk kasus ini sediakan tombol Abaikan yang menyingkirkan GL dari papan peringatan secara permanen, dengan alasan tercatat. Berbeda dari Tandai Sudah Ditinjau yang hanya menandai, Abaikan menghapusnya dari daftar. Simpan status ini di tabel `tinjauan`. Mekanisme yang sama juga terpicu otomatis lewat tahap "Berkas Selesai" (bagian 5, `status_proses_pusat`).

Catatan: kode angka Status Jaminan (0 sampai 5) berasal dari **form pencarian DASI**, sedangkan berkas ekspor memakai teks seperti di atas. Jangan campur keduanya. Aturan ini memakai teks karena sumbernya berkas ekspor.

### Keterbatasan model impor yang harus tampil di antarmuka

Sistem hanya sesegar berkas terakhir yang diunggah. Petugas perlu mengunggah berkas terbaru secara berkala agar status GL mutakhir. Tampilkan label jelas seperti "Data terakhir diperbarui: [tanggal impor terakhir]" di dashboard, supaya petugas selalu sadar tingkat kesegaran datanya dan tidak salah menyimpulkan dari data lama.

### KSKK GL pelimpahan: checkbox tanda tangan

Untuk GL yang dilimpahkan, KSKK datang dari loket lain dalam keadaan **sudah bertanda tangan**. Penempelan tanda tangan sendiri terjadi di `app/api/kskk/[token]/route.ts` **setiap kali berkas dibuka**, bukan sekali saat diunggah — jadi kalau berkas yang sudah bertanda tangan ikut ditempel, hasilnya dobel, dan dobelnya berulang tiap kali dibuka.

Karena itu keputusannya disimpan di kolom `gl_mirror.kskk_tempel_ttd` (default `true` = perilaku lama), bukan cuma di form. Petugas melepas centang **"Tanda tangan Kepala Cabang & Mobile Service"** saat mengunggah KSKK pelimpahan.

**Posisi tanda tangan dicari lewat anchor teks, bukan koordinat tetap.** `lib/laporan-tkp/tempel-ttd-kskk.ts` sebelumnya menempel di koordinat X/Y tetap hasil kalibrasi manual sekali — ternyata KELIRU untuk KSKK asli dari DASI-JR karena dua alasan yang baru ketahuan setelah dicek langsung ke contoh nyata (`docs/KSKK.pdf`, `docs/KSKK-1.pdf`, digitignore karena data pribadi):

1. Kode lama mengasumsikan KSKK selalu 2 halaman (`pages[1]`) dan langsung `return` tanpa menempel apa pun kalau `pages.length < 2` — padahal KSKK asli DASI-JR cuma **1 halaman**. Akibatnya tanda tangan tidak pernah tertempel sama sekali untuk berkas 1-halaman, tanpa galat apa pun (silent).
2. Layout DASI-JR **bergeser vertikal** antar-berkas (sampai ~15pt pada dua contoh) tergantung panjang tabel data korban/uraian kejadian di atasnya — jadi koordinat Y tetap gampang meleset ke posisi yang salah begitu isi tabelnya beda panjang dari berkas kalibrasi awal.

Perbaikannya pakai `pdfjs-dist` (build `legacy/build/pdf.mjs`, cukup untuk baca posisi teks tanpa render — Node otomatis menonaktifkan Web Worker-nya sendiri, tidak perlu opsi tambahan) untuk cari posisi teks **"MENGETAHUI"** (anchor Kepala Cabang) dan **"TANDA TANGAN"** dengan X **paling kiri** (anchor Petugas Survei/Mobile Service — teks ini muncul dua kali di halaman, kotak kiri punya nama+jabatan staf, kotak tengah kosong/tidak dipakai). Tanda tangan ditempel relatif dari anchor itu (offset yang sudah dikalibrasi visual terhadap dua contoh nyata), bukan di koordinat mutlak — jadi ikut bergeser kalau layoutnya bergeser. Kalau pencarian anchor gagal (PDF hasil scan tanpa layer teks, timeout, atau format di luar dugaan), jatuh ke koordinat tetap yang lama sebagai fallback, dan halaman yang dipakai juga ikut disesuaikan (halaman terakhir kalau cuma 1 halaman, bukan asumsi `pages[1]`).

**Jebakan pdfjs-dist di Node:** `Buffer instanceof Uint8Array` bernilai `true` di JS, tapi pdfjs-dist menolak Buffer secara eksplisit lewat pengecekan yang lebih ketat dari `instanceof` -- selalu bungkus ulang dengan `new Uint8Array(pdfBytes)` tanpa syarat sebelum dikasih ke `getDocument()`, jangan mengandalkan `instanceof` check.

Test regresi (`tempel-ttd-kskk.test.ts`) pakai pola `describe.skipIf(!existsSync(...))` yang sama dengan `sumber-impor.test.ts` -- otomatis dilewati kalau `docs/KSKK.pdf` tidak ada di mesin (termasuk di CI).

**`pdfjs-dist` WAJIB masuk `serverExternalPackages` di `next.config.ts`.** Tanpa ini, pencarian anchor gagal DIAM-DIAM setiap kali dipanggil lewat aplikasi Next.js sungguhan (dev maupun build produksi) -- fallback ke koordinat tetap jalan terus tanpa galat yang kelihatan, persis seolah-olah perbaikan anchor-nya tidak pernah ada. Penyebabnya: pdfjs-dist mendeteksi Node lalu mengimpor dinamis `./pdf.worker.mjs` relatif terhadap dirinya sendiri (lihat catatan di atas) -- begitu di-bundle webpack, berkas worker itu tidak ikut disalin ke `.next/server/vendor-chunks/`, jadi importnya gagal dengan `Cannot find module '...pdf.worker.mjs'`. `serverExternalPackages: ["pdfjs-dist"]` membuat Next.js membiarkan paket ini di-`require`/`import` langsung dari `node_modules` di runtime, bukan lewat hasil bundle, jadi resolusi file worker-nya normal.

Test vitest TIDAK menangkap bug ini karena vitest menjalankan kode langsung di Node, tidak lewat webpack -- jadi tesnya lolos padahal aplikasi sungguhannya diam-diam masih pakai koordinat tetap. Kalau menyentuh kode ini lagi dan tanda tangan kelihatan salah tempat lagi (nempel dekat atas halaman, bukan dekat "MENGETAHUI"/"TANDA TANGAN"), cek dulu `serverExternalPackages` masih ada sebelum menduga kalibrasi offset-nya yang salah.

**Istilah "Mobile Service".** Label antarmuka untuk penanda tangan kedua adalah **Mobile Service**, bukan "Petugas Survei" — orang yang sama, sebutan berbeda (arahan pemilik proyek). Yang diganti hanya label antarmuka. Sentinel `PEMILIK_PETUGAS_SURVEI` di database **tidak** diubah (mengubahnya membuat tanda tangan yang sudah tersimpan tidak terbaca), dan teks di dalam PDF Laporan Survei TKP juga **tidak** diubah karena mengikuti format resmi "LHS TKP.pdf".

**Laporan Survei TKP bisa diunggah, bukan cuma di-generate.** Kolom `berkas` di `laporan_survei_tkp` menentukan asal-usulnya: `NULL` = dibuat SIGAP (PDF di-generate ulang tiap diunduh dari field manual + data GL terkini), terisi = sudah jadi dari luar dan dikirim apa adanya. Gunanya untuk kasus lama yang laporannya sudah pernah dibuat sebelum SIGAP dipakai, supaya tidak perlu diketik ulang.

Riwayat singkat supaya tidak membingungkan: fitur ini sempat dibangun untuk GL pelimpahan (migrasi 0013), dicabut total karena ternyata pelimpahan tidak butuh LHS (0014), lalu dibangun lagi (0015) untuk alasan yang berbeda — kasus lama, bukan pelimpahan.

**Sengaja satu tabel, bukan tabel terpisah.** Seluruh pengecekan kelengkapan dokumen bertanya hal yang sama — "apakah GL ini punya baris di `laporan_survei_tkp`?" — di enam tempat: syarat tahap "Berkas Belum Di Limpah" dan "Berkas Diajukan Ke Pusat", badge Status Dokumen, Kartu Kinerja, kolom Google Sheets, dan tabel Dokumen GL. Dengan satu tabel, keenamnya ikut benar tanpa disentuh. Konsekuensinya `nomor_lp`, `alamat_korban`, `uraian_kesimpulan`, dan `nama_saksi` **nullable** — laporan unggahan tidak punya isian itu.

Karena `nomor_lp` bisa null, label dokumen dipusatkan di `labelLaporanTkp()` (`lib/laporan-tkp/laporan.ts`): Nomor LP kalau ada, kalau tidak nama berkas. **Jangan pakai `nomorLp` langsung** di tempat baru — tiga tempat sudah pernah salah karenanya (halaman detail, Proses Pusat, Google Sheets).

**Syarat membuat Laporan Survei TKP: cukup Lokasi LAKA.** Tanggal Masuk, Tanggal Pulang Pasien, dan Tgl LAKA (DASI) TIDAK wajib (arahan pemilik proyek) — banyak kasus lama yang laporannya perlu dibuat padahal PIC Task Force belum sempat mengisi. Kalau Tgl LAKA kosong, baris "Tempat/Tgl. Kecelakaan" di PDF cuma memuat tempatnya, tanpa koma menggantung. Hari/Tanggal Survei tetap wajib, tapi itu isian form yang bisa diketik langsung, tidak bergantung pada data GL mana pun.

**`tinjauan.ditinjauPada` ikut diperbarui saat catatan diedit** (`perbaruiTinjauan`). Kolom itu tampil sebagai "Waktu" di tabel catatan dan dibaca petugas sebagai kapan catatan terakhir dikerjakan — kalau dibiarkan, catatan yang diedit hari ini tetap bertanggal lama dan riwayatnya menyesatkan.

### Pencocokan impor Sentralisasi Pembayaran

Berkas "Sentralisasi Pembayaran" berisi daftar invoice yang sudah dibayar pusat. Tiap baris dicocokkan ke SATU GL, lalu GL itu ditandai lunas lewat `tandaiBerkasSelesai()`. Aturannya di `lib/sumber-data/pencocokan-sentralisasi.ts` (fungsi murni, ada test-nya).

**Patokan lunas = kolom Transaction Reference terisi**, bukan Status Invoice. Sudah diverifikasi pemilik proyek ke JRCare: Status Invoice "Kasir" pun bisa berarti sudah lunas.

**Nama korban SAJA tidak cukup** — ini pernah jadi bug serius. Satu korban lazim punya beberapa GL. Versi lama mencocokkan lewat nama lalu menandai SEMUA GL Unpaid milik nama itu; pada berkas nyata perilaku itu menandai **320 GL** lunas padahal yang benar cuma **3**. Dua cacatnya:

1. **Terlalu banyak ditandai** — satu pembayaran melunasi semua GL orang itu (contoh nyata: SUPRAPTIWI, 5 GL sekaligus).
2. **Salah sasaran** — kandidat dibatasi ke GL Unpaid saja, sehingga GL yang benar (sudah Paid dari impor JRCare) tersembunyi dan pembayarannya nyasar ke GL lain milik orang yang sama. Contoh nyata DEBBY INDRIYANI WIRYANTO: pembayaran Rp 17.089.322 seharusnya untuk GL Tgl 26-05-2026 (sudah Paid), malah menandai GL Tgl 06-07-2026 yang nilainya cuma Rp 342.540.

Urutan keputusan sekarang: (a) kalau ada GL Paid dengan `jumlah_pembayaran` **sama persis** dengan Nominal Invoice, baris dilewati karena sudah tercermin dari impor JRCare; (b) kalau semua kandidat sudah Paid, dilewati juga; (c) sisanya dipilih dari **Tgl GL yang paling dekat ke Tgl Pengajuan**, dengan selisih Nominal Invoice terhadap Nilai Disetujui sebagai pembanding kedua; (d) kalau dua kandidat sama kuat di kedua ukuran, **jangan ditebak** — namanya dilaporkan ke petugas di pesan hasil impor.

**Jangan pakai Tgl GL harus lebih dulu dari Tgl Pengajuan.** Pada data nyata Tgl GL kerap SESUDAH Tgl Pengajuan (kasus DEBBY: pengajuan 25-05, Tgl GL 26-05). Yang dipakai jaraknya, bukan urutannya. Toleransi 365 hari diukur dari 487 baris tak-ambigu di berkas nyata: median 0 hari, 84% dalam 90 hari, seluruhnya dalam 365 hari.

**Nominal Invoice BUKAN kunci keras** (arahan pemilik proyek) — nominalnya kerap berbeda dari Nilai Disetujui, sering tepat 1 juta. Dipakai sebagai pembanding saja, kecuali untuk mendeteksi pembayaran yang sudah tercatat, di mana yang dibandingkan `jumlah_pembayaran` dan harus sama persis.

**Kolom Nominal Invoice punya dua tipe sel dalam satu berkas.** 694 sel teks (`"20.968.750"`, titik = pemisah ribuan) dan 109 sel angka (`616.28`), karena Excel menafsirkan titik ribuan sebagai koma desimal. Sel bertipe angka harus **dikalikan 1000**. Ini bukan tebakan: diuji ke seluruh 109 sel, 109/109 cocok persis dengan `jumlah_pembayaran` GL yang sudah lunas.

### Pelimpahan berkas antar-loket

Sebelum berkas GL bisa diajukan ke pusat, kadang berkasnya harus dilimpahkan dulu ke loket cabang yang berwenang. Selama itu belum terjadi, pengajuan ke pusat tidak bisa jalan -- ini penghambat nyata di lapangan, bukan sekadar penanda.

Petugas mencatatnya lewat tahap **"Berkas Belum Di Limpah"** di halaman detail GL, yang memunculkan satu dropdown wajib: **Loket Cabang tujuan** (11 pilihan, `lib/gl/pelimpahan.ts`). GL itu lalu muncul di halaman **Pelimpahan** sampai tahap berikutnya dicatat.

Tiga keputusan pemilik proyek yang menentukan bentuknya, jangan diubah tanpa konfirmasi ulang:

1. **Keluar otomatis, tanpa tahap "sudah dilimpah".** Halaman Pelimpahan menampilkan GL yang tahap **TERKINI**-nya "Berkas Belum Di Limpah". Begitu petugas mencatat "Berkas Diajukan Ke Pusat", GL hilang sendiri dari daftar. Sengaja tidak memakai "pernah punya baris Belum Di Limpah", supaya GL yang dulu menunggu pelimpahan lalu sudah diajukan tidak nongol lagi.
2. **Tetap muncul di Papan Peringatan.** GL yang menunggu pelimpahan umurnya tetap jalan dan tetap terlihat di peringatan -- tidak ada perlakuan khusus di `lib/gl/peringatan.ts`. Alasannya supaya tidak ada celah menyembunyikan GL yang mandek dengan menandainya menunggu pelimpahan.
3. **Tidak wajib dilalui.** GL yang berkasnya sudah di loket yang benar boleh langsung dicatat "Berkas Diajukan Ke Pusat".

**Syarat dokumen BERBEDA per tahap**, dan bedanya disengaja (`catatTahapProses` di `app/gl/[idJaminan]/actions.ts`):

| Tahap | Syarat dokumen |
| --- | --- |
| Berkas Belum Di Limpah | KSKK saja |
| Berkas Diajukan Ke Pusat | Laporan Survei TKP **dan** KSKK |
| Berkas Selesai | tidak ada (punya pop-up konfirmasi sendiri) |

Kenapa pelimpahan tidak mensyaratkan Laporan Survei TKP: untuk GL yang dilimpahkan, survei TKP dikerjakan **loket tujuan** karena wilayahnya di sana, bukan Semarang. Kalau LHS tetap disyaratkan, tahap itu mustahil dicatat dan GL-nya nyangkut selamanya. Yang tetap wajib ikut berpindah tangan cuma KSKK.

Ekspornya (`/api/ekspor-pelimpahan`) menerima query string yang sama dengan halamannya, jadi menekan Ekspor saat sedang menyaring satu loket menghasilkan berkas berisi loket itu saja. Filter yang dipakai ikut ditulis di baris keterangan di dalam berkasnya, supaya penerima tahu cakupan isi yang dia pegang.

### Deteksi stagnasi (Tahap 2)

```
hari_di_tahapan = tanggal_hari_ini - direkam_pada snapshot terakhir yang mengubah tahapan
```

Berbeda dari umur. Umur mengukur berapa lama sejak GL terbit. Stagnasi mengukur berapa lama GL tidak bergerak dari satu tahapan.

Keluhan asli klien adalah stagnasi, bukan umur. Tahap 1 memakai umur karena riwayat snapshot belum terkumpul. Begitu snapshot terisi beberapa siklus impor, stagnasi bisa dihitung.

**Sumber tahapan.** Berkas ekspor sudah memuat kolom Tahapan di tiap baris, jadi snapshot antar-impor cukup untuk melacak perpindahan tahapan. Tidak perlu sumber lain.

**Batasan yang harus dijelaskan di antarmuka.** Riwayat baru terisi sejak aplikasi dipakai. Untuk GL yang sudah ada sebelum impor pertama, stagnasi tidak dapat dihitung dan sistem jatuh kembali ke umur. Beri penanda visual untuk membedakan keduanya, jangan diam-diam mencampur.

### Prioritas

Klien menyebut kode GL berakhiran dua digit, `00` sebagai prioritas pengajuan pertama. Namun di berkas ekspor, kolom Nomor Surat Jaminan kosong di semua baris, sedangkan Nomor ID Jaminan berakhiran urutan angka seperti `001925`, `002000`. Belum jelas yang mana yang dimaksud klien.

Sampai dikonfirmasi, jangan bangun logika prioritas berbasis akhiran 00. Untuk sementara, urutkan papan peringatan berdasarkan umur tertinggi. Lihat bagian 8.

### Kartu Kunjungan PIC Task Force

Di dashboard Monitoring, di atas Kartu Kinerja Pengajuan ke Pusat. Menjawab pertanyaan yang sebelumnya tidak terjawab di mana pun: **berapa GL yang harus dikunjungi PIC Task Force, dan berapa yang sudah**.

| Kartu | Definisi |
| --- | --- |
| Harus Dikunjungi | `tipe_klaim = 'GL'` DAN `gl_status = 'Active'` DAN `dihapus_pada IS NULL` DAN `tahapan NOT IN ('Verifikasi User', 'Done')` |
| Sudah Dikunjungi | Dari yang di atas: `tanggal_masuk`, `tanggal_pulang_pasien`, DAN `lokasi` terisi tiga-tiganya |
| Belum Dikunjungi | Sisanya |

**Umur GL TIDAK ikut menyaring** di sini — beda dari papan peringatan. Yang ditanyakan "berapa yang harus dikunjungi", bukan "berapa yang sudah telat", jadi GL berumur 1 hari maupun 300 hari sama-sama dihitung (arahan pemilik proyek).

**Cakupannya sengaja sama dengan Peringatan PIC Task Force** (`tahapan` belum sampai `Verifikasi User`/`Done`). Konsekuensinya yang harus disadari: begitu sebuah GL maju ke `Verifikasi User`, GL itu keluar dari kartu ini — jadi angka "Sudah Dikunjungi" membaca sebagai **beban kerja saat ini**, bukan catatan prestasi kumulatif. Pemilik proyek memilih ini di antara tiga opsi (semua GL aktif = 3.698, tanpa yang lunas = 1.627, cakupan Task Force = 719).

**Dinamis mengikuti filter PIC Task Force dan Rentang Tgl GL** — perhatikan filter PIC-nya BERBEDA dari Kartu Kinerja Pengajuan ke Pusat yang memakai PIC Pengajuan. Keduanya mengukur peran yang berbeda, jadi jangan disatukan.

**Jebakan yang harus diingat:** `lokasi` (Lokasi LAKA) berasal dari berkas DASI yang dicocokkan lewat nama korban, BUKAN diketik PIC Task Force. Akibatnya GL yang sebenarnya sudah dikunjungi tetap terhitung "belum" selama berkas DASI-nya belum pernah diunggah untuk korban itu. Ini konsekuensi yang sama persis dengan aturan Peringatan PIC Task Force, jadi dibiarkan konsisten -- tapi kalau angkanya terasa terlalu kecil, penyebabnya sering di situ, bukan di kinerja petugas.

### Kartu Kinerja Pengajuan ke Pusat

Di dashboard Monitoring, di dekat Kartu Ringkasan GL. Empat kartu yang membentuk **alur/funnel** progres kerja PIC Pengajuan yang TIDAK kelihatan di kolom Tahapan bawaan JRCare (yang cuma mentok di "Verifikasi User"/"Done") — dipakai klien untuk menilai kinerja staf, termasuk per-PIC. Tiap kartu punya ikon Bantuan (`?`) berisi definisi persisnya, supaya tidak ambigu dibaca klien.

Keempatnya SALING EKSKLUSIF (tidak ada GL yang terhitung di lebih dari satu kartu), dan urutannya mewakili tahap makin maju:

| # | Kartu | Definisi |
| --- | --- | --- |
| 1 | Dokumen Belum Lengkap | `tahapan IN ("Verifikasi User", "Done")` DAN `status_pembayaran = "Unpaid"` DAN belum pernah punya baris `status_proses_pusat` (belum pernah diajukan ke pusat sama sekali) DAN Laporan Survei TKP + KSKK **belum** lengkap dua-duanya |
| 2 | Siap Diajukan ke Pusat | Sama seperti #1, tapi dokumen **sudah** lengkap dua-duanya — tinggal menunggu PIC Pengajuan mencatat "Berkas Diajukan Ke Pusat" |
| 3 | Sudah Diajukan ke Pusat | Tahap TERKINI di `status_proses_pusat` persis `"Berkas Diajukan Ke Pusat"` DAN `status_pembayaran` belum "Paid" |
| 4 | Done | `tahapan = "Done"` DAN `status_pembayaran = "Paid"` — genuinely lunas, baik lewat "Berkas Selesai" di Proses Pusat MAUPUN Paid langsung dari impor JRCare tanpa pernah lewat Proses Pusat sama sekali |

Cakupan dasar sama seperti kartu ringkasan lain yang sudah ada: `tipe_klaim = 'GL'`, `gl_status = 'Active'`, `dihapus_pada IS NULL`.

**Catatan dari pengecekan data nyata (jangan diubah tanpa verifikasi ulang):** awalnya diduga "`tahapan = Done` tapi `status_pembayaran = Unpaid`" selalu berarti `gl_status = Cancel` -- **tidak selalu benar**. Ditemukan GL `Active` dengan kombinasi itu (dokumen belum lengkap, belum pernah diajukan ke pusat). Makanya kartu #1/#2 sengaja mencakup `tahapan IN ("Verifikasi User", "Done")` — bukan cuma "Verifikasi User" — supaya GL semacam ini tetap kehitung di kartu #1, bukan hilang tanpa kategori.

**Dinamis mengikuti filter yang sedang aktif di dashboard** — PIC Pengajuan dan Rentang Tgl GL, filter yang SAMA dengan tabel Daftar GL di bawahnya, bukan filter terpisah. Pilih "Semua" PIC untuk lihat total keseluruhan, pilih satu PIC untuk lihat kinerja individunya.

Tiap kartu menampilkan **angka mentah DAN persentase** terhadap total GL aktif yang lolos filter yang sama (bukan cuma yang Unpaid). Angka mentah untuk volume beban kerja, persentase supaya kinerja antar-PIC dengan jumlah GL berbeda tetap bisa dibandingkan adil (PIC dengan 12 dari 20 GL beda jauh maknanya dari PIC dengan 12 dari 65 GL, walau angka mentahnya sama).

---

## 8. Pertanyaan Terbuka

Jangan menebak jawaban dari daftar berikut. Kalau sebuah pekerjaan bergantung pada salah satunya, hentikan dan tanyakan.

### Penghambat — tidak bisa dilewati

Tidak ada lagi penghambat yang menghalangi Tahap 1. Struktur berkas ekspor sudah diketahui lengkap, dan seluruh fitur inti bisa dibangun dari situ.

### Perlu dikonfirmasi, tapi tidak menghambat

| # | Pertanyaan | Asumsi sementara |
| --- | --- | --- |
| 1 | Tanggal mana yang dipakai untuk menghitung umur GL: Tgl GL, atau tanggal lain? | Pakai `Tgl GL`. Itu satu-satunya tanggal terbit yang ada di ekspor |
| 2 | Arti prioritas "akhiran 00". Nomor Surat Jaminan kosong di semua baris ekspor, sedangkan ID Jaminan berakhiran urutan seperti `001925`, `002000` | Sampai jelas, jangan bangun logika prioritas 00. Tandai prioritas berdasarkan umur tertinggi dulu |
| 3 | Filter loket `0400601` mencakup seluruh cabang Semarang termasuk Pati, atau hanya Semarang kota? | Tampilkan apa adanya dari kolom Loket. Tidak memfilter lebih jauh |
| 4 | Nilai Status Verifikasi `Process` muncul di data tapi tidak disebut klien di awal | Perlakukan semua enum sebagai terbuka. Jangan hardcode. Daftar 17 Tahapan sudah lengkap di `docs/domain-gl.md`, tapi Status Verifikasi belum tentu lengkap |
| 5 | Arti kode Tipe Cidera LL, MD LL, LL PG, LL CT | Tampilkan kodenya apa adanya, jangan diterjemahkan |
| 6 | Sebaran daerah dibaca dari kolom Loket atau Nama Rumah Sakit | Diasumsikan Loket |
| 7 | Format tanggal untuk berkas DASI dalam bentuk `.csv` (kalau nanti dibutuhkan) — parser DASI saat ini pakai serial tanggal Excel (angka), yang tidak ada di CSV | Belum dibangun. Jangan tebak formatnya, tanya dulu kalau kebutuhan ini nyata |
| 8 | Ejaan resmi nama PIC "Arif Eka" (dipakai, sesuai teks daftar PIC) vs "Arief Eka" (di screenshot spreadsheet OneDrive) | Dipakai "Arif Eka" di `pic_rumah_sakit`. Bisa diedit lewat Pengaturan kalau ternyata salah |
| 9 | Apakah `pic_rumah_sakit` perlu mendukung lebih dari satu PIC per rumah sakit per peran (mis. gantian shift), atau selalu 1:1 seperti sekarang | Diasumsikan 1:1. Kalau butuh multi-PIC, perlu ubah skema (satu kolom teks → tabel relasi) |
| 10 | Rincian teknis "Laporan Survei TKP" generator (Tahap 2) — apakah nomor dokumennya (`No. PL ...`) di-generate otomatis atau diisi manual, dan format persisnya | Belum dibangun, taruh di bagian 6 sebagai penanda. Jangan mulai desain sebelum kolom/alur dikonfirmasi lebih rinci |

### Sudah terjawab oleh berkas ekspor

| Pertanyaan | Jawaban |
| --- | --- |
| Cara masuknya data | Unggah berkas ekspor `.xlsx` dari JRCare, lalu impor. Bukan akses otomatis |
| Kenapa bukan otomatis | Klien tidak punya teknisi IT untuk memelihara sesi. Impor manual bisa dijalankan siapa saja |
| Ada kolom Tahapan? | Ada, di tiap baris. 7 nilai muncul di data contoh dari 17 yang disebut klien |
| Ada jejak waktu? | Ada. Tgl GL, Tgl Diajukan, Tgl Verifikasi, Tgl Pembayaran |
| Nilai tagihan | Ada. Nilai Diajukan dan Nilai Disetujui. Selisihnya adalah cost containment |
| Kolom lengkap | 18 kolom, lihat `docs/domain-gl.md` |
| Format tanggal | `DD-MM-YYYY`. Kosong ditulis `-` |
| Struktur berkas | ~14 baris filter di atas, header di bawahnya, baris terakhir Total Data Klaim |

### Riwayat: akses otomatis ke DASI

Sempat digali dan sempat berhasil diuji (cookie sliding session, IIS/ASP.NET), tetapi **ditinggalkan** karena klien tidak punya kapasitas teknis untuk memeliharanya. Rinciannya disimpan di `docs/domain-gl.md` seandainya suatu hari relevan lagi. Jangan bangun jalur ini kecuali pemilik proyek memintanya kembali secara eksplisit.

### Keputusan komersial, bukan teknis

Setelah petugas menandai sebuah GL sudah ditinjau, apakah hasilnya cukup disimpan di aplikasi ini? Dengan model impor, jawabannya hampir pasti ya, karena aplikasi memang tidak menulis ke mana pun. Tandai lokal, selesai.

---

### Server Action tidak boleh melempar galat isian

Kalau sebuah Server Action `throw new Error("Pilih berkas dulu")`, yang muncul ke petugas adalah **layar galat mentah Next.js** lengkap dengan potongan kode dan call stack. Tidak terbaca orang non-teknis, dan di produksi jadi halaman error yang membuang isi form yang sudah diketik.

Aturannya: setiap Server Action yang bisa gagal karena kesalahan petugas **mengembalikan** `StatusAksi` (`lib/aksi.ts`), tidak melempar. Pakai helper `gagal(pesan)` dan `sukses(pesan)`. Lempar Error HANYA untuk hal yang bukan salah petugas dan tidak bisa dipulihkan di layar itu (mis. galat database), supaya tertangkap error boundary.

Di sisi antarmuka ada dua pola, keduanya di `components/ui/form-aksi.tsx`:

- **`<FormAksi>`** untuk form biasa — membungkus `<form>`, menjalankan aksi lewat `useActionState`, merender tombol submit sendiri (dengan status "sedang mengirim"), memunculkan pop-up saat gagal, dan menampilkan teks hijau kecil saat berhasil. Kolom-kolomnya dioper sebagai children biasa supaya komponen server tetap bisa memakainya.
- **`<DialogGagal>`** untuk aksi berbentuk tombol yang memanggil action langsung lewat `useTransition` (tombol hapus, pulihkan, dan sejenisnya) — tampung hasilnya, lalu isi `pesan` kalau gagal.

Kenapa pop-up hanya untuk kegagalan: dialog sukses memaksa petugas menutup jendela tiap kali menyimpan, dan di form yang sering dipakai itu justru mengganggu.

**Pengecekan cepat sebelum deploy:** `grep -c "throw new Error"` di tiap berkas ber-`"use server"` harus 0.

## 9. Gaya Kerja

- Kerjakan satu hal, lalu berhenti dan tunjukkan hasilnya. Jangan menyelesaikan beberapa fitur sekaligus.
- Tulis test untuk aturan peringatan di bagian 7. Itu logika inti aplikasi, dan pengecualiannya mudah terlewat.
- Tulis test untuk parser impor. Berkas nyata punya blok filter, baris total, dan sel `-`, semua rawan bikin parser salah.
- Kalau sebuah keputusan bergantung pada informasi di bagian 8, tanyakan, jangan pilih sendiri.
- Kalau menemukan pertanyaan baru yang belum ada di bagian 8, tambahkan ke daftar tersebut.

### Urutan build yang disarankan

Kerjakan berurutan. Jangan lompat.

1. Inisialisasi proyek Next.js, PostgreSQL lewat Docker Compose, koneksi Drizzle
2. Skema database (bagian 5) dan migrasi
3. Seeder dummy sesuai kontrak `docs/domain-gl.md`, minimal 500 baris bervariasi
4. Parser impor `sumber-impor.ts` plus test-nya, pakai kontrak berkas ekspor
5. Autentikasi satu akun
6. Tabel daftar GL dengan filter dan pencarian
7. Halaman detail GL dan riwayat tahapan
8. Aturan peringatan plus test, lalu papan peringatan
9. Tandai sudah ditinjau dan catatan
10. Kartu ringkasan dan grafik
11. Ekspor Excel hasil olahan
12. Halaman pengaturan (ambang hari) dan unggah berkas

Langkah 1 sampai 4 tidak butuh keputusan apa pun yang belum ada. Mulai dari sana.