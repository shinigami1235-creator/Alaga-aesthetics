/* Wrinkles, from the Cygnus facial measurement tool (Facial Design/Facial Measurements, v3.12.0,
   analyzeWrinkles). Ported as it is: the box resampled to 8 px per mm, the shine mask, the hair mask,
   the eye sockets left out of the glabella box, multi-scale dark-ridge response, thinning to centre
   lines, and the reach gate that keeps a line only when it runs a region's span in one direction.
   What changes here: no pen or eraser (a patient can't draw), and the boxes are always the standard
   boxes placed from the face map, with a forehead box added on the same rule.

   Its own record says not to link shallow lines by hysteresis: it chains pores into long false lines.
   So nothing here bridges gaps. */

const WR = {
  workPxMm: 8, bgMm: 2.5, sigmasMm: [0.12, 0.20, 0.32, 0.50], minPhotoPxMm: 4.5,
  shineLum: 1.14, shineSat: 0.75, shineLumLo: 1.00, shineSatLo: 0.92, shineGrowMm: 0.8, shineFringeMm: 2.0, shineMax: 0.55,
  hairTexMm: 0.35, hairSpreadMm: 2.0, hairDarkMm: 2.5, hairLumRefQ: 0.65, hairTexRefQ: 0.40,
  hairLum: 0.80, hairTex: 1.5, hairLumLo: 0.97, hairTexLo: 1.12, hairGrow: 0.8, hairMax: 0.75,
  orbitGrowMm: 2.0, minLenMm: 2.5,
};
/* Standard boxes, in millimetres from a face-map point along the eye line (along) and up the face (up).
   Glabella and crow's feet are the tool's own rules (RELFYDESS case files). The forehead box is new:
   from 10 to 34 mm above landmark 9, 28 mm each side. */
export const REGIONS = [
  {id: 'forehead', label: 'Forehead', o: 9, e: [133, 362], along: [-28, 28], up: [10, 34], span: 8},
  {id: 'glabella', label: 'Between the brows', o: 168, e: [133, 362], along: [-13, 13], up: [2, 28], span: 6, orbits: true},
  {id: 'cfR', label: "Crow's feet, right", o: 33, e: [133, 33], along: [6, 24], up: [-10, 10], span: 4},
  {id: 'cfL', label: "Crow's feet, left", o: 263, e: [362, 263], along: [6, 24], up: [-10, 10], span: 4},
];
const ORBIT_RINGS = [
  [46, 53, 52, 65, 55, 133, 173, 157, 158, 159, 160, 161, 246, 33],
  [276, 283, 282, 295, 285, 362, 398, 384, 385, 386, 387, 388, 466, 263],
];

function boxBlur(src, w, h, rad){
  if (rad < 1) return src;
  const out = new Float32Array(src.length), n = 2 * rad + 1;
  for (let y = 0; y < h; y++) {
    const o = y * w; let acc = 0;
    for (let i = -rad; i <= rad; i++) acc += src[o + Math.min(w - 1, Math.max(0, i))];
    for (let x = 0; x < w; x++) { out[o + x] = acc / n; acc -= src[o + Math.min(w - 1, Math.max(0, x - rad))]; acc += src[o + Math.min(w - 1, Math.max(0, x + rad + 1))]; }
  }
  const out2 = new Float32Array(src.length);
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let i = -rad; i <= rad; i++) acc += out[Math.min(h - 1, Math.max(0, i)) * w + x];
    for (let y = 0; y < h; y++) { out2[y * w + x] = acc / n; acc -= out[Math.min(h - 1, Math.max(0, y - rad)) * w + x]; acc += out[Math.min(h - 1, Math.max(0, y + rad + 1)) * w + x]; }
  }
  return out2;
}
function gauss(src, w, h, s){ const rad = Math.max(1, Math.round(s * 0.9)); let f = src; for (let i = 0; i < 3; i++) f = boxBlur(f, w, h, rad); return f; }
function thin(mask, w, h){
  const img = Uint8Array.from(mask), at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : img[y * w + x];
  let changed = true, guard = 0; const del = [];
  while (changed && guard++ < 40) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      del.length = 0;
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        if (!img[y * w + x]) continue;
        const P = [at(x, y - 1), at(x + 1, y - 1), at(x + 1, y), at(x + 1, y + 1), at(x, y + 1), at(x - 1, y + 1), at(x - 1, y), at(x - 1, y - 1)];
        let B = 0; for (const v of P) B += v;
        if (B < 2 || B > 6) continue;
        let A = 0; for (let i = 0; i < 8; i++) if (P[i] === 0 && P[(i + 1) % 8] === 1) A++;
        if (A !== 1) continue;
        const [p2, , p4, , p6, , p8] = P;
        if (step === 0) { if (p2 * p4 * p6 || p4 * p6 * p8) continue; } else { if (p2 * p4 * p8 || p2 * p6 * p8) continue; }
        del.push(y * w + x);
      }
      if (del.length) { changed = true; for (const i of del) img[i] = 0; }
    }
  }
  return img;
}

