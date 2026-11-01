/* Face analysis: what is read from the photo.
   Works on a face crop scaled so the pupils are WORK_IOD pixels apart, with the 478 face mesh points in the
   same pixels. Every reading compares areas inside the same photo, so lighting and camera matter less, but
   the results are a guide and not a skin exam. */

export const WORK_IOD = 240;            // pixels between the pupils in the working image (about 3.8 px per mm)
const PX_MM = WORK_IOD / 63;

/* ---------- mesh areas ---------- */
const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const EYE = [[33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246], [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466]];
const LID_LO = [[33, 7, 163, 144, 145, 153, 154, 155, 133], [263, 249, 390, 373, 374, 380, 381, 382, 362]];
const LID_UP = [[33, 246, 161, 160, 159, 158, 157, 173, 133], [263, 466, 388, 387, 386, 385, 384, 398, 362]];
const BROW = [[70, 63, 105, 66, 107, 55, 65, 52, 53, 46], [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]];
const BROW_LO = [[46, 53, 52, 65, 55], [276, 283, 282, 295, 285]];
const LIPS = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185];
const NOSTRIL = [[98, 64, 48, 115, 220, 45, 4, 1, 2, 97], [327, 294, 278, 344, 440, 275, 4, 1, 2, 326]];
const FOREHEAD = [103, 67, 109, 10, 338, 297, 332, 300, 293, 334, 296, 336, 9, 107, 66, 105, 63, 70];
const GLABELLA = [55, 107, 9, 336, 285, 8];
const NOSE = [6, 351, 358, 327, 2, 98, 129, 122];
const CHEEK = [[101, 50, 187, 205, 36], [330, 280, 411, 425, 266]];
const FOLD = [[203, 206, 216], [423, 426, 436]];            // nasolabial fold, alar to beside the mouth corner
const MARIONETTE = [[61, 202, 210], [291, 422, 430]];       // mouth corner down toward the jaw
const JAW = [[172, 136, 150, 149, 176, 148, 152], [397, 365, 379, 378, 400, 377, 152]];
const MID = [10, 151, 9, 8, 168, 6, 197, 195, 5, 4, 1, 2, 164, 0, 17, 18, 200, 199, 175, 152];
const PAIRS = [[33, 263], [133, 362], [70, 300], [105, 334], [107, 336], [61, 291], [64, 294], [234, 454], [172, 397], [150, 379], [50, 280], [159, 386], [145, 374], [98, 327], [205, 425], [127, 356], [58, 288]];

export const LINES_AT = {FOLD, MARIONETTE, BROW_LO, LID_UP, PAIRS};

