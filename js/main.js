import { initForm } from './form.js';
import { FlightClips } from './flight-clips.js';

document.documentElement.classList.remove('no-js');
gsap.registerPlugin(ScrollTrigger);

const $ = s => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

const AUTO_S = 7; // défilement automatique tant que le visiteur n'a pas touché au slider

const flightEl = $('#flight'), canvas = $('#stageCanvas');
const engine = new FlightClips(canvas, { reduced });
const N = engine.count;
let slide = 0;

/* ---------------------------------------------------------------- chargement */
const bar = $('#loaderBar'), pct = $('#loaderPct');
const setLoad = v => { bar.style.width = `${Math.round(v * 100)}%`; pct.textContent = v < 1 ? `Préparation du vol · ${Math.round(v * 100)} %` : 'Décollage'; };

(async () => {
  await null; // laisse le module finir de s'initialiser
  setupBeats();
  updateUi(0);
  const minShow = new Promise(r => setTimeout(r, reduced ? 0 : 900));
  try { await engine.init(setLoad); } catch (e) { console.error(e); }
  setLoad(1);
  await minShow;
  $('#loader').classList.add('done');
  revealHero();
  startAuto();
})();

let stageVisible = true;
// La visite reste collée en haut, recouverte par la suite : visible tant qu'on n'a pas scrollé d'un écran
const readVisible = () => { stageVisible = scrollY < innerHeight * 0.9; };
addEventListener('scroll', readVisible, { passive: true });
readVisible();

/* ---------------------------------------------------------------- slider */
function goTo(i, { user = true } = {}) {
  const target = (i + N) % N;
  if (target === slide) return;
  // sens du volet : vers l'avant sauf retour explicite (ou passage de la dernière à la première)
  const dir = (i > slide) ? 1 : -1;
  slide = target;
  engine.show(slide, dir);
  updateBeats(slide);
  updateUi(slide);
  if (user) { stopAuto(); stopTour(); }
}
const next = o => goTo(slide + 1, o), prev = o => goTo(slide - 1, o);

$('#slNext').addEventListener('click', () => next());
$('#slPrev').addEventListener('click', () => prev());
document.querySelectorAll('.rail button').forEach((b, i) => b.addEventListener('click', () => goTo(i)));
$('#autoFly').addEventListener('click', () => startTour());

// Glisser vers la gauche ou la droite : doigt, souris ou trackpad.
// Les écouteurs sont sur toute la zone (textes compris) ; le scroll vertical reste libre.
{
  const zone = flightEl;
  const ignore = t => t.closest('a, button, input, textarea, select');

  // Doigt (iPhone, Android)
  let tx = null, ty = 0, horizontal = false;
  zone.addEventListener('touchstart', e => {
    if (ignore(e.target) || e.touches.length > 1) { tx = null; return; }
    tx = e.touches[0].clientX; ty = e.touches[0].clientY; horizontal = false;
  }, { passive: true });
  zone.addEventListener('touchmove', e => {
    if (tx === null) return;
    const dx = e.touches[0].clientX - tx, dy = e.touches[0].clientY - ty;
    if (!horizontal && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) horizontal = true;
    if (horizontal) e.preventDefault(); // geste horizontal : la page ne bouge pas
  }, { passive: false });
  zone.addEventListener('touchend', e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (horizontal && Math.abs(dx) > 40) (dx < 0 ? next : prev)();
  });

  // Souris (glisser-cliquer sur ordinateur)
  let mx = null, my = 0;
  zone.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse' || ignore(e.target)) return; mx = e.clientX; my = e.clientY; });
  addEventListener('pointerup', e => {
    if (mx === null) return;
    const dx = e.clientX - mx, dy = e.clientY - my; mx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) (dx < 0 ? next : prev)();
  });

  // Trackpad : un geste horizontal = une slide, même avec l'inertie
  let acc = 0, locked = false, idle;
  zone.addEventListener('wheel', e => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return; // geste vertical : scroll normal
    e.preventDefault();
    clearTimeout(idle);
    idle = setTimeout(() => { locked = false; acc = 0; }, 220); // fin du geste
    if (locked) return;
    acc += e.deltaX;
    if (Math.abs(acc) > 50) { locked = true; (acc > 0 ? next : prev)(); acc = 0; }
  }, { passive: false });
}
addEventListener('keydown', e => {
  if (!stageVisible || e.target.closest('input, textarea, select')) return;
  if (e.key === 'ArrowRight') next();
  if (e.key === 'ArrowLeft') prev();
});

let autoTimer = null;
function startAuto() { if (!reduced) { stopAuto(); autoTimer = setInterval(() => { if (stageVisible && !document.hidden) next({ user: false }); }, AUTO_S * 1000); } }
function stopAuto() { clearInterval(autoTimer); autoTimer = null; }

// « Explorer la villa » : visite guidée rapide de tous les espaces, puis arrêt sur le dernier
const TOUR_S = 3;
let tourTimer = null;
function startTour() {
  stopAuto(); stopTour();
  goTo(slide === N - 1 ? 0 : slide + 1, { user: false });
  tourTimer = setInterval(() => {
    if (slide >= N - 1) return stopTour();
    next({ user: false });
  }, TOUR_S * 1000);
}
function stopTour() { clearInterval(tourTimer); tourTimer = null; }

/* ---------------------------------------------------------------- textes par slide */
let beats = [], currentBeat = -1;
function setupBeats() {
  beats = [...document.querySelectorAll('.beat')];
  beats.forEach((el, i) => gsap.set(el, { autoAlpha: i === 0 ? 1 : 0 }));
  beats[0].classList.add('on');
  currentBeat = 0;
}