/* the standard box for a region, in source pixels; lm are 0..1 of the canvas */
function boxOf(r, lm, W, H, pxmm){
  const P = i => [lm[i].x * W, lm[i].y * H];
  const A = P(r.e[0]), B = P(r.e[1]), L = Math.hypot(B[0] - A[0], B[1] - A[1]); if (L < 4) return null;
  const e = [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
  let n = [e[1], -e[0]]; if (n[1] > 0) n = [-n[0], -n[1]];
  const o = P(r.o), k = pxmm;
  const at = (a, u) => [o[0] + e[0] * a * k + n[0] * u * k, o[1] + e[1] * a * k + n[1] * u * k];
  const q = [at(r.along[0], r.up[0]), at(r.along[1], r.up[0]), at(r.along[1], r.up[1]), at(r.along[0], r.up[1])];
  if (q.some(([x, y]) => !isFinite(x) || x < -.02 * W || x > 1.02 * W || y < -.02 * H || y > 1.02 * H)) return null;
  return q;
}

/* One region at a set of sensitivities (per cent darker than the skin beside it). The heavy part, the
   ridge response, is worked out once and thresholded for each sensitivity. */
function region(canvas, lm, pxmm, r, sens){
  const poly = boxOf(r, lm, canvas.width, canvas.height, pxmm);
  if (!poly) return null;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of poly) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(canvas.width, Math.ceil(x1)); y1 = Math.min(canvas.height, Math.ceil(y1));
  if (x1 - x0 < 12 || y1 - y0 < 12) return null;
  const k = WR.workPxMm / pxmm;
  const w = Math.max(8, Math.round((x1 - x0) * k)), h = Math.max(8, Math.round((y1 - y0) * k));
  const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
  const g = cvs.getContext('2d', {willReadFrequently: true});
  g.drawImage(canvas, x0, y0, x1 - x0, y1 - y0, 0, 0, w, h);
  const mcv = document.createElement('canvas'); mcv.width = w; mcv.height = h;
  const mg = mcv.getContext('2d', {willReadFrequently: true});
  mg.fillStyle = '#000'; mg.fillRect(0, 0, w, h); mg.fillStyle = '#fff'; mg.beginPath();
  poly.forEach(([x, y], i) => { const px = (x - x0) * k, py = (y - y0) * k; i ? mg.lineTo(px, py) : mg.moveTo(px, py); });
  mg.closePath(); mg.fill();
  const mdat = mg.getImageData(0, 0, w, h).data, dat = g.getImageData(0, 0, w, h).data, N = w * h;
  const gray = new Float32Array(N), sat = new Float32Array(N), roi = new Uint8Array(N);
  let roiN = 0;
  for (let i = 0, j = 0; i < N; i++, j += 4) {
    const R = dat[j], G = dat[j + 1], B = dat[j + 2];
    gray[i] = .299 * R + .587 * G + .114 * B;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    sat[i] = mx > 4 ? (mx - mn) / mx : 0;
    roi[i] = mdat[j] > 127 ? 1 : 0; if (roi[i]) roiN++;
  }
  if (roiN < 64) return null;
  const roiN0 = roiN, roi0 = roi.slice();

  // shine: bright AND washed out, a strict core grown into a looser fringe
  {
    const gv = [], sv = [];
    for (let i = 0; i < N; i++) if (roi[i]) { gv.push(gray[i]); sv.push(sat[i]); }
    gv.sort((a, b) => a - b); sv.sort((a, b) => a - b);
    const gMed = gv[gv.length >> 1], sMed = sv[sv.length >> 1];
    const gHi = Math.max(gMed * WR.shineLum, 96), sHi = sMed * WR.shineSat, gLo = Math.max(gMed * WR.shineLumLo, 88), sLo = sMed * WR.shineSatLo;
    const core = new Uint8Array(N), cand = new Uint8Array(N);
    for (let i = 0; i < N; i++) { if (!roi[i]) continue; if (gray[i] >= 250 || (gray[i] > gHi && sat[i] < sHi)) { core[i] = 1; cand[i] = 1; } else if (gray[i] > gLo && sat[i] < sLo) cand[i] = 1; }
    const keep = new Uint8Array(N), lim = Math.max(1, Math.round(WR.shineFringeMm * WR.workPxMm));
    let cur = [], nxt = [];
    for (let i = 0; i < N; i++) if (core[i]) { keep[i] = 1; cur.push(i); }
    for (let d = 0; d < lim && cur.length; d++) {
      nxt = [];
      for (const i of cur) { const x = i % w, y = (i - x) / w;
        for (const q of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (q >= 0 && cand[q] && !keep[q]) { keep[q] = 1; nxt.push(q); } }
      cur = nxt;
    }
    const raw = new Float32Array(N); for (let i = 0; i < N; i++) raw[i] = keep[i] ? 1 : 0;
    const soft = gauss(raw, w, h, Math.max(1, WR.shineGrowMm * WR.workPxMm));
    let n = 0;
    for (let i = 0; i < N; i++) if (roi[i] && (keep[i] || soft[i] > .3)) { roi[i] = 0; roiN--; n++; }
    if (roiN < 64) return null;
  }
  // hair: dark AND rough at strand scale, judged over 2.5 mm so a wrinkle's own shadow doesn't qualify
  {
    const smooth = gauss(gray, w, h, Math.max(1, WR.hairTexMm * WR.workPxMm));
    const dev = new Float32Array(N); for (let i = 0; i < N; i++) dev[i] = Math.abs(gray[i] - smooth[i]);
    const spread = gauss(dev, w, h, Math.max(1, WR.hairSpreadMm * WR.workPxMm)), bgH = gauss(gray, w, h, Math.max(1, WR.hairDarkMm * WR.workPxMm));
    const tex = new Float32Array(N); for (let i = 0; i < N; i++) tex[i] = 100 * spread[i] / Math.max(12, bgH[i]);
    const gv = [], tv = []; for (let i = 0; i < N; i++) if (roi0[i]) { gv.push(bgH[i]); tv.push(tex[i]); }
    gv.sort((a, b) => a - b); tv.sort((a, b) => a - b);
    const at = (a, q) => a[Math.min(a.length - 1, Math.max(0, Math.round(q * (a.length - 1))))];
    const gMed = at(gv, WR.hairLumRefQ), tMed = Math.max(1e-3, at(tv, WR.hairTexRefQ));
    const core = new Uint8Array(N), cand = new Uint8Array(N);
    for (let i = 0; i < N; i++) { if (!roi[i]) continue; if (bgH[i] < gMed * WR.hairLum && tex[i] > tMed * WR.hairTex) { core[i] = 1; cand[i] = 1; } else if (bgH[i] < gMed * WR.hairLumLo && tex[i] > tMed * WR.hairTexLo) cand[i] = 1; }
    const keep = new Uint8Array(N), stack = [];
    for (let i = 0; i < N; i++) if (core[i]) { keep[i] = 1; stack.push(i); }
    while (stack.length) { const i = stack.pop(), x = i % w, y = (i - x) / w;
      for (const q of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) if (q >= 0 && cand[q] && !keep[q]) { keep[q] = 1; stack.push(q); } }
    const raw = new Float32Array(N); for (let i = 0; i < N; i++) raw[i] = keep[i] ? 1 : 0;
    const soft = gauss(raw, w, h, Math.max(1, WR.hairGrow * WR.workPxMm));
    for (let i = 0; i < N; i++) if (roi[i] && (keep[i] || soft[i] > .3)) { roi[i] = 0; roiN--; }
    if (roiN < 64) return null;
  }
  // eye sockets out of the glabella box
  if (r.orbits) {
    const ocv = document.createElement('canvas'); ocv.width = w; ocv.height = h;
    const og = ocv.getContext('2d', {willReadFrequently: true});
    og.fillStyle = '#000'; og.fillRect(0, 0, w, h); og.fillStyle = '#fff'; og.strokeStyle = '#fff'; og.lineJoin = 'round';
    og.lineWidth = Math.max(1, 2 * WR.orbitGrowMm * WR.workPxMm);
    for (const ring of ORBIT_RINGS) { og.beginPath(); ring.forEach((idx, i) => { const q = lm[idx], px = (q.x * canvas.width - x0) * k, py = (q.y * canvas.height - y0) * k; i ? og.lineTo(px, py) : og.moveTo(px, py); }); og.closePath(); og.fill(); og.stroke(); }
    const od = og.getImageData(0, 0, w, h).data;
    for (let i = 0, j = 0; i < N; i++, j += 4) if (roi[i] && od[j] > 127) { roi[i] = 0; roiN--; }
    if (roiN < 64) return null;
  }

  // darkness relative to the skin around it, then the dark-ridge response over four line widths
  const bg = gauss(gray, w, h, WR.bgMm * WR.workPxMm);
  const rel = new Float32Array(N); for (let i = 0; i < N; i++) { const b = Math.max(12, bg[i]); rel[i] = 100 * (b - gray[i]) / b; }
  const resp = new Float32Array(N);
  for (const sMm of WR.sigmasMm) {
    const s = Math.max(1, sMm * WR.workPxMm), f = gauss(rel, w, h, s), s2 = s * s;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x, c = f[i];
      const Ixx = f[i + 1] - 2 * c + f[i - 1], Iyy = f[i + w] - 2 * c + f[i - w], Ixy = (f[i + w + 1] - f[i + w - 1] - f[i - w + 1] + f[i - w - 1]) / 4;
      const tr = Ixx + Iyy, d = Math.sqrt(Math.max(0, ((Ixx - Iyy) / 2) ** 2 + Ixy * Ixy)), l1 = tr / 2 + d, l2 = tr / 2 - d;
      const big = Math.abs(l1) >= Math.abs(l2) ? l1 : l2, small = Math.abs(l1) >= Math.abs(l2) ? l2 : l1;
      if (big >= 0) continue;
      const v = s2 * (-big) * (1 - Math.min(1, Math.abs(small) / Math.abs(big)));
      if (v > resp[i]) resp[i] = v;
    }
  }
  const vals = []; for (let i = 0; i < N; i++) if (roi0[i] && resp[i] > 0) vals.push(resp[i]);
  vals.sort((a, b) => a - b);
  const vThr = Math.max(1e-4, (vals.length ? vals[vals.length >> 1] : 0) * 1.6);
  const minLenPx = WR.minLenMm * WR.workPxMm, minSpanPx = r.span * WR.workPxMm, mm2 = 1 / (WR.workPxMm * WR.workPxMm);

  const out = {};
  for (const cThr of sens) {
    const mask = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (roi[i] && resp[i] > vThr && rel[i] >= cThr) mask[i] = 1;
    const skel = thin(mask, w, h), lab = new Int32Array(N).fill(-1), comps = [], stack = [];
    for (let i = 0; i < N; i++) {
      if (!skel[i] || lab[i] >= 0) continue;
      const id = comps.length, px = []; lab[i] = id; stack.length = 0; stack.push(i);
      while (stack.length) { const q = stack.pop(); px.push(q); const qx = q % w, qy = (q - qx) / w;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const nx = qx + dx, ny = qy + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const n = ny * w + nx; if (skel[n] && lab[n] < 0) { lab[n] = id; stack.push(n); } } }
      comps.push(px);
    }
    let lenPx = 0, nLines = 0;
    const keep = new Uint8Array(comps.length);
    comps.forEach((P, c) => {
      const set = new Set(P); let L = 0;
      for (const q of P) { const qx = q % w, qy = (q - qx) / w;
        for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) { const nx = qx + dx, ny = qy + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && set.has(ny * w + nx)) L += dx && dy ? Math.SQRT2 : 1; } }
      // reach: the spread along the line's own main direction
      let sx = 0, sy = 0; for (const q of P) { sx += q % w; sy += (q - q % w) / w; }
      const mx = sx / P.length, my = sy / P.length;
      let sxx = 0, sxy = 0, syy = 0;
      for (const q of P) { const dx = q % w - mx, dy = (q - q % w) / w - my; sxx += dx * dx; sxy += dx * dy; syy += dy * dy; }
      const tr = sxx + syy, det = sxx * syy - sxy * sxy, l1 = tr / 2 + Math.sqrt(Math.max(0, tr * tr / 4 - det));
      let ux = 1, uy = 0; if (Math.abs(sxy) > 1e-9) { ux = l1 - syy; uy = sxy; } else if (syy > sxx) { ux = 0; uy = 1; }
      const un = Math.hypot(ux, uy) || 1; ux /= un; uy /= un;
      let pmin = Infinity, pmax = -Infinity;
      for (const q of P) { const t = (q % w - mx) * ux + ((q - q % w) / w - my) * uy; if (t < pmin) pmin = t; if (t > pmax) pmax = t; }
      if ((L || 1) >= minLenPx && pmax - pmin >= minSpanPx) { keep[c] = 1; lenPx += L || 1; nLines++; }
    });
    // the line pixels drawn back in source pixels, for the overlay
    const pts = [];
    for (let i = 0; i < N; i++) if (skel[i] && lab[i] >= 0 && keep[lab[i]]) { const x = i % w, y = (i - x) / w; pts.push(x0 + x / k, y0 + y / k); }
    const lenMm = lenPx / WR.workPxMm, roiMm2 = roiN * mm2;
    out[cThr] = {lenMm, count: nLines, density: roiMm2 > 0 ? lenMm / (roiMm2 / 100) : 0, pts};
  }
  return {id: r.id, poly, boxMm2: roiN0 * mm2, skinMm2: roiN * mm2, at: out};
}

/* All four regions on one photograph. canvas: the photo; lm: 478 points as 0..1 of it; pxmm: pixels
   per millimetre (from the iris). Returns null when the photo is too coarse to see lines. */
export function readWrinkles(canvas, lm, pxmm, sens = [4]){
  // the tool refuses under 4.5 px/mm; here it still reads down to 3 and says the photo is small, since a
  // phone selfie often lands in between and a rough answer with a warning beats none
  if (!pxmm || pxmm < 3) return {lowRes: true, none: true, pxmm, regions: {}};
  const regions = {};
  for (const r of REGIONS) { const v = region(canvas, lm, pxmm, r, sens); if (v) regions[r.id] = v; }
  return {lowRes: pxmm < WR.minPhotoPxMm, none: !Object.keys(regions).length, pxmm, regions};
}
