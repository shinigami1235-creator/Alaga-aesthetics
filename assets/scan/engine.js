/* Skin check engine: from a photo or a burst of camera frames to the readings shown on the page.
   The readings (skin.js), the levels (factors.js) and the proportions (geometry.js) come from the Apex
   face analysis. What is new here:
   - the newer Face Landmarker model and its head-turn matrix (face.js)
   - every photo is read several times on slightly different crops, and every camera scan on several frames,
     and each reading is the median of those, so one unlucky landmark fit no longer moves the result
   - millimetre measures from the iris (face.js) */
import {find, detect, frameFace, cut, measures} from './face.js';
import {workImage, read, quality, LINES_AT} from './skin.js';
import {factors, skinAge} from './factors.js';
import {measure, overall} from './geometry.js';

export {factors, skinAge};

/* ---------- reading off the main thread ---------- */
let worker = null, wid = 0;
const waiting = new Map();
function getWorker(){
  if (worker !== null) return worker;
  try {
    if (typeof OffscreenCanvas === 'undefined') throw new Error('no OffscreenCanvas');
    worker = new Worker(new URL('./worker.js', import.meta.url), {type: 'module'});
    worker.onmessage = e => { const w = waiting.get(e.data.id); if (!w) return; waiting.delete(e.data.id); e.data.error ? w.rej(new Error(e.data.error)) : w.res(e.data.r); };
    worker.onerror = () => { waiting.forEach(w => w.rej(new Error('worker'))); waiting.clear(); worker = false; };
  } catch (e) { worker = false; }
  return worker;
}
async function readWork(work){
  const w = getWorker();
  if (w) {
    try {
      const img = work.canvas.getContext('2d', {willReadFrequently: true}).getImageData(0, 0, work.canvas.width, work.canvas.height);
      return await new Promise((res, rej) => { const id = ++wid; waiting.set(id, {res, rej}); w.postMessage({id, img, L: work.L}, [img.data.buffer]); });
    } catch (e) { worker = false; }
  }
  return read(work);
}

/* ---------- median of several readings ---------- */
const med = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const KEEP = new Set(['masks', 'axis', 'face', 'skin', 'grain', 'redMap', 'shineMap', 'lineStr', 'lineAng', 'spots', 'wrinkleMap', 'W', 'H']);
const plain = v => v && typeof v === 'object' && !ArrayBuffer.isView(v) && !(v instanceof ImageData);
/* Every number in the readings becomes the median across the reads. Typed-array maps and masks stay as
   they were in the first read, since they are only used to draw on that photo. */
export function medianRaw(raws){
  if (raws.length === 1) return raws[0];
  const walk = (base, others) => {
    if (typeof base === 'number') return med([base, ...others.map(o => (typeof o === 'number' ? o : base))]);
    if (Array.isArray(base)) {
      if (!base.every(x => typeof x === 'number' || plain(x))) return base;
      // a list of points (the spots) stays from the first read; lists of numbers per side are merged
      if (base.length && plain(base[0]) && 'x' in base[0]) return base;
      return base.map((x, i) => walk(x, others.map(o => o && o[i])));
    }
    if (plain(base)) {
      const out = {};
      for (const k in base) out[k] = KEEP.has(k) ? base[k] : walk(base[k], others.map(o => o && o[k]));
      return out;
    }
    return base;
  };
  return walk(raws[0], raws.slice(1));
}

/* ---------- one photo ---------- */
/* Crops the reads are repeated on: the photo as found, a little closer, and a little closer again shifted
   up and to each side. The landmark fit moves slightly between them, and so does the reading. */
const CROPS = [[1, 0, 0], [.93, 0, 0], [.9, -.03, -.02], [.9, .03, -.02], [.95, 0, .03]];

async function readOne(canvas, lm){
  const f = frameFace(canvas, lm, 2.1, 900, 2000);
  const work = workImage(f.base, f.L);
  const raw = await readWork(work);
  return {work, raw};
}

/* analyse(canvas, {passes, onStep}) -> result, or throws Error('noFace' | 'front' | 'read') */
export async function analyse(canvas, opts = {}){
  const step = opts.onStep || (() => {});
  const passes = Math.max(1, Math.min(CROPS.length, opts.passes || 4));
  step('find', 0);
  const hit = await find(canvas);
  if (!hit) throw new Error('noFace');
  step('mesh', 0, hit);
  const reads = [];
  const first = await readOne(hit.canvas, hit.lm);
  reads.push(first);
  step('read', 1 / passes, hit);
  const W = hit.canvas.width, H = hit.canvas.height;
  for (let i = 1; i < passes; i++) {
    const [k, dx, dy] = CROPS[i];
    const w = W * k, h = H * k, x = (W - w) / 2 + dx * W, y = (H - h) / 2 + dy * H;
    const c = cut(hit.canvas, Math.max(0, x), Math.max(0, y), w, h, 1600, true);
    const again = await detect(c);
    if (again) reads.push(await readOne(c, again.lm));
    step('read', (i + 1) / passes, hit);
  }
  return finish(reads, hit.pose, step);
}

