---
# DESIGN.md — Sistem desain SIGAP
# Format: token YAML di frontmatter, alasan dalam prosa di bawah.
# Agen yang membangun UI membaca token. Prosa mencegah keputusan
# yang masuk akal tapi keliru pada layar yang belum ditokenkan.

meta:
  product: SIGAP
  subject: Dashboard pemantauan surat jaminan (GL) Jasa Raharja cabang Semarang
  themes: [light, dark]
  default-theme: light

colors:
  # === Jangkar: biru resmi Jasa Raharja ===
  # Diambil dari variabel sistem JRCare/DASI (--primaryColor #00adef).
  # Memakai warna ini membuat SIGAP satu keluarga dengan sistem induk,
  # bukan aplikasi asing. Keputusan berdasar sumber, bukan selera.
  brand: "#00adef"          # biru cerah khas Jasa Raharja
  brand-deep: "#0369a1"     # biru dalam untuk tombol (lihat catatan kontras)

  light:
    bg: "#f3f5f4"           # latar aplikasi — dari --tableBodyColor
    surface: "#ffffff"      # kartu, panel
    surface-header: "#d0d6e0" # header tabel — dari --tableHeaderColor
    border: "#dce1e8"        # garis tipis, pemisah
    text: "#454545"          # teks utama — dari --colorOnTableBodyColor
    text-muted: "#6b7280"    # sublabel, placeholder
    accent: "#0369a1"        # AKSI: tombol, tautan. Teks putih lolos AA
    accent-bright: "#00adef" # aksen non-teks: fokus, ikon, garis aktif
    on-accent: "#ffffff"
    danger: "#d92d20"        # GL lewat ambang
    warn: "#b54708"          # mendekati ambang
    ok: "#067647"            # aman, sudah dibayar

  dark:
    # Diturunkan sendiri, tidak berasal dari palette klien.
    # Jangkar biru #00adef dipertahankan. TANDAI untuk dikoreksi klien.
    bg: "#0d1219"
    surface: "#161c26"
    surface-header: "#1e2734"
    border: "#252c3a"
    text: "#e8ecf2"
    text-muted: "#8b94a7"
    accent: "#00adef"        # di latar gelap, biru cerah lolos AA (7.36)
    accent-bright: "#38bdf8"
    on-accent: "#062330"     # teks gelap di atas biru cerah, bukan putih
    danger: "#ff6b6b"
    warn: "#f5a623"
    ok: "#3dd68c"

typography:
  display:
    family: "Plus Jakarta Sans"
    role: "Judul, nama layar, angka besar di kartu ringkasan"
  body:
    family: "Plus Jakarta Sans"
    role: "Teks antarmuka, label, tombol"
  mono:
    family: "JetBrains Mono"
    role: "Nominal rupiah, tanggal, nomor ID jaminan di tabel"
  weights: [400, 600, 800]  # regular, semibold, extrabold. Tiga, berjauhan.
  scale:
    display-lg: "28px"
    display: "22px"
    title: "18px"
    body: "15px"
    label: "14px"
    caption: "13px"

layout:
  base: "8px"               # semua jarak kelipatan 8, kecuali 4 untuk rapat
  max-width: "1440px"
  sidebar: "240px"
  radius:
    sm: "6px"               # input, chip, sel
    md: "10px"              # kartu, panel
    lg: "16px"              # kartu login mengambang
    full: "9999px"          # lambang, badge status

motion:
  duration-fast: "120ms"    # hover tombol, fokus
  duration-base: "200ms"    # pindah halaman, buka panel
  easing: "cubic-bezier(0.2, 0, 0, 1)"
  no-animate: "Tabel dan angka tidak beranimasi saat data berubah. Hormati prefers-reduced-motion."

