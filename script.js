/* =====================================================================
   Multi-System Mathematical Visualizer
   Semua inti numerik (fraktal, RK4, DFT, proyeksi 3D) ditulis manual
   dari rumus dasar. Tidak ada library matematika eksternal.
   ===================================================================== */
'use strict';

/* ---------------------------------------------------------------------
   0. Utilitas kecil
   --------------------------------------------------------------------- */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const TAU = 6.283185307179586;

function bindRange(id, onInput, format) {
  const input = $('#' + id);
  const out = $('#' + id + '-v');
  const apply = () => {
    const v = parseFloat(input.value);
    if (out) out.textContent = format ? format(v) : String(v);
    onInput(v);
  };
  input.addEventListener('input', apply);
  apply();
  return input;
}

function fitCanvas(canvas, maxDpr) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr || 2);
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    return true;
  }
  return false;
}

function canvasPos(canvas, ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - r.left) * (canvas.width / r.width),
    y: (ev.clientY - r.top) * (canvas.height / r.height)
  };
}

/* ---------------------------------------------------------------------
   1. Aritmetika double-double (~32 digit desimal)
   Sebuah bilangan disimpan sebagai pasangan [hi, lo] dengan
   nilai eksak = hi + lo dan |lo| <= ulp(hi)/2.
   Dipakai untuk koordinat pusat saat zoom melewati batas presisi double.
   --------------------------------------------------------------------- */

/* quickTwoSum: syarat |a| >= |b|; hasil eksak a+b = s + e */
function ddQuickTwoSum(a, b) {
  const s = a + b;
  return [s, b - (s - a)];
}

/* twoSum: penjumlahan eksak tanpa syarat urutan */
function ddTwoSum(a, b) {
  const s = a + b;
  const v = s - a;
  return [s, (a - (s - v)) + (b - v)];
}

/* split Dekker: pecah double jadi dua bagian 26-bit */
function ddSplit(a) {
  const t = 134217729 * a;           // 2^27 + 1
  const hi = t - (t - a);
  return [hi, a - hi];
}

/* twoProd: perkalian eksak a*b = p + e */
function ddTwoProd(a, b) {
  const p = a * b;
  const A = ddSplit(a), B = ddSplit(b);
  const e = ((A[0] * B[0] - p) + A[0] * B[1] + A[1] * B[0]) + A[1] * B[1];
  return [p, e];
}

function ddAdd(A, B) {
  const s = ddTwoSum(A[0], B[0]);
  return ddQuickTwoSum(s[0], s[1] + A[1] + B[1]);
}

function ddMul(A, B) {
  const p = ddTwoProd(A[0], B[0]);
  return ddQuickTwoSum(p[0], p[1] + A[0] * B[1] + A[1] * B[0]);
}

function ddNeg(A) { return [-A[0], -A[1]]; }
function ddSub(A, B) { return ddAdd(A, ddNeg(B)); }
function ddFrom(x) { return [x, 0]; }
function ddNum(A) { return A[0] + A[1]; }

/* Konversi double ke BigInt terskala 10^S secara eksak (untuk cetak
   koordinat pada zoom dalam, di mana toFixed sudah kehabisan digit). */
function doubleToScaledBigInt(x, S) {
  if (!isFinite(x) || x === 0) return 0n;
  const dv = new DataView(new ArrayBuffer(8));
  dv.setFloat64(0, x);
  const bits = (BigInt(dv.getUint32(0)) << 32n) | BigInt(dv.getUint32(4));
  const sign = (bits >> 63n) & 1n;
  const expo = Number((bits >> 52n) & 0x7FFn);
  let mant = bits & 0xFFFFFFFFFFFFFn;
  let e;
  if (expo === 0) { e = -1074; } else { mant |= (1n << 52n); e = expo - 1075; }
  const num = mant * (10n ** BigInt(S));
  const r = e >= 0 ? (num << BigInt(e)) : (num >> BigInt(-e));
  return sign ? -r : r;
}

function ddToDecimalString(A, digits) {
  const S = clamp(Math.round(digits), 3, 40);
  let v = doubleToScaledBigInt(A[0], S) + doubleToScaledBigInt(A[1], S);
  const neg = v < 0n;
  if (neg) v = -v;
  const base = 10n ** BigInt(S);
  return (neg ? '-' : '') + (v / base).toString() + '.' + (v % base).toString().padStart(S, '0');
}

/* ---------------------------------------------------------------------
   2. Inti fraktal
   --------------------------------------------------------------------- */

/* Pewarnaan kontinu (smooth coloring):
   nu = n + 1 - log(log|z|) / log(2) */
function smoothCount(iter, zm) {
  const lz = 0.5 * Math.log(zm);            // log|z| dari |z|^2
  const nu = iter + 1 - Math.log(lz) / Math.LN2;
  return nu > 0 ? nu : 0;
}

/* Mandelbrot, escape-time: z(0) = 0, z(n+1) = z(n)^2 + c
   Nilai balik: nu (smooth) atau -1 bila titik di dalam himpunan. */
function mandelbrotIterate(cx, cy, maxIter, bail2) {
  // uji analitik kardioid utama dan bulb periode-2 -> hemat iterasi
  const q = (cx - 0.25) * (cx - 0.25) + cy * cy;
  if (q * (q + (cx - 0.25)) <= 0.25 * cy * cy) return -1;
  if ((cx + 1) * (cx + 1) + cy * cy <= 0.0625) return -1;

  let zx = 0, zy = 0;
  for (let i = 0; i < maxIter; i++) {
    const x2 = zx * zx, y2 = zy * zy;
    if (x2 + y2 > bail2) return smoothCount(i, x2 + y2);
    const t = 2 * zx * zy;
    zx = x2 - y2 + cx;
    zy = t + cy;
  }
  return -1;
}

/* Julia: c tetap, z(0) = titik pada bidang, z(n+1) = z(n)^2 + c */
function juliaIterate(zx, zy, cx, cy, maxIter, bail2) {
  for (let i = 0; i < maxIter; i++) {
    const x2 = zx * zx, y2 = zy * zy;
    if (x2 + y2 > bail2) return smoothCount(i, x2 + y2);
    const t = 2 * zx * zy;
    zx = x2 - y2 + cx;
    zy = t + cy;
  }
  return -1;
}

