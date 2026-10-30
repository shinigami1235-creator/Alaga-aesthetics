/*
  Glazed porcelain helix wreath, rebuilt in code from the Alaga logo:
  a ring made of two DNA strands with base-pair rungs, two leaves at the
  base and a tulip on the right. Procedural geometry only, no model files.

  Spec (from the logo reference):
  - ring radius 1.0, helix radius 0.15, 11 full twists around the ring
  - strands: tube radius 0.048, cobalt glaze (clearcoat, low roughness)
  - rungs: 66 cylinders between the strands, periwinkle glaze
  - leaves: two extruded leaf shapes at the bottom, pointing up and inward
  - tulip: lathe bulb with three petals on a short stem, right side
*/
import * as THREE from "three";
import { RoomEnvironment } from "./RoomEnvironment.js";

export function mountWreath(host, opts = {}) {
  const sway = opts.sway ?? 0.12, follow = opts.follow ?? 0.25;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  } catch (e) {
    host.classList.add("no-webgl");
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, opts.distance ?? 5.5);

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(2.5, 3, 4);
  scene.add(key);
  scene.add(new THREE.HemisphereLight(0xf4f7fc, 0x24489a, 0.5));

  const glaze = new THREE.MeshPhysicalMaterial({ color: 0x1f3f95, roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06 });
  const rungGlaze = new THREE.MeshPhysicalMaterial({ color: 0x8a96c6, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  const leafGlaze = new THREE.MeshPhysicalMaterial({ color: 0x3557b3, roughness: 0.24, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });

  const wreath = new THREE.Group();
  scene.add(wreath);

  const R = 1, r = 0.15, twists = 11;
  class Strand extends THREE.Curve {
    constructor(phase) { super(); this.phase = phase; }
    getPoint(t, target = new THREE.Vector3()) {
      const a = t * Math.PI * 2;
      const s = twists * a + this.phase;
      const rad = R + r * Math.cos(s);
      return target.set(rad * Math.cos(a), rad * Math.sin(a), r * Math.sin(s));
    }
  }
  const strandA = new Strand(0), strandB = new Strand(Math.PI);
  wreath.add(new THREE.Mesh(new THREE.TubeGeometry(strandA, 720, 0.048, 14, true), glaze));
  wreath.add(new THREE.Mesh(new THREE.TubeGeometry(strandB, 720, 0.048, 14, true), glaze));

  const rungs = twists * 6;
  const rungGeo = new THREE.CylinderGeometry(0.017, 0.017, 1, 8);
  const rungMesh = new THREE.InstancedMesh(rungGeo, rungGlaze, rungs);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), mid = new THREE.Vector3(), dir = new THREE.Vector3();
  for (let i = 0; i < rungs; i++) {
    const t = (i + 0.5) / rungs;
    strandA.getPoint(t, p1); strandB.getPoint(t, p2);
    dir.subVectors(p2, p1); const len = dir.length(); dir.normalize();
    mid.addVectors(p1, p2).multiplyScalar(0.5);
    q.setFromUnitVectors(up, dir);
    m.compose(mid, q, new THREE.Vector3(1, len, 1));
    rungMesh.setMatrixAt(i, m);
  }
  wreath.add(rungMesh);

  // Leaves: a pointed oval outline, extruded thin with a soft bevel.
  function leaf(length, width) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(width, length * 0.25, width * 0.8, length * 0.75, 0, length);
    s.bezierCurveTo(-width * 0.8, length * 0.75, -width, length * 0.25, 0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 4, curveSegments: 24 });
    g.translate(0, 0, -0.016);
    // Curl the blade: the tip bends forward and the edges cup slightly.
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i) / length;
      pos.setZ(i, pos.getZ(i) + 0.28 * length * y * y + 1.4 * x * x);
    }
    g.computeVertexNormals();
    return g;
  }
  const leafGeo = leaf(0.46, 0.13);
  [[-1, 0.42], [1, -0.42]].forEach(([side, tilt]) => {
    const l = new THREE.Mesh(leafGeo, leafGlaze);
    l.position.set(side * 0.12, -0.9, 0.08);
    l.rotation.set(-0.35, side * 0.3, tilt);
    wreath.add(l);
  });

  // Tulip on the right of the ring: a cup of three outer petals around a closed bud, on a short stem.
  const tulip = new THREE.Group();
  const cupPts = [];
  for (let i = 0; i <= 18; i++) {
    const v = i / 18;
    cupPts.push(new THREE.Vector2(0.004 + 0.085 * Math.pow(Math.sin(Math.PI * Math.min(v * 0.62 + 0.08, 1)), 0.9), v * 0.24));
  }
  tulip.add(new THREE.Mesh(new THREE.LatheGeometry(cupPts, 32), glaze));
  const petalGeo = leaf(0.27, 0.085);
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(petalGeo, leafGlaze);
    p.rotation.y = (i * Math.PI * 2) / 3;
    p.translateZ(0.06);
    p.rotateX(-0.12);
    p.position.y = 0.0;
    tulip.add(p);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.26, 10), leafGlaze);
  stem.position.y = -0.13;
  tulip.add(stem);
  const tulipLeaf = new THREE.Mesh(leaf(0.24, 0.07), leafGlaze);
  tulipLeaf.position.set(0.0, -0.24, 0.02);
  tulipLeaf.rotation.z = -0.7;
  tulip.add(tulipLeaf);
  tulip.position.set(1.12, 0.2, 0.1);
  tulip.rotation.z = -0.22;
  wreath.add(tulip);

  // A midrib down each base leaf so it reads as a leaf, not a flat oval.
  const rib = new THREE.MeshPhysicalMaterial({ color: 0x8a96c6, roughness: 0.3, clearcoat: 1 });
  wreath.children.filter((o) => o.geometry === leafGeo).forEach((l) => {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.4, 6), rib);
    r.position.set(0, 0.2, 0.05);
    l.add(r);
  });

  wreath.rotation.set(-0.08, 0.12, 0);
  wreath.position.y = opts.lift ?? 0;

  const pointer = { x: 0, y: 0 };
  host.addEventListener("pointermove", (e) => {
    const b = host.getBoundingClientRect();
    pointer.x = ((e.clientX - b.left) / b.width) * 2 - 1;
    pointer.y = ((e.clientY - b.top) / b.height) * 2 - 1;
  });
  host.addEventListener("pointerleave", () => { pointer.x = 0; pointer.y = 0; });

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  }
  new ResizeObserver(resize).observe(host);

  function render() { renderer.render(scene, camera); }

  let visible = true, start = performance.now();
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(host);

  function tick(now) {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = (now - start) / 1000;
    const ease = 1 - Math.pow(1 - Math.min(t / 1.6, 1), 4);
    wreath.scale.setScalar(0.86 + 0.14 * ease);
    wreath.rotation.z = -0.9 * (1 - ease) + t * 0.06;
    wreath.rotation.y += ((0.12 + pointer.x * follow + Math.sin(t * 0.4) * sway) - wreath.rotation.y) * 0.04;
    wreath.rotation.x += ((-0.08 + pointer.y * follow * 0.6) - wreath.rotation.x) * 0.04;
    render();
  }

  resize();
  if (reduce) render();
  else requestAnimationFrame(tick);
  host.classList.add("is-live");
}
