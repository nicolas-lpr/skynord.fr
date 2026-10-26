// Drone visible devant la vidéo : vu de dos, la caméra le suit.
// Flottement léger, inclinaison max ±5° dans le sens de l'avancée, hélices qui tournent,
// LED champagne qui s'intensifient au passage d'un espace à l'autre.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MAX_TILT = THREE.MathUtils.degToRad(5);

export function createDrone(canvas, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(28, 1.5, 0.1, 50);
  camera.position.set(0, 1.9, 4.3);
  camera.lookAt(0, 0.05, 0);

  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(2, 4, 3);
  scene.add(sun, new THREE.HemisphereLight(0xdfe8ff, 0x30302c, 0.6));

  const shell = new THREE.MeshPhysicalMaterial({ color: 0xeceff2, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2 });
  const graphite = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.45, metalness: 0.4 });
  const blade = new THREE.MeshStandardMaterial({ color: 0x1c1e22, roughness: 0.5, transparent: true, opacity: 0.85 });
  const blur = new THREE.MeshBasicMaterial({ color: 0xd7dde4, transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const led = new THREE.MeshStandardMaterial({ color: 0xf3d9a4, emissive: 0xf0c987, emissiveIntensity: 2 });

  const drone = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.add(drone);
  scene.add(tilt);

  // Corps : coque claire sur un châssis graphite (silhouette du logo)
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.42, 8, 20).rotateX(Math.PI / 2), shell);
  body.scale.set(1.15, 0.5, 1);
  drone.add(body);
  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.4, 6, 16).rotateX(Math.PI / 2), graphite);
  belly.scale.set(1.05, 0.42, 0.98);
  belly.position.y = -0.07;
  drone.add(belly);
  const gimbal = new THREE.Mesh(new THREE.SphereGeometry(0.085, 20, 14), graphite);
  gimbal.position.set(0, -0.14, -0.42);
  drone.add(gimbal);

  // Bras en X, moteurs, hélices
  const props = [];
  for (const [sx, sz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const end = new THREE.Vector3(sx * 0.62, 0.02, sz * 0.55);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, end.length()), graphite);
    arm.position.copy(end).multiplyScalar(0.5);
    arm.lookAt(end.x * 2, end.y, end.z * 2);
    drone.add(arm);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.11, 20), graphite);
    motor.position.copy(end).setY(0.07);
    drone.add(motor);

    const prop = new THREE.Group();
    prop.position.copy(end).setY(0.135);
    prop.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.008, 0.055), blade)); // hélice bipale
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.33, 40).rotateX(-Math.PI / 2), blur);
    prop.add(disc);
    prop.userData.dir = sx * sz;
    drone.add(prop);
    props.push(prop);

    // LED sous les bras arrière (visibles depuis la caméra)
    if (sz > 0) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), led);
      l.position.copy(end).setY(-0.01);
      drone.add(l);
    }
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.018, 0.018), led);
  tail.position.set(0, 0.0, 0.47);
  drone.add(tail);

  function resize() {
    const r = canvas.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  let t = 0, pitch = 0, glow = 0, spin = 0;
  return {
    // dt en secondes, v = vitesse relative du vol (-1..1), pulse = changement d'espace
    update(dt, v, pulse) {
      t += dt;
      if (pulse) glow = 1;
      glow = Math.max(0, glow - dt * 0.8);
      led.emissiveIntensity = 2 + glow * 6;
      if (!reduced) {
        spin += dt * (38 + Math.abs(v) * 20);
        props.forEach(p => { p.rotation.y = spin * p.userData.dir; });
        pitch += (-v * MAX_TILT - pitch) * Math.min(1, dt * 3);
        tilt.rotation.x = pitch;
        tilt.position.y = Math.sin(t * 1.3) * 0.025;
        tilt.rotation.z = Math.sin(t * 0.7) * 0.006;
      }
      renderer.render(scene, camera);
    },
    resize,
  };
}
