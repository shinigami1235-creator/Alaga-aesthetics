/* Face proportions: measuring and planning.
   Works on the 478 MediaPipe face mesh points (pixel coordinates of the photo).
   Only what treatment can change is moved: chin length, nose width, lip fullness and the jawline.
   Eye spacing, forehead and skull shape are anchored so they never move. */

export const V = {
  add:(a, b) => ({x:a.x + b.x, y:a.y + b.y}), sub:(a, b) => ({x:a.x - b.x, y:a.y - b.y}), mul:(a, k) => ({x:a.x * k, y:a.y * k}),
  dot:(a, b) => a.x * b.x + a.y * b.y, dist:(a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  unit:a => { const l = Math.hypot(a.x, a.y) || 1; return {x:a.x / l, y:a.y / l}; }, perp:a => ({x:-a.y, y:a.x}),
  mid:(a, b) => ({x:(a.x + b.x) / 2, y:(a.y + b.y) / 2}),
};
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* mesh indices (MediaPipe face mesh annotations) */
export const I = {gl:9, nasion:168, top:10, bridge:6, tip:1, sn:2, me:152, ulTop:0, st1:13, st2:14, llBot:17,
  icdA:133, icdB:362, ocA:33, ocB:263, alA:64, alB:294, bzA:234, bzB:454, jawA:172, jawB:397, mA:61, mB:291};
export const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const LIP_UP = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291];
const LIP_LO = [146, 91, 181, 84, 17, 314, 405, 321, 375];
const LIP_IN = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 95, 88, 178, 87, 14, 317, 402, 318, 324];
// jawline from the cheekbone down to the chin on each side, with how much each point follows a slimmer jaw
const JAW = [[93, 323, .15], [132, 361, .4], [58, 288, .75], [172, 397, 1], [136, 365, 1], [150, 379, .8], [149, 378, .55], [176, 400, .3], [148, 377, .12]];
// points that never move: eyes, brows, forehead, the nose bridge and the upper cheeks
const FIXED = [33, 133, 159, 145, 263, 362, 386, 374, 70, 105, 107, 336, 334, 300, 10, 151, 9, 168, 6, 197, 117, 346, 50, 280, 187, 411, 205, 425, 36, 266];

/* the ideals. Each is a ratio of two distances on the front of the face */
export const ROWS = [
  {id:'thirds', target:() => 1, change:true},
  {id:'nose', target:() => 1, change:true, svc:'rhinoplasty'},
  {id:'golden', target:() => 1.618, change:false},
  {id:'lips', target:() => 1.6, change:true},
  {id:'jaw', target:s => s === 'men' ? .8 : .74, change:true, svc:'lipo'},
];
const CAP = {chinUp:.12, chinDown:.10, nose:.18, lips:.35, jaw:.10};
const TOL = .03; // within 3% of the ideal counts as already there

export const pt = (L, i) => L[i];

/* face frame: u runs down the face (between the brows to the chin), v across it */
export function frame(L){
  const u = V.unit(V.sub(L[I.me], L[I.gl]));
  let v = V.perp(u);
  if (V.dot(V.sub(L[I.bzB], L[I.bzA]), v) < 0) v = V.mul(v, -1);
  return {u, v};
}
const along = (a, b, d) => V.dot(V.sub(b, a), d);

export function measure(L){
  const F = frame(L), st = V.mid(L[I.st1], L[I.st2]);
  const mid = along(L[I.gl], L[I.sn], F.u), low = along(L[I.sn], L[I.me], F.u);
  const ul = along(L[I.ulTop], st, F.u), ll = along(st, L[I.llBot], F.u);
  const icd = Math.abs(along(L[I.icdA], L[I.icdB], F.v)), alar = Math.abs(along(L[I.alA], L[I.alB], F.v));
  const mouth = Math.abs(along(L[I.mA], L[I.mB], F.v));
  const bz = Math.abs(along(L[I.bzA], L[I.bzB], F.v)), jaw = Math.abs(along(L[I.jawA], L[I.jawB], F.v));
  return {thirds:low / mid, nose:alar / icd, golden:mouth / alar, lips:ll / Math.max(1, ul), jaw:jaw / bz,
    d:{mid, low, ul, ll, icd, alar, mouth, bz, jaw}};
}

/* how close a ratio sits to its ideal, 0 to 100 */
export const score = (r, t) => Math.round(100 * Math.exp(-2.5 * Math.abs(Math.log(Math.max(1e-3, r) / t))));
export const near = (r, t) => Math.abs(r / t - 1) <= TOL;
/* the overall golden match: the average closeness of every ratio, the golden ratio itself included */
export const overall = (M, sex) => Math.round(ROWS.reduce((a, r) => a + score(M[r.id], r.target(sex)), 0) / ROWS.length);

