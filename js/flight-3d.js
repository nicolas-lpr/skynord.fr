// Villa 3D temps réel : maquette de vol utilisée tant que la séquence vidéo
// (assets/flight/manifest.json) n'existe pas. Même interface que FlightFrames.
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { monotone } from './util.js';

// Trajectoire : position caméra, point regardé, instant (0..1) de passage.
const KEYS = [
  { p: [6, 46, 92],     l: [0, 2, 0],       t: 0.00 },
  { p: [3, 24, 52],     l: [0, 2.5, 0],     t: 0.10 },
  { p: [0.8, 8, 22],    l: [0, 3, 0],       t: 0.20 },
  { p: [0, 2.1, 10.5],  l: [0, 2, 0],       t: 0.28 },
  { p: [0, 1.8, 3],     l: [-1, 1.8, -6],   t: 0.34 },
  { p: [-1.6, 1.8, -0.4], l: [-6.5, 1.9, -5], t: 0.44 },
  { p: [0.2, 1.9, -4.6], l: [0.4, 1.7, -12], t: 0.54 },
  { p: [0, 2.3, -9],    l: [0, 1, -18],     t: 0.62 },
  { p: [0, 3.2, -17],   l: [0, -0.5, -30],  t: 0.72 },
  { p: [0, 10, -30],    l: [0, 0, -70],     t: 0.84 },
  { p: [0, 26, -46],    l: [0, 6, -160],    t: 1.00 },
];

export const CHAPTERS_3D = [0, 0.22, 0.34, 0.56, 0.8];

export class Flight3D {
  constructor(canvas, { mobile }) {
    this.canvas = canvas;
    this.mobile = mobile;
    this.frames = 600; // équivalent « images » pour plafonner la vitesse
    this.chapters = CHAPTERS_3D;
    this.posCurve = new THREE.CatmullRomCurve3(KEYS.map(k => new THREE.Vector3(...k.p)), false, 'centripetal');
    this.lookCurve = new THREE.CatmullRomCurve3(KEYS.map(k => new THREE.Vector3(...k.l)), false, 'centripetal');
    this.timeToU = monotone(KEYS.map(k => k.t), KEYS.map((_, i) => i / (KEYS.length - 1)));
    this._look = new THREE.Vector3();
  }

  async init(onProgress = () => {}) {
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(devicePixelRatio, this.mobile ? 1.5 : 2));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.85;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = !this.mobile;
    r.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 4000);
    onProgress(0.2);

    // Ciel de fin d'après-midi + éclairage d'environnement tiré du ciel
    const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(83), THREE.MathUtils.degToRad(215));
    const sky = new Sky();
    sky.scale.setScalar(3000);
    const u = sky.material.uniforms;
    u.turbidity.value = 5; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.82;
    u.sunPosition.value.copy(sun);
    scene.add(sky);
    const pmrem = new THREE.PMREMGenerator(r);
    const envScene = new THREE.Scene(); envScene.add(sky.clone());
    scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    scene.fog = new THREE.Fog(0xc9b8a6, 90, 520);
    onProgress(0.45);

    const light = new THREE.DirectionalLight(0xffd6a6, 2.4);
    light.position.copy(sun).multiplyScalar(120);
    light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048);
    Object.assign(light.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 300 });
    light.shadow.bias = -0.0004;
    light.shadow.normalBias = 0.04;
    scene.add(light, new THREE.HemisphereLight(0xc4d6ff, 0x5c4a3a, 0.35));

    buildWorld(scene);
    onProgress(0.9);

    this.resize();
    this.setProgress(0);
    r.compile(scene, this.camera);
    this.render();
    onProgress(1);
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 72 : 55; // portrait : champ plus large
    this.camera.updateProjectionMatrix();
    this.dirty = true;
  }

  setProgress(p) {
    const u = this.timeToU(p);
    this.posCurve.getPoint(u, this.camera.position);
    this.lookCurve.getPoint(u, this._look);
    this.camera.lookAt(this._look);
    this.dirty = true;
  }

  render() {
    if (!this.dirty) return;
    this.renderer.render(this.scene, this.camera);
    this.dirty = false;
  }

  telemetry() {
    const d = this._look.clone().sub(this.camera.position);
    return {
      alt: this.camera.position.y,
      heading: (THREE.MathUtils.radToDeg(Math.atan2(d.x, -d.z)) + 352) % 360,
      pos: this.camera.position,
    };
  }

  // Image verticale pour le téléphone (vue depuis la piscine vers la villa)
  snapshot(target) {
    const cam = new THREE.PerspectiveCamera(60, 9 / 19.5, 0.1, 4000);
    cam.position.set(1.5, 1.6, -21);
    cam.lookAt(-0.5, 3.2, 0);
    const w = 540, h = 1170, prev = new THREE.Vector2();
    this.renderer.getSize(prev);
    const pr = this.renderer.getPixelRatio();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h, false);
    this.renderer.render(this.scene, cam);
    target.width = w; target.height = h;
    target.getContext('2d').drawImage(this.canvas, 0, 0, w, h);
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(prev.x, prev.y, false);
    this.dirty = true;
    this.render();
  }
}