/* A camera burst: several frames of the same face, read the same way and merged. */
export async function analyseFrames(frames, opts = {}){
  const step = opts.onStep || (() => {});
  step('find', 0);
  const reads = [];
  let pose = null, firstHit = null;
  for (let i = 0; i < frames.length; i++) {
    const hit = await detect(frames[i]);
    if (hit) {
      if (!firstHit) { firstHit = {...hit, canvas: frames[i]}; step('mesh', 0, firstHit); }
      pose = pose || hit.pose;
      reads.push(await readOne(frames[i], hit.lm));
    }
    step('read', (i + 1) / frames.length, firstHit);
  }
  if (!reads.length) throw new Error('noFace');
  return finish(reads, pose, step);
}

function finish(reads, pose, step){
  step('score', 1);
  const work = reads[0].work, raw = medianRaw(reads.map(r => r.raw));
  if (raw.turn > .5 || (pose && Math.abs(pose.yaw) > 28)) throw new Error('front');
  const issues = quality(work, raw).filter(k => k !== 'turn');
  if (pose ? Math.abs(pose.yaw) > 10 || Math.abs(pose.pitch) > 14 : raw.turn > .22) issues.push('turn');
  if (pose && Math.abs(pose.roll) > 8) issues.push('tilt');
  // a smile folds the cheeks and the corners of the eyes into lines that go away when the face relaxes
  const mmNow = measures(work.L);
  if (mmNow && mmNow.mouthWidth / mmNow.faceWidth > .42) issues.push('smile');
  const res = factors(raw, []);
  // how far the separate reads disagree, as a rough confidence: under 0.06 on the 0..1 scale is steady
  let spread = 0;
  if (reads.length > 1) {
    const each = reads.map(r => factors(r.raw, []).F);
    const keys = ['lines', 'wrinkles', 'texture', 'spots', 'redness', 'under', 'sag', 'shine'];
    spread = keys.reduce((a, k) => { const v = each.map(F => F[k].v); return a + (Math.max(...v) - Math.min(...v)); }, 0) / keys.length;
  }
  return {work, raw, res, issues, pose, reads: reads.length, spread,
    mm: measures(work.L), gold: {women: overall(measure(work.L), 'women'), men: overall(measure(work.L), 'men')}};
}

/* ---------- skin age (face-api age model, weighed with the readings in factors.js) ---------- */
const FA = new URL('../vendor/face-api/', import.meta.url).href;
let faP = null;
function loadAge(){
  if (faP) return faP;
  faP = (async () => {
    const fa = await import(FA + 'dist/face-api.esm.js');
    try { await fa.tf.setBackend('webgl'); await fa.tf.ready(); } catch (e) { await fa.tf.setBackend('cpu'); await fa.tf.ready(); }
    await fa.nets.ageGenderNet.loadFromUri(FA + 'model/');
    return fa;
  })();
  faP.catch(() => { faP = null; });
  return faP;
}
const OV = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
export async function guessAge(work){
  const fa = await loadAge(), L = work.L;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const i of OV) { const p = L[i]; x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  const ages = [];
  for (const pad of [1, 1.15]) {
    const s = Math.max(x1 - x0, y1 - y0) * pad, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const c = document.createElement('canvas'); c.width = c.height = 112;
    c.getContext('2d').drawImage(work.canvas, cx - s / 2, cy - s / 2, s, s, 0, 0, 112, 112);
    ages.push((await fa.nets.ageGenderNet.predictAgeAndGender(c)).age);
  }
  return ages.reduce((a, b) => a + b, 0) / ages.length;
}