/* checks that tell the visitor when a photo will measure badly */
export function checks(L){
  const F = frame(L), out = [];
  const a = Math.abs(along(L[I.tip], L[I.bzA], F.v)), b = Math.abs(along(L[I.tip], L[I.bzB], F.v));
  if (Math.abs(a - b) / (a + b) > .25) out.push('turn');
  const ul = along(L[I.ulTop], V.mid(L[I.st1], L[I.st2]), F.u);
  if (V.dist(L[I.st1], L[I.st2]) > .6 * Math.max(1, ul)) out.push('mouth');
  return out;
}

/* The plan: a displacement for each moved mesh point, plus fixed anchors.
   on: which changes to apply; amt 0 to 1; sex picks the jaw ideal. */
export function plan(L, on, amt, sex){
  const F = frame(L), {u, v} = F, M = measure(L), D = new Map();
  const add = (i, d) => { const q = D.get(i); D.set(i, q ? V.add(q, d) : d); };
  const st = V.mid(L[I.st1], L[I.st2]), me = L[I.me];
  const cx = V.mid(L[I.bzA], L[I.bzB]);
  const lat = p => V.dot(V.sub(p, cx), v);
  const jawHalf = M.d.jaw / 2;
  const info = {};

  // chin length: the lower face matches the middle face
  if (on.thirds && !near(M.thirds, 1)) {
    const dLow = clamp(M.d.mid - M.d.low, -CAP.chinDown * M.d.low, CAP.chinUp * M.d.low) * amt;
    // the chin stretches below the lower lip, so the lips keep their size
    const t0 = along(st, L[I.llBot], u), span = (along(st, me, u) - t0) || 1;
    L.forEach((p, i) => {
      const t = (along(st, p, u) - t0) / span;
      if (t <= 0) return;
      const lf = 1 - .55 * smooth(.25, 1, Math.abs(V.dot(V.sub(p, me), v)) / Math.max(1, jawHalf));
      add(i, V.mul(u, dLow * smooth(0, 1, t) * lf));
    });
    info.thirds = dLow;
  }

  // nose width: the outer edges of the nostrils come in to the inner corners of the eyes
  if (on.nose && M.nose > 1 + TOL) {
    const shrink = clamp(1 - 1 / M.nose, 0, CAP.nose) * amt;
    const top = L[I.bridge], base = L[I.sn], span = along(top, base, u) || 1, half = M.d.alar / 2;
    const c = V.mid(L[I.alA], L[I.alB]);
    L.forEach((p, i) => {
      const t = along(top, p, u) / span, off = V.dot(V.sub(p, c), v);
      if (t < .3 || t > 1.15 || Math.abs(off) > half * 1.25) return;
      const w = smooth(.3, .8, t) * (1 - smooth(1.02, 1.15, t)) * (1 - smooth(1.05, 1.25, Math.abs(off) / half));
      if (w > .01) add(i, V.mul(v, -off * shrink * w));
    });
    info.nose = shrink;
  }

  // lip balance: the thinner lip fills out until the lower lip is 1.6 times the upper
  if (on.lips && !near(M.lips, 1.6)) {
    const half = M.d.mouth / 2, prof = p => Math.max(0, 1 - (lat(p) - lat(V.mid(L[I.mA], L[I.mB]))) ** 2 / (half * half));
    if (M.lips < 1.6) {
      const g = clamp(1.6 * M.d.ul - M.d.ll, 0, CAP.lips * M.d.ll) * amt;
      LIP_LO.forEach(i => add(i, V.mul(u, g * prof(L[i]))));
      [18, 83, 313, 200, 201, 421].forEach(i => add(i, V.mul(u, .35 * g * prof(L[i]))));
      info.lips = g;
    } else {
      const g = clamp(M.d.ll / 1.6 - M.d.ul, 0, CAP.lips * M.d.ul) * amt;
      LIP_UP.forEach(i => add(i, V.mul(u, -g * prof(L[i]))));
      [164, 167, 393, 165, 391].forEach(i => add(i, V.mul(u, -.3 * g * prof(L[i]))));
      info.lips = -g;
    }
  }

  // jawline: the jaw narrows toward the ideal against the cheekbones, never widens
  const tj = ROWS[4].target(sex);
  if (on.jaw && M.jaw > tj * (1 + TOL)) {
    const shrink = clamp(1 - tj / M.jaw, 0, CAP.jaw) * amt;
    for (const [a, b, w] of JAW) for (const i of [a, b]) add(i, V.mul(v, -lat(L[i]) * shrink * w));
    info.jaw = shrink;
  }

  // every control point: moved ones, fixed ones, the oval, the lips and a ring outside the face
  const ctrl = new Map();
  const put = (i, p, d) => { if (!ctrl.has(i)) ctrl.set(i, {p, d}); };
  D.forEach((d, i) => put(i, L[i], d));
  [...FIXED, ...OVAL, ...LIP_UP, ...LIP_LO, ...LIP_IN, I.tip, I.sn, I.alA, I.alB].forEach(i => put(i, L[i], {x:0, y:0}));
  const pts = [...ctrl.entries()].map(([i, q]) => ({i, p:q.p, d:q.d}));
  // a ring of fixed anchors outside the face keeps the hair, ears, neck and background still
  const fc = V.mid(L[I.top], me), R = M.d.bz * .62, H = along(L[I.top], me, u) * .66;
  for (let k = 0; k < 28; k++) {
    const a = k / 28 * Math.PI * 2;
    pts.push({i:-1, p:V.add(fc, V.add(V.mul(v, Math.cos(a) * R * 1.32), V.mul(u, Math.sin(a) * H * 1.3))), d:{x:0, y:0}});
  }
  const ell = {c:V.add(fc, V.mul(u, .06 * H)), a:v, ra:R * 1.5, b:u, rb:H * 1.48};
  return {pts, ell, D, info};
}

