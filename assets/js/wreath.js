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
  // Neutral keeps the cobalt cobalt; filmic tone mapping pushes it toward violet
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.5;

  // opts.ortho frames the logo exactly as Logo.jpeg (1264 px across, ring radius 478 px), for checking
  // it square by square against the logo
  const HALF = 632 / 478;
  const camera = opts.ortho ? new THREE.OrthographicCamera(-HALF, HALF, HALF, -HALF, 0.1, 50) : new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, opts.ortho ? 5 : opts.distance ?? 5.5);

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(-3, 4, 3);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe6ff, 0.35);
  fill.position.set(3, -1, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2);
  rim.position.set(1, 2, -2);
  scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xf7f9fe, 0x0b1d4a, 0.25));

  // Colours taken with a dropper from Logo.jpeg, each element on its own: the middle tone of the ring
  // #204ca0, the rungs #113071, lettering #17326d, leaves #1b346d, tulip #16326b, the microscope body
  // steel #3e434f with highlights to #9da2ae, and its arm a blue steel #2f3c5c. The base colours below
  // are set so the rendered middle tones land on those.
  const glossy = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.2, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, ...extra });
  const glaze = glossy(0x204ca0);
  const rungGlaze = glossy(0x113071, { roughness: 0.45 });
  const leafGlaze = glossy(0x1b346d, { side: THREE.DoubleSide });
  const tulipGlaze = glossy(0x2a4f9c, { side: THREE.DoubleSide, roughness: 0.15 });
  const vein = glossy(0x40609f, { roughness: 0.3, metalness: 0 });
  const letterGlaze = glossy(0x1b3a7c, { envMapIntensity: 1.6 });
  const steel = new THREE.MeshPhysicalMaterial({ color: 0x7d828e, metalness: 0.6, roughness: 0.18, clearcoat: 0.8 });
  const darkSteel = new THREE.MeshPhysicalMaterial({ color: 0x3a3f4b, metalness: 0.55, roughness: 0.25, clearcoat: 0.4 });
  const armSteel = new THREE.MeshPhysicalMaterial({ color: 0x6d7fae, metalness: 0.5, roughness: 0.22, clearcoat: 0.6 });

  const logo = new THREE.Group();
  scene.add(logo);

  /* ---- the DNA ring: two strands winding in the plane of the ring, rungs between them ----
     Measured on the logo: the band runs from about 400 to 520 px out from the centre, so the middle of
     the band is at 460 px (0.962 here), each strand about 48 px thick, and the strands cross 15 times
     round the ring, the first at 52 degrees from the right going anticlockwise. 15 crossings is 7.5
     twists, so the two strands are drawn as one closed curve that goes round twice. */
  const R = 0.962, r = 0.076, twists = 7.5, tube = 0.05, phase = 1.05;
  class Strands extends THREE.Curve {
    getPoint(t, target = new THREE.Vector3()) {
      const a = t * Math.PI * 4, s = twists * a + phase, rad = R + r * Math.cos(s);
      return target.set(rad * Math.cos(a), rad * Math.sin(a), 0.07 * Math.sin(s));
    }
  }
  const strands = new Strands();
  logo.add(new THREE.Mesh(new THREE.TubeGeometry(strands, 1800, tube, 16, true), glaze));
  const rungs = 15 * 14;
  const rungMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8), rungGlaze, rungs);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const p1 = new THREE.Vector3(), p2 = new THREE.Vector3(), mid = new THREE.Vector3(), dir = new THREE.Vector3();
  for (let i = 0; i < rungs; i++) {
    const t = (i + 0.5) / rungs / 2;
    strands.getPoint(t, p1); strands.getPoint(t + 0.5, p2);
    dir.subVectors(p2, p1); const len = dir.length(); dir.normalize();
    mid.addVectors(p1, p2).multiplyScalar(0.5); mid.z -= 0.02;
    q.setFromUnitVectors(up, dir);
    m.compose(mid, q, new THREE.Vector3(1, Math.max(0.001, len), 1));
    rungMesh.setMatrixAt(i, m);
  }
  logo.add(rungMesh);

  /* ---- leaves ---- */
  // A leaf blade along +y from its base. The half-width follows sin(pi * t^p), so the widest point sits
  // at the fraction `peak` of the length, as each leaf on the logo has it. Thin, glossy, bent a little.
  function blade(length, width, o = {}) {
    const peak = o.peak ?? 0.45, bend = o.bend ?? 0.05, cup = o.cup ?? 0.5, stalk = o.stalk ?? 0;
    const p = Math.log(0.5) / Math.log(peak), n = 40, right = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, h = width * Math.pow(Math.sin(Math.PI * Math.pow(t, p)), o.round ?? 0.85);
      right.push(new THREE.Vector2(h, stalk + t * (length - stalk)));
    }
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    if (stalk) { s.lineTo(0.006, 0); s.lineTo(0.006, stalk); }
    right.forEach((v) => s.lineTo(Math.max(v.x, 0.004), v.y));
    for (let i = n; i >= 0; i--) s.lineTo(-Math.max(right[i].x, 0.004), right[i].y);
    if (stalk) { s.lineTo(-0.006, stalk); s.lineTo(-0.006, 0); }
    s.lineTo(0, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.008, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.006, bevelSegments: 2, curveSegments: 4 });
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i) / length;
      pos.setZ(i, pos.getZ(i) + bend * length * y * y + cup * x * x - (o.fold ?? 0) * Math.abs(x));
    }
    g.computeVertexNormals();
    return { geo: g, length, width, peak, bend, cup, stalk, p, round: o.round ?? 0.85, fold: o.fold ?? 0 };
  }
  // Midrib and fine side veins running up toward the tip, a lighter blue as on the logo.
  function veins(mesh, b, pairs) {
    const zAt = (x, y) => 0.019 + b.bend * b.length * (y / b.length) ** 2 + b.cup * x * x - b.fold * Math.abs(x) + 0.0015;
    const halfAt = (y) => b.width * Math.pow(Math.sin(Math.PI * Math.pow(Math.max(0, (y - b.stalk) / (b.length - b.stalk)), b.p)), b.round);
    const rib = [];
    for (let i = 0; i <= 16; i++) { const y = b.stalk + (b.length - b.stalk) * (0.02 + 0.93 * i / 16); rib.push(new THREE.Vector3(0, y, zAt(0, y))); }
    mesh.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rib), 32, 0.0035, 5), vein));
    for (let k = 1; k <= pairs; k++) {
      const y0 = b.stalk + (b.length - b.stalk) * (0.06 + 0.82 * k / (pairs + 1));
      [-1, 1].forEach((side) => {
        const v = [];
        for (let i = 0; i <= 5; i++) {
          const f = i / 5, y = y0 + (b.length - b.stalk) * 0.1 * f, x = side * halfAt(y) * 0.85 * f;
          v.push(new THREE.Vector3(x, y, zAt(x, y)));
        }
        mesh.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(v), 8, 0.0018, 4), vein));
      });
    }
  }
  const toward = (dx, dy) => Math.atan2(-dx, dy);
  // a leaf from base to tip, both in ring units
  function leaf(base, tip, width, o = {}) {
    const dx = tip[0] - base[0], dy = tip[1] - base[1], len = Math.hypot(dx, dy);
    const b = blade(len, width, o);
    const mesh = new THREE.Mesh(b.geo, o.mat ?? leafGlaze);
    veins(mesh, b, o.pairs ?? 12);
    mesh.position.set(base[0], base[1], o.z ?? 0.03);
    mesh.rotation.set(o.tiltX ?? -0.08, o.tiltY ?? 0, toward(dx, dy));
    logo.add(mesh);
    return mesh;
  }

  // The two base leaves meet at the bottom of the ring under the knot where the strands cross, about
  // (632, 1046) px, pass behind the lower strand, and open up and out to their tips at (366, 795) and (931, 795) px. Widest at 60%.
  leaf([-0.01, -0.87], [-0.556, -0.341], 0.11, { peak: 0.62, stalk: 0.08, round: 0.75, tiltY: -0.12, pairs: 16, fold: 0.3, z: -0.01 });
  leaf([0.02, -0.87], [0.626, -0.341], 0.11, { peak: 0.62, stalk: 0.08, round: 0.75, tiltY: 0.12, pairs: 16, fold: 0.3, z: -0.01 });

  /* ---- tulip, right: a closed tulip cup of three petals with a crown above, stem and three leaves ---- */
  // Cup from y 592 px (bottom) to the side petal tips at 462 px, 115 px across, centred on x 1046 px.
  // The front petal stops at 474 px, and the crown of folded inner petals shows above it to 434 px.
  const TX = 0.867, TY = 0.084, TH = 0.272;
  const tulip = new THREE.Group();
  tulip.position.set(TX, TY + 0.01, 0.12);
  tulip.scale.set(0.86, 0.97, 0.86);
  logo.add(tulip);
  const petalGlaze = glossy(0x2a4f9c, { side: THREE.DoubleSide, roughness: 0.14 });
  const innerGlaze = glossy(0x0c1d4d, { side: THREE.DoubleSide, roughness: 0.3 });
  const crownGlaze = glossy(0x3a62b4, { roughness: 0.18 });
  const rimGlaze = glossy(0x9fb2dc, { roughness: 0.2, metalness: 0 });
  // cup radius against height, 0 at the bottom to 1 at the side petal tips: narrow at the stem and
  // widest near the top, the goblet shape of the tulip on the logo
  const cupR = (v) => {
    const k = [[0, 0.01], [0.15, 0.045], [0.35, 0.088], [0.6, 0.112], [0.85, 0.116], [1, 0.108]];
    for (let i = 1; i < k.length; i++) if (v <= k[i][0]) { const f = (v - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); const e = f * f * (3 - 2 * f); return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * e; }
    return k[k.length - 1][1];
  };
  // the dark inside of the cup, which shows in the gaps between the petals
  const cupPts = [];
  for (let i = 0; i <= 30; i++) { const v = (i / 30) * 0.85; cupPts.push(new THREE.Vector2(Math.max(0.002, cupR(v) - 0.01), v * TH)); }
  tulip.add(new THREE.Mesh(new THREE.LatheGeometry(cupPts, 48), innerGlaze));
  // a petal wrapped round the cup: rounded at the bottom, pointed at the tip, the tip turned out by
  // `flare`, a crease down the middle by `crease`, `height` as a share of the cup, `lift` off the cup
  function petal(halfArc, height, flare, crease, lift, turn) {
    const nu = 18, nv = 32, pos = [], idx = [], edgeL = [], edgeR = [];
    const at = (u, v) => {
      const prof = v < 0.55 ? 0.55 + 0.45 * Math.sin((Math.PI / 2) * (v / 0.55)) : Math.pow(Math.cos((Math.PI / 2) * ((v - 0.55) / 0.45)), 0.75);
      const w = Math.max(halfArc * prof, 0.002), vv = v * height;
      let rr = cupR(vv) + lift + (v > 0.7 ? flare * Math.pow((v - 0.7) / 0.3, 2) : 0);
      rr -= crease * Math.exp(-((u / 0.18) ** 2)) * Math.min(1, v * 3);
      const th = Math.max(-1.3, Math.min(1.3, (u * w) / rr)) + turn;
      return new THREE.Vector3(rr * Math.sin(th), vv * TH, rr * Math.cos(th));
    };
    for (let j = 0; j <= nv; j++) {
      const v = j / nv;
      for (let i = 0; i <= nu; i++) { const p = at((i / nu) * 2 - 1, v); pos.push(p.x, p.y, p.z); }
      edgeL.push(at(-1, v)); edgeR.push(at(1, v));
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + nu + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    tulip.add(new THREE.Mesh(g, petalGlaze));
    // the light edge along each side of the petal, as on the logo
    [edgeL, edgeR].forEach((e) => tulip.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(e.slice(2)), 32, 0.0032, 5), rimGlaze)));
  }
  // crown first: rows of pointed scales on a dome, showing above the front petal and between the side tips
  const scaleGeo = blade(0.055, 0.026, { peak: 0.4, bend: 0.02, cup: 2.5 }).geo;
  [[0.19, 0.095, 12], [0.222, 0.086, 11], [0.25, 0.072, 10], [0.274, 0.055, 8], [0.293, 0.035, 6], [0.307, 0.014, 3]].forEach(([y, rad, n], row) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + row * 0.35;
      const sc = new THREE.Mesh(scaleGeo, crownGlaze);
      sc.position.set(rad * Math.sin(a), y, rad * Math.cos(a));
      sc.rotation.set(0, a, 0, "YXZ");
      sc.rotateX(-0.3 - row * 0.05);
      tulip.add(sc);
    }
  });
  // two side petals, turned so their outer halves and pointed tips show left and right, then the
  // broad front petal over them with its crease
  petal(0.13, 1.0, 0.03, 0, 0.005, -0.95);
  petal(0.13, 1.0, 0.03, 0, 0.005, 0.95);
  petal(0.11, 0.95, 0.0, 0.008, 0.016, 0);
  // stem from the bottom of the cup down the inside of the ring into the strand
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(TX, TY + 0.01, 0.07), new THREE.Vector3(TX - 0.004, -0.15, 0.07),
    new THREE.Vector3(TX - 0.008, -0.43, 0.065), new THREE.Vector3(TX - 0.024, -0.644, 0.05),
  ]);
  logo.add(new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 48, 0.013, 10), petalGlaze));
  // leaves: up and left to (987, 592) px, up and right to (1098, 604) px, and down and left to (944, 885) px
  leaf([0.877, -0.28], [0.745, 0.084], 0.05, { peak: 0.45, cup: 1.2, round: 0.7, pairs: 8, z: 0.1, fold: 0.25 });
  leaf([0.885, -0.33], [0.975, 0.059], 0.048, { peak: 0.45, cup: 1.2, round: 0.7, pairs: 8, z: 0.09, fold: 0.25 });
  leaf([0.88, -0.232], [0.653, -0.529], 0.052, { peak: 0.45, cup: 1.2, round: 0.7, pairs: 8, z: 0.11, fold: 0.25 });

  /* ---- microscope, left: steel, standing on the ring ---- */
  // Every part placed from the logo in px: eyepiece top 427, body tube x 258 to 316 and y 482 to 582,
  // objectives to 645, stage x 237 to 341 at y 678 to 707, column to 774, base x 233 to 350 at y 774 to
  // 820, focus knobs at (250, 549) and (250, 741), and the curved arm out to x 170 on the left.
  const U = (px) => (632 - px) / 478, UX = (px) => (px - 632) / 478;
  const scope = new THREE.Group();
  scope.position.z = 0.14;
  logo.add(scope);
  const BX = UX(287);
  const cyl = (rt, rb, y0, y1, mat, x = BX, z = 0, seg = 32) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, Math.abs(y1 - y0), seg), mat);
    c.position.set(x, (y0 + y1) / 2, z);
    scope.add(c);
    return c;
  };
  const box = (x0, x1, y0, y1, d, mat, z = 0) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), d), mat);
    b.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
    scope.add(b);
    return b;
  };
  const knob = (xp, yp, r) => {
    const k = cyl(r, r, -0.025, 0.025, steel, UX(xp), 0.035);
    k.position.y = U(yp); k.rotation.x = Math.PI / 2;
    const c = cyl(r * 0.4, r * 0.4, -0.03, 0.03, darkSteel, UX(xp), 0.04);
    c.position.y = U(yp); c.rotation.x = Math.PI / 2;
  };
  // eyepiece: wide cap, neck, ring, neck, collar
  cyl(0.044, 0.044, U(427), U(441), steel);
  cyl(0.03, 0.03, U(441), U(452), darkSteel);
  cyl(0.04, 0.04, U(452), U(462), steel);
  cyl(0.032, 0.032, U(462), U(475), darkSteel);
  cyl(0.05, 0.05, U(475), U(482), steel);
  // body tube, banded top and bottom
  cyl(0.061, 0.061, U(482), U(582), steel);
  cyl(0.063, 0.063, U(482), U(489), darkSteel);
  cyl(0.063, 0.063, U(575), U(582), darkSteel);
  // focus knob on a bracket, left of the body
  box(UX(244), UX(262), U(541), U(557), 0.05, darkSteel);
  knob(250, 549, 0.038);
  // nosepiece and three objectives
  cyl(0.058, 0.042, U(582), U(599), steel);
  [-0.034, 0, 0.034].forEach((dx, i) => {
    const o = cyl(0.016, 0.019, U(599), U(645), steel, BX + dx, i === 1 ? 0.025 : 0);
    o.rotation.z = -dx * 3;
  });
  // stage: light plate over a dark band
  box(UX(237), UX(341), U(678), U(691), 0.17, steel);
  box(UX(240), UX(338), U(691), U(707), 0.16, darkSteel);
  // column under the stage, fine focus knob
  cyl(0.04, 0.04, U(707), U(774), steel, UX(289));
  knob(250, 741, 0.035);
  // base: a step, then the plate
  box(UX(258), UX(325), U(774), U(795), 0.14, steel);
  box(UX(233), UX(350), U(795), U(820), 0.18, darkSteel);
  // the arm: a broad curve from behind the upper knob, out to the left and down into the base
  const armCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(UX(241), U(562), 0), new THREE.Vector3(UX(190), U(610), 0),
    new THREE.Vector3(UX(170), U(670), 0), new THREE.Vector3(UX(185), U(745), 0),
    new THREE.Vector3(UX(212), U(790), 0), new THREE.Vector3(UX(240), U(808), 0),
  ]);
  const arm = new THREE.Mesh(new THREE.TubeGeometry(armCurve, 60, 0.036, 16), armSteel);
  arm.scale.z = 0.7;
  scope.add(arm);

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
  const sprigLeaf = blade(0.045, 0.014, { bend: 0, cup: 0 }).geo;
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
    if (opts.ortho) { camera.left = -HALF * w / h; camera.right = HALF * w / h; } else camera.aspect = w / h;
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
