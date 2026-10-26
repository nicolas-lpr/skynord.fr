import { clamp, smooth } from './util.js';
import { initForm } from './form.js';
import { FlightClips } from './flight-clips.js';

document.documentElement.classList.remove('no-js');
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const $ = s => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
const mobile = matchMedia('(max-width: 900px), (pointer: coarse)').matches;

// Réglages de confort (voir brief, section 2)
// Réglages indépendants de la vitesse de l'écran : même ressenti sur un Mac lent ou rapide
const SMOOTH = 9;            // lissage du scroll (plus haut = plus réactif)
const MAX_SPEED = 2;         // avance max de la visite par seconde (1 = toute la visite)
const AUTO_FLIGHT_S = 30;    // durée de la visite automatique complète

const flightEl = $('#flight'), canvas = $('#stageCanvas');
let engine;

/* ---------------------------------------------------------------- chargement */
const bar = $('#loaderBar'), pct = $('#loaderPct');
const setLoad = v => { bar.style.width = `${Math.round(v * 100)}%`; pct.textContent = v < 1 ? `Préparation du vol · ${Math.round(v * 100)} %` : 'Décollage'; };

engine = new FlightClips(canvas, { reduced });

(async () => {
  await null; // laisse le module finir de s'initialiser
  setupBeats(); // les textes ne dépendent plus du chargement des vidéos
  const minShow = new Promise(r => setTimeout(r, reduced ? 0 : 1800));
  try { await engine.init(setLoad); } catch (e) { console.error(e); }
  setLoad(1);
  await minShow;
  $('#loader').classList.add('done');
  revealHero();
  requestAnimationFrame(tick);
})();

/* ---------------------------------------------------------------- drone visible */
const droneCanvas = $('#droneCanvas');
let drone, lastChap = 0, mouseX = 0, droneX = 0;
import('./drone.js').then(({ createDrone }) => { drone = createDrone(droneCanvas, { reduced }); }).catch(() => droneCanvas.remove());
if (finePointer && !reduced) addEventListener('pointermove', e => { mouseX = (e.clientX / innerWidth - 0.5) * 2; });

/* ---------------------------------------------------------------- scroll → vol */
let target = 0, cur = 0;
const flightRange = () => Math.max(1, flightEl.offsetHeight - innerHeight);
const readTarget = () => { target = clamp((scrollY - flightEl.offsetTop) / flightRange()) || 0; };
addEventListener('scroll', readTarget, { passive: true });
addEventListener('resize', () => { readTarget(); engine?.resize(); });
readTarget();

let beats = [], railItems = [...document.querySelectorAll('.rail li')];
const rail = $('#rail'), hudLeft = $('.hud__bl');
function setupBeats() {
  const ch = engine.chapters;
  const ranges = [
    [0, ch[1] * 0.6],
    [ch[2] - 0.01, ch[3] - 0.05],
    [ch[3] + 0.01, ch[4] - 0.02],
    [ch[4] + 0.02, 1.01],
  ];
  beats = [...document.querySelectorAll('.beat')].map((el, i) => ({ el, from: ranges[i][0], to: ranges[i][1], shown: i === 0 }));
  beats.slice(1).forEach(b => gsap.set(b.el.querySelectorAll('.panel, .eyebrow, h2, p'), { y: 24 }));
}

function updateBeats(p) {
  const F = 0.022; // longueur des fondus (en progression)
  for (const b of beats) {
    const o = b.from <= 0 ? 1 - smooth(b.to - F, b.to, p) : smooth(b.from, b.from + F, p) * (1 - smooth(b.to - F, b.to, p));
    b.el.style.opacity = o.toFixed(3);
    b.el.style.visibility = o > 0.001 ? 'visible' : 'hidden';
    b.el.classList.toggle('on', o > 0.5);
    const inside = p > b.from && p < b.to;
    if (inside && !b.shown) enterBeat(b);
    b.shown = inside || (b.from <= 0 && p < b.to);
  }
}

function enterBeat(b) {
  const els = b.el.querySelectorAll('.panel, .eyebrow, h2, p');
  if (reduced) { gsap.set(els, { y: 0 }); } else gsap.to(els, { y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.06, overwrite: true });
  b.el.querySelectorAll('[data-count]').forEach(n => {
    const to = +n.dataset.count, pre = n.dataset.prefix || '', o = { v: 0 };
    if (reduced) { n.textContent = pre + to; return; }
    gsap.to(o, { v: to, duration: 1.8, ease: 'power2.out', onUpdate: () => { n.textContent = pre + Math.round(o.v); } });
  });
}

function revealHero() {
  if (reduced) return;
  gsap.from('.beat--hero .mask > span', { yPercent: 105, duration: 1.3, ease: 'power4.out', stagger: 0.12 });
  gsap.from('.beat--hero .eyebrow, .hero__lead, .hero__cta', { opacity: 0, y: 18, duration: 1.2, ease: 'power3.out', stagger: 0.1, delay: 0.35 });
}