/* The golden spiral, drawn for show and never scored. A golden rectangle (1 wide, 1.618 tall) is cut into
   squares, one quarter circle in each. The point the spiral curls into sits on the pupil of the eye nearer the
   camera, and the size is set so the first, largest arc passes through the bottom of the chin. From there it
   runs up the far cheek, over the forehead and into the eye. */
const PHI = (1 + Math.sqrt(5)) / 2;
const POLE = {x:.7236068, y:.4472136}; // where the spiral ends inside the rectangle, as a share of its width
export function spiral(L, squares = 9){
  const F = frame(L), {u, v} = F;
  const irisA = L[468] || V.mid(L[33], L[133]), irisB = L[473] || V.mid(L[263], L[362]);
  const [lo, hi] = V.dot(V.sub(irisB, irisA), v) > 0 ? [irisA, irisB] : [irisB, irisA];
  // the eye nearer the camera is on the wider half of the face
  const a = Math.abs(along(L[I.tip], L[I.bzA], v)), b = Math.abs(along(L[I.tip], L[I.bzB], v));
  const toHi = a <= b, eye = toHi ? hi : lo, X = toHi ? v : V.mul(v, -1);
  // size: the first arc, centred on the corner (s, s/φ), passes through the chin
  const dm = V.sub(L[I.me], eye), D = {x:V.dot(dm, X), y:V.dot(dm, u)};
  const c = {x:1 - POLE.x, y:1 / PHI - POLE.y}, cc = c.x * c.x + c.y * c.y, dc = D.x * c.x + D.y * c.y, dd = D.x * D.x + D.y * D.y;
  const s = (-dc + Math.sqrt(dc * dc + (1 - cc) * dd)) / (1 - cc);
  const at = (x, y) => V.add(eye, V.add(V.mul(X, x - POLE.x * s), V.mul(u, y - POLE.y * s)));
  let x = 0, y = 0, w = s, h = s * PHI;
  const boxes = [[at(0, 0), at(w, 0), at(w, h), at(0, h)]], arc = [];
  for (let k = 0; k < squares; k++) {
    const q = Math.min(w, h), d = k % 4;
    let cx, cy, a0;
    // the square is cut from the bottom, left, top and right in turn; the arc's centre is the square's inner corner
    if (d === 0) { h -= q; cx = x + q; cy = y + h; a0 = Math.PI / 2; boxes.push([at(x, cy), at(x + w, cy)]); }
    else if (d === 1) { cx = x + q; cy = y + q; x += q; w -= q; a0 = Math.PI; boxes.push([at(x, y), at(x, y + h)]); }
    else if (d === 2) { cx = x; cy = y + q; y += q; h -= q; a0 = 3 * Math.PI / 2; boxes.push([at(x, y), at(x + w, y)]); }
    else { w -= q; cx = x + w; cy = y; a0 = 0; boxes.push([at(cx, y), at(cx, y + h)]); }
    const n = Math.max(6, 28 - k * 3);
    for (let j = k ? 1 : 0; j <= n; j++) {
      const t = a0 + j / n * Math.PI / 2;
      arc.push(at(cx + q * Math.cos(t), cy + q * Math.sin(t)));
    }
  }
  return {boxes, arc, eye, s};
}

/* the mesh points after the plan, used for the guides and the after measure */
export function moved(L, P){
  return L.map((p, i) => { const d = P.D.get(i); return d ? V.add(p, d) : p; });
}