components:
  button-primary:
    background: "{colors.light.accent}"
    text: "{colors.light.on-accent}"
    radius: "{layout.radius.sm}"
  button-primary-hover:
    background: "{colors.brand-deep}"
    text: "{colors.light.on-accent}"
  input:
    background: "{colors.light.surface}"
    text: "{colors.light.text}"
    border: "{colors.light.border}"
  input-focus:
    border: "{colors.light.accent-bright}"
  table-header:
    background: "{colors.light.surface-header}"
    text: "{colors.light.text}"
  table-row:
    background: "{colors.light.surface}"
    text: "{colors.light.text}"
  alert-row:
    background: "{colors.light.surface}"
    text: "{colors.light.danger}"
  badge-paid:
    background: "{colors.light.ok}"
    text: "{colors.light.on-accent}"
---

# SIGAP — Sistem Desain

## Overview

SIGAP dipakai satu petugas monitoring, setiap hari, untuk satu tugas: menemukan
GL yang terlambat sebelum tagihan rumah sakit ikut telat. Layar utamanya tabel
padat yang ditatap lama. Maka dua hal memandu seluruh desain ini: **keterbacaan
tahan lama** dan **rasa satu keluarga dengan sistem induk Jasa Raharja**.

Yang membuat sistem ini bukan template: warnanya tidak dikarang. Biru
`#00adef` (disebut *biru Jasa Raharja* di prosa) diambil langsung dari variabel
sistem JRCare dan DASI yang sudah dipakai petugas. Ketika SIGAP memakai biru
yang sama, ia terasa sebagai kelanjutan alat kerja mereka, bukan aplikasi
pihak ketiga yang menempel. Itu keputusan dengan sumber, dan itu pengorbanannya
juga: SIGAP menyerahkan kebebasan memilih warna demi kesinambungan dengan induk.

Aplikasi punya dua tema, terang dan gelap, dapat ditukar. Terang adalah default
karena aplikasi kerja instansi umumnya dipakai di ruang terang dan palette
resmi klien memang dirancang untuk terang.

## Colors

**Biru Jasa Raharja tidak boleh menyandang teks putih.** Ini temuan kontras,
bukan pendapat. `#00adef` dengan teks putih hanya mencapai rasio 2.55, jauh di
bawah ambang keterbacaan 4.5. Petugas yang menatap tombol berjam-jam akan
lelah. Karena itu warna aksi (`accent`) di tema terang adalah **biru dalam**
`#0369a1` yang lolos di 5.93, sementara biru cerah `#00adef` (`accent-bright`)
disimpan untuk hal yang tidak menuntut teks di atasnya: garis fokus, ikon,
penanda baris aktif. Dua biru, dua tugas berbeda, satu keluarga.

Di tema gelap keadaannya terbalik. Biru cerah `#00adef` justru lolos (7.36) di
atas latar gelap, jadi ia boleh jadi aksen. Yang berubah, teks di atas biru itu
menjadi gelap (`on-accent` `#062330`), bukan putih.

**Warna status diturunkan dari keluarga yang sama, bukan merah-hijau stok.**
Danger, warn, dan ok dipilih agar duduk berdampingan dengan biru Jasa Raharja
tanpa bertengkar. Semua lolos AA dengan teks putih. Aturan pentingnya: di satu
layar, jangan sampai merah peringatan bersaing dengan biru tombol. Merah hanya
untuk status GL terlambat, biru hanya untuk aksi. Keduanya tidak boleh menyala
di tempat yang sama.

Netral tema terang mewarisi abu klien apa adanya: latar `#f3f5f4`, teks
`#454545`, header tabel `#d0d6e0`. Ketiganya lolos kontras dengan lega
(8.76 dan 6.56) sehingga tabel padat tetap terbaca.

> Bagian `dark` dalam token adalah turunan buatan, bukan dari palette klien.
> Jangkar birunya dipertahankan, tapi seluruh netral gelap dikarang. Tandai
> untuk dikonfirmasi pemilik proyek.

## Typography

Dua peran, dan satu pengecualian yang bekerja keras.