/* Orbit rujukan presisi tinggi untuk teori perturbasi:
   Z(n+1) = Z(n)^2 + C dihitung dalam aritmetika double-double,
   lalu disimpan sebagai double. */
function buildReferenceOrbit(cxHi, cxLo, cyHi, cyLo, maxIter, bail2) {
  const cap = maxIter + 2;
  const rx = new Float64Array(cap), ry = new Float64Array(cap);
  const Cx = [cxHi, cxLo], Cy = [cyHi, cyLo];
  let Zx = [0, 0], Zy = [0, 0];
  let n = 0;
  for (; n < cap; n++) {
    const zx = ddNum(Zx), zy = ddNum(Zy);
    rx[n] = zx; ry[n] = zy;
    if (zx * zx + zy * zy > bail2) { n++; break; }
    const xx = ddMul(Zx, Zx), yy = ddMul(Zy, Zy), xy = ddMul(Zx, Zy);
    const nx = ddAdd(ddSub(xx, yy), Cx);
    const ny = ddAdd(ddAdd(xy, xy), Cy);
    Zx = nx; Zy = ny;
  }
  return { rx: rx, ry: ry, len: n };
}

/* Iterasi perturbasi + rebasing (metode Zhuoran).
   d = z - Z adalah simpangan piksel terhadap orbit rujukan:
   d(n+1) = 2*Z(n)*d(n) + d(n)^2 + dc
   Bila |Z+d| < |d| orbit di-rebase (d := Z+d, n := 0) sehingga
   tidak muncul glitch walau semua aritmetika piksel tetap double. */
function perturbIterate(dcx, dcy, rx, ry, refLen, maxIter, bail2) {
  let dx = 0, dy = 0, n = 0, iter = 0;
  while (iter < maxIter) {
    const Zx = rx[n], Zy = ry[n];
    const ndx = 2 * (Zx * dx - Zy * dy) + (dx * dx - dy * dy) + dcx;
    const ndy = 2 * (Zx * dy + Zy * dx) + 2 * dx * dy + dcy;
    dx = ndx; dy = ndy;
    n++; iter++;
    const zx = rx[n] + dx, zy = ry[n] + dy;
    const zm = zx * zx + zy * zy;
    if (zm > bail2) return smoothCount(iter, zm);
    if (zm < dx * dx + dy * dy || n >= refLen - 1) { dx = zx; dy = zy; n = 0; }
  }
  return -1;
}

/* Palet kosinus: kanal(t) = a + b*cos(2*pi*(f*t + p)) */
function paletteColor(t, P, out) {
  out[0] = 255 * (P.a[0] + P.b[0] * Math.cos(TAU * (P.f[0] * t + P.p[0])));
  out[1] = 255 * (P.a[1] + P.b[1] * Math.cos(TAU * (P.f[1] * t + P.p[1])));
  out[2] = 255 * (P.a[2] + P.b[2] * Math.cos(TAU * (P.f[2] * t + P.p[2])));
}

/* Render satu buffer piksel penuh. Dipakai di dalam Web Worker,
   dan sebagai cadangan di UI thread bila Worker tidak tersedia. */
function renderFractalTile(m) {
  const clock = (typeof performance !== 'undefined' ? performance : Date);
  const t0 = clock.now();
  const w = m.w, h = m.h, s = m.scale, bail2 = m.bail2, maxIter = m.maxIter;
  const y0 = m.y0 || 0;                 // baris awal pita ini
  const hFull = m.hFull || h;           // tinggi gambar utuh
  const buf = new Uint8ClampedArray(w * h * 4);
  const col = new Float64Array(3);
  const kind = m.mode === 'julia' ? 1 : (m.deep ? 2 : 0);
  let ref = null;
  if (kind === 2) ref = buildReferenceOrbit(m.cxHi, m.cxLo, m.cyHi, m.cyLo, maxIter, bail2);

  let p = 0;
  for (let y = 0; y < h; y++) {
    const dcy = (hFull * 0.5 - (y0 + y) - 0.5) * s;
    const cy = m.cyHi + (m.cyLo + dcy);
    for (let x = 0; x < w; x++) {
      const dcx = (x + 0.5 - w * 0.5) * s;
      let nu;
      if (kind === 1) nu = juliaIterate(m.cxHi + (m.cxLo + dcx), cy, m.jcx, m.jcy, maxIter, bail2);
      else if (kind === 2) nu = perturbIterate(dcx, dcy, ref.rx, ref.ry, ref.len, maxIter, bail2);
      else nu = mandelbrotIterate(m.cxHi + (m.cxLo + dcx), cy, maxIter, bail2);

      if (nu < 0) { buf[p] = 13; buf[p + 1] = 17; buf[p + 2] = 32; }
      else {
        paletteColor(nu * m.cycle + m.shift, m.pal, col);
        buf[p] = col[0]; buf[p + 1] = col[1]; buf[p + 2] = col[2];
      }
      buf[p + 3] = 255;
      p += 4;
    }
  }
  return { buf: buf, ms: clock.now() - t0, refLen: ref ? ref.len : 0, y0: y0 };
}

/* ---------------------------------------------------------------------
   3. Inti sistem dinamik Lorenz
   --------------------------------------------------------------------- */

/* Medan vektor Lorenz:
   dx/dt = sigma*(y - x)
   dy/dt = x*(rho - z) - y
   dz/dt = x*y - beta*z */
function lorenzDeriv(s, p, out) {
  out[0] = p.sigma * (s[1] - s[0]);
  out[1] = s[0] * (p.rho - s[2]) - s[1];
  out[2] = s[0] * s[1] - p.beta * s[2];
}

/* Runge-Kutta orde 4:
   k1 = f(s)
   k2 = f(s + dt/2 * k1)
   k3 = f(s + dt/2 * k2)
   k4 = f(s + dt   * k3)
   s(n+1) = s(n) + dt/6 * (k1 + 2*k2 + 2*k3 + k4) */