/* ---------------------------------------------------------------- monde */

function canvasTex(size, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.repeat.set(...repeat);
  return t;
}

const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();

const brickTex = canvasTex(512, (g, S) => {
  g.fillStyle = '#b3a493'; g.fillRect(0, 0, S, S);
  const bw = 64, bh = 24;
  for (let y = 0, row = 0; y < S; y += bh, row++) {
    for (let x = -(row % 2) * bw / 2; x < S; x += bw) {
      const l = 30 + rnd() * 12, h = 14 + rnd() * 8;
      g.fillStyle = `hsl(${h} ${38 + rnd() * 14}% ${l}%)`;
      g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
    }
  }
});
const woodTex = canvasTex(512, (g, S) => {
  const pw = 42;
  for (let x = 0; x < S; x += pw) {
    g.fillStyle = `hsl(28 ${32 + rnd() * 10}% ${44 + rnd() * 10}%)`;
    g.fillRect(x, 0, pw, S);
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(60,35,20,${rnd() * 0.08})`; g.fillRect(x + rnd() * pw, 0, 1 + rnd() * 2, S); }
    g.fillStyle = 'rgba(40,25,15,.35)'; g.fillRect(x, 0, 1, S);
  }
});

const M = {
  render: new THREE.MeshStandardMaterial({ color: 0xebe6de, roughness: 0.92 }),
  zinc: new THREE.MeshStandardMaterial({ color: 0x4d535b, metalness: 0.65, roughness: 0.42 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x23262b, metalness: 0.5, roughness: 0.5 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xa9c0cc, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.16, envMapIntensity: 1.6, depthWrite: false }),
  stone: new THREE.MeshStandardMaterial({ color: 0xcfc7b8, roughness: 0.82 }),
  darkStone: new THREE.MeshStandardMaterial({ color: 0x2c2b2a, roughness: 0.7 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0xd9d1c4, roughness: 1 }),
  fabric2: new THREE.MeshStandardMaterial({ color: 0x6f6a62, roughness: 1 }),
  rug: new THREE.MeshStandardMaterial({ color: 0xbfb4a3, roughness: 1 }),
  walnut: new THREE.MeshStandardMaterial({ color: 0x4a3324, roughness: 0.55 }),
  marble: new THREE.MeshStandardMaterial({ color: 0xf2efea, roughness: 0.25 }),
  black: new THREE.MeshStandardMaterial({ color: 0x18181a, roughness: 0.6 }),
  glow: new THREE.MeshStandardMaterial({ color: 0xffe2b8, emissive: 0xffc98a, emissiveIntensity: 2.4 }),
  fire: new THREE.MeshStandardMaterial({ color: 0xff8a3d, emissive: 0xff6a1a, emissiveIntensity: 3 }),
  water: new THREE.MeshPhysicalMaterial({ color: 0x0f5a6e, roughness: 0.12, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.15, envMapIntensity: 0.55 }),
  gravel: new THREE.MeshStandardMaterial({ color: 0xb7ad9c, roughness: 1 }),
  hedge: new THREE.MeshStandardMaterial({ color: 0x2f4729, roughness: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x3f5a30, roughness: 1, flatShading: true }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 }),
};

function box(parent, mat, w, h, d, x, y, z, { shadow = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  parent.add(m);
  return m;
}

function brick(w, h) {
  const t = brickTex.clone(); t.needsUpdate = true;
  t.repeat.set(Math.max(w, 0.6) / 2.2, h / 0.8);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
}

// Façade vitrée avec ouverture centrale (largeur 3,2 m) par laquelle passe le drone
function glassFacade(g, z, x0, x1, h) {
  const open = 2.1, doorH = 3.3;
  for (const [a, b] of [[x0, -open], [open, x1]]) {
    box(g, M.glass, b - a, h, 0.04, (a + b) / 2, 0.3 + h / 2, z, { shadow: false });
    for (let x = a; x <= b + 0.01; x += (b - a) / 3) box(g, M.frame, 0.08, h, 0.14, x, 0.3 + h / 2, z);
  }
  box(g, M.glass, open * 2, h - doorH, 0.04, 0, 0.3 + doorH + (h - doorH) / 2, z, { shadow: false });
  box(g, M.frame, open * 2 + 0.1, 0.12, 0.16, 0, 0.3 + doorH, z);
  // panneau coulissant ouvert, rangé derrière la partie fixe
  box(g, M.glass, open * 2, doorH, 0.04, open * 2 + 0.2, 0.3 + doorH / 2, z - Math.sign(z) * 0.18, { shadow: false });
}

function buildWorld(scene) {
  const g = new THREE.Group();
  scene.add(g);

  // ---- Terrain : jardin plat, puis pente douce vers une campagne en patchwork
  const groundGeo = new THREE.PlaneGeometry(1400, 1400, 220, 220).rotateX(-Math.PI / 2);
  const pos = groundGeo.attributes.position, col = [];
  const c = new THREE.Color();
  const fields = [0x5d7a3e, 0x6f8a45, 0x8a8a4a, 0xa69560, 0x4f6b38, 0x7a9450];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const plot = Math.abs(x) < 34 && z > -27 && z < 60;
    pos.setY(i, plot ? 0 : groundHeight(x, z) - 0.05);
    if (plot) c.setHex(0x4f6b3a);
    else {
      const k = Math.abs(Math.floor(x / 60) * 7 + Math.floor(z / 45) * 13) % fields.length;
      c.setHex(fields[k]).offsetHSL(0, 0, (rnd() - 0.5) * 0.03);
    }
    col.push(c.r, c.g, c.b);
  }
  groundGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  groundGeo.computeVertexNormals();
  const ground = new THREE.Mesh(groundGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  ground.receiveShadow = true;
  g.add(ground);

  // Allée et haies
  box(g, M.gravel, 5, 0.06, 52, 0, 0.03, 34, { shadow: false });
  box(g, M.hedge, 1.2, 1.6, 86, -34, 0.8, 16);
  box(g, M.hedge, 1.2, 1.6, 86, 34, 0.8, 16);
  box(g, M.hedge, 28, 1.6, 1.2, -20, 0.8, 59);
  box(g, M.hedge, 28, 1.6, 1.2, 20, 0.8, 59);

  // ---- Volume principal (séjour double hauteur)
  const W = 22, D = 12, H = 6.2;
  box(g, M.stone, W + 0.6, 0.3, D + 0.6, 0, 0.15, 0);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.6, D - 0.6).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: (() => { const t = woodTex.clone(); t.needsUpdate = true; t.repeat.set(5, 3); return t; })(), roughness: 0.45 }));
  floor.position.y = 0.31; floor.receiveShadow = true; g.add(floor);
  box(g, brick(D, H), 0.35, H, D, -W / 2, 0.3 + H / 2, 0);
  box(g, brick(D, H), 0.35, H, D, W / 2, 0.3 + H / 2, 0);
  for (const z of [D / 2, -D / 2]) {
    box(g, brick(4, H), 4, H, 0.35, -W / 2 + 2, 0.3 + H / 2, z);
    box(g, brick(4, H), 4, H, 0.35, W / 2 - 2, 0.3 + H / 2, z);
    glassFacade(g, z, -7, 7, H);
  }
  box(g, M.zinc, W + 1.6, 0.4, D + 2.4, 0, 0.3 + H + 0.2, 0);
  box(g, M.render, W - 0.4, 0.05, D - 0.4, 0, 0.3 + H - 0.03, 0, { shadow: false }); // plafond

  // Volume en porte-à-faux à l'étage
  box(g, brick(12, 3.4), 12, 3.4, 11, 7, 0.3 + H + 0.4 + 1.7, 1.5);
  box(g, M.glass, 9, 2.2, 0.04, 7, 0.3 + H + 2.2, 7.02, { shadow: false });
  box(g, M.frame, 9.2, 0.1, 0.12, 7, 0.3 + H + 1.1, 7.04);
  box(g, M.zinc, 12.8, 0.3, 11.8, 7, 0.3 + H + 4.0, 1.5);

  // Aile basse enduite
  box(g, M.render, 10, 3.4, 9, -16, 1.7, 1.5);
  box(g, M.zinc, 10.8, 0.3, 9.8, -16, 3.55, 1.5);
  box(g, M.glass, 6, 2.2, 0.04, -16, 1.6, 6.02, { shadow: false });

  // ---- Intérieur
  // Cheminée sur le mur gauche
  box(g, M.darkStone, 0.6, H, 3.4, -W / 2 + 0.5, 0.3 + H / 2, -1);
  box(g, M.fire, 0.1, 0.5, 1.8, -W / 2 + 0.82, 1.15, -1, { shadow: false });
  const fireLight = new THREE.PointLight(0xff8a3d, 6, 9, 2); fireLight.position.set(-W / 2 + 1.6, 1.3, -1); g.add(fireLight);
  // Canapés, tapis, table basse
  box(g, M.rug, 5, 0.02, 4.2, -6.4, 0.32, -1, { shadow: false });
  box(g, M.fabric, 1.0, 0.42, 3.8, -4.2, 0.52, -1);
  box(g, M.fabric, 0.3, 0.5, 3.8, -3.8, 0.95, -1);
  box(g, M.fabric, 2.6, 0.42, 1.0, -5.0, 0.52, 1.3);
  box(g, M.fabric, 2.6, 0.5, 0.3, -5.0, 0.95, 1.7);
  box(g, M.fabric2, 0.45, 0.25, 0.45, -4.3, 0.85, -2.2);
  box(g, M.walnut, 1.3, 0.08, 2.0, -6.6, 0.55, -1);
  box(g, M.black, 1.1, 0.24, 1.8, -6.6, 0.4, -1);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.025, 8, 64).rotateX(Math.PI / 2), M.glow);
  ring.position.set(-6.4, 4.2, -1); g.add(ring);
  const living = new THREE.PointLight(0xffd2a0, 10, 12, 2); living.position.set(-6.4, 4, -1); g.add(living);
  // Cuisine sous la mezzanine
  box(g, M.walnut, 3.4, 0.9, 1.1, 4.6, 0.75, -1.2);
  box(g, M.marble, 3.6, 0.06, 1.25, 4.6, 1.23, -1.2);
  box(g, M.walnut, 0.7, 2.6, 7, W / 2 - 0.6, 1.6, -0.5);
  for (const x of [3.6, 4.6, 5.6]) {
    box(g, M.glow, 0.22, 0.22, 0.22, x, 3.1, -1.2, { shadow: false });
    box(g, M.black, 0.01, 3.0, 0.01, x, 4.6, -1.2, { shadow: false });
  }
  const kitchen = new THREE.PointLight(0xffd2a0, 6, 8, 2); kitchen.position.set(4.6, 2.8, -1.2); g.add(kitchen);
  // Mezzanine avec garde-corps vitré
  box(g, M.render, 4, 0.3, D - 0.6, W / 2 - 2.2, 3.4, 0);
  box(g, M.glass, 0.03, 1.0, D - 0.6, W / 2 - 4.2, 4.05, 0, { shadow: false });
  for (let i = 0; i < 9; i++) box(g, M.walnut, 1.1, 0.06, 0.32, 7.6, 0.6 + i * 0.33, 4.6 - i * 0.34);
  // Table à manger
  box(g, M.walnut, 2.6, 0.06, 1.1, 2, 1.05, 3.4);
  box(g, M.black, 0.08, 0.72, 0.9, 1, 0.68, 3.4);
  box(g, M.black, 0.08, 0.72, 0.9, 3, 0.68, 3.4);
  // Plantes
  for (const [x, z] of [[-8.8, 4.6], [8.6, -4.8], [-9, -4.6]]) {
    box(g, M.render, 0.6, 0.6, 0.6, x, 0.6, z);
    const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), M.leaf); f.position.set(x, 1.5, z); f.castShadow = true; g.add(f);
  }

  // ---- Terrasse et piscine à débordement
  box(g, M.stone, W + 0.6, 0.3, 5.4, 0, 0.15, -8.7);
  const PW = 9, PL = 14, pz = -11.4 - PL / 2;
  box(g, M.stone, 1.4, 0.3, PL + 1.4, -PW / 2 - 0.7, 0.15, pz);
  box(g, M.stone, 1.4, 0.3, PL + 1.4, PW / 2 + 0.7, 0.15, pz);
  box(g, M.stone, 10, 0.3, PL + 1.4, -PW / 2 - 6.4, 0.15, pz);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(PW, PL).rotateX(-Math.PI / 2), M.water);
  water.position.set(0, 0.24, pz); water.receiveShadow = true; g.add(water);
  box(g, M.darkStone, PW, 1.4, 0.3, 0, -0.45, pz - PL / 2 - 0.1); // bord de débordement
  for (let i = 0; i < 3; i++) {
    box(g, M.fabric, 0.8, 0.12, 2.0, -9 + i * 1.4, 0.55, -16);
    box(g, M.fabric, 0.8, 0.5, 0.12, -9 + i * 1.4, 0.75, -15.1);
  }
  box(g, M.fabric2, 3.2, 0.45, 1.0, 6.5, 0.52, -9.8);
  box(g, M.fabric2, 3.2, 0.5, 0.3, 6.5, 0.95, -9.4);

  // ---- Arbres (instanciés)
  const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1, 6);
  const leafGeo = new THREE.IcosahedronGeometry(1, 1);
  const spots = [];
  for (let i = 0; i < 520; i++) {
    const x = (rnd() - 0.5) * 900, z = (rnd() - 0.5) * 900;
    if (Math.abs(x) < 40 && z > -60 && z < 70) continue;     // propriété et trajectoire
    if (Math.abs(x) < 25 && z < -60 && z > -260) continue;  // vue dégagée en sortie
    spots.push([x, z, 0.7 + rnd() * 0.8]);
  }
  for (let i = 0; i < 14; i++) spots.push([(rnd() < 0.5 ? -1 : 1) * (24 + rnd() * 8), -20 + rnd() * 75, 0.8 + rnd() * 0.4]);
  const trunks = new THREE.InstancedMesh(trunkGeo, M.trunk, spots.length);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  spots.forEach(([x, z, k], i) => {
    const y = groundHeight(x, z);
    m4.compose(p.set(x, y + 1.5 * k, z), q, s.set(k, 3 * k, k)); trunks.setMatrixAt(i, m4);
    m4.compose(p.set(x, y + 4.2 * k, z), q, s.set(2.4 * k, 2.8 * k, 2.4 * k)); leaves.setMatrixAt(i, m4);
    leaves.setColorAt(i, new THREE.Color().setHSL(0.22 + rnd() * 0.07, 0.3 + rnd() * 0.1, 0.24 + rnd() * 0.1));
  });
  trunks.castShadow = leaves.castShadow = true;
  g.add(trunks, leaves);
}

function groundHeight(x, z) {
  const plot = Math.abs(x) < 34 && z > -27 && z < 60;
  if (plot) return 0;
  const fall = z < -27 ? Math.min(1, (-27 - z) / 30) : 0;
  return -7 * fall * fall * (3 - 2 * fall) + Math.sin(x * 0.012) * Math.cos(z * 0.01) * 5 * Math.min(1, Math.hypot(x, z) / 120);
}