**Roboto** memikul teks dan judul. Ia buatan perancang Indonesia dan
sudah dipakai resmi oleh instansi pemerintah, jadi untuk aplikasi Jasa Raharja
pilihan ini beralasan, bukan sekadar font sans yang aman. Modern tapi tidak
main-main.

**JetBrains Mono** memikul satu tugas: semua angka yang harus disejajarkan.
Nominal rupiah, tanggal `DD/MM/YYYY`, dan nomor ID jaminan di tabel. Angka
monospace membuat kolom lurus sehingga petugas bisa membandingkan nilai
sepintas. Jangan pakai mono untuk teks biasa, hanya untuk data.

Tiga bobot, berjauhan: 400 untuk teks, 600 untuk label dan tombol, 800 untuk
angka besar di kartu ringkasan. 400/600/800 terbaca sebagai keputusan; skala
400/500/600 yang rapat terbaca sebagai default.

## Layout

Dasar jarak 8px, boleh 4px untuk elemen rapat di tabel. Isi utama maksimal
1440px, sidebar tetap 240px.

Susunannya asimetris: sidebar kiri untuk navigasi, isi mengalir ke kanan.
Bukan hero di tengah, karena ini alat kerja, bukan halaman promosi. Layar
pertama yang dibuka petugas bukan sambutan, melainkan papan peringatan.

## Elevation & Depth

Kedalaman datang dari **pergeseran nada dan garis tipis**, bukan bayangan tebal.
Kartu dibedakan dari latar lewat `surface` yang sedikit berbeda dari `bg`,
ditambah `border` 1px. Bayangan hanya untuk elemen yang benar-benar mengambang
seperti kartu login dan menu melayang, dan bayangannya berwarna biru sangat
tipis, bukan hitam netral. Bayangan hitam 10% di mana-mana adalah tanda desain
tak diurus.

## Shapes

Radius berjenjang, bukan seragam. Input dan chip 6px, kartu 10px, kartu login
mengambang 16px, lambang dan badge status penuh. Radius yang sama di segala
elemen adalah tanda template; jenjang ini menandai hierarki.

## Components

Halaman login (sudah ada) jadi acuan pertama. Kartunya memakai radius `lg`,
mengambang di latar bertema. Tombol Masuk memakai `button-primary`: biru dalam
dengan teks putih, berubah lebih dalam lagi saat disentuh. Input memakai border
tipis yang menyala biru cerah saat difokus.

Papan peringatan (dibangun nanti) adalah jantung aplikasi. Baris GL terlambat
ditandai lewat `alert-row`: teks danger dan penanda merah di tepi kiri baris,
**bukan** seluruh baris dibanjiri merah. GL yang sudah dibayar memakai
`badge-paid` hijau. Angka umur GL dan nominal memakai mono.

## Do's and Don'ts

- **Jangan** memberi teks putih di atas biru cerah `#00adef`. Gagal kontras.
  Untuk tombol pakai biru dalam `accent`; biru cerah hanya untuk fokus dan ikon.
- **Jangan** memakai biru aksi dan merah peringatan menyala di area yang sama.
  Biru untuk aksi, merah untuk status terlambat. Pisahkan.
- **Jangan** membanjiri seluruh baris tabel dengan warna status. Tandai di tepi
  atau di teks kolom status saja, supaya tabel tetap tenang dibaca lama.
- **Jangan** menambah warna aksen kedua. Kalau butuh penekanan, pakai bobot font
  atau ruang, bukan warna baru.
- **Jangan** memakai JetBrains Mono untuk teks biasa. Hanya untuk angka dan ID.
- **Lakukan** tampilkan label "Data terakhir diperbarui" di dashboard, karena
  data hanya sesegar impor terakhir.
- **Lakukan** pastikan fokus keyboard selalu terlihat lewat cincin biru cerah,
  demi petugas yang bekerja cepat dengan papan ketik.
- **Lakukan** hormati prefers-reduced-motion; tabel dan angka tidak beranimasi
  saat data berubah.