const RK_SCRATCH = {
  k1: new Float64Array(3), k2: new Float64Array(3),
  k3: new Float64Array(3), k4: new Float64Array(3),
  tmp: new Float64Array(3)
};
function rk4Step(s, dt, p) {
  const k1 = RK_SCRATCH.k1, k2 = RK_SCRATCH.k2, k3 = RK_SCRATCH.k3,
        k4 = RK_SCRATCH.k4, tmp = RK_SCRATCH.tmp;
  lorenzDeriv(s, p, k1);
  for (let i = 0; i < 3; i++) tmp[i] = s[i] + 0.5 * dt * k1[i];
  lorenzDeriv(tmp, p, k2);
  for (let i = 0; i < 3; i++) tmp[i] = s[i] + 0.5 * dt * k2[i];
  lorenzDeriv(tmp, p, k3);
  for (let i = 0; i < 3; i++) tmp[i] = s[i] + dt * k3[i];
  lorenzDeriv(tmp, p, k4);
  const c = dt / 6;
  for (let i = 0; i < 3; i++) s[i] += c * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  return s;
}

/* Rotasi manual R = Rx(pitch) * Ry(yaw), lalu proyeksi perspektif
   u = focal * X / (dist - Z),  v = -focal * Y / (dist - Z) */
function project3D(x, y, z, cy, sy, cp, sp, dist, focal, out) {
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const y2 = y * cp - z1 * sp;
  const z2 = y * sp + z1 * cp;
  let den = dist - z2;
  if (den < 1) den = 1;
  const k = focal / den;
  out[0] = x1 * k;
  out[1] = -y2 * k;
  out[2] = z2;
}

/* ---------------------------------------------------------------------
   4. Inti Fourier
   --------------------------------------------------------------------- */

/* Resample lintasan menjadi N titik berjarak busur seragam. */
function resamplePath(pts, N) {
  if (pts.length < 2) return null;
  const cum = new Float64Array(pts.length);
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    cum[i] = total;
  }
  if (total <= 0) return null;
  const out = new Float64Array(N * 2);
  let j = 1;
  for (let k = 0; k < N; k++) {
    const d = total * k / N;
    while (j < pts.length - 1 && cum[j] < d) j++;
    const seg = cum[j] - cum[j - 1];
    const t = seg > 1e-12 ? (d - cum[j - 1]) / seg : 0;
    out[2 * k] = pts[j - 1].x + t * (pts[j].x - pts[j - 1].x);
    out[2 * k + 1] = pts[j - 1].y + t * (pts[j].y - pts[j - 1].y);
  }
  return out;
}

/* DFT langsung dari definisi, sinyal kompleks x[n] = px + i*py:
   X[k] = (1/N) * sum_{n=0}^{N-1} x[n] * (cos(2*pi*k*n/N) - i*sin(2*pi*k*n/N))
   Frekuensi dipetakan ke rentang bertanda -N/2 .. N/2-1 agar epicycle
   berputar dua arah. */
function computeDFT(xy, N) {
  const re = new Float64Array(N), im = new Float64Array(N);
  const amp = new Float64Array(N), phase = new Float64Array(N);
  const freq = new Int32Array(N);
  const step = TAU / N;
  for (let k = 0; k < N; k++) {
    let sr = 0, si = 0;
    const wk = step * k;
    for (let n = 0; n < N; n++) {
      const a = wk * n;
      const c = Math.cos(a), s = Math.sin(a);
      const xr = xy[2 * n], xi = xy[2 * n + 1];
      sr += xr * c + xi * s;
      si += xi * c - xr * s;
    }
    re[k] = sr / N;
    im[k] = si / N;
    amp[k] = Math.hypot(re[k], im[k]);
    phase[k] = Math.atan2(im[k], re[k]);
    freq[k] = k <= N / 2 ? k : k - N;
  }
  // urutan gambar epicycle: amplitudo terbesar lebih dulu
  const order = new Int32Array(N);
  for (let i = 0; i < N; i++) order[i] = i;
  const arr = Array.prototype.slice.call(order);
  arr.sort((a, b) => amp[b] - amp[a]);
  for (let i = 0; i < N; i++) order[i] = arr[i];
  return { re: re, im: im, amp: amp, phase: phase, freq: freq, order: order, N: N };
}

/* ---------------------------------------------------------------------
   5. Pabrik Web Worker (kode diambil dari sumber fungsi di atas,
      jadi rumus hanya ditulis satu kali)
   --------------------------------------------------------------------- */
function workerURL(fns, body) {
  try {
    const src = fns.map(f => f.toString()).join('\n\n') + '\n\n' + body;
    return URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  } catch (err) {
    console.warn('Blob worker tidak bisa dibuat:', err);
    return null;
  }
}

function spawnWorker(url) {
  try { return url ? new Worker(url) : null; }
  catch (err) { console.warn('Worker ditolak, kalkulasi jatuh ke UI thread:', err); return null; }
}

const FRACTAL_URL = workerURL(
  [ddQuickTwoSum, ddTwoSum, ddSplit, ddTwoProd, ddAdd, ddMul, ddNeg, ddSub, ddFrom, ddNum,
   smoothCount, mandelbrotIterate, juliaIterate, buildReferenceOrbit, perturbIterate,
   paletteColor, renderFractalTile],
  'var TAU = 6.283185307179586;\n' +
  'self.onmessage = function (ev) {\n' +
  '  var m = ev.data;\n' +
  '  var r = renderFractalTile(m);\n' +
  '  self.postMessage({ id: m.id, w: m.w, h: m.h, y0: r.y0, step: m.step, ms: r.ms,\n' +
  '                     refLen: r.refLen, buf: r.buf.buffer }, [r.buf.buffer]);\n' +
  '};\n'
);

const DFT_URL = workerURL(
  [computeDFT],
  'var TAU = 6.283185307179586;\n' +
  'self.onmessage = function (ev) {\n' +
  '  var t0 = performance.now();\n' +
  '  var r = computeDFT(new Float64Array(ev.data.xy), ev.data.N);\n' +
  '  r.ms = performance.now() - t0;\n' +
  '  r.id = ev.data.id;\n' +
  '  self.postMessage(r);\n' +
  '};\n'
);

/* Kolam worker: satu render fraktal dibagi menjadi pita baris,
   satu pita per worker, lalu disatukan kembali di UI thread. */
const POOL_SIZE = clamp((navigator.hardwareConcurrency || 4) - 1, 1, 8);
let fractalPool = [];
for (let i = 0; i < POOL_SIZE; i++) {
  const w = spawnWorker(FRACTAL_URL);
  if (w) fractalPool.push(w);
}
let dftWorker = spawnWorker(DFT_URL);

