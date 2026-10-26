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
  const minShow = new Promise(r => setTimeout(r, reduced ? 0 : 1800));
  try { await engine.init(setLoad); } catch (e) { console.error(e); }
  setLoad(1);
  await minShow;
  $('#loader').classList.add('done');
  revealHero();
  startAuto();
  requestAnimationFrame(tick);
})();

/* ---------------------------------------------------------------- drone visible */
const droneCanvas = $('#droneCanvas');
let drone, mouseX = 0, droneX = 0, impulse = 0, pulse = false, stageVisible = true;
import('./drone.js').then(({ createDrone }) => { drone = createDrone(droneCanvas, { reduced }); }).catch(() => droneCanvas.remove());
if (finePointer && !reduced) addEventListener('pointermove', e => { mouseX = (e.clientX / innerWidth - 0.5) * 2; });
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
  impulse = dir; pulse = true;
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

/* ---------------------------------------------------------------- HUD et commandes */
const hud = {
  time: $('#hudTime'), zone: $('#hudZone'), chap: $('#hudChap'),
  alt: $('#hudAlt'), spd: $('#hudSpd'), hdg: $('#hudHdg'), gps: $('#hudGps'), bat: $('#hudBat'),
};
const ZONES = ['APPROCHE', 'ENTRÉE', 'SÉJOUR', 'TERRASSE'];
const SPEED = [3.2, 1.6, 1.4, 2.1];
const railItems = [...document.querySelectorAll('.rail li')];
const progressBar = $('#progressBar'), counter = $('#slCount');
function updateUi(i) {
  const t = { alt: [4, 1.6, 1.4, 2.2][i], heading: 195 + i * 4 }; // données simulées
  const secs = 6 + i * 11;
  hud.time.textContent = `00:00:${String(secs).padStart(2, '0')}`;
  hud.zone.textContent = ZONES[i];
  hud.chap.textContent = String(i + 1).padStart(2, '0');
  hud.alt.textContent = String(Math.round(t.alt)).padStart(3, '0');
  hud.hdg.textContent = String(t.heading).padStart(3, '0');
  hud.spd.textContent = SPEED[i].toFixed(1);
  hud.bat.textContent = 98 - i * 2;
  hud.gps.textContent = `${(50.43 + i * 0.0001).toFixed(4)} N · ${(2.83 - i * 0.0001).toFixed(4)} E`;
  railItems.forEach((li, k) => li.classList.toggle('on', k === i));
  // sur l'accueil, le rail et les mesures laissent la place au titre
  $('#rail').classList.toggle('off', i === 0);
  $('.hud__bl').style.opacity = i === 0 ? 0 : 1;
  counter.textContent = `${String(i + 1).padStart(2, '0')} / ${String(N).padStart(2, '0')}`;
  progressBar.style.transform = `scaleX(${(i + 1) / N})`;
}

/* ---------------------------------------------------------------- boucle (drone seulement) */
let lastNow = 0;
function tick(now) {
  const dt = Math.min(0.05, (now - (lastNow || now)) / 1000);
  lastNow = now;
  if (drone && stageVisible) {
    droneX += (mouseX * 8 - droneX) * 0.06; // parallaxe souris ±8 px
    droneCanvas.style.transform = `translate(calc(-50% + ${droneX.toFixed(2)}px), -50%)`;
    impulse *= Math.exp(-dt * 2.5); // inclinaison brève dans le sens du changement de slide
    drone.update(dt, impulse, pulse);
    pulse = false;
  }
  requestAnimationFrame(tick);
}

/* ---------------------------------------------------------------- nav, titres, micro-interactions */
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
  const cursor = $('#cursor');
  const cx = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
  const cy = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
  addEventListener('pointermove', e => { cursor.classList.add('on'); cx(e.clientX); cy(e.clientY); });
  document.addEventListener('pointerover', e => cursor.classList.toggle('big', !!e.target.closest('a, button, .work, .pack__frame, input, select, textarea')));

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
