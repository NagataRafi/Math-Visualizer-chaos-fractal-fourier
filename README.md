# Multi-System Mathematical Visualizer

<p align="center">
  <img alt="Vanilla JavaScript" src="https://img.shields.io/badge/Vanilla_JS-2b2b2b?style=flat-square&logo=javascript&logoColor=F7DF1E">
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-2b2b2b?style=flat-square&logo=html5&logoColor=E34F26">
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-2b2b2b?style=flat-square&logo=css3&logoColor=1572B6">
  <img alt="Web Workers" src="https://img.shields.io/badge/Web_Workers-2b2b2b?style=flat-square&logo=javascript&logoColor=ccc">
  <img alt="Canvas 2D" src="https://img.shields.io/badge/Canvas_2D-2b2b2b?style=flat-square">
  <img alt="No dependencies" src="https://img.shields.io/badge/dependencies-none-2b2b2b?style=flat-square">
</p>





Visualisasi interaktif tiga sistem matematika...


Visualisasi interaktif tiga sistem matematika dalam satu halaman web, dibuat
murni dengan **HTML + CSS + JavaScript vanilla**. Seluruh inti numerik
(iterasi fraktal, integrator RK4, DFT, aritmetika presisi tinggi, dan
proyeksi 3D) ditulis manual dari rumus dasar — **tanpa library matematika
atau framework eksternal**.

Satu-satunya sumber daya dari luar adalah Google Fonts (opsional, hanya
untuk tampilan).

---

## Daftar Isi