/* =====================================================================
   MODUL 1 — Fraktal
   ===================================================================== */
const Fractal = (function () {
  const canvas = $('#fractal-canvas');
  const ctx = canvas.getContext('2d');
  const off = document.createElement('canvas');
  const octx = off.getContext('2d');

  const PALETTES = [
    { a: [0.50, 0.50, 0.56], b: [0.45, 0.45, 0.50], f: [1, 1, 1], p: [0.00, 0.13, 0.26] },
    { a: [0.54, 0.42, 0.34], b: [0.46, 0.42, 0.34], f: [1, 1, 1], p: [0.05, 0.30, 0.58] },
    { a: [0.48, 0.48, 0.48], b: [0.50, 0.50, 0.50], f: [1, 1, 1], p: [0.00, 0.33, 0.67] }
  ];
  const SPAN0 = 3.2;
  const BAIL2 = 65536;          // radius bailout 256, cukup besar untuk warna mulus
  const DEEP_SCALE = 5e-13;     // di bawah ini double sudah pecah -> pakai perturbasi

  const st = {
    mode: 'mandelbrot',
    cx: ddFrom(-0.6), cy: ddFrom(0),
    scale: SPAN0 / 600,
    maxIter: 400, autoIter: true,
    palette: 0, cycle: 0.035, shift: 0,
    jcx: -0.75, jcy: 0.11, animC: false, animT: 0
  };

  let jobId = 0, busy = false, wanted = null, idleTimer = 0;
  let remaining = 0, curStep = 1, curMs = 0;
  const prev = document.createElement('canvas');
  const pctx = prev.getContext('2d');

  function zoomLevel() { return SPAN0 / (st.scale * Math.max(1, canvas.height)); }

  function effectiveIter() {
    if (!st.autoIter) return st.maxIter;
    const z = zoomLevel();
    return clamp(Math.round(220 + 150 * Math.log10(z + 10)), 220, 6000);
  }

  /* langkah pratinjau dipilih agar jumlah piksel ~45k, berapa pun ukuran layar */
  function previewStep() {
    const px = Math.max(1, canvas.width * canvas.height);
    return clamp(Math.ceil(Math.sqrt(px / 45000)), 2, 12);
  }

  function buildMessage(step) {
    const w = Math.max(1, Math.ceil(canvas.width / step));
    const h = Math.max(1, Math.ceil(canvas.height / step));
    const deep = st.mode === 'mandelbrot' && st.scale < DEEP_SCALE;
    return {
      id: ++jobId, w: w, h: h, step: step,
      scale: st.scale * step,
      cxHi: st.cx[0], cxLo: st.cx[1], cyHi: st.cy[0], cyLo: st.cy[1],
      jcx: st.jcx, jcy: st.jcy,
      mode: st.mode, deep: deep,
      maxIter: effectiveIter(), bail2: BAIL2,
      pal: PALETTES[st.palette], cycle: st.cycle, shift: st.shift
    };
  }

  function request(step) {
    if (busy) { wanted = (wanted === null) ? step : Math.min(wanted, step); return; }
    dispatch(step);
  }

  function dispatch(step) {
    busy = true; wanted = null;
    const msg = buildMessage(step);
    off.width = msg.w; off.height = msg.h;
    octx.clearRect(0, 0, msg.w, msg.h);
    if (canvas.width > 0 && canvas.height > 0) {
      prev.width = canvas.width; prev.height = canvas.height;
      pctx.drawImage(canvas, 0, 0);
    }
    curStep = step; curMs = 0;

    const bands = fractalPool.length || 1;
    remaining = bands;
    for (let i = 0; i < bands; i++) {
      const y0 = Math.floor(msg.h * i / bands);
      const y1 = Math.floor(msg.h * (i + 1) / bands);
      if (y1 <= y0) { remaining--; continue; }
      const band = Object.assign({}, msg, { y0: y0, h: y1 - y0, hFull: msg.h });
      if (fractalPool.length) {
        fractalPool[i].postMessage(band);
      } else {
        const r = renderFractalTile(band);
        paintBand({ id: band.id, y0: y0, w: band.w, h: band.h, ms: r.ms, buf: r.buf.buffer });
      }
    }
  }

  function paintBand(res) {
    if (res.id !== jobId) return;          // hasil usang, abaikan
    octx.putImageData(new ImageData(new Uint8ClampedArray(res.buf), res.w, res.h), 0, res.y0);
    if (res.ms > curMs) curMs = res.ms;
    remaining--;
    blit();
    if (remaining <= 0) finish();
  }

  /* frame sebelumnya dipakai sebagai alas selama pita baru belum lengkap */
  function blit() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (remaining > 0 && prev.width > 0) {
      ctx.drawImage(prev, 0, 0, prev.width, prev.height, 0, 0, canvas.width, canvas.height);
    }
    ctx.imageSmoothingEnabled = curStep > 1;
    ctx.drawImage(off, 0, 0, off.width, off.height, 0, 0, off.width * curStep, off.height * curStep);
  }

  function finish() {
    busy = false;
    $('#f-ms').textContent = curMs.toFixed(1) + ' ms' +
      (curStep > 1 ? ' (pratinjau)' : '') +
      (fractalPool.length > 1 ? ' · ' + fractalPool.length + ' worker' : '');
    $('#f-zoom').textContent = zoomLevel().toExponential(2) + '×';
    $('#f-pix').textContent = st.scale.toExponential(2);
    $('#f-arith').textContent =
      (st.mode === 'mandelbrot' && st.scale < DEEP_SCALE) ? 'double-double + perturbasi' : 'double';
    if (st.autoIter) {
      const it = effectiveIter();
      $('#f-iter').value = clamp(it, 60, 6000);
      $('#f-iter-v').textContent = String(it);
    }
    if (wanted !== null) dispatch(wanted);
  }

  fractalPool.forEach(w => {
    w.onmessage = ev => paintBand(ev.data);
    w.onerror = () => {
      fractalPool.forEach(x => { try { x.terminate(); } catch (e) { /* abaikan */ } });
      fractalPool = [];
      busy = false; wanted = null; remaining = 0;
      dispatch(1);
    };
  });

  /* --- render bertingkat: pratinjau cepat lalu kualitas penuh --- */
  function refresh(fast) {
    clearTimeout(idleTimer);
    if (fast) {
      request(previewStep());
      idleTimer = setTimeout(() => request(1), 170);
    } else {
      request(1);
    }
  }

  /* --- interaksi --- */
  let drag = null;

  canvas.addEventListener('wheel', ev => {
    ev.preventDefault();
    const p = canvasPos(canvas, ev);
    const factor = Math.exp(-ev.deltaY * (ev.deltaMode === 1 ? 0.05 : 0.0016));
    const ns = clamp(st.scale / factor, 1e-30, SPAN0 / 40);
    // titik di bawah kursor dipertahankan: c = pusat + d*skala tetap sama
    const dx = p.x - canvas.width * 0.5;
    const dy = canvas.height * 0.5 - p.y;
    st.cx = ddAdd(st.cx, ddFrom(dx * (st.scale - ns)));
    st.cy = ddAdd(st.cy, ddFrom(dy * (st.scale - ns)));
    st.scale = ns;
    refresh(true);
  }, { passive: false });

  canvas.addEventListener('pointerdown', ev => {
    canvas.setPointerCapture(ev.pointerId);
    canvas.classList.add('is-drag');
    drag = canvasPos(canvas, ev);
  });

  canvas.addEventListener('pointermove', ev => {
    const p = canvasPos(canvas, ev);
    if (drag) {
      st.cx = ddAdd(st.cx, ddFrom(-(p.x - drag.x) * st.scale));
      st.cy = ddAdd(st.cy, ddFrom((p.y - drag.y) * st.scale));
      drag = p;
      refresh(true);
    }
    const digits = clamp(Math.round(-Math.log10(st.scale)) + 3, 4, 34);
    const re = ddAdd(st.cx, ddFrom((p.x - canvas.width * 0.5) * st.scale));
    const im = ddAdd(st.cy, ddFrom((canvas.height * 0.5 - p.y) * st.scale));
    $('#f-re').textContent = ddToDecimalString(re, digits);
    $('#f-im').textContent = ddToDecimalString(im, digits);
  });

  const endDrag = () => { drag = null; canvas.classList.remove('is-drag'); refresh(false); };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', () => { if (!drag) { $('#f-re').textContent = '–'; $('#f-im').textContent = '–'; } });

  /* --- kontrol --- */
  $$('[data-fmode]').forEach(b => b.addEventListener('click', () => {
    $$('[data-fmode]').forEach(x => x.classList.toggle('is-on', x === b));
    st.mode = b.dataset.fmode;
    $('#julia-group').hidden = st.mode !== 'julia';
    st.cx = ddFrom(st.mode === 'julia' ? 0 : -0.6);
    st.cy = ddFrom(0);
    st.scale = SPAN0 / Math.max(1, canvas.height);
    refresh(false);
  }));

  $$('[data-pal]').forEach(b => b.addEventListener('click', () => {
    $$('[data-pal]').forEach(x => x.classList.toggle('is-on', x === b));
    st.palette = parseInt(b.dataset.pal, 10);
    refresh(false);
  }));

  bindRange('f-jre', v => { st.jcx = v; if (st.mode === 'julia') refresh(true); }, v => v.toFixed(3));
  bindRange('f-jim', v => { st.jcy = v; if (st.mode === 'julia') refresh(true); }, v => v.toFixed(3));
  bindRange('f-iter', v => { if (!st.autoIter) { st.maxIter = v; refresh(true); } }, v => String(v));
  bindRange('f-cycle', v => { st.cycle = v; refresh(true); }, v => v.toFixed(3));
  bindRange('f-shift', v => { st.shift = v; refresh(true); }, v => v.toFixed(2));

  $('#f-autoiter').addEventListener('change', e => {
    st.autoIter = e.target.checked;
    if (!st.autoIter) st.maxIter = parseFloat($('#f-iter').value);
    refresh(false);
  });
  $('#f-animc').addEventListener('change', e => { st.animC = e.target.checked; });
  $('#f-reset').addEventListener('click', () => {
    st.cx = ddFrom(st.mode === 'julia' ? 0 : -0.6);
    st.cy = ddFrom(0);
    st.scale = SPAN0 / Math.max(1, canvas.height);
    refresh(false);
  });

  /* --- animasi konstanta c (opsional) --- */
  function tick(dt) {
    if (!st.animC || st.mode !== 'julia') return;
    st.animT += dt * 0.25;
    const r = 0.7885;
    st.jcx = r * Math.cos(st.animT);
    st.jcy = r * Math.sin(st.animT);
    $('#f-jre').value = st.jcx; $('#f-jre-v').textContent = st.jcx.toFixed(3);
    $('#f-jim').value = st.jcy; $('#f-jim-v').textContent = st.jcy.toFixed(3);
    request(Math.max(2, previewStep() - 2));
  }

  function resize() {
    const first = canvas.width === 0;
    if (fitCanvas(canvas, 1) || first) {
      if (first) st.scale = SPAN0 / Math.max(1, canvas.height);
      refresh(true);
    }
  }

  return { resize: resize, tick: tick };
})();

