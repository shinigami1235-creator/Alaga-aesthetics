/*
  The Alaga logo in 3D, built in code to match Logo.jpeg piece for piece. Nothing is added, moved or
  restyled: the DNA ring, the microscope on its left, the closed tulip with its stem and leaves on the
  right, the two veined leaves at the base, and the wordmark ALAGA, the rule with its sprig, and
  AESTHETICS. The logo stays still as one piece; it only tilts a little toward the pointer.

  Placement is in ring units: the middle of the ring strand is radius 1, which is 478 px on the
  1264 px logo, measured from its centre (632, 632).
*/
import * as THREE from "three";
import { RoomEnvironment } from "./RoomEnvironment.js";
import { WORDMARK } from "./wordmark.js";

export function mountWreath(host, opts = {}) {
  const follow = opts.follow ?? 0.16, sway = opts.sway ?? 0.05;
  const reduce = opts.still || matchMedia("(prefers-reduced-motion: reduce)").matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power", preserveDrawingBuffer: !!opts.still });
  } catch (e) {
    host.classList.add("no-webgl");
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, opts.distance ?? 5.5);

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-2, 3, 4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe6ff, 0.6);
  fill.position.set(3, -1, 3);
  scene.add(fill);
  scene.add(new THREE.HemisphereLight(0xf4f7fc, 0x0b1d4a, 0.35));

  // The logo is one deep royal blue throughout, glossy, with darker rungs and a gunmetal microscope.
  const BLUE = 0x0b2266;
  const glaze = new THREE.MeshPhysicalMaterial({ color: BLUE, roughness: 0.2, metalness: 0.45, clearcoat: 1, clearcoatRoughness: 0.05 });
  const rungGlaze = new THREE.MeshPhysicalMaterial({ color: 0x06123a, roughness: 0.3, metalness: 0.1, clearcoat: 0.7 });
  const leafGlaze = new THREE.MeshPhysicalMaterial({ color: BLUE, roughness: 0.24, metalness: 0.45, clearcoat: 1, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
  const vein = new THREE.MeshPhysicalMaterial({ color: 0x2b4699, roughness: 0.3, clearcoat: 0.6 });
  const letterGlaze = new THREE.MeshPhysicalMaterial({ color: 0x0e2366, roughness: 0.25, metalness: 0.45, clearcoat: 1, clearcoatRoughness: 0.08 });
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x8c909c, metalness: 0.95, roughness: 0.16, clearcoat: 0.4 });
  const darkSteel = new THREE.MeshPhysicalMaterial({ color: 0x32363f, metalness: 0.85, roughness: 0.32 });

  const logo = new THREE.Group();
  scene.add(logo);

  /* ---- the DNA ring: two strands winding in the plane of the ring, rungs between them ---- */
  const R = 1, r = 0.07, twists = 9, tube = 0.044;
  class Strand extends THREE.Curve {
    constructor(phase) { super(); this.phase = phase; }
    getPoint(t, target = new THREE.Vector3()) {
      const a = t * Math.PI * 2, s = twists * a + this.phase, rad = R + r * Math.cos(s);
      return target.set(rad * Math.cos(a), rad * Math.sin(a), 0.06 * Math.sin(s));
    }
  }
  const strandA = new Strand(0), strandB = new Strand(Math.PI);
  logo.add(new THREE.Mesh(new THREE.TubeGeometry(strandA, 900, tube, 16, true), glaze));
  logo.add(new THREE.Mesh(new THREE.TubeGeometry(strandB, 900, tube, 16, true), glaze));
  const rungs = twists * 2 * 7;
  const rungMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 8), rungGlaze, rungs);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), mid = new THREE.Vector3(), dir = new THREE.Vector3();
  for (let i = 0; i < rungs; i++) {
    const t = (i + 0.5) / rungs;
    strandA.getPoint(t, p1); strandB.getPoint(t, p2);
    dir.subVectors(p2, p1); const len = dir.length(); dir.normalize();
    mid.addVectors(p1, p2).multiplyScalar(0.5); mid.z -= 0.02;
    q.setFromUnitVectors(up, dir);
    m.compose(mid, q, new THREE.Vector3(1, Math.max(0.001, len), 1));
    rungMesh.setMatrixAt(i, m);
  }
  logo.add(rungMesh);

  /* ---- leaves ---- */
  // A pointed blade along +y from its base, extruded thin, bent gently forward.
  function blade(length, width, bend = 0.06, cup = 0.6) {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(width * 1.15, length * 0.22, width * 0.9, length * 0.72, 0, length);
    s.bezierCurveTo(-width * 0.9, length * 0.72, -width * 1.15, length * 0.22, 0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.012, bevelSegments: 3, curveSegments: 28 });
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i) / length;
      pos.setZ(i, pos.getZ(i) + bend * length * y * y + cup * x * x);
    }
    g.computeVertexNormals();
    return g;
  }
  const surface = (length, bend, cup, x, y) => 0.026 + bend * length * (y / length) ** 2 + cup * x * x;
  // Midrib and side veins, raised a hair above the blade, as on the logo's leaves.
  function veins(leaf, length, width, bend, cup, pairs) {
    const pts = [];
    for (let i = 0; i <= 12; i++) { const y = length * 0.04 + (length * 0.9 * i) / 12; pts.push(new THREE.Vector3(0, y, surface(length, bend, cup, 0, y) + 0.002)); }
    leaf.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0045, 6), vein));
    for (let k = 1; k <= pairs; k++) {
      const y0 = length * (0.1 + 0.75 * (k / (pairs + 1)));
      const half = width * 0.85 * Math.sin(Math.PI * (y0 / length)) ** 0.8;
      [-1, 1].forEach((side) => {
        const v = [];
        for (let i = 0; i <= 6; i++) {
          const f = i / 6, x = side * half * f, y = y0 + length * 0.12 * f;
          v.push(new THREE.Vector3(x, y, surface(length, bend, cup, x, y) + 0.002));
        }
        leaf.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v), 10, 0.0028, 5), vein));
      });
    }
  }
  function leaf(length, width, at, angle, opts2 = {}) {
    const bend = opts2.bend ?? 0.06, cup = opts2.cup ?? 0.6;
    const l = new THREE.Mesh(blade(length, width, bend, cup), leafGlaze);
    if (opts2.veins !== false) veins(l, length, width, bend, cup, opts2.pairs ?? 7);
    l.position.set(at[0], at[1], at[2] ?? 0.05);
    l.rotation.set(opts2.tiltX ?? -0.1, opts2.tiltY ?? 0, angle);
    logo.add(l);
    return l;
  }
  // angle that turns +y toward a direction
  const toward = (dx, dy) => Math.atan2(-dx, dy);

  // The two base leaves: from the bottom of the ring up and out, the left one to (370, 800) px,
  // the right one to (915, 800) px.
  leaf(0.66, 0.1, [-0.06, -0.8, 0.06], toward(-0.48, 0.44), { tiltY: -0.15 });
  leaf(0.66, 0.1, [0.075, -0.8, 0.06], toward(0.51, 0.44), { tiltY: 0.15 });

  /* ---- tulip on the right: closed bud on a stem down the inside of the ring, three slender leaves ---- */
  // Bud: x 1000 to 1105 px, petals from y 600 up to 480 px, the folded petal tips above to 430 px.
  const tulip = new THREE.Group();
  const budPts = [];
  for (let i = 0; i <= 28; i++) {
    const v = i / 28;
    budPts.push(new THREE.Vector2(0.004 + 0.1 * Math.pow(Math.sin(Math.PI * Math.min(1, v * 0.85 + 0.08)), 0.6), v * 0.26));
  }
  tulip.add(new THREE.Mesh(new THREE.LatheGeometry(budPts, 48), glaze));
  // three outer petals hugging the bud, their tips turned slightly out at the top
  const petal = blade(0.27, 0.1, -0.04, -2.2);
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Mesh(petal, glaze);
    p.rotation.y = (i * Math.PI * 2) / 3 + Math.PI / 3;
    p.translateZ(0.08);
    p.rotateX(-0.04);
    tulip.add(p);
  }
  // the tight crown of petal tips on top, in rows of small scales
  const scale = new THREE.SphereGeometry(0.018, 10, 8);
  scale.scale(1, 1.5, 0.7);
  [[0.25, 0.06, 9], [0.29, 0.045, 7], [0.32, 0.026, 5], [0.345, 0, 1]].forEach(([y, rad, n]) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + y * 9;
      const sc = new THREE.Mesh(scale, glaze);
      sc.position.set(rad * Math.cos(a), y, rad * Math.sin(a));
      sc.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      tulip.add(sc);
    }
  });
  tulip.position.set(0.875, 0.06, 0.07);
  logo.add(tulip);
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.875, 0.08, 0.07), new THREE.Vector3(0.866, -0.14, 0.075),
    new THREE.Vector3(0.853, -0.35, 0.075), new THREE.Vector3(0.843, -0.5, 0.07),
  ]);
  logo.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 40, 0.016, 10), leafGlaze));
  // left leaf up to just under the bud (990, 590 px), right leaf up and out (1115, 590 px),
  // and the low leaf down toward the base leaves (905, 890 px)
  leaf(0.57, 0.052, [0.843, -0.48, 0.09], toward(-0.094, 0.565), { pairs: 7, cup: 1.4, bend: 0.1 });
  leaf(0.46, 0.05, [0.874, -0.35, 0.06], toward(0.136, 0.44), { pairs: 6, cup: 1.4, bend: 0.1 });
  leaf(0.33, 0.048, [0.843, -0.36, 0.1], toward(-0.272, -0.19), { pairs: 4, cup: 1.4 });

  /* ---- microscope on the left, standing just inside the ring, gunmetal ---- */
  // Built straight in ring units from the logo: eyepiece top at y 425 px, body tube centred on x 288 px,
  // stage at y 680 to 710 px, base plate at y 800 to 830 px.
  const scope = new THREE.Group();
  const cyl = (rt, rb, h, mat, x, y, z = 0, seg = 32) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
    c.position.set(x, y, z);
    scope.add(c);
    return c;
  };
  const box = (w, h, d, mat, x, y, z = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    b.position.set(x, y, z);
    scope.add(b);
    return b;
  };
  const X = -0.72;
  // eyepiece with its rings
  cyl(0.042, 0.042, 0.12, steel, X, 0.37);
  cyl(0.047, 0.047, 0.016, darkSteel, X, 0.425);
  cyl(0.046, 0.046, 0.014, darkSteel, X, 0.38);
  cyl(0.05, 0.05, 0.02, darkSteel, X, 0.315);
  // body tube and its collar
  cyl(0.057, 0.057, 0.25, steel, X, 0.18);
  cyl(0.064, 0.064, 0.022, darkSteel, X, 0.3);
  cyl(0.062, 0.062, 0.02, darkSteel, X, 0.06);
  // focus knob on the left of the body, face to the viewer
  const knob = cyl(0.042, 0.042, 0.06, steel, -0.8, 0.15, 0.02);
  knob.rotation.x = Math.PI / 2;
  const knobCap = cyl(0.02, 0.02, 0.07, darkSteel, -0.8, 0.15, 0.025);
  knobCap.rotation.x = Math.PI / 2;
  // nosepiece and three objectives
  cyl(0.06, 0.045, 0.035, steel, X, 0.03);
  [-0.032, 0, 0.032].forEach((dx, i) => {
    const o = cyl(0.015, 0.019, 0.07, darkSteel, X + dx, -0.02, i === 1 ? 0.02 : 0);
    o.rotation.z = -dx * 4;
  });
  // stage with clips, condenser below, fine focus knob
  box(0.22, 0.032, 0.15, darkSteel, X, -0.13);
  box(0.2, 0.01, 0.14, steel, X, -0.11);
  [-0.05, 0.05].forEach((dx) => box(0.05, 0.01, 0.02, steel, X + dx, -0.102, 0.05));
  cyl(0.032, 0.026, 0.06, steel, X, -0.18);
  const fine = cyl(0.03, 0.03, 0.05, steel, -0.81, -0.24, 0.02);
  fine.rotation.x = Math.PI / 2;
  // pillar from the base up to the stage
  box(0.06, 0.2, 0.07, steel, -0.79, -0.26);
  // the curved arm on the left, behind, from the base up to the body
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.8, -0.33, -0.03), new THREE.Vector3(-0.9, -0.12, -0.03),
    new THREE.Vector3(-0.88, 0.08, -0.03), new THREE.Vector3(-0.78, 0.2, -0.02),
  ]);
  scope.add(new THREE.Mesh(new THREE.TubeGeometry(armCurve, 40, 0.042, 14), steel));
  // base plate
  const baseShape = new THREE.Shape();
  baseShape.moveTo(-0.13, -0.07); baseShape.lineTo(0.13, -0.07);
  baseShape.quadraticCurveTo(0.15, -0.07, 0.15, -0.05); baseShape.lineTo(0.15, 0.05);
  baseShape.quadraticCurveTo(0.15, 0.07, 0.13, 0.07); baseShape.lineTo(-0.13, 0.07);
  baseShape.quadraticCurveTo(-0.15, 0.07, -0.15, 0.05); baseShape.lineTo(-0.15, -0.05);
  baseShape.quadraticCurveTo(-0.15, -0.07, -0.13, -0.07);
  const baseGeo = new THREE.ExtrudeGeometry(baseShape, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3 });
  baseGeo.rotateX(Math.PI / 2);
  const basePlate = new THREE.Mesh(baseGeo, darkSteel);
  basePlate.position.set(-0.735, -0.36, 0);
  scope.add(basePlate);
  scope.position.z = 0.06;
  logo.add(scope);

  /* ---- the wordmark ---- */
  function word(w, emX, emY, cx, baseline) {
    const path = new THREE.ShapePath();
    for (const c of w.d) {
      if (c[0] === "M") path.moveTo(c[1], c[2]);
      else if (c[0] === "L") path.lineTo(c[1], c[2]);
      else if (c[0] === "Q") path.quadraticCurveTo(c[1], c[2], c[3], c[4]);
      else if (c[0] === "C") path.bezierCurveTo(c[1], c[2], c[3], c[4], c[5], c[6]);
    }
    const shapes = path.toShapes(false);
    const g = new THREE.ExtrudeGeometry(shapes, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.022, bevelSegments: 3, curveSegments: 8 });
    g.scale(emX, emY, emY * 0.6);
    const mesh = new THREE.Mesh(g, letterGlaze);
    mesh.position.set(cx, baseline, 0.02);
    logo.add(mesh);
  }
  // The logo's lettering is narrower than Cinzel, so each word is fitted to the box it takes on the logo.
  // ALAGA: x 370 to 976 px, cap height 160 px, baseline at 600 px.
  // AESTHETICS: x 372 to 940 px, cap height 92 px, baseline at 772 px.
  word(WORDMARK.alaga, 1.268 / WORDMARK.alaga.w, 0.335 / WORDMARK.alaga.cap, 0.086, 0.067);
  word(WORDMARK.aesthetics, 1.188 / WORDMARK.aesthetics.w, 0.192 / WORDMARK.aesthetics.cap, 0.05, -0.293);
  // the rule between them, 370 to 940 px at y 646 px, broken by a three-leaf sprig at x 604 px
  const ruleY = -0.03, sprigX = -0.059;
  [[-0.548, sprigX - 0.05], [sprigX + 0.05, 0.645]].forEach(([a, b]) => {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, b - a, 8), letterGlaze);
    l.rotation.z = Math.PI / 2;
    l.position.set((a + b) / 2, ruleY, 0.03);
    logo.add(l);
  });
  const sprig = new THREE.Group();
  const sprigLeaf = blade(0.045, 0.014, 0, 0);
  [[0, 0.0], [0.9, -0.008], [-0.9, -0.008]].forEach(([ang, y]) => {
    const sl = new THREE.Mesh(sprigLeaf, letterGlaze);
    sl.rotation.z = ang;
    sl.position.y = y;
    sprig.add(sl);
  });
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 8), letterGlaze);
  dot.position.y = -0.016;
  sprig.add(dot);
  sprig.position.set(sprigX, ruleY - 0.002, 0.03);
  logo.add(sprig);

  logo.rotation.set(0, 0, 0);
  logo.position.y = opts.lift ?? 0;

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

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(host);
  const start = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = (now - start) / 1000;
    logo.rotation.y += ((pointer.x * follow + Math.sin(t * 0.4) * sway) - logo.rotation.y) * 0.05;
    logo.rotation.x += ((pointer.y * follow * 0.6) - logo.rotation.x) * 0.05;
    render();
  }

  resize();
  if (reduce) render();
  else requestAnimationFrame(tick);
  host.classList.add("is-live");
}
