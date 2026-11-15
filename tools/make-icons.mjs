// Gera os ícones PNG do app a partir da própria pixel art do jogo.
// Uso: node tools/make-icons.mjs   (rode dentro da pasta monster-pet-game)
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { creature } from '../js/sprites.js';

const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
function icon(size, { maskable = false } = {}) {
  const out = Buffer.alloc(size * size * 4);
  const r0 = size * 0.22; // cantos arredondados (só no ícone comum)
  const sp = creature('pirilim', 0, 'happy');
  const k = Math.floor(size * (maskable ? 0.58 : 0.7) / 48);
  const ox = Math.floor((size - 48 * k) / 2), oy = Math.floor((size - 48 * k) / 2 + size * 0.02);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    if (!maskable) {
      const dx = Math.max(0, Math.abs(x + 0.5 - size / 2) - (size / 2 - r0)), dy = Math.max(0, Math.abs(y + 0.5 - size / 2) - (size / 2 - r0));
      if (dx * dx + dy * dy > r0 * r0) continue;
    }
    // fundo: céu noturno com brilho quente no centro
    const t = y / size, d = Math.hypot(x - size / 2, y - size * 0.52) / (size * 0.5);
    const glow = Math.max(0, 1 - d) ** 2;
    out[i] = Math.min(255, 18 + 40 * t + 200 * glow);
    out[i + 1] = Math.min(255, 16 + 22 * t + 120 * glow);
    out[i + 2] = Math.min(255, 48 + 60 * t + 40 * glow);
    out[i + 3] = 255;
    // estrelinhas
    if (((x * 73856093) ^ (y * 19349663)) % 997 === 0 && t < 0.6) { out[i] = out[i + 1] = 255; out[i + 2] = 230; }
    // sprite
    const sx = Math.floor((x - ox) / k), sy = Math.floor((y - oy) / k);
    if (sx >= 0 && sy >= 0 && sx < 48 && sy < 48) {
      const c = sp.d[sy * 48 + sx], a = c >>> 24;
      if (a) { const f = a / 255; out[i] = out[i] * (1 - f) + (c & 255) * f; out[i + 1] = out[i + 1] * (1 - f) + ((c >>> 8) & 255) * f; out[i + 2] = out[i + 2] * (1 - f) + ((c >>> 16) & 255) * f; }
    }
  }
  return png(size, size, out);
}
mkdirSync('icons', { recursive: true });
writeFileSync('icons/icon-192.png', icon(192));
writeFileSync('icons/icon-512.png', icon(512));
writeFileSync('icons/maskable-512.png', icon(512, { maskable: true }));
writeFileSync('icons/apple-touch-icon.png', icon(180, { maskable: true }));
console.log('ícones gerados em icons/');
