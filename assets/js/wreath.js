/*
  Glazed porcelain helix wreath, rebuilt in code from the Alaga logo:
  a ring made of two DNA strands with base-pair rungs, two leaves at the
  base, a tulip on the right and a microscope on the left. Procedural geometry only.

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
  for (let i = 0; i <= 24; i++) {
    const v = i / 24;
    cupPts.push(new THREE.Vector2(0.002 + 0.092 * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.75)), 0.8), v * 0.3));
  }
  tulip.add(new THREE.Mesh(new THREE.LatheGeometry(cupPts, 40), leafGlaze));
  // Outer petals: the leaf shape with its curl flipped so the tips close over the bud.
  const petalGeo = leaf(0.31, 0.1);
  petalGeo.scale(1, 1, -1);
  petalGeo.computeVertexNormals();
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(petalGeo, glaze);
    p.rotation.y = (i * Math.PI * 2) / 3 + 0.5;
    p.translateZ(0.07);
    p.rotateX(0.1);
    p.position.y = -0.01;
    tulip.add(p);
  }
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.26, 10), leafGlaze);
  stem.position.y = -0.13;
  tulip.add(stem);
  const tulipLeaf = new THREE.Mesh(leaf(0.24, 0.07), leafGlaze);
  tulipLeaf.position.set(0.0, -0.24, 0.02);
  tulipLeaf.rotation.z = -0.7;
  tulip.add(tulipLeaf);
  const tulipLeaf2 = new THREE.Mesh(leaf(0.3, 0.07), leafGlaze);
  tulipLeaf2.position.set(0.0, -0.3, 0.0);
  tulipLeaf2.rotation.set(0, Math.PI, -0.5);
  tulip.add(tulipLeaf2);
  tulip.position.set(0.94, 0.08, 0.18);
  tulip.scale.setScalar(1.6);
  tulip.rotation.z = -0.12;
  wreath.add(tulip);

  // Microscope on the left, inside the ring: brushed steel body, cobalt knobs and stage ring.
  // Built upright in its own group, origin at the foot of the arm.
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x9aa5c2, metalness: 0.85, roughness: 0.24, clearcoat: 0.5 });
  const darkSteel = new THREE.MeshPhysicalMaterial({ color: 0x4c5677, metalness: 0.8, roughness: 0.3 });
  const scope = new THREE.Group();
  const cyl = (rt, rb, h, mat, x, y, z = 0, seg = 24) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    c.position.set(x, y, z);
    scope.add(c);
    return c;
  };
  // Foot: a rounded plate with a bevel.
  const footShape = new THREE.Shape();
  footShape.moveTo(-0.07, -0.06);
  footShape.lineTo(0.17, -0.06);
  footShape.quadraticCurveTo(0.21, -0.06, 0.21, -0.02);
  footShape.lineTo(0.21, 0.02);
  footShape.quadraticCurveTo(0.21, 0.06, 0.17, 0.06);
  footShape.lineTo(-0.07, 0.06);
  footShape.quadraticCurveTo(-0.11, 0.06, -0.11, 0.02);
  footShape.lineTo(-0.11, -0.02);
  footShape.quadraticCurveTo(-0.11, -0.06, -0.07, -0.06);
  const footGeo = new THREE.ExtrudeGeometry(footShape, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3 });
  footGeo.rotateX(Math.PI / 2);
  const foot = new THREE.Mesh(footGeo, darkSteel);
  foot.position.y = 0.0;
  scope.add(foot);
  // Arm: a C-shaped curve bulging to the left, from the foot up to the head.
  class Arm extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      const a = -Math.PI / 2 + t * Math.PI;
      return target.set(-0.02 - 0.14 * Math.cos(a) * (1 - 0.15 * t), 0.31 + 0.27 * Math.sin(a), 0);
    }
  }
  scope.add(new THREE.Mesh(new THREE.TubeGeometry(new Arm(), 48, 0.034, 14, false), steel));
  // Stage with a cobalt ring and two clips.
  const stage = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.022, 0.13), steel);
  stage.position.set(0.07, 0.24, 0);
  scope.add(stage);
  const stageRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 10, 32), glaze);
  stageRing.rotation.x = Math.PI / 2;
  stageRing.position.set(0.08, 0.254, 0);
  scope.add(stageRing);
  // Body tube with collars, eyepiece on top, objectives below.
  cyl(0.034, 0.034, 0.26, steel, 0.08, 0.5);
  cyl(0.044, 0.044, 0.03, darkSteel, 0.08, 0.4);
  cyl(0.042, 0.042, 0.022, glaze, 0.08, 0.62);
  cyl(0.026, 0.03, 0.08, steel, 0.08, 0.67);
  cyl(0.032, 0.032, 0.016, darkSteel, 0.08, 0.715);
  cyl(0.05, 0.05, 0.03, darkSteel, 0.08, 0.355);
  cyl(0.012, 0.02, 0.06, steel, 0.06, 0.31);
  cyl(0.012, 0.02, 0.05, steel, 0.1, 0.315);
  // Head block joining the arm to the tube.
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.07), steel);
  head.position.set(0.03, 0.52, 0);
  scope.add(head);
  // Coarse and fine focus knobs, axis toward the viewer.
  [[0.36, 0.05], [0.3, 0.034]].forEach(([y, rad]) => {
    const k = cyl(rad, rad, 0.16, glaze, -0.1, y);
    k.rotation.x = Math.PI / 2;
    const cap = cyl(rad * 0.55, rad * 0.55, 0.18, darkSteel, -0.1, y);
    cap.rotation.x = Math.PI / 2;
  });
  scope.position.set(-0.92, -0.56, 0.16);
  scope.scale.setScalar(1.45);
  scope.rotation.set(0, 0.32, 0);
  wreath.add(scope);

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
    // Scroll turns the emblem a quarter toward the microscope as the hero leaves the screen.
    const b = host.getBoundingClientRect();
    const scroll = Math.min(Math.max(-b.top / (b.height || 1), 0), 1);
    wreath.scale.setScalar(0.86 + 0.14 * ease);
    wreath.rotation.z = -0.9 * (1 - ease) + Math.sin(t * 0.3) * 0.03;
    wreath.rotation.y += ((0.12 + pointer.x * follow + Math.sin(t * 0.4) * sway + scroll * 0.9) - wreath.rotation.y) * 0.05;
    wreath.rotation.x += ((-0.08 + pointer.y * follow * 0.6 + scroll * 0.2) - wreath.rotation.x) * 0.05;
    render();
  }

  resize();
  if (reduce) render();
  else requestAnimationFrame(tick);
  host.classList.add("is-live");
}