/* ---------- drawing a reading on the photo, in Alaga's cobalt, blush and ochre ---------- */
const OCHRE = '#E9C77C', PERI = 'rgba(200,212,240,.95)', DARK = 'rgba(11,29,74,.5)';
export function paint(cv, work, raw, key){
  const {W, H} = raw, g = cv.getContext('2d'), L = work.L;
  cv.width = W; cv.height = H; g.clearRect(0, 0, W, H);
  const img = g.createImageData(W, H), d = img.data, M = raw.masks;
  const set = (i, r, gg, b, a) => { const o = i * 4; d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = a; };
  const T = 2.2;
  if (key === 'lines' || key === 'under') {
    const area = key === 'lines' ? (i => M.forehead[i] || M.glabella[i] || M.crows[i] || M.unders[i]) : (i => M.unders[i]);
    for (let i = 0; i < W * H; i++) {
      if (key === 'under' && M.unders[i]) set(i, 95, 127, 208, 70);
      if (key === 'lines' && raw.wrinkleMap && raw.wrinkleMap[i]) continue;
      if (area(i) && raw.lineStr[i] > T * 1.1) set(i, 200, 212, 240, Math.min(220, 80 + (raw.lineStr[i] - T) * 24));
    }
  } else if (key === 'wrinkles') {
    // the deeper lines in solid ochre, with a dark edge so they stand out on any skin
    const wm = raw.wrinkleMap;
    if (wm) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (wm[i]) set(i, 233, 170, 60, 235);
      else if (wm[i - 1] || wm[i + 1] || wm[i - W] || wm[i + W]) set(i, 11, 29, 74, 140);
    }
  } else if (key === 'texture') {
    for (let i = 0; i < W * H; i++) if (raw.grain[i]) set(i, 200, 212, 240, 175);
  } else if (key === 'redness') {
    for (let i = 0; i < W * H; i++) if (raw.redMap[i]) set(i, 214, 70, 120, Math.min(150, 40 + raw.redMap[i]));
  } else if (key === 'shine') {
    for (let i = 0; i < W * H; i++) if (raw.shineMap[i]) set(i, 255, 246, 214, 190);
  }
  g.putImageData(img, 0, 0);
  g.lineCap = g.lineJoin = 'round';
  const line = (pts, w, col) => { if (pts.length < 2) return; g.beginPath(); pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p.x, p.y)); g.lineWidth = w + 3; g.strokeStyle = DARK; g.stroke(); g.lineWidth = w; g.strokeStyle = col; g.stroke(); };
  const P = ix => ix.map(i => L[i]);
  if (key === 'spots') {
    const s = raw.spots.slice().sort((a, b) => b.d - a.d).slice(0, 160);
    for (const p of s) { g.beginPath(); g.arc(p.x, p.y, 5 + Math.min(6, p.d), 0, Math.PI * 2); g.lineWidth = 3.5; g.strokeStyle = DARK; g.stroke(); g.lineWidth = 1.8; g.strokeStyle = OCHRE; g.stroke(); }
  } else if (key === 'sag') {
    const {FOLD, MARIONETTE, BROW_LO} = LINES_AT;
    [0, 1].forEach(s => {
      line(P(FOLD[s]), 2 + raw.sag.folds[s] * 14, OCHRE);
      line(P(MARIONETTE[s]), 2 + raw.sag.marios[s] * 12, OCHRE);
      line(P(BROW_LO[s]), 2, PERI);
    });
    for (const i of [61, 291]) { g.beginPath(); g.arc(L[i].x, L[i].y, 5, 0, Math.PI * 2); g.fillStyle = OCHRE; g.fill(); }
  } else if (key === 'lid') {
    const {LID_UP} = LINES_AT;
    [0, 1].forEach(s => { line(P(LID_UP[s]), 1.6, PERI); line(raw.lid.pts[s], 2.6, OCHRE); });
  } else if (key === 'balance') {
    const {c, d: ax} = raw.axis, k = raw.H;
    line([{x: c.x - ax.x * k, y: c.y - ax.y * k}, {x: c.x + ax.x * k, y: c.y + ax.y * k}], 1.6, PERI);
    const refl = p => { const v = {x: p.x - c.x, y: p.y - c.y}, a = v.x * ax.x + v.y * ax.y; return {x: c.x + 2 * a * ax.x - v.x, y: c.y + 2 * a * ax.y - v.y}; };
    for (const [a, b] of LINES_AT.PAIRS) {
      const q = refl(L[a]), p = L[b];
      line([q, p], 1.4, OCHRE);
      g.beginPath(); g.arc(p.x, p.y, 3.4, 0, Math.PI * 2); g.fillStyle = OCHRE; g.fill();
      g.beginPath(); g.arc(q.x, q.y, 3.4, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill();
    }
  } else if (key === 'measure') {
    const mm = raw.__mm;
    const tick = (a, b, label) => {
      line([L[a], L[b]], 1.6, OCHRE);
      for (const p of [L[a], L[b]]) { g.beginPath(); g.arc(p.x, p.y, 3.2, 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); }
      if (!label) return;
      const m = {x: (L[a].x + L[b].x) / 2, y: (L[a].y + L[b].y) / 2};
      g.font = '700 15px "Nunito Sans", sans-serif'; g.textAlign = 'center';
      const w = g.measureText(label).width + 12;
      g.fillStyle = 'rgba(11,29,74,.75)'; g.beginPath(); g.roundRect(m.x - w / 2, m.y - 12, w, 22, 11); g.fill();
      g.fillStyle = '#fff'; g.fillText(label, m.x, m.y + 4);
    };
    tick(234, 454, mm && mm.faceWidth + ' mm');
    tick(468, 473, mm && mm.pupils + ' mm');
    tick(48, 278, mm && mm.noseWidth + ' mm');
    tick(61, 291, mm && mm.mouthWidth + ' mm');
    tick(10, 152, null);
    for (const i of [9, 2]) { g.beginPath(); g.arc(L[i].x, L[i].y, 4, 0, Math.PI * 2); g.fillStyle = OCHRE; g.fill(); }
  }
}
