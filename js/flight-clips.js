// Visite en slider horizontal : un court plan vidéo par espace, en boucle.
// Changement de slide = volet horizontal minuté (le nouveau plan glisse depuis la droite),
// indépendant du scroll : fluide sur téléphone comme sur ordinateur.
const CLIPS = ['approche', 'entree', 'interieur', 'piscine'];
const ALT = [4, 1.6, 1.4, 2.2]; // altitudes indicatives (HUD, données simulées)

export class FlightClips {
  constructor(el, { base = 'assets/visite/', reduced = false } = {}) {
    this.el = el;
    this.base = base;
    this.reduced = reduced;
    this.count = CLIPS.length;
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
    this.show(0, 1);
    this.preloadAll();
  }

  load(i) {
    const v = this.videos[i];
    if (v && !v.src) { v.preload = 'auto'; v.src = v.dataset.src; v.load(); }
    return v;
  }

  // Une fois le premier plan prêt, les suivants se chargent un par un (≈ 7 Mo au total)
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

  // dir = 1 : le plan arrive par la droite ; -1 : par la gauche
  show(i, dir = 1) {
    if (i === this.active) return;
    const next = this.load(i), prev = this.videos[this.active];
    this.load((i + 1) % this.count);
    this.videos.forEach(v => gsap.set(v, { zIndex: v === next ? 2 : v === prev ? 1 : 0 }));
    if (!this.reduced) { next.currentTime = 0; next.play().catch(() => {}); }

    if (this.reduced || !prev) {
      gsap.set(next, { opacity: 1, clipPath: 'inset(0% 0% 0% 0%)', scale: 1 });
      this.videos.forEach(v => { if (v !== next) { gsap.set(v, { opacity: 0 }); v.pause(); } });
    } else {
      const from = dir > 0 ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)';
      gsap.fromTo(next, { opacity: 1, clipPath: from, scale: 1.08 },
        { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 1.1, ease: 'power3.inOut', overwrite: true,
          onComplete: () => this.videos.forEach(v => { if (v !== this.videos[this.active]) { gsap.set(v, { opacity: 0, xPercent: 0 }); v.pause(); } }) });
      gsap.to(prev, {
        xPercent: -4 * dir, duration: 1.1, ease: 'power3.inOut', overwrite: true,
        onComplete: () => {
          gsap.set(prev, { xPercent: 0 });
          if (prev !== this.videos[this.active]) { gsap.set(prev, { opacity: 0 }); prev.pause(); }
        },
      });
    }
    this.active = i;
  }

  telemetry() {
    const i = Math.max(0, this.active);
    return { alt: ALT[i], heading: 195 + i * 4 };
  }
}
