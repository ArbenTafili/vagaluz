// gfx.js — buffer de pixels puro (sem DOM ao importar) + utilitários de cor.
// Usado no navegador (vira <canvas>) e no Node (gera os ícones PNG).

export function rgba(r, g, b, a = 255) {
  return (((a & 255) << 24) | ((b & 255) << 16) | ((g & 255) << 8) | (r & 255)) >>> 0;
}
export function hex(h, a = 255) {
  const n = parseInt(h.replace('#', ''), 16);
  return rgba((n >> 16) & 255, (n >> 8) & 255, n & 255, a);
}
export function unpack(c) {
  return [c & 255, (c >>> 8) & 255, (c >>> 16) & 255, c >>> 24];
}
export function mix(c1, c2, t) {
  const a = unpack(c1), b = unpack(c2);
  return rgba(
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    Math.round(a[3] + (b[3] - a[3]) * t));
}
export function withAlpha(c, a) { const [r, g, b] = unpack(c); return rgba(r, g, b, a); }
// Contorno "seletivo": versão escura e levemente arroxeada da cor vizinha.
export function outlineOf(c) {
  const [r, g, b] = unpack(c);
  return rgba(Math.round(r * 0.38 + 14), Math.round(g * 0.3 + 8), Math.round(b * 0.42 + 26));
}
export function cssOf(c) { const [r, g, b, a] = unpack(c); return `rgba(${r},${g},${b},${(a / 255).toFixed(3)})`; }

// PRNG determinístico (para tiles com variação estável)
export function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export function hash2(x, y, k = 0) {
  let h = (x * 374761393 + y * 668265263 + k * 2147483647) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const LIGHT = [-0.55, -0.65, 0.52];

export class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (this.inside(x, y)) this.d[y * this.w + x] = c; }
  get(x, y) { return this.inside(x, y) ? this.d[y * this.w + x] : 0; }
  // pinta por cima respeitando alfa da cor (mistura simples)
  blend(x, y, c) {
    x = Math.floor(x); y = Math.floor(y); if (!this.inside(x, y)) return;
    const a = (c >>> 24) / 255; if (a >= 1) { this.d[y * this.w + x] = c; return; }
    const cur = this.d[y * this.w + x];
    if (!(cur >>> 24)) { this.d[y * this.w + x] = c; return; }
    this.d[y * this.w + x] = withAlpha(mix(cur, c, a), cur >>> 24);
  }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); }
  fill(test, color) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (test(x + 0.5, y + 0.5)) this.set(x, y, typeof color === 'function' ? color(x + 0.5, y + 0.5) : color);
    }
  }
  ellipse(cx, cy, rx, ry, c) { this.fill((x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, c); }
  // esfera sombreada em faixas (pixel art), com teste de forma opcional
  ball(cx, cy, rx, ry, ramp, test = null, bands = [0.86, 0.42, 0.02]) {
    const inEl = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    this.fill(test || inEl, (x, y) => {
      let nx = (x - cx) / rx, ny = (y - cy) / ry; let r2 = nx * nx + ny * ny;
      if (r2 > 1) { const r = Math.sqrt(r2); nx /= r; ny /= r; r2 = 1; }
      const nz = Math.sqrt(1 - r2);
      const d = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
      let i = d > bands[0] ? 0 : d > bands[1] ? 1 : d > bands[2] ? 2 : 3;
      return ramp[Math.min(i, ramp.length - 1)];
    });
  }
  // brilho radial: núcleo claro, borda escura (chamas, espíritos)
  glow(cx, cy, rx, ry, ramp, test = null) {
    const inEl = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
    this.fill(test || inEl, (x, y) => {
      const t = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2);
      return ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))];
    });
  }
  line(x0, y0, x1, y1, c) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c); if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  // contorno de 1px ao redor de pixels opacos (cor derivada do vizinho)
  outline(colorFn = outlineOf, fixed = null) {
    const out = [];
    const W = this.w, H = this.h, d = this.d;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (d[y * W + x] >>> 24) continue;
      let n = 0;
      if (x > 0 && d[y * W + x - 1] >>> 24 > 90) n = d[y * W + x - 1];
      else if (x < W - 1 && d[y * W + x + 1] >>> 24 > 90) n = d[y * W + x + 1];
      else if (y > 0 && d[(y - 1) * W + x] >>> 24 > 90) n = d[(y - 1) * W + x];
      else if (y < H - 1 && d[(y + 1) * W + x] >>> 24 > 90) n = d[(y + 1) * W + x];
      if (n) out.push(y * W + x, fixed ?? colorFn(n));
    }
    for (let i = 0; i < out.length; i += 2) d[out[i]] = out[i + 1];
    return this;
  }
  blit(src, dx, dy) {
    for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
      const c = src.d[y * src.w + x]; if (c >>> 24) this.blend(dx + x, dy + y, c);
    }
    return this;
  }
  flipX() {
    const o = new Pix(this.w, this.h);
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) o.d[y * this.w + (this.w - 1 - x)] = this.d[y * this.w + x];
    return o;
  }
  silhouette(c) {
    const o = new Pix(this.w, this.h);
    for (let i = 0; i < this.d.length; i++) if (this.d[i] >>> 24) o.d[i] = withAlpha(c, this.d[i] >>> 24);
    return o;
  }
  // desenha um mapa de caracteres com paleta {char: cor}
  map(rows, pal, ox = 0, oy = 0) {
    rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = pal[row[x]]; if (c) this.set(ox + x, oy + y, c); } });
    return this;
  }
  scaleUp(k) {
    const o = new Pix(this.w * k, this.h * k);
    for (let y = 0; y < o.h; y++) for (let x = 0; x < o.w; x++) o.d[y * o.w + x] = this.d[Math.floor(y / k) * this.w + Math.floor(x / k)];
    return o;
  }
}

// ---- ponte para o navegador ----
export function toCanvas(pix) {
  const c = document.createElement('canvas'); c.width = pix.w; c.height = pix.h;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(pix.w, pix.h);
  new Uint32Array(img.data.buffer).set(pix.d);
  ctx.putImageData(img, 0, 0);
  return c;
}
export function makeCanvas(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}