const V = {
  sub:(a, b) => ({x:a.x - b.x, y:a.y - b.y}), add:(a, b) => ({x:a.x + b.x, y:a.y + b.y}), mul:(a, k) => ({x:a.x * k, y:a.y * k}),
  dot:(a, b) => a.x * b.x + a.y * b.y, len:a => Math.hypot(a.x, a.y), dist:(a, b) => Math.hypot(a.x - b.x, a.y - b.y),
  unit:a => { const l = Math.hypot(a.x, a.y) || 1; return {x:a.x / l, y:a.y / l}; }, mid:(a, b) => ({x:(a.x + b.x) / 2, y:(a.y + b.y) / 2}),
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const avg = pts => pts.reduce((s, p) => ({x:s.x + p.x / pts.length, y:s.y + p.y / pts.length}), {x:0, y:0});
const pupil = (L, side) => L[side ? 473 : 468] || avg(EYE[side].map(i => L[i]));

/* ---------- the working image ---------- */
/* crop to the face oval with room around it and scale so the pupils sit WORK_IOD pixels apart */
export function workImage(canvas, L){
  // a turned head shortens the eye distance, so the face height keeps the scale in check
  const iod = V.dist(pupil(L, 0), pupil(L, 1)) || 1, fh = V.dist(L[10], L[152]) || 1, k = WORK_IOD / Math.max(iod, fh * .33);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const i of OVAL) { const p = L[i]; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  const mw = (x1 - x0) * .14, mh = (y1 - y0) * .1;
  x0 = Math.max(0, x0 - mw); x1 = Math.min(canvas.width, x1 + mw); y0 = Math.max(0, y0 - mh * 1.6); y1 = Math.min(canvas.height, y1 + mh);
  const W = Math.round((x1 - x0) * k), H = Math.round((y1 - y0) * k);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', {willReadFrequently:true}); g.imageSmoothingQuality = 'high';
  g.drawImage(canvas, x0, y0, x1 - x0, y1 - y0, 0, 0, W, H);
  return {canvas:c, L:L.map(p => ({x:(p.x - x0) * k, y:(p.y - y0) * k})), scale:k, srcIod:iod};
}

/* ---------- image maths on Float32 planes ---------- */
function gauss(src, W, H, s){
  if (s <= 0) return src.slice();
  const r = Math.max(1, Math.ceil(s * 3)), K = r * 2 + 1, kern = new Float32Array(K);
  let sum = 0; for (let i = -r; i <= r; i++) { kern[i + r] = Math.exp(-i * i / (2 * s * s)); sum += kern[i + r]; }
  for (let i = 0; i < K; i++) kern[i] /= sum;
  // edges are repeated outward so the inner loops need no bounds checks
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H), row = new Float32Array(W + 2 * r), col = new Float32Array(H + 2 * r);
  for (let y = 0; y < H; y++) {
    const o = y * W;
    for (let x = 0; x < r; x++) { row[x] = src[o]; row[W + r + x] = src[o + W - 1]; }
    row.set(src.subarray(o, o + W), r);
    for (let x = 0; x < W; x++) { let a = 0; for (let k = 0; k < K; k++) a += row[x + k] * kern[k]; tmp[o + x] = a; }
  }
  for (let x = 0; x < W; x++) {
    for (let y = 0; y < r; y++) { col[y] = tmp[x]; col[H + r + y] = tmp[(H - 1) * W + x]; }
    for (let y = 0; y < H; y++) col[y + r] = tmp[y * W + x];
    for (let y = 0; y < H; y++) { let a = 0; for (let k = 0; k < K; k++) a += col[y + k] * kern[k]; out[y * W + x] = a; }
  }
  return out;
}
/* box blur repeated three times, close to a gaussian and fast for wide blurs */
function wide(src, W, H, s){
  const r = Math.max(1, Math.round(Math.sqrt(12 * s * s / 3 + 1) / 2 - .5));
  let a = src, b = new Float32Array(W * H);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < H; y++) { const o = y * W; let acc = 0; for (let k = -r; k <= r; k++) acc += a[o + clamp(k, 0, W - 1)];
      for (let x = 0; x < W; x++) { b[o + x] = acc / (2 * r + 1); acc += a[o + clamp(x + r + 1, 0, W - 1)] - a[o + clamp(x - r, 0, W - 1)]; } }
    const c = new Float32Array(W * H);
    for (let x = 0; x < W; x++) { let acc = 0; for (let k = -r; k <= r; k++) acc += b[clamp(k, 0, H - 1) * W + x];
      for (let y = 0; y < H; y++) { c[y * W + x] = acc / (2 * r + 1); acc += b[clamp(y + r + 1, 0, H - 1) * W + x] - b[clamp(y - r, 0, H - 1) * W + x]; } }
    a = c;
  }
  return a;
}
/* dark lines: the Hessian of the blurred image. A valley has one large positive curvature across it and a
   small one along it. Returns line strength (scaled by s² so scales compare) and the direction across */
function valleys(I, W, H, s, pre){
  const g = pre || gauss(I, W, H, s), str = new Float32Array(W * H), ang = new Float32Array(W * H), blob = new Float32Array(W * H), s2 = s * s;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const o = y * W + x, c = g[o];
    const xx = g[o - 1] - 2 * c + g[o + 1], yy = g[o - W] - 2 * c + g[o + W], xy = (g[o - W - 1] + g[o + W + 1] - g[o - W + 1] - g[o + W - 1]) / 4;
    const tr = (xx + yy) / 2, d = Math.sqrt((xx - yy) * (xx - yy) / 4 + xy * xy), l1 = tr + d, l2 = tr - d;
    if (l1 > 0 && l1 > Math.abs(l2)) {
      const an = l1 > 1e-6 ? (l1 - Math.max(0, l2) * 2) / l1 : 0;
      str[o] = s2 * l1 * clamp(an, 0, 1);
      ang[o] = .5 * Math.atan2(2 * xy, xx - yy);   // direction of strongest curvature, across the line
    }
    if (l2 > 0) blob[o] = s2 * l2;                    // both curvatures up: a small dark dot, such as a pore
  }
  return {str, ang, blob, g};
}