- [Fitur](#fitur)
- [Modul](#modul)
- [Petunjuk Penggunaan](#petunjuk-penggunaan)
- [Cara Instalasi](#cara-instalasi)
- [Struktur Proyek](#struktur-proyek)
- [Detail Teknis](#detail-teknis)
- [Kompatibilitas Browser](#kompatibilitas-browser)
- [Lisensi](#lisensi)

---

## Fitur

- **3 modul terpisah** yang dapat dipilih lewat tab: Fraktal kompleks,
  Lorenz attractor, dan Fourier epicycle.
- **Perhitungan paralel** memakai *Web Worker pool* (dibuat dari Blob URL,
  jumlah worker menyesuaikan `navigator.hardwareConcurrency`) sehingga UI
  tetap responsif saat rendering berat.
- **Aritmetika double-double (~32 digit desimal)** untuk mempertahankan
  presisi koordinat ketika zoom fraktal melewati batas presisi `double`.
- **Metode perturbasi + reference orbit** agar zoom Mandelbrot bisa
  menembus > 10¹⁰ tanpa artefak pembulatan.
- **Integrator Runge–Kutta orde 4** yang ditulis sendiri untuk sistem
  Lorenz, lengkap dengan uji sensitivitas kondisi awal (trajektori kembar).
- **Discrete Fourier Transform** manual untuk merekonstruksi bentuk apa pun
  sebagai rangkaian epicycle berputar.
- **Proyeksi perspektif 3D** dihitung langsung dari matriks rotasi, tanpa
  WebGL / Three.js.
- Penuh **readout numerik real-time** (posisi kursor, zoom, waktu render,
  fps, jarak divergensi, koefisien Fourier dominan, dst.).
- **Responsif** — tata letak menyesuaikan untuk layar sempit.
- Kontrol keyboard-accessible dengan `focus-visible` yang jelas dan atribut
  ARIA pada tab.

---

## Modul

### 1. Fraktal Kompleks (Mandelbrot & Julia)

Iterasi `z_{n+1} = z_n² + c` dengan pewarnaan *escape-time* kontinu.

- Pilih himpunan **Mandelbrot** atau **Julia** (konstanta `c` dapat diatur
  dengan slider atau diputar otomatis pada lingkaran).
- Iterasi maksimum bisa manual atau otomatis mengikuti kedalaman zoom.
- Tiga palet warna (Kobalt, Tembaga, Spektrum) dengan kontrol rapat pita
  dan pergeseran warna.
- Zoom sangat dalam otomatis berpindah ke aritmetika **double-double +
  perturbasi**.

### 2. Lorenz Attractor

Sistem persamaan diferensial Lorenz diintegrasikan dengan **RK4**.

- Parameter `σ`, `ρ`, `β` dapat diubah langsung (tersedia preset klasik
  `10, 28, 8/3`).
- Kontrol langkah waktu `dt`, jumlah langkah per frame, dan panjang jejak.
- **Trajektori kembar** dengan selisih awal 10⁻⁵ untuk memperlihatkan
  divergensi eksponensial (chaos), disertai grafik `log₁₀` jarak antar
  trajektori.
- Kamera 3D dapat diputar (drag) dan di-zoom (scroll), dengan opsi rotasi
  otomatis.

### 3. Fourier Epicycle

Merekonstruksi sebuah kurva sebagai jumlah vektor berputar (epicycle).

- Sumber bentuk: **gambar sendiri** di kanvas, atau **gelombang kotak**.
- Atur jumlah sampel `N`, jumlah harmonik yang dipakai, dan kecepatan
  animasi.
- Tampilkan / sembunyikan lingkaran epicycle dan bentuk asli.
- Panel **spektrum magnitudo vs frekuensi** dan tabel koefisien dominan
  (`k`, `|X_k|`, fase `φ`) plus waktu komputasi DFT.

---

## Petunjuk Penggunaan

| Aksi | Fraktal | Lorenz | Fourier |
|------|---------|--------|---------|
| **Scroll** | Zoom ke posisi kursor | Zoom kamera | – |
| **Drag** | Geser bidang | Putar kamera | Menggambar bentuk (mode "Gambar sendiri") |
| **Tab atas** | Berpindah antar modul | | |
| **Slider / tombol di panel kiri** | Mengubah parameter secara langsung | | |

Langkah cepat:

1. Buka halaman, secara default modul **Fraktal kompleks** aktif.
2. Scroll di atas kanvas untuk memperbesar; perhatikan readout `Zoom`,
   `Lebar piksel`, dan `Aritmetika` berubah saat zoom makin dalam.
3. Klik tab **Lorenz attractor**, tekan **Nilai klasik**, lalu drag untuk
   memutar attractor. Aktifkan **trajektori kembar** untuk melihat efek
   chaos.
4. Klik tab **Fourier epicycle**, tekan **Gambar sendiri**, seret satu
   goresan di kanvas, lalu turunkan slider **Harmonik dipakai** untuk
   melihat aproksimasi menjadi lebih kasar.

Indikator **fps** di pojok kanan atas menampilkan performa render saat ini.

---

## Cara Instalasi

Proyek ini **statis** — tidak butuh build step, Node.js, atau dependensi
apa pun.

### 1. Ambil kode

```bash
git clone https://github.com/<username>/<nama-repo>.git
cd <nama-repo>
```

Atau unduh ZIP dari GitHub lalu ekstrak.

### 2. Jalankan lewat server statis (disarankan)

Web Worker paling andal dijalankan lewat protokol `http://`. Pilih salah
satu cara:

```bash
# Python 3
python -m http.server 8000

# Node.js (paket npx, tanpa instalasi global)
npx serve .

# PHP
php -S localhost:8000
```

Lalu buka `http://localhost:8000` di browser.

> **VS Code:** cukup pasang ekstensi *Live Server*, klik kanan
> `index.html` → **Open with Live Server**.

### 3. Alternatif: buka langsung

Membuka `index.html` lewat `file://` (double-click) umumnya tetap berjalan
karena worker dibuat dari Blob URL, dan aplikasi punya *fallback* ke UI
thread bila worker ditolak. Namun demi keandalan penuh, gunakan server
statis seperti di langkah 2.

### Deploy

Karena murni statis, repo bisa langsung di-host di **GitHub Pages**,
Netlify, Vercel, atau Cloudflare Pages tanpa konfigurasi tambahan. Untuk
GitHub Pages: **Settings → Pages → Source: `main` / root**.

---

## Struktur Proyek

```
.
├── index.html   # Kerangka halaman, tab, panel kontrol, elemen <canvas>
├── style.css    # Tema gelap, tata letak grid, gaya kontrol, responsif
├── script.js    # Seluruh logika: utilitas, inti numerik, worker, 3 modul
└── README.md
```

Pembagian `script.js`:

| Bagian | Isi |
|--------|-----|
| 0 | Utilitas kecil (`$`, `clamp`, `bindRange`, `fitCanvas`, ...) |
| 1 | Aritmetika double-double (`ddAdd`, `ddMul`, konversi BigInt, ...) |
| 2 | Inti fraktal (iterasi, smooth count, palet, reference orbit, perturbasi) |
| 3 | Inti sistem dinamik Lorenz (turunan + langkah RK4) |
| 4 | Inti Fourier (DFT) |
| 5 | Pabrik Web Worker (kode fungsi di atas dipakai ulang di worker) |
| MODUL 1–3 | Kelas/objek tiap modul: state, kontrol, event, loop render |
| Akhir | Registrasi modul, pengalih tab, loop `requestAnimationFrame` |

---

## Detail Teknis

- **Tanpa dependensi runtime.** Tidak ada `package.json`; tidak ada
  bundler. Semua kode ada di tiga berkas.
- **Web Worker dari sumber tunggal.** Fungsi numerik di-`toString()` lalu
  digabung menjadi Blob sehingga rumus hanya ditulis satu kali dan tetap
  bisa berjalan di worker.
- **Fraktal** dirender per pita baris; setiap pita dikerjakan satu worker
  lalu disatukan kembali di UI thread. Ukuran pool =
  `clamp(hardwareConcurrency - 1, 1, 8)`.
- **Presisi.** Di bawah ambang zoom tertentu dipakai `double` biasa; di
  atasnya koordinat pusat memakai pasangan `[hi, lo]` (double-double) dan
  iterasi memakai perturbasi terhadap reference orbit presisi tinggi.
- **Lorenz** memakai proyeksi perspektif yang dihitung manual dari matriks
  rotasi kamera — tidak ada WebGL.
- **DFT** berjalan di worker terpisah; hasilnya dipakai untuk animasi
  epicycle dan grafik spektrum.

---

## Kompatibilitas Browser

Diuji pada versi terbaru Chrome, Firefox, dan Edge. Membutuhkan dukungan:

- `<canvas>` 2D context
- Web Worker + `Blob` + `URL.createObjectURL`
- `BigInt` (untuk pencetakan koordinat presisi tinggi)
- `Float64Array` / transferable `ArrayBuffer`

Semua fitur di atas tersedia di browser desktop modern (≈ 2020 ke atas).

---

## Lisensi

Belum ditentukan. Tambahkan berkas `LICENSE` (mis. MIT) sebelum publikasi
bila ingin mengizinkan penggunaan ulang.