function updateBeats(b) {
  if (b === currentBeat) return;
  const prevB = beats[currentBeat], nextB = beats[b];
  if (prevB) {
    prevB.classList.remove('on');
    gsap.to(prevB, { autoAlpha: 0, duration: reduced ? 0 : 0.45, ease: 'power2.out', overwrite: true });
  }
  if (nextB) {
    nextB.classList.add('on');
    gsap.to(nextB, { autoAlpha: 1, duration: reduced ? 0 : 0.8, delay: reduced ? 0 : 0.4, ease: 'power2.out', overwrite: true });
    enterBeat(nextB);
  }
  currentBeat = b;
}

function enterBeat(el) {
  const els = el.querySelectorAll('.panel, h1, h2, p, .hero__cta');
  if (!reduced) gsap.fromTo(els, { x: 30 }, { x: 0, duration: 1.1, delay: 0.4, ease: 'power3.out', stagger: 0.06, overwrite: true });
  el.querySelectorAll('[data-count]').forEach(n => {
    const to = +n.dataset.count, pre = n.dataset.prefix || '', o = { v: 0 };
    if (reduced) { n.textContent = pre + to; return; }
    gsap.to(o, { v: to, duration: 1.8, delay: 0.4, ease: 'power2.out', onUpdate: () => { n.textContent = pre + Math.round(o.v); } });
  });
}

function revealHero() {
  if (reduced) return;
  gsap.from('.beat--hero .mask > span', { yPercent: 105, duration: 1.3, ease: 'power4.out', stagger: 0.12 });
  gsap.from('.hero__lead, .hero__cta', { opacity: 0, y: 18, duration: 1.2, ease: 'power3.out', stagger: 0.1, delay: 0.35 });
}

/* ---------------------------------------------------------------- commandes du slider */
const railItems = [...document.querySelectorAll('.rail li')];
const progressBar = $('#progressBar'), counter = $('#slCount');
function updateUi(i) {
  railItems.forEach((li, k) => li.classList.toggle('on', k === i));
  // sur l'accueil, le rail laisse la place au titre
  $('#rail').classList.toggle('off', i === 0);
  counter.textContent = `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
  progressBar.style.transform = `scaleX(${(i + 1) / N})`;
}

/* ---------------------------------------------------------------- nav, titres, micro-interactions */
// Rideau : en descendant, la visite recule et s'assombrit pendant que les prestations montent par-dessus
if (!reduced) {
  gsap.timeline({ scrollTrigger: { trigger: '#prestations', start: 'top bottom', end: 'top top', scrub: 0.6 } })
    .to(flightEl, { scale: 0.9, yPercent: -6, borderRadius: 32, '--cover': 0.6, ease: 'none' }, 0);
}

if (!reduced) gsap.fromTo('#prestations .section__head .h2', { '--bar': 0 }, { '--bar': 1, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '#prestations .section__head', start: 'top 80%' } });

const nav = $('#nav');
ScrollTrigger.create({ start: () => flightEl.offsetHeight - 70, onToggle: s => nav.classList.toggle('solid', s.isActive) });

if (!reduced) {
  document.querySelectorAll('.section .mask > span').forEach(el => {
    gsap.from(el, { yPercent: 105, duration: 1.2, ease: 'power4.out', scrollTrigger: { trigger: el.closest('h2'), start: 'top 85%' } });
  });
  gsap.utils.toArray('.pack__text, .band li, .zones > *').forEach(el => {
    gsap.from(el, { opacity: 0, y: 30, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%' } });
  });
}

if (finePointer && !reduced) {
  document.querySelectorAll('.magnetic').forEach(btn => {
    const mx = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3' });
    const my = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3' });
    btn.addEventListener('pointermove', e => {
      const r = btn.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      btn.style.setProperty('--mx', `${x}px`); btn.style.setProperty('--my', `${y}px`);
      mx((x - r.width / 2) * 0.25); my((y - r.height / 2) * 0.35);
    });
    btn.addEventListener('pointerleave', () => { mx(0); my(0); });
  });
}

/* ---------------------------------------------------------------- lecteur plein écran (partagé) */
{
  const dlg = $('#player'), pv = $('#playerVideo');
  const close = () => { pv.pause(); pv.removeAttribute('src'); pv.load(); dlg.close(); };
  dlg.querySelector('.player__close').addEventListener('click', close);
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  dlg.addEventListener('cancel', e => { e.preventDefault(); close(); });
}

/* ---------------------------------------------------------------- exemples des packs */
document.querySelectorAll('.pack__frame').forEach(frame => {
  const v = frame.querySelector('video');
  // Lecture muette seulement quand l'image est à l'écran
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { if (!v.src) v.src = v.dataset.src; if (!reduced) v.play().catch(() => {}); }
    else v.pause();
  }, { threshold: 0.35 }).observe(frame);
  // Révélation par masque puis léger recul de l'image, liés au scroll
  if (!reduced) {
    gsap.fromTo(frame, { '--clip': '18%' }, { '--clip': '0%', ease: 'none', scrollTrigger: { trigger: frame, start: 'top 95%', end: 'top 35%', scrub: 0.6 } });
    gsap.fromTo(frame, { '--zoom': 1.18 }, { '--zoom': 1, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  }
  // Clic : plein écran dans le lecteur
  frame.addEventListener('click', () => {
    const dlg = $('#player'), pv = $('#playerVideo');
    pv.poster = v.poster; pv.src = frame.dataset.play;
    $('#playerCap').textContent = frame.dataset.cap;
    dlg.classList.toggle('player--v', 'vertical' in frame.dataset);
    dlg.showModal();
    pv.play().catch(() => {});
  });
});

initForm();


// Outil de test : aller directement à une slide (ex. skynordGo(2))
window.skynordGo = i => goTo(i);