/* ---------- masks from mesh polygons ---------- */
function maskOf(W, H, polys, holes = []){
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (const pts of polys) for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  x0 = Math.max(0, Math.floor(x0) - 1); y0 = Math.max(0, Math.floor(y0) - 1); x1 = Math.min(W, Math.ceil(x1) + 1); y1 = Math.min(H, Math.ceil(y1) + 1);
  const m = new Uint8Array(W * H), bw = x1 - x0, bh = y1 - y0;
  if (bw <= 0 || bh <= 0) return m;
  const c = mkCanvas(bw, bh);
  const g = c.getContext('2d', {willReadFrequently:true}); g.fillStyle = '#fff'; g.translate(-x0, -y0);
  const path = pts => { g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p.x, p.y)); g.closePath(); g.fill(); };
  polys.forEach(path);
  g.globalCompositeOperation = 'destination-out'; holes.forEach(path);
  const d = g.getImageData(0, 0, bw, bh).data;
  for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) if (d[(y * bw + x) * 4 + 3] > 127) m[(y + y0) * W + x + x0] = 1;
  return m;
}
const and = (a, b) => { const m = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) m[i] = a[i] & b[i]; return m; };
const count = m => { let n = 0; for (let i = 0; i < m.length; i++) n += m[i]; return n; };
/* a polygon grown or shrunk about its centre */
const grow = (pts, k) => { const c = avg(pts); return pts.map(p => V.add(c, V.mul(V.sub(p, c), k))); };
/* a band below or above a line of points: from offset a to offset b along dir */
const band = (pts, dir, a, b) => [...pts.map(p => V.add(p, V.mul(dir, a))), ...pts.slice().reverse().map(p => V.add(p, V.mul(dir, b)))];

/* ---------- colour ---------- */
/* a canvas that also works inside a worker */
const mkCanvas = (w, h) => { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); }
const f3 = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
function lab(data, n){
  const Lc = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = LIN[data[i * 4]], g = LIN[data[i * 4 + 1]], b = LIN[data[i * 4 + 2]];
    const X = (.4124 * r + .3576 * g + .1805 * b) / .95047, Y = .2126 * r + .7152 * g + .0722 * b, Z = (.0193 * r + .1192 * g + .9505 * b) / 1.08883;
    const fx = f3(X), fy = f3(Y), fz = f3(Z);
    Lc[i] = 116 * fy - 16; A[i] = 500 * (fx - fy); B[i] = 200 * (fy - fz);
  }
  return {Lc, A, B};
}
const stats = (P, m) => {
  let n = 0; for (let i = 0; i < m.length; i++) n += m[i] ? 1 : 0;
  if (!n) return {n:0, mean:0, med:0, mad:1, p95:0, p05:0};
  // every third pixel is plenty for a median and keeps the sort short
  const step = n > 60000 ? 3 : 1, v = new Float32Array(Math.ceil(n / step) + 1);
  let k = 0, c = 0, tot = 0;
  for (let i = 0; i < m.length; i++) if (m[i]) { tot += P[i]; if (c++ % step === 0) v[k++] = P[i]; }
  const a = v.subarray(0, k).sort(), med = a[k >> 1];
  const dev = new Float32Array(k); for (let i = 0; i < k; i++) dev[i] = Math.abs(a[i] - med); dev.sort();
  return {n, mean:tot / n, med, mad:dev[k >> 1] || 1, p95:a[Math.floor(k * .95)], p05:a[Math.floor(k * .05)]};
};

