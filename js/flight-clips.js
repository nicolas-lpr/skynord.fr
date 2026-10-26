// Visite en « slides » : un court plan vidéo par espace, en boucle.
// Le passage d'un plan à l'autre est un fondu minuté (et non lié au scroll) :
// il reste fluide même quand le scroll est saccadé, sur téléphone comme sur ordinateur.
const CLIPS = ['approche', 'entree', 'interieur', 'piscine', 'vue'];
const ALT = [4, 1.6, 1.4, 2.2, 5]; // altitudes indicatives (HUD, données simulées)

export class FlightClips {
  constructor(el, { base = 'assets/visite/', reduced = false } = {}) {
    this.el = el;
    this.base = base;
    this.reduced = reduced;
    this.chapters = CLIPS.map((_, i) => i / CLIPS.length);
    this.p = 0;
    this.active = -1;
  }

  async init(onProgress = () => {}) {
    const suffix = innerWidth / innerHeight < 0.8 ? '-m' : '';
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
    this.preloadAll();
  }

  load(i) {
    const v = this.videos[i];
    if (v && !v.src) { v.preload = 'auto'; v.src = v.dataset.src; v.load(); }
    return v;
  }

  // Une fois le premier plan prêt, les suivants se chargent un par un (≈ 9 Mo au total)
  preloadAll() {
    let k = 1;
    const next = () => {
      if (k >= this.videos.length) return;
      const v = this.load(k++);
      if (v.readyState >= 3) next(); else v.addEventListener('canplaythrough', next, { once: true });
    };
    const first = this.videos[0];
    if (first.readyState >= 3) next(); else first.addEventListener('canplaythrough', next, { once: true });
    setTimeout(next, 6000); // au cas où l'événement ne vient pas (iOS)
  }

  activate(i) {
    if (i === this.active) return;
    const dur = this.reduced ? 0 : 1;
    const next = this.load(i);
    this.load(i + 1);
    this.videos.forEach(v => gsap.set(v, { zIndex: v === next ? 2 : 1 }));
    if (!this.reduced) { next.currentTime = 0; next.play().catch(() => {}); }
    gsap.fromTo(next, { opacity: 0, scale: 1.06 }, { opacity: 1, scale: 1, duration: dur * 1.2, ease: 'power2.out', overwrite: true });
    // Efface tous les autres plans encore visibles (utile si l'on saute plusieurs slides)
    this.videos.forEach(v => {
      if (v === next || +getComputedStyle(v).opacity === 0) return;
      gsap.to(v, {
        opacity: 0, scale: 0.98, duration: dur, ease: 'power2.inOut', overwrite: true,
        onComplete: () => { if (v !== this.videos[this.active]) v.pause(); },
      });
    });
    this.active = i;
  }

  resize() {}

  setProgress(p) {
    this.p = p;
    const n = CLIPS.length;
    this.activate(Math.min(n - 1, Math.floor(p * n + 1e-6)));
  }

  render() {}

  telemetry() {
    const i = Math.max(0, this.active);
    return { alt: ALT[i], heading: 195 + i * 4 };
  }
}