/* =====================================================================
   MODUL 2 — Lorenz attractor
   ===================================================================== */
const Lorenz = (function () {
  const canvas = $('#lorenz-canvas');
  const ctx = canvas.getContext('2d');
  const chart = $('#l-diverge');
  const cctx = chart.getContext('2d');

  const CAP = 8000;
  function makeTrail(cap) {
    return { buf: new Float64Array(cap * 3), cap: cap, n: 0, head: 0 };
  }
  function trailPush(tr, x, y, z) {
    const i = tr.head * 3;
    tr.buf[i] = x; tr.buf[i + 1] = y; tr.buf[i + 2] = z;
    tr.head = (tr.head + 1) % tr.cap;
    if (tr.n < tr.cap) tr.n++;
  }
  function trailIndex(tr, k, limit) {
    const n = Math.min(tr.n, limit);
    const start = ((tr.head - n) % tr.cap + tr.cap) % tr.cap;
    return ((start + k) % tr.cap) * 3;
  }

  const st = {
    p: { sigma: 10, rho: 28, beta: 8 / 3 },
    dt: 0.005, stepsPerFrame: 8, trailLen: 3000,
    a: new Float64Array([1, 1, 1]),
    b: new Float64Array([1 + 1e-5, 1, 1]),
    ta: makeTrail(CAP), tb: makeTrail(CAP),
    t: 0, running: true, twin: true,
    yaw: 0.6, pitch: 0.35, zoom: 1, spin: true,
    sep: [], sepMax: 240
  };

  const proj = new Float64Array(3);
  let ptsA = new Float64Array(CAP * 2), ptsB = new Float64Array(CAP * 2);

  function reset() {
    st.a.set([1, 1, 1]);
    st.b.set([1 + 1e-5, 1, 1]);
    st.ta.n = st.ta.head = 0;
    st.tb.n = st.tb.head = 0;
    st.sep.length = 0;
    st.t = 0;
  }
  reset();

  function step() {
    for (let i = 0; i < st.stepsPerFrame; i++) {
      rk4Step(st.a, st.dt, st.p);
      if (st.twin) rk4Step(st.b, st.dt, st.p);
      st.t += st.dt;
      trailPush(st.ta, st.a[0], st.a[1], st.a[2]);
      if (st.twin) trailPush(st.tb, st.b[0], st.b[1], st.b[2]);
    }
    if (!isFinite(st.a[0]) || !isFinite(st.a[1]) || !isFinite(st.a[2])) { reset(); return; }
    if (st.twin) {
      const d = Math.hypot(st.a[0] - st.b[0], st.a[1] - st.b[1], st.a[2] - st.b[2]);
      st.sep.push(Math.log10(Math.max(d, 1e-18)));
      if (st.sep.length > st.sepMax) st.sep.shift();
      $('#l-sep').textContent = d.toExponential(3);
    } else {
      $('#l-sep').textContent = '–';
    }
    $('#l-x').textContent = st.a[0].toFixed(4);
    $('#l-y').textContent = st.a[1].toFixed(4);
    $('#l-z').textContent = st.a[2].toFixed(4);
    $('#l-t').textContent = st.t.toFixed(2);
  }

  function projectTrail(tr, out, cy, sy, cp, sp, dist, focal, cx0, cy0) {
    const n = Math.min(tr.n, st.trailLen);
    for (let k = 0; k < n; k++) {
      const i = trailIndex(tr, k, st.trailLen);
      project3D(tr.buf[i], tr.buf[i + 1], tr.buf[i + 2] - 25, cy, sy, cp, sp, dist, focal, proj);
      out[2 * k] = cx0 + proj[0];
      out[2 * k + 1] = cy0 + proj[1];
    }
    return n;
  }

  /* jejak digambar dalam beberapa potongan agar bagian lama lebih pudar */
  function strokeChunks(pts, n, color) {
    const CH = 6;
    for (let c = 0; c < CH; c++) {
      const from = Math.floor(n * c / CH);
      const to = Math.floor(n * (c + 1) / CH);
      if (to - from < 2) continue;
      ctx.globalAlpha = 0.12 + 0.88 * ((c + 1) / CH) * ((c + 1) / CH);
      ctx.lineWidth = 0.8 + 1.4 * (c / CH);
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.moveTo(pts[2 * from], pts[2 * from + 1]);
      for (let k = from + 1; k <= to && k < n; k++) ctx.lineTo(pts[2 * k], pts[2 * k + 1]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const cy = Math.cos(st.yaw), sy = Math.sin(st.yaw);
    const cp = Math.cos(st.pitch), sp = Math.sin(st.pitch);
    const focal = H * 0.95 * st.zoom;
    const dist = 95;
    const cx0 = W * 0.5, cy0 = H * 0.5;

    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    const nA = projectTrail(st.ta, ptsA, cy, sy, cp, sp, dist, focal, cx0, cy0);
    if (st.twin) {
      const nB = projectTrail(st.tb, ptsB, cy, sy, cp, sp, dist, focal, cx0, cy0);
      strokeChunks(ptsB, nB, '#f2a154');
      if (nB > 0) headDot(ptsB[2 * nB - 2], ptsB[2 * nB - 1], '#f2a154');
    }
    strokeChunks(ptsA, nA, '#5ad1c4');
    if (nA > 0) headDot(ptsA[2 * nA - 2], ptsA[2 * nA - 1], '#5ad1c4');

    drawChart();
  }

  function headDot(x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 3.2, 0, TAU);
    ctx.fill();
  }

  function drawChart() {
    fitCanvas(chart, 2);
    const W = chart.width, H = chart.height;
    cctx.clearRect(0, 0, W, H);
    if (st.sep.length < 2) return;
    const lo = -6, hi = 2;                       // log10 jarak
    cctx.strokeStyle = '#313c69';
    cctx.lineWidth = 1;
    cctx.beginPath();
    for (let g = lo; g <= hi; g += 2) {
      const y = H - (g - lo) / (hi - lo) * H;
      cctx.moveTo(0, y); cctx.lineTo(W, y);
    }
    cctx.stroke();
    cctx.strokeStyle = '#e0709f';
    cctx.lineWidth = 1.6;
    cctx.beginPath();
    for (let i = 0; i < st.sep.length; i++) {
      const x = i / (st.sepMax - 1) * W;
      const y = H - clamp((st.sep[i] - lo) / (hi - lo), 0, 1) * H;
      i === 0 ? cctx.moveTo(x, y) : cctx.lineTo(x, y);
    }
    cctx.stroke();
  }

  /* --- interaksi kamera --- */
  let drag = null;
  canvas.addEventListener('pointerdown', ev => {
    canvas.setPointerCapture(ev.pointerId);
    drag = canvasPos(canvas, ev);
  });
  canvas.addEventListener('pointermove', ev => {
    if (!drag) return;
    const p = canvasPos(canvas, ev);
    st.yaw += (p.x - drag.x) * 0.005;
    st.pitch = clamp(st.pitch + (p.y - drag.y) * 0.005, -1.5, 1.5);
    drag = p;
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('wheel', ev => {
    ev.preventDefault();
    st.zoom = clamp(st.zoom * Math.exp(-ev.deltaY * 0.0012), 0.2, 6);
  }, { passive: false });

  /* --- kontrol --- */
  bindRange('l-sigma', v => { st.p.sigma = v; }, v => v.toFixed(2));
  bindRange('l-rho', v => { st.p.rho = v; }, v => v.toFixed(2));
  bindRange('l-beta', v => { st.p.beta = v; }, v => v.toFixed(3));
  bindRange('l-dt', v => { st.dt = v; }, v => v.toFixed(3));
  bindRange('l-speed', v => { st.stepsPerFrame = v; }, v => String(v));
  bindRange('l-trail', v => { st.trailLen = v; }, v => String(v));

  $('#l-twin').addEventListener('change', e => { st.twin = e.target.checked; if (st.twin) { st.b.set([st.a[0] + 1e-5, st.a[1], st.a[2]]); st.tb.n = st.tb.head = 0; st.sep.length = 0; } });
  $('#l-spin').addEventListener('change', e => { st.spin = e.target.checked; });
  $('#l-reset').addEventListener('click', reset);
  $('#l-pause').addEventListener('click', e => {
    st.running = !st.running;
    e.target.textContent = st.running ? 'Jeda' : 'Lanjut';
    e.target.classList.toggle('is-on', !st.running);
  });
  $('#l-preset').addEventListener('click', () => {
    $('#l-sigma').value = 10; $('#l-sigma').dispatchEvent(new Event('input'));
    $('#l-rho').value = 28; $('#l-rho').dispatchEvent(new Event('input'));
    $('#l-beta').value = 2.667; $('#l-beta').dispatchEvent(new Event('input'));
    reset();
  });

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    st.spin = false;
    $('#l-spin').checked = false;
  }

  function tick(dt) {
    if (st.spin && !drag) st.yaw += dt * 0.15;
    if (st.running) step();
    draw();
  }

  function resize() { fitCanvas(canvas, 1.75); }

  return { tick: tick, resize: resize };
})();

/* =====================================================================
   MODUL 3 — Fourier epicycle
   ===================================================================== */
const Fourier = (function () {
  const canvas = $('#fourier-canvas');
  const ctx = canvas.getContext('2d');
  const spec = $('#spectrum-canvas');
  const sctx = spec.getContext('2d');

  const st = {
    raw: [],            // titik mentah relatif pusat kanvas
    N: 200, harmonics: 200, speed: 1,
    coef: null, t: 0, trace: [],
    drawing: false, capture: false,
    showCircles: true, showOriginal: true,
    jobId: 0
  };

  /* bentuk bawaan: gelombang kotak (memperlihatkan gejala Gibbs) */
  function squarePath() {
    const R = Math.min(canvas.width, canvas.height) * 0.26 || 160;
    const pts = [];
    const per = 60;
    const corners = [[-R, -R], [R, -R], [R, R], [-R, R], [-R, -R]];
    for (let s = 0; s < 4; s++) {
      const a = corners[s], b = corners[s + 1];
      for (let i = 0; i < per; i++) {
        const t = i / per;
        pts.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t });
      }
    }
    return pts;
  }

  function transform() {
    const sampled = resamplePath(st.raw, st.N);
    if (!sampled) return;
    $('#u-status').textContent = 'Menghitung DFT…';
    const id = ++st.jobId;
    if (dftWorker) {
      dftWorker.postMessage({ id: id, N: st.N, xy: sampled.buffer.slice(0) });
    } else {
      const t0 = performance.now();
      const r = computeDFT(sampled, st.N);
      r.ms = performance.now() - t0; r.id = id;
      accept(r);
    }
  }

  if (dftWorker) {
    dftWorker.onmessage = ev => { if (ev.data.id === st.jobId) accept(ev.data); };
    dftWorker.onerror = () => { dftWorker = null; if (st.raw.length > 4) transform(); };
  }

  function accept(r) {
    st.coef = r;
    st.t = 0; st.trace.length = 0;
    $('#u-ms').textContent = r.ms.toFixed(2) + ' ms';
    $('#u-status').textContent = 'DFT selesai: ' + r.N + ' koefisien dihitung dari definisi (O(N²)).';
    const harm = $('#u-harm');
    harm.max = r.N;
    if (parseInt(harm.value, 10) > r.N) { harm.value = r.N; }
    st.harmonics = parseInt(harm.value, 10);
    $('#u-harm-v').textContent = String(st.harmonics);
    fillTable();
    drawSpectrum();
  }

  function fillTable() {
    const c = st.coef;
    const body = $('#u-coef');
    if (!c) return;
    let html = '';
    for (let i = 0; i < Math.min(5, c.N); i++) {
      const k = c.order[i];
      html += '<tr><td>' + c.freq[k] + '</td><td>' + c.amp[k].toFixed(2) +
              '</td><td>' + (c.phase[k] * 180 / Math.PI).toFixed(1) + '°</td></tr>';
    }
    body.innerHTML = html;
  }

  function drawSpectrum() {
    fitCanvas(spec, 2);
    const W = spec.width, H = spec.height, pad = 16;
    sctx.clearRect(0, 0, W, H);
    const c = st.coef;
    if (!c) return;
    let maxA = 0;
    for (let k = 0; k < c.N; k++) if (c.amp[k] > maxA) maxA = c.amp[k];
    if (maxA <= 0) return;

    // himpunan indeks yang sedang dipakai untuk rekonstruksi
    const used = new Uint8Array(c.N);
    for (let i = 0; i < st.harmonics && i < c.N; i++) used[c.order[i]] = 1;

    const half = Math.floor(c.N / 2);
    const bw = Math.max(1, (W - 2 * pad) / c.N);
    sctx.strokeStyle = '#313c69';
    sctx.beginPath(); sctx.moveTo(pad, H - pad); sctx.lineTo(W - pad, H - pad); sctx.stroke();

    for (let k = 0; k < c.N; k++) {
      const f = c.freq[k];
      const x = pad + (f + half) * bw;
      const hgt = Math.sqrt(c.amp[k] / maxA) * (H - 2 * pad);
      sctx.fillStyle = used[k] ? (f === 0 ? '#e0709f' : '#5ad1c4') : '#2c3557';
      sctx.fillRect(x, H - pad - hgt, Math.max(1, bw - 0.5), hgt);
    }
    sctx.fillStyle = '#8e99c0';
    sctx.font = '11px "IBM Plex Mono", monospace';
    sctx.fillText('-' + half, pad, H - 4);
    sctx.fillText('0', pad + half * bw - 3, H - 4);
    sctx.fillText('+' + half, W - pad - 22, H - 4);
  }

  /* Rekonstruksi: x(t) = sum_k |X_k| * exp(i*(freq_k*t + phase_k)) */
  function drawEpicycles(cx, cy) {
    const c = st.coef;
    let x = 0, y = 0;
    ctx.lineWidth = 1;
    for (let i = 0; i < st.harmonics && i < c.N; i++) {
      const k = c.order[i];
      const px = x, py = y;
      const ang = c.freq[k] * st.t + c.phase[k];
      x += c.amp[k] * Math.cos(ang);
      y += c.amp[k] * Math.sin(ang);
      if (st.showCircles && c.amp[k] > 1.2 && i < 60) {
        ctx.strokeStyle = 'rgba(142,153,192,0.30)';
        ctx.beginPath();
        ctx.arc(cx + px, cy + py, c.amp[k], 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(223,229,247,0.55)';
        ctx.beginPath();
        ctx.moveTo(cx + px, cy + py);
        ctx.lineTo(cx + x, cy + y);
        ctx.stroke();
      }
    }
    return { x: x, y: y };
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    const cx = W * 0.5, cy = H * 0.5;
    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    // bentuk asli
    if (st.showOriginal && st.raw.length > 1) {
      ctx.strokeStyle = 'rgba(142,153,192,0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx + st.raw[0].x, cy + st.raw[0].y);
      for (let i = 1; i < st.raw.length; i++) ctx.lineTo(cx + st.raw[i].x, cy + st.raw[i].y);
      if (!st.drawing) ctx.closePath();
      ctx.stroke();
    }

    if (!st.coef) return;

    const tip = drawEpicycles(cx, cy);

    // jejak hasil penjumlahan epicycle
    st.trace.push(tip.x, tip.y);
    const maxTrace = st.coef.N * 2;
    if (st.trace.length > maxTrace * 2) st.trace.splice(0, st.trace.length - maxTrace * 2);
    ctx.strokeStyle = '#f2a154';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < st.trace.length; i += 2) {
      const X = cx + st.trace[i], Y = cy + st.trace[i + 1];
      i === 0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y);
    }
    ctx.stroke();

    ctx.fillStyle = '#5ad1c4';
    ctx.beginPath();
    ctx.arc(cx + tip.x, cy + tip.y, 3.4, 0, TAU);
    ctx.fill();
  }

  function tick(dt) {
    if (st.coef && !st.drawing) {
      st.t += TAU / st.coef.N * st.speed * (dt * 60);
      if (st.t >= TAU) { st.t -= TAU; st.trace.length = 0; }
      $('#u-t').textContent = st.t.toFixed(3) + ' rad';
    }
    draw();
  }

  /* --- menggambar --- */
  function startCapture() {
    st.capture = true;
    st.coef = null;
    st.raw = [];
    st.trace.length = 0;
    canvas.classList.add('is-draw');
    $('#u-coef').innerHTML = '<tr><td colspan="3" class="muted">belum ada data</td></tr>';
    $('#u-status').textContent = 'Seret satu goresan tertutup di kanvas, lalu lepas.';
    drawSpectrum();
  }

  canvas.addEventListener('pointerdown', ev => {
    if (!st.capture) return;
    canvas.setPointerCapture(ev.pointerId);
    st.drawing = true;
    st.raw = [];
    addPoint(ev);
  });
  canvas.addEventListener('pointermove', ev => { if (st.drawing) addPoint(ev); });
  canvas.addEventListener('pointerup', () => {
    if (!st.drawing) return;
    st.drawing = false;
    st.capture = false;
    canvas.classList.remove('is-draw');
    if (st.raw.length > 4) transform();
    else $('#u-status').textContent = 'Goresan terlalu pendek. Coba lagi.';
  });

  function addPoint(ev) {
    const p = canvasPos(canvas, ev);
    const x = p.x - canvas.width * 0.5, y = p.y - canvas.height * 0.5;
    const last = st.raw[st.raw.length - 1];
    if (!last || Math.hypot(x - last.x, y - last.y) > 2) st.raw.push({ x: x, y: y });
  }

  /* --- kontrol --- */
  $('#u-draw').addEventListener('click', startCapture);
  $('#u-square').addEventListener('click', () => {
    st.capture = false;
    canvas.classList.remove('is-draw');
    st.raw = squarePath();
    transform();
  });
  bindRange('u-n', v => { st.N = v; if (st.raw.length > 4) transform(); }, v => String(v));
  bindRange('u-harm', v => { st.harmonics = v; st.trace.length = 0; drawSpectrum(); }, v => String(v));
  bindRange('u-speed', v => { st.speed = v; }, v => v.toFixed(1) + '×');
  $('#u-circles').addEventListener('change', e => { st.showCircles = e.target.checked; });
  $('#u-orig').addEventListener('change', e => { st.showOriginal = e.target.checked; });

  function resize() {
    const first = canvas.width === 0;
    fitCanvas(canvas, 1.75);
    fitCanvas(spec, 2);
    if (first && !st.coef) { st.raw = squarePath(); transform(); }
    drawSpectrum();
  }

  return { tick: tick, resize: resize };
})();