/* ---------------------------------------------------------------- HUD (10 Hz max) */
const hud = {
  el: $('#hud'), time: $('#hudTime'), zone: $('#hudZone'), chap: $('#hudChap'),
  alt: $('#hudAlt'), spd: $('#hudSpd'), hdg: $('#hudHdg'), gps: $('#hudGps'), bat: $('#hudBat'),
};
const ZONES = ['APPROCHE', 'ENTRÉE', 'SÉJOUR', 'TERRASSE', 'ENVOL'];
let lastHud = 0, prevP = 0, speed = 0;
function updateHud(p, now) {
  if (now - lastHud < 100) return;
  const dt = (now - lastHud) / 1000; lastHud = now;
  const t = engine.telemetry();
  const ch = engine.chapters; let c = 0; while (c < ch.length - 1 && p >= ch[c + 1]) c++;
  const secs = p * 42;
  // ~300 m de trajectoire sur l'ensemble du vol
  speed += (Math.min(14, Math.abs(cur - prevP) * 300 / dt) - speed) * 0.35;
  prevP = cur;
  hud.time.textContent = `00:${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
  hud.zone.textContent = ZONES[c];
  hud.chap.textContent = String(c + 1).padStart(2, '0');
  hud.alt.textContent = String(Math.max(0, Math.round(t.alt))).padStart(3, '0');
  hud.hdg.textContent = String(Math.round((t.heading + 360) % 360)).padStart(3, '0');
  hud.spd.textContent = speed.toFixed(1);
  hud.bat.textContent = Math.round(98 - p * 9);
  hud.gps.textContent = `${(50.43 + p * 0.0004).toFixed(4)} N · ${(2.83 - p * 0.0003).toFixed(4)} E`;
  railItems.forEach((li, i) => li.classList.toggle('on', i === c));
  rail.style.opacity = hudLeft.style.opacity = smooth(0.06, 0.09, p).toFixed(2); // libère le titre d'accueil
  hud.el.style.opacity = (1 - smooth(0.95, 1, p)).toFixed(2);
}

/* ---------------------------------------------------------------- boucle */
const progressBar = $('#progressBar'), shade = $('#stageShade');
let lastNow = 0;
function tick(now) {
  const dt = Math.min(0.25, (now - (lastNow || now)) / 1000);
  const maxStep = MAX_SPEED * dt;
  const d = target - cur;
  let step = reduced ? d : d * (1 - Math.exp(-SMOOTH * dt));
  if (!reduced) step = clamp(step, -maxStep, maxStep);
  if (Math.abs(d) < 1e-5) step = d;
  cur += step;

  const onStage = scrollY < flightEl.offsetTop + flightEl.offsetHeight;
  if (onStage) {
    if (step !== 0) engine.setProgress(cur);
    engine.render();
    progressBar.style.transform = `scaleX(${cur.toFixed(4)})`;
    shade.style.setProperty('--dark', (smooth(0.92, 1, cur) * 0.55).toFixed(3));
    updateBeats(cur);
    updateHud(cur, now);
    if (drone) {
      const ch = engine.chapters; let c = 0; while (c < ch.length - 1 && cur >= ch[c + 1]) c++;
      droneX += (mouseX * 8 - droneX) * 0.06; // parallaxe souris ±8 px
      droneCanvas.style.transform = `translate(calc(-50% + ${droneX.toFixed(2)}px), -50%)`;
      droneCanvas.style.opacity = (1 - smooth(0.93, 0.99, cur)).toFixed(2);
      drone.update(Math.min(0.05, dt), maxStep ? clamp(step / maxStep, -1, 1) : 0, c !== lastChap);
      lastChap = c;
    }
  }
  lastNow = now;
  requestAnimationFrame(tick);
}

/* ---------------------------------------------------------------- vol automatique */
let auto;
$('#autoFly').addEventListener('click', () => {
  const end = flightEl.offsetTop + flightRange() * 0.995;
  const remaining = 1 - target;
  auto = gsap.to(window, { scrollTo: { y: end, autoKill: true }, duration: reduced ? 0 : AUTO_FLIGHT_S * remaining, ease: 'none' });
});
const stopAuto = () => { if (auto?.isActive()) auto.kill(); };
['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(e => addEventListener(e, ev => { if (ev.target.id !== 'autoFly') stopAuto(); }, { passive: true }));

/* ---------------------------------------------------------------- nav, titres, micro-interactions */
const nav = $('#nav');
ScrollTrigger.create({ start: () => flightEl.offsetTop + flightRange() - 10, onToggle: s => nav.classList.toggle('solid', s.isActive) });

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

// Outil de test : saute directement à une position du vol (ex. skynordJump(0.4))
window.skynordJump = p => {
  scrollTo(0, flightEl.offsetTop + p * flightRange());
  readTarget(); cur = target; engine.setProgress(cur); engine.render();
  updateBeats(cur); lastHud = 0; updateHud(cur, performance.now());
};