/* ---------- reading one photo ---------- */
/* work: {canvas, L} on the page, or {img (ImageData), L} inside the worker */
export function read(work){
  const {L} = work, img = work.img || work.canvas.getContext('2d', {willReadFrequently:true}).getImageData(0, 0, work.canvas.width, work.canvas.height);
  const W = img.width, H = img.height, n = W * H;
  const {Lc, A, B} = lab(img.data, n);
  const P = i => L[i], Ps = ix => ix.map(P);
  const iod = V.dist(pupil(L, 0), pupil(L, 1));
  const up = V.unit(V.sub(P(10), P(152))), side = {x:-up.y, y:up.x};
  const eyeW = [V.dist(P(33), P(133)), V.dist(P(263), P(362))];

  // skin: the face oval without the eyes, brows, lips and nostrils, then only pixels close to the skin colour
  const holes = [...EYE.map(e => grow(Ps(e), 1.45)), ...BROW.map(b => grow(Ps(b), 1.25)), grow(Ps(LIPS), 1.12), ...NOSTRIL.map(Ps)];
  const face = maskOf(W, H, [Ps(OVAL)], holes);
  const ref = maskOf(W, H, CHEEK.map(c => Ps(c)));
  const sL = stats(Lc, and(ref, face)), sA = stats(A, and(ref, face)), sB = stats(B, and(ref, face));
  const skin = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (face[i]) {
    const dl = Math.abs(Lc[i] - sL.med) / (sL.mad * 6 + 8), da = Math.abs(A[i] - sA.med) / (sA.mad * 5 + 5), db = Math.abs(B[i] - sB.med) / (sB.mad * 5 + 6);
    skin[i] = dl * dl + da * da + db * db < 1 ? 1 : 0;
  }
  const area = polys => and(maskOf(W, H, polys), skin);

  // areas
  const crowPoly = s => {
    const c = P(s ? 359 : 130), out = V.unit(V.sub(P(s ? 263 : 33), P(s ? 362 : 133))), u = V.mul(up, -1), w = eyeW[s];
    return [V.add(V.add(c, V.mul(out, .08 * w)), V.mul(u, -.42 * w)), V.add(V.add(c, V.mul(out, .9 * w)), V.mul(u, -.5 * w)),
            V.add(V.add(c, V.mul(out, .9 * w)), V.mul(u, .45 * w)), V.add(V.add(c, V.mul(out, .08 * w)), V.mul(u, .3 * w))];
  };
  const down = V.mul(up, -1);
  const R = {
    forehead:area([Ps(FOREHEAD)]), glabella:area([grow(Ps(GLABELLA), 1.1)]),
    crow:[area([crowPoly(0)]), area([crowPoly(1)])],
    under:[0, 1].map(s => area([band(Ps(LID_LO[s]), down, eyeW[s] * .15, eyeW[s] * .5)])),
    cheek:[0, 1].map(s => area([grow(Ps(CHEEK[s]), 1.25)])),
    nose:area([Ps(NOSE)]),
    chin:area([[...Ps([200, 421, 418, 262, 369, 396, 175, 171, 140, 32, 194, 201])]]),
  };
  R.cheeks = R.cheek[0].map((v, i) => v | R.cheek[1][i]);
  R.crows = R.crow[0].map((v, i) => v | R.crow[1][i]);
  R.unders = R.under[0].map((v, i) => v | R.under[1][i]);
  R.tzone = R.forehead.map((v, i) => v | R.nose[i] | R.chin[i]);

  // shading removed: what is left are lines, spots and grain at skin scale
  const base = wide(Lc, W, H, 14 * PX_MM / 3.8);
  const flat = new Float32Array(n); for (let i = 0; i < n; i++) flat[i] = Lc[i] - base[i];

  // a soft photo (phone smoothing, slight blur) flattens every fine line and pore; the detail energy on the
  // cheeks says how soft it is, and the thresholds come down to match, up to a limit
  let sh = 0, shn = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const o = y * W + x; if (!R.cheeks[o]) continue; shn++; sh += Math.abs(4 * Lc[o] - Lc[o - 1] - Lc[o + 1] - Lc[o - W] - Lc[o + W]); }
  const sharp = shn ? sh / shn : 0, soft = clamp(Math.sqrt(SHARP_REF / Math.max(.3, sharp)), 1, 1.7);

  /* ---- lines ---- */
  const fine = valleys(Lc, W, H, 1.3), mid = valleys(Lc, W, H, 2.6);
  const lineStr = new Float32Array(n), lineAng = new Float32Array(n);
  for (let i = 0; i < n; i++) { if (fine.str[i] >= mid.str[i]) { lineStr[i] = fine.str[i]; lineAng[i] = fine.ang[i]; } else { lineStr[i] = mid.str[i]; lineAng[i] = mid.ang[i]; } }
  const upAng = Math.atan2(up.y, up.x);
  // share of the area where a line runs, optionally only lines running one way (want: angle across the line vs face up)
  const LINE_T = 1.6 / soft;
  const lineShare = (m, across) => {
    let hit = 0, tot = 0, sum = 0;
    for (let i = 0; i < n; i++) if (m[i]) {
      tot++;
      let s = lineStr[i]; if (s < LINE_T) continue;
      if (across != null) { const d = Math.abs(Math.cos(lineAng[i] - upAng - across)); if (d < .7) continue; }
      hit++; sum += s;
    }
    return tot ? {share:hit / tot, depth:hit ? sum / hit : 0, n:tot} : {share:0, depth:0, n:0};
  };
  const lines = {
    forehead:lineShare(R.forehead, 0),            // across the line points up the face: lines run side to side
    glabella:lineShare(R.glabella, Math.PI / 2),  // frown lines run up and down
    crows:lineShare(R.crows, null), under:lineShare(R.unders, null),
  };

  /* ---- texture: pores and fine grain on the cheeks, nose and forehead ---- */
  // pores are a pixel or two across at this scale, so they get their own fine pass, only where texture is read
  const gp = gauss(Lc, W, H, .9);
  const texM = R.cheeks.map((v, i) => v | R.nose[i] | R.forehead[i]);
  let pores = 0, tn = 0, rough = 0;
  const g3 = mid.g;
  const grain = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (texM[i]) {
    tn++;
    const x = i % W, y = (i - x) / W;
    if (x > 0 && y > 0 && x < W - 1 && y < H - 1) {
      const c = gp[i], xx = gp[i - 1] - 2 * c + gp[i + 1], yy = gp[i - W] - 2 * c + gp[i + W], xy = (gp[i - W - 1] + gp[i + W + 1] - gp[i - W + 1] - gp[i + W - 1]) / 4;
      const l2 = (xx + yy) / 2 - Math.sqrt((xx - yy) * (xx - yy) / 4 + xy * xy);
      if (l2 * .81 > PORE_T / soft) pores++;
    }
    if (lineStr[i] < LINE_T) { const d = Lc[i] - g3[i]; rough += d * d; if (d < -2 / soft) grain[i] = 1; }
  }
  const texture = {pores:tn ? pores / tn : 0, rough:tn ? Math.sqrt(rough / tn) * soft : 0};

  /* ---- spots and evenness ---- */
  const d1 = fine.g, d2 = wide(Lc, W, H, 6 * PX_MM / 3.8), bS = gauss(B, W, H, 2), aS = gauss(A, W, H, 2);
  const bW = wide(B, W, H, 6 * PX_MM / 3.8);
  const spotM = R.cheeks.map((v, i) => v | R.forehead[i] | R.nose[i] | R.chin[i]);
  const spots = []; let sn = 0;
  const rad = Math.round(2.6 * PX_MM);
  for (let y = rad; y < H - rad; y++) for (let x = rad; x < W - rad; x++) {
    const o = y * W + x; if (!spotM[o]) continue; sn++;
    const dog = d1[o] - d2[o];
    if (dog > -2.4 / soft) continue;
    if (bS[o] - bW[o] < -1.5) continue;                 // a pigment spot is darker and browner, not bluer like a shadow
    if (lineStr[o] > LINE_T * 1.5) continue;            // a line, not a dot
    let isMin = true;
    for (let k = -rad; k <= rad && isMin; k += 2) for (let j = -rad; j <= rad; j += 2) { const q = o + k * W + j; if (d1[q] - d2[q] < dog) { isMin = false; break; } }
    if (isMin) spots.push({x, y, d:-dog});
  }
  const toneM = and(spotM, spotM);
  const tL = stats(d2, toneM), tA = stats(aS, toneM);
  const even = {spots:sn ? spots.length / (sn / 1e4) : 0, spotDepth:spots.reduce((a, s) => a + s.d, 0) / (spots.length || 1), toneL:tL.mad, toneA:tA.mad};

  /* ---- redness ---- */
  // red means redder in hue as well as stronger: shade and darker skin raise a* and b* together, redness raises a* alone
  const hue = new Float32Array(n);
  for (let i = 0; i < n; i++) if (face[i]) hue[i] = Math.atan2(bS[i], aS[i]) * 57.3;
  const fA = stats(aS, R.forehead), cA = stats(aS, R.cheeks.map((v, i) => v | R.nose[i])), allA = stats(aS, skin), allH = stats(hue, skin);
  let red = 0, rn = 0; const redMap = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (skin[i]) { rn++; const ex = Math.min(aS[i] - allA.med - 3, (allH.med - hue[i]) * .8 - 3); if (ex > 0) { red++; redMap[i] = Math.min(255, 1 + ex * 30); } }
  const redness = {patch:rn ? red / rn : 0, cheekVsForehead:cA.mean - fA.mean, hueGap:fA.n && cA.n ? stats(hue, R.forehead).med - stats(hue, R.cheeks).med : 0};

  /* ---- under the eyes ---- */
  const uL = [0, 1].map(s => stats(Lc, R.under[s])), chL = [0, 1].map(s => stats(Lc, R.cheek[s]));
  const dark = [0, 1].map(s => chL[s].n && uL[s].n ? (chL[s].med - uL[s].med) / Math.max(20, chL[s].med) : 0);
  const trough = lineShare(R.unders, 0);
  const under = {dark:Math.max(...dark), darkL:dark[0], darkR:dark[1], trough:trough.share};

  /* ---- shine ---- */
  const sT = stats(Lc, R.tzone);
  let shine = 0, shN = 0; const shineMap = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (R.tzone[i] || (face[i] && R.cheeks[i])) {
    shN++;
    const ch = Math.hypot(A[i], B[i]);
    if (Lc[i] > sT.med + Math.max(6, sT.mad * 3) && ch < Math.hypot(sA.med, sB.med) * .8) { shine++; shineMap[i] = 1; }
  }

  /* ---- sagging and folds ---- */
  // a fold is a valley across a short line of mesh points: compare the darkest stripe with the skin either side
  const profile = (pts, reach) => {
    let tot = 0, cnt = 0, worst = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1], t = V.unit(V.sub(b, a)), nrm = {x:-t.y, y:t.x}, len = V.dist(a, b);
      for (let s = 0; s <= len; s += 2) {
        const c = V.add(a, V.mul(t, s)); let lo = 1e9, edge = 0, en = 0;
        for (let o = -reach; o <= reach; o += 1) {
          const p = V.add(c, V.mul(nrm, o)), x = Math.round(p.x), y = Math.round(p.y);
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const v = g3[y * W + x];
          if (Math.abs(o) < reach * .5) lo = Math.min(lo, v); else { edge += v; en++; }
        }
        if (!en || lo > 1e8) continue;
        const depth = Math.max(0, edge / en - lo) / Math.max(20, edge / en);
        tot += depth; cnt++; worst = Math.max(worst, depth);
      }
    }
    return cnt ? tot / cnt : 0;
  };
  const ext = (ix, k) => { const pts = Ps(ix), a = pts[pts.length - 2], b = pts[pts.length - 1]; return [...pts, V.add(b, V.mul(V.sub(b, a), k))]; };
  const folds = [0, 1].map(s => profile(ext(FOLD[s], .6), iod * .09));
  const mario = [0, 1].map(s => profile(Ps(MARIONETTE[s]), iod * .08));
  const st = V.mid(P(13), P(14)), mw = V.dist(P(61), P(291));
  const droop = (V.dot(V.sub(V.mid(P(61), P(291)), st), down)) / mw;
  const browH = [0, 1].map(s => V.dot(V.sub(P(s ? 386 : 159), avg(Ps(BROW_LO[s]))), down) / eyeW[s]);
  // jawline: how sharp the edge is along the lower jaw, against the contrast of the face
  const gx = (x, y) => g3[y * W + Math.min(W - 1, x + 1)] - g3[y * W + Math.max(0, x - 1)], gy = (x, y) => g3[Math.min(H - 1, y + 1) * W + x] - g3[Math.max(0, y - 1) * W + x];
  const jawEdge = s => {
    const pts = Ps(JAW[s]); let tot = 0, cnt = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1], t = V.unit(V.sub(b, a)), nrm = {x:-t.y, y:t.x};
      for (let q = 0; q <= V.dist(a, b); q += 2) {
        let best = 0;
        for (let o = -iod * .06; o <= iod * .06; o += 1) {
          const p = V.add(V.add(a, V.mul(t, q)), V.mul(nrm, o)), x = Math.round(p.x), y = Math.round(p.y);
          if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) continue;
          best = Math.max(best, Math.abs(gx(x, y) * nrm.x + gy(x, y) * nrm.y));
        }
        tot += best; cnt++;
      }
    }
    return cnt ? tot / cnt / Math.max(10, sL.med) : 0;
  };
  const jaw = [jawEdge(0), jawEdge(1)];
  const sag = {fold:Math.max(...folds), folds, mario:Math.max(...mario), marios:mario, droop, brow:Math.min(...browH), browH, jaw:Math.max(...jaw), jaws:jaw};

  /* ---- upper lid fold ---- */
  // the crease shows as a dark line running along the lid, a little above the lashes
  const creasePts = [[], []];
  const crease = [0, 1].map(s => {
    const lid = Ps(LID_UP[s]), brow = Ps(BROW_LO[s]), w = eyeW[s];
    let tot = 0, cnt = 0;
    for (let k = 2; k < lid.length - 2; k++) {
      const p = lid[k], br = brow.reduce((b, q) => Math.abs(V.dot(V.sub(q, p), side)) < Math.abs(V.dot(V.sub(b, p), side)) ? q : b, brow[0]);
      const span = V.dot(V.sub(p, br), down);  // brow sits above the lid
      if (span <= 4) continue;
      let best = 0, at = null;
      for (let o = w * .06; o <= Math.min(span * .7, w * .42); o += 1) {
        const q = V.add(p, V.mul(up, o)), x = Math.round(q.x), y = Math.round(q.y);
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = y * W + x, d = Math.abs(Math.cos(lineAng[i] - upAng));
        if (d > .6 && lineStr[i] > best) { best = lineStr[i]; at = q; }
      }
      tot += best; cnt++;
      if (at && best > 1.3) creasePts[s].push(at);
    }
    return cnt ? tot / cnt : 0;
  });
  const lid = {crease:Math.min(...crease), creases:crease, pts:creasePts, open:[0, 1].map(s => V.dist(P(s ? 386 : 159), P(s ? 374 : 145)) / eyeW[s])};

  /* ---- symmetry ---- */
  const mpts = Ps(MID), mc = avg(mpts);
  let sxx = 0, sxy = 0, syy = 0; for (const p of mpts) { const d = V.sub(p, mc); sxx += d.x * d.x; sxy += d.x * d.y; syy += d.y * d.y; }
  const th = .5 * Math.atan2(2 * sxy, sxx - syy), ax = {x:Math.cos(th), y:Math.sin(th)};
  const refl = p => { const d = V.sub(p, mc), a = V.dot(d, ax); return V.add(mc, V.sub(V.mul(ax, 2 * a), d)); };
  const asym = PAIRS.reduce((s, [a, b]) => s + V.dist(refl(P(a)), P(b)), 0) / PAIRS.length / iod;

  // photo quality: fine detail on the cheeks, light on each side, how far the head is turned
  const light = chL[0].n && chL[1].n ? Math.abs(chL[0].med - chL[1].med) / Math.max(20, (chL[0].med + chL[1].med) / 2) : 0;
  const ta = Math.abs(V.dot(V.sub(P(1), P(234)), side)), tb = Math.abs(V.dot(V.sub(P(1), P(454)), side)), turn = Math.abs(ta - tb) / (ta + tb);
  return {sharp, soft, light, turn, near:ta >= tb ? 0 : 1, grain, axis:{c:mc, d:ax}, W, H, iod, skinShare:count(skin) / Math.max(1, count(face)), lines, texture, even, spots, redness, redMap, under, shine:{share:shN ? shine / shN : 0}, shineMap,
    sag, lid, asym, lineStr, lineAng, masks:R, face, skin, refL:sL.med, flatSd:stats(flat, R.cheeks).mad};
}

/* ---------- photo quality ---------- */
/* issues that make the reading less true: a small or soft face, smoothing from a beauty mode, dim or one-sided light,
   a turned head (from the mesh) */
export function quality(work, raw){
  const out = [];
  if (work.srcIod < 70) out.push('small');
  if (raw.sharp < SHARP_MIN) out.push(raw.texture.pores < .01 ? 'smooth' : 'soft');
  if (raw.refL < 30) out.push('dark');
  if (raw.light > .16) out.push('uneven');
  if (raw.turn > .22) out.push('turn');
  return out;
}
export const SHARP_MIN = .9;
const SHARP_REF = 2.8, PORE_T = globalThis.__PORE_T || .6;

/* a 45 degree photo: only the side nearer the camera is read, for the fold beside the nose and the jawline */
export function readSide(work){
  const r = read(work);
  return {turn:r.turn, near:r.near, fold:r.sag.folds[r.near], jaw:r.sag.jaws[r.near]};
}
