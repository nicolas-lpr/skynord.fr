// Séquence d'images issue des vraies vidéos (générée par tools/prepare_videos.py).
// Dessinée dans un canvas avec fondu entre deux images voisines.
import { drawCover } from './util.js';

export class FlightFrames {
  constructor(canvas, manifest, base) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.m = manifest;
    this.base = base;
    this.frames = manifest.frames;
    this.chapters = manifest.chapters || [0, 0.2, 0.4, 0.6, 0.8];
    this.telem = manifest.telemetry || null;
    // Écran portrait + version verticale disponible → images recadrées 9:16 en pleine définition
    const portrait = innerWidth / innerHeight < 0.8;
    this.variant = portrait && manifest.portrait ? manifest.portrait : manifest.landscape;
    this.imgs = new Array(this.frames);
    this.p = 0;
  }

  src(i) {
    return this.base + this.variant.pattern.replace('%04d', String(i + 1).padStart(4, '0'));
  }

  load(i) {
    return new Promise(res => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { this.imgs[i] = img; if (Math.abs(i - this.p * (this.frames - 1)) < 2) this.dirty = true; res(); };
      img.onerror = res;
      img.src = this.src(i);
    });
  }

  // Passes successives : 1 image sur 8, puis 1 sur 4, 1 sur 2, toutes.
  async init(onProgress = () => {}) {
    this.resize();
    const N = this.frames, passes = [8, 4, 2, 1], order = [], seen = new Set();
    for (const step of passes) for (let i = 0; i < N; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
    if (!seen.has(N - 1)) order.push(N - 1);
    const first = Math.ceil(N / 8);
    let done = 0;
    const run = async (list, conc) => {
      let k = 0;
      await Promise.all(Array.from({ length: conc }, async () => {
        while (k < list.length) { await this.load(list[k++]); done++; if (done <= first) onProgress(done / first); }
      }));
    };
    await run(order.slice(0, first), 6);
    this.dirty = true;
    this.render();
    run(order.slice(first), 4); // la suite se charge pendant que l'on regarde
  }

  resize() {
    const dpr = Math.min(devicePixelRatio, 2);
    this.canvas.width = Math.round(innerWidth * dpr);
    this.canvas.height = Math.round(innerHeight * dpr);
    this.ctx.imageSmoothingQuality = 'high';
    this.dirty = true;
  }

  setProgress(p) { this.p = p; this.dirty = true; }

  nearest(f, dir) {
    for (let i = f; i >= 0 && i < this.frames; i += dir) if (this.imgs[i]) return i;
    return -1;
  }

  render() {
    if (!this.dirty) return;
    const f = this.p * (this.frames - 1);
    let a = this.nearest(Math.floor(f), -1), b = this.nearest(Math.ceil(f), 1);
    if (a < 0) a = b; if (b < 0) b = a;
    if (a < 0) return;
    const { ctx, canvas } = this, w = canvas.width, h = canvas.height;
    drawCover(ctx, this.imgs[a], w, h);
    if (b !== a) drawCover(ctx, this.imgs[b], w, h, (f - a) / (b - a));
    this.dirty = false;
  }

  telemetry() {
    // Altitude/cap approximatifs fournis par le manifeste (par plan), sinon valeurs indicatives
    const p = this.p, t = this.telem;
    if (t) {
      let i = 0; while (i < t.length - 1 && t[i + 1].t <= p) i++;
      const A = t[i], B = t[Math.min(i + 1, t.length - 1)], k = B.t > A.t ? (p - A.t) / (B.t - A.t) : 0;
      return { alt: A.alt + (B.alt - A.alt) * k, heading: A.hdg + (B.hdg - A.hdg) * k };
    }
    return { alt: 40 * Math.abs(Math.cos(p * Math.PI)) + 1.6, heading: 180 + 20 * Math.sin(p * 6) };
  }

  // Recadrage vertical d'une image de la séquence pour le téléphone
  snapshot(target, p = 0.66) {
    const img = this.imgs[this.nearest(Math.round(p * (this.frames - 1)), -1)] || this.imgs[0];
    if (!img) return;
    target.width = 540; target.height = 1170;
    drawCover(target.getContext('2d'), img, 540, 1170);
  }
}
