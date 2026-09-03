# Multi-System Mathematical Visualizer

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue?style=flat-square">
  <img alt="Status: Active Development" src="https://img.shields.io/badge/status-active%20development-5ad1c4?style=flat-square">
  <img alt="Built with HTML5 + Vanilla JavaScript" src="https://img.shields.io/badge/built%20with-HTML5%20%2B%20Vanilla%20JS-E34F26?style=flat-square&logo=html5&logoColor=white">
  <img alt="Canvas API" src="https://img.shields.io/badge/Canvas-2D%20API-F7DF1E?style=flat-square&logo=javascript&logoColor=black">
  <img alt="Platform: Web" src="https://img.shields.io/badge/platform-web-1c2340?style=flat-square">
</p>

<p align="center">
  <b>Visualisasi interaktif 3 sistem matematika kompleks — fraktal, chaos, dan Fourier —</b><br>
  dengan kontrol parameter <i>real-time</i> di browser, tanpa satu pun library eksternal.
</p>

<p align="center">
  Seluruh inti numerik (iterasi fraktal, integrator RK4, DFT, aritmetika presisi tinggi,
  proyeksi 3D) ditulis manual dari rumus dasar.
</p>

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Screenshot](#screenshot)
- [Cara Menjalankan](#cara-menjalankan)
- [Konsep Teknis](#konsep-teknis)
- [Teknologi & Dependencies](#teknologi--dependencies)
- [Struktur Project](#struktur-project)
- [Lisensi](#lisensi)
- [Kontak](#kontak)

---

## Fitur Utama

Aplikasi terdiri dari **tiga modul independen** yang dipilih lewat tab di bar atas.
Berpindah tab **tidak me-reset** keadaan modul lain — setiap modul terus berjalan di
belakang layar.

### Modul 1 — Fraktal Kompleks (Mandelbrot & Julia)

Render himpunan fraktal dari iterasi `z → z² + c` memakai **escape-time algorithm**
dengan **smooth coloring** (continuous iteration count), sehingga gradasi warna tetap
halus tanpa pita bertingkat.

- **Zoom & pan interaktif** presisi tinggi: scroll untuk memperbesar tepat di posisi
  kursor, drag untuk menggeser bidang kompleks.
- **Zoom ultra-dalam (> 10¹⁰).** Saat presisi `double` mulai pecah, koordinat pusat
  otomatis berpindah ke **aritmetika _double-double_ (~32 digit desimal)** dan iterasi
  memakai **teori perturbasi + reference orbit** (dengan _rebasing_) agar tidak muncul
  artefak pembulatan.
- **Julia Set real-time:** slider `Re(c)` dan `Im(c)` mengubah bentuk fraktal seketika,
  plus opsi memutar `c` otomatis pada lingkaran.
- **Color mapping dinamis:** tiga palet kosinus (Kobalt, Tembaga, Spektrum) dengan
  kontrol rapat pita warna dan pergeseran fasa warna.
- **Iterasi adaptif:** batas iterasi bisa manual atau otomatis menyesuaikan kedalaman
  zoom.
- **Rendering paralel:** gambar dipecah menjadi pita baris dan dikerjakan oleh
  _pool Web Worker_ (jumlah menyesuaikan `navigator.hardwareConcurrency`), dengan render
  bertingkat (pratinjau cepat → kualitas penuh) supaya UI tetap responsif.

### Modul 2 — Lorenz Attractor (Sistem Dinamik Chaos)

Solusi numerik sistem persamaan diferensial Lorenz

```
dx/dt = σ (y − x)
dy/dt = x (ρ − z) − y
dz/dt = x y − β z
```

diintegrasikan dengan **Runge–Kutta orde 4 (RK4)** untuk akurasi tinggi (bukan Euler).

- **Visualisasi 3D → proyeksi 2D** dengan **matriks rotasi yang diimplementasikan
  sendiri** (yaw + pitch) dan proyeksi perspektif manual — tanpa Three.js / WebGL.
  Kamera dapat diputar (drag), di-zoom (scroll), dan berputar otomatis.
- **Parameter kontrol real-time:** slider `σ`, `ρ`, `β`, plus langkah waktu `dt`, jumlah
  langkah per frame, dan panjang jejak. Tersedia tombol preset nilai klasik `(10, 28, 8/3)`.
- **Sensitivitas kondisi awal:** jalankan **dua trajektori kembar** dengan selisih awal
  `10⁻⁵` untuk mendemonstrasikan _chaos_ / _butterfly effect_, dilengkapi grafik mini
  `log₁₀` jarak antar-trajektori — garis naik lurus = divergensi eksponensial.
- Readout numerik `x`, `y`, `z`, `t`, dan jarak antar-kembar.

### Modul 3 — Fourier Epicycle (Dekomposisi Fourier)

- **Drawing pad:** gambar bentuk bebas dengan satu goresan di kanvas, atau pakai preset
  **gelombang kotak** (memperlihatkan gejala Gibbs).
- **DFT manual** (tanpa library FFT): lintasan di-_resample_ menjadi `N` titik berjarak
  busur seragam, lalu **Discrete Fourier Transform dihitung langsung dari definisi**
  (`O(N²)`) untuk memperoleh koefisien kompleks. Perhitungan berjalan di Web Worker
  terpisah.
- **Animasi epicycle:** rangkaian lingkaran berputar (diurutkan dari amplitudo terbesar)
  yang jumlah vektornya menggambar ulang bentuk asli — efek "Fourier drawing machine"
  klasik. Jumlah harmonik yang dipakai bisa diatur untuk melihat aproksimasi mengkasar.
- **Spektrum frekuensi:** panel magnitudo vs frekuensi (rentang bertanda `−N/2 … N/2−1`)
  plus tabel koefisien dominan (`k`, `|Xₖ|`, fasa `φ`) dan waktu komputasi DFT.

### Fitur Umum

- **3 tab navigasi** untuk berpindah antar modul tanpa reset state.
- **Dark theme modern** dengan aksen teal/cyan (`#5ad1c4`) — tampilan profesional.
- **Semua kalkulasi diimplementasikan manual** dari rumus dasar (RK4, DFT, rotasi
  matriks, double-double, perturbasi) — bukan library siap pakai, untuk menunjukkan
  pemahaman matematika & _numerical methods_.
- **FPS counter** kecil di pojok kanan atas untuk memantau performa render.
- **Canvas responsif** terhadap ukuran window; tata letak menyesuaikan pada layar sempit.
- Kontrol **keyboard-accessible** dengan `focus-visible` yang jelas dan atribut ARIA
  pada tab. Menghormati `prefers-reduced-motion`.

---

## Screenshot

| Fraktal Mandelbrot | Lorenz Attractor | Fourier Epicycle |
|:---:|:---:|:---:|
| ![Fraktal Mandelbrot](assets/screenshot-mandelbrot.png) | ![Lorenz Attractor](assets/screenshot-lorenz.png) | ![Fourier Epicycle](assets/screenshot-fourier.png) |

> **Cara mengisi:** jalankan aplikasi di browser, buka masing-masing modul, ambil
> screenshot, simpan ke folder `assets/`, lalu **ganti path `assets/screenshot-X.png`
> di atas dengan nama file gambar yang sebenarnya**. Buat folder `assets/` bila belum ada.

---

## Cara Menjalankan

Project ini **statis** — tidak butuh build step, Node.js, atau dependensi apa pun.
Cukup jalankan lewat server statis (`http://` / `localhost`).

### Opsi A — Live Server (VS Code)

1. Install extension **"Live Server"** di VS Code.
2. Klik kanan file `index.html` → **"Open with Live Server"**.
3. Browser otomatis terbuka di `http://127.0.0.1:5500`.
4. Selesai.

### Opsi B — Server bawaan Python

1. Buka terminal di folder project.
2. Jalankan:
   ```bash
   python -m http.server 8000
   ```
3. Buka browser ke `http://localhost:8000`.

> **Catatan:** buka lewat `file:///` (double-click `index.html`) umumnya masih jalan
> karena Web Worker dibuat dari Blob URL dan ada _fallback_ ke UI thread bila worker
> ditolak. Namun untuk keandalan penuh (terutama _pool_ worker fraktal), gunakan
> `http://` / `localhost`.

### Deploy

Karena murni statis, repo bisa langsung di-host di **GitHub Pages**, Netlify, Vercel,
atau Cloudflare Pages tanpa konfigurasi. Untuk GitHub Pages: **Settings → Pages →
Source: `main` / root**.

---

## Konsep Teknis

**Fraktal Kompleks.** Setiap piksel memetakan sebuah titik `c` (Mandelbrot) atau `z₀`
(Julia) pada bidang kompleks, lalu mengiterasi `zₙ₊₁ = zₙ² + c` sampai `|z|` melewati
radius _bailout_ atau mencapai batas iterasi. Warna ditentukan oleh **smooth
(continuous) iteration count** `ν = n + 1 − log(log|z|) / log 2`, yang menghilangkan
pita diskret. Untuk zoom yang melampaui presisi `double` (~10⁻¹³ pada skala ini),
koordinat pusat disimpan sebagai pasangan `[hi, lo]` **double-double** (setara ~32 digit
desimal, lewat trik Dekker/Knuth: `twoSum`, `twoProd`, `split`), dan iterasi tiap piksel
memakai **teori perturbasi**: simpangan `δ = z − Z` terhadap satu _reference orbit_
presisi tinggi dihitung dengan `δₙ₊₁ = 2·Zₙ·δₙ + δₙ² + δc`, disertai **rebasing**
(metode Zhuoran) untuk mencegah _glitch_ saat `|Z + δ|` mengecil.

**Lorenz Attractor.** Sistem chaos deterministik tiga variabel `(x, y, z)` yang
solusinya sangat sensitif terhadap kondisi awal. Integrasi memakai **RK4** (empat
evaluasi medan vektor `k₁…k₄` per langkah, `sₙ₊₁ = sₙ + Δt/6·(k₁ + 2k₂ + 2k₃ + k₄)`)
yang jauh lebih akurat daripada Euler pada `Δt` yang sama. Titik 3D diproyeksikan ke
layar lewat **matriks rotasi kamera custom** `R = Rₓ(pitch)·R_y(yaw)` diikuti proyeksi
perspektif `u = f·X/(d − Z)`, `v = −f·Y/(d − Z)`. Dua trajektori dengan selisih awal
`10⁻⁵` menunjukkan divergensi eksponensial: `log₁₀` jaraknya naik mendekati garis lurus,
kemiringannya sebanding dengan eksponen Lyapunov terbesar.

**Fourier Series.** Setiap kurva tertutup dapat dipandang sebagai sinyal kompleks
periodik `x[n] = xₙ + i·yₙ` dan didekomposisi menjadi superposisi vektor berputar.
**DFT dihitung langsung dari definisi** `X[k] = (1/N) Σₙ x[n]·e^(−i·2πkn/N)` (tanpa FFT),
menghasilkan amplitudo `|Xₖ|`, fasa `φₖ`, dan frekuensi bertanda. **Animasi epicycle**
adalah interpretasi geometris dari penjumlahan vektor tersebut: `x(t) = Σₖ |Xₖ|·e^(i(fₖ·t + φₖ))`,
di mana setiap suku adalah lingkaran yang berputar di ujung lingkaran sebelumnya.
Membatasi jumlah harmonik = memotong deret Fourier, terlihat sebagai bentuk yang makin
kasar.

---

## Teknologi & Dependencies

| Lapisan | Detail |
|---|---|
| **Markup / Style** | HTML5, CSS3 vanilla (CSS Grid, custom properties) — tanpa framework |
| **Logika** | JavaScript vanilla (ES6+), tanpa library eksternal untuk matematika |
| **Grafik** | Canvas 2D API |
| **Konkurensi** | Web Workers (pool dibuat dari Blob URL, `toString()` fungsi numerik) |
| **Kalkulasi** | RK4, DFT `O(N²)`, rotasi matriks, aritmetika double-double, perturbasi — semua ditulis dari dasar |
| **Aset luar** | Hanya Google Fonts (Space Grotesk, IBM Plex Mono) — kosmetik, opsional |

**Butuh browser desktop modern (≈ 2020+):** `<canvas>` 2D, Web Worker + `Blob` +
`URL.createObjectURL`, `BigInt`, `Float64Array` / transferable `ArrayBuffer`.
Diuji pada versi terbaru Chrome, Firefox, dan Edge.

---

## Struktur Project

```
multi-system-visualizer/
├── index.html   # Kerangka halaman: tab, panel kontrol, elemen <canvas>
├── style.css    # Tema gelap, tata letak grid, gaya kontrol, responsif
├── script.js    # Seluruh logika: utilitas, inti numerik, Web Worker, 3 modul
├── README.md
├── LICENSE      # MIT License
├── .gitignore
└── assets/
    ├── screenshot-mandelbrot.png
    ├── screenshot-lorenz.png
    └── screenshot-fourier.png
```

Pembagian `script.js`:

| Bagian | Isi |
|---|---|
| 0 | Utilitas kecil (`$`, `clamp`, `bindRange`, `fitCanvas`, …) |
| 1 | Aritmetika double-double (`ddAdd`, `ddMul`, konversi BigInt, …) |
| 2 | Inti fraktal (iterasi, smooth count, palet, reference orbit, perturbasi) |
| 3 | Inti sistem dinamik Lorenz (medan vektor + langkah RK4) |
| 4 | Inti Fourier (resample + DFT) |
| 5 | Pabrik Web Worker (kode fungsi di atas dipakai ulang di worker) |
| Modul 1–3 | Objek tiap modul: state, kontrol, event, loop render |
| Akhir | Registrasi modul, pengalih tab, loop `requestAnimationFrame`, FPS |

---

## Lisensi

Project ini dilisensikan di bawah **MIT License**. Lihat file [`LICENSE`](LICENSE) untuk
detail.

---

## Kontak

Dibuat oleh **NagataRafi** sebagai proyek portofolio.

- Email: nagatapct@gmail.com
- GitHub: [@NagataRafi](https://github.com/NagataRafi)

Silakan buka _issue_ atau _pull request_ bila menemukan bug atau punya ide perbaikan.