/* =====================================================================
   Tab, loop utama, FPS
   ===================================================================== */
const MODULES = {
  'mod-fractal': Fractal,
  'mod-lorenz': Lorenz,
  'mod-fourier': Fourier
};
let activeId = 'mod-fractal';

$$('.tab').forEach(tab => tab.addEventListener('click', () => {
  const target = tab.getAttribute('aria-controls');
  $$('.tab').forEach(t => {
    const on = t === tab;
    t.classList.toggle('is-active', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  $$('.module').forEach(m => {
    const on = m.id === target;
    m.hidden = !on;
    m.classList.toggle('is-active', on);
  });
  activeId = target;
  // state tiap modul tetap hidup; hanya ukuran kanvas yang disegarkan
  requestAnimationFrame(() => MODULES[activeId].resize());
}));

window.addEventListener('resize', () => MODULES[activeId].resize());

let last = performance.now(), fpsAcc = 0, fpsCount = 0;
function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;
  fpsAcc += dt; fpsCount++;
  if (fpsAcc >= 0.5) {
    $('#fps').textContent = Math.round(fpsCount / fpsAcc);
    fpsAcc = 0; fpsCount = 0;
  }
  MODULES[activeId].tick(dt);
  requestAnimationFrame(loop);
}

Fractal.resize();
requestAnimationFrame(loop);
