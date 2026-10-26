// Visite en « slides » : un court plan vidéo par espace, en boucle, enchaîné en fondu au scroll.
// Bien plus léger qu'une séquence d'images : seuls le plan affiché et le suivant se chargent.
const CLIPS = ['approche', 'entree', 'interieur', 'piscine', 'vue'];
const ALT = [4, 1.6, 1.4, 2.2, 5]; // altitudes indicatives (HUD, données simulées)

export class FlightClips {
  constructor(el, { base = 'assets/visite/', reduced = false } = {}) {
    this.el = el;
    this.base = base;
    this.reduced = reduced;
    this.frames = 300; // sert seulement à plafonner la vitesse du scroll
    this.chapters = CLIPS.map((_, i) => i / CLIPS.length);
    this.p = 0;
    this.active = -1;
  }

  async init(onProgress = () => {}) {
    const portrait = innerWidth / innerHeight < 0.8;
    const suffix = portrait ? '-m' : '';
    this.videos = CLIPS.map(name => {
      const v = document.createElement('video');
      v.muted = true; v.loop = true; v.playsInline = true;
      v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
      v.preload = 'none';
      v.poster = `${this.base}${name}${suffix}.webp`;
      v.dataset.src = `${this.base}${name}${suffix}.mp4`;
      this.el.appendChild(v);
      return v;
    });
    // On n'attend que la première image fixe : le site s'affiche tout de suite
    await new Promise(res => {
      const img = new Image();
      img.onload = img.onerror = res;
      img.src = this.videos[0].poster;
      setTimeout(res, 2500);
    });
    onProgress(1);
    this.setProgress(0);
  }

  load(i) {
    const v = this.videos[i];
    if (v && !v.src) { v.preload = 'auto'; v.src = v.dataset.src; }
  }

  activate(i) {
    if (i === this.active) return;
    this.videos.forEach((v, k) => {
      const on = k === i;
      v.classList.toggle('on', on);
      if (on) {
        this.load(k);
        if (!this.reduced) { v.currentTime = 0; v.play().catch(() => {}); }
      } else if (!v.paused) {
        setTimeout(() => { if (!v.classList.contains('on')) v.pause(); }, 900); // après le fondu
      }
    });
    this.load(i + 1); // prépare le plan suivant
    this.active = i;
  }

  resize() {}

  setProgress(p) {
    this.p = p;
    const n = CLIPS.length;
    this.activate(Math.min(n - 1, Math.floor(p * n)));
    this.dirty = true;
  }

  render() {
    if (!this.dirty) return;
    // Léger zoom lié au scroll à l'intérieur de chaque plan : le scroll reste perceptible
    const n = CLIPS.length, local = this.p * n - Math.min(n - 1, Math.floor(this.p * n));
    const v = this.videos[this.active];
    if (v && !this.reduced) v.style.transform = `scale(${(1.06 - local * 0.06).toFixed(4)})`;
    this.dirty = false;
  }

  telemetry() {
    const i = Math.max(0, this.active);
    return { alt: ALT[i], heading: 195 + i * 4 };
  }
}
