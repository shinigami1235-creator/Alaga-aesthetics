/* Skin check page: start, live camera guide, scanning, results and suggestions.
   The readings come from assets/scan (the Apex face analysis on the newer face model). */
import {analyse, analyseFrames, guessAge, skinAge, paint} from '../assets/scan/engine.js';
import {track, edges, loadImage, toCanvas, ready} from '../assets/scan/face.js';

const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const ORDER = ['lines', 'wrinkles', 'texture', 'spots', 'redness', 'under', 'sag', 'shine'];
const FACE = ['lid', 'balance'];
const LEVELS = ['Minimal', 'Mild', 'Moderate', 'Marked'];
const LV = ['#3F7A5C', '#9A7414', '#B4561E', '#883451'];
const NAME = {lines: 'Fine lines', wrinkles: 'Wrinkles', texture: 'Texture and pores', spots: 'Spots and evenness', redness: 'Redness', under: 'Under the eyes',
  sag: 'Sagging and folds', shine: 'Shine', lid: 'Upper lids', balance: 'Balance'};
const SHORT = {lines: 'Fine lines', wrinkles: 'Wrinkles', texture: 'Texture', spots: 'Spots', redness: 'Redness', under: 'Under eyes', sag: 'Sagging', shine: 'Shine', lid: 'Lids', balance: 'Balance'};
const DESC = {lines: 'Faint lines on the forehead, between the brows, at the corners of the eyes and under them. Hard to see in a photo, so only clear ones count.',
  wrinkles: 'Creases on the forehead, between the brows and at the corners of the eyes. Fine crinkles mostly drop out; deeper lines show.', texture: 'Fine grain and pores on the cheeks, nose and forehead.',
  spots: 'Dark spots and how evenly colour spreads.', redness: 'Red patches on the cheeks and nose.', under: 'Darkness and hollows under the eyes against the cheek.',
  sag: 'The folds beside the nose, the lines below the mouth corners, the mouth corners and brow height.', shine: 'Highlights on the forehead, nose and chin.',
  lid: 'Whether a fold shows on the upper lid.', balance: 'How closely the left and right sides match.'};
const AREA = {forehead: 'the forehead', glabella: 'between the brows', crows: 'the corners of the eyes', under: 'under the eyes', cheeks: 'the cheeks',
  tzone: 'the forehead, nose and chin', folds: 'the folds beside the nose', mouth: 'the mouth corners', brows: 'the brows', jaw: 'the jawline'};
const LID = {clear: 'Fold shows clearly', faint: 'Fold is faint', none: 'No fold seen'};
const WARN = {small: 'The face is small in this photo. A closer photo reads skin better.', smooth: 'This photo looks smoothed. Turn off beauty mode for a truer reading.',
  soft: 'This photo is soft or blurred. A sharper photo reads skin better.', dark: 'The light is dim. Face a window for a truer reading.',
  uneven: 'One side of the face is in shadow. Face the light for a truer reading.', turn: 'Your head is turned. Face the camera for a truer reading.',
  tilt: 'Your head is tilted. Keep it level for a truer reading.',
  wrSmall: 'The photo is a little small for wrinkles, so that reading is rough. A closer photo or the camera reads them better.',
  wrNone: 'The photo is too small to read wrinkles. Take it closer or use the camera.',
  smile: 'You\'re smiling, which folds the skin into extra lines. Take it again with a relaxed face for a truer wrinkle reading.'};
const ERR = {noFace: 'No face found in this photo. Try a closer photo taken from the front.', front: 'This looks like a side photo. Use a photo taken from the front.',
  camera: 'The camera could not be opened. Upload a photo instead.', read: 'The photo could not be read. Try another one.', model: 'The face model could not be loaded. Check your connection and try again.'};

/* What could help, per finding. Skincare links go to the store; treatments a doctor gives go to Ask Dr. Sarah. */
const HELP = {
  lines: {store: ['pep-conc', 'pdrn-serum'], text: 'Signal peptides and PDRN support the skin while lines are still fine.'},
  wrinkles: {store: ['pep-conc'], ask: 'Treating deeper wrinkles', text: 'Deeper lines respond best to treatment in a clinic: muscle relaxers for forehead lines, frown lines and crow\'s feet. A peptide concentrate supports the skin in between.'},
  texture: {store: ['exo-amp', 'pdrn-serum'], text: 'A one-week exosome course and a PDRN serum help skin look smoother. Microneedling in a clinic works deeper.'},
  spots: {store: ['spf', 'exo-amp'], text: 'Daily mineral SPF stops spots getting darker. Niacinamide in the ampoules helps the tone even out.'},
  redness: {store: ['pdrn-serum', 'pn-cream'], text: 'PDRN calms redness and PN with ceramides strengthens the barrier. Redness that stays should be seen by a doctor.'},
  under: {store: ['pn-cream'], ask: 'Under-eye hollows and darkness', text: 'Polynucleotide injections around the eyes are done in a clinic. The PN cream helps the skin itself.'},
  sag: {store: ['pep-conc'], ask: 'Biostimulators for sagging', text: 'Folds and sagging respond to biostimulators such as PLLA or CaHA, given by a doctor. A peptide concentrate supports the skin in between.'},
  shine: {store: ['spf', 'exo-amp'], text: 'A light routine works best: watery ampoules and a mineral SPF instead of rich creams in the morning.'},
};
const PRODUCTS = {'pdrn-serum': ['PDRN Recovery Serum', 64], 'pn-cream': ['PN Barrier Cream', 58], 'exo-amp': ['Plant Exosome Ampoules', 89], 'pep-conc': ['Peptide Firming Concentrate', 54], spf: ['Mineral SPF 50', 38]};

/* ---------- state ---------- */
const view = $('[data-view]'), file = $('[data-file]');
let stream = null, camLoop = 0, result = null, sel = null, isSample = false, age = null;

function show(name){
  $$('[data-state]').forEach(el => (el.hidden = el.dataset.state !== name));
  view.dataset.on = name;
}
function fail(code){
  stopCam();
  $('[data-err]').textContent = ERR[code] || ERR.read;
  show('error');
}

/* ---------- start ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const a = b.dataset.act;
  if (a === 'camera') startCam();
  if (a === 'upload') file.click();
  if (a === 'sample') useSample();
  if (a === 'cancel') { stopCam(); show('start'); }
  if (a === 'shutter') burst();
  if (a === 'again') { $('[data-results]').hidden = true; $('[data-scanner]').hidden = false; show('start'); $('[data-scanner]').scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'}); }
});
file.addEventListener('change', async () => {
  const f = file.files[0]; file.value = '';
  if (!f) return;
  const url = URL.createObjectURL(f);
  try { const im = await loadImage(url); isSample = false; runPhoto(toCanvas(im, 1600)); }
  catch (e) { fail('read'); }
  finally { setTimeout(() => URL.revokeObjectURL(url), 4000); }
});
async function useSample(){
  try { const im = await loadImage('https://images.unsplash.com/photo-1790574318874-8837efcfc519?ixlib=rb-4.1.0&q=85&fm=jpg&crop=entropy&cs=srgb&w=1400'); isSample = true; runPhoto(toCanvas(im, 1600)); }
  catch (e) { fail('read'); }
}
// Load the face model in the background so the first scan starts sooner.
setTimeout(() => ready().catch(() => {}), 600);

/* ---------- live camera with the guide ---------- */
const video = $('video'), live = $('[data-live]'), say = $('[data-say]'), ring = $('[data-ring]');
const tiny = document.createElement('canvas'); tiny.width = 64; tiny.height = 48;
const tctx = tiny.getContext('2d', {willReadFrequently: true});
let okSince = 0, lastNose = [], busy = false;

async function startCam(){
  try {
    // the camera's full resolution, as the collage maker asks for, since fine lines need every pixel
    stream = await navigator.mediaDevices.getUserMedia({video: {facingMode: 'user', width: {ideal: 4000}, height: {ideal: 3000}}, audio: false});
  } catch (e) { fail('camera'); return; }
  video.srcObject = stream;
  show('camera');
  await video.play().catch(() => {});
  setupZoom(stream.getVideoTracks()[0]);
  okSince = 0; lastNose = [];
  const loop = async t => {
    if (!stream) return;
    camLoop = requestAnimationFrame(loop);
    if (busy || video.readyState < 2) return;
    busy = true;
    try { guide(await track(video, t)); } catch (e) {}
    busy = false;
  };
  camLoop = requestAnimationFrame(loop);
}
/* zoom, when the camera offers it, as in the collage maker */
function setupZoom(track){
  const wrap = $('[data-zoom-wrap]'), z = $('[data-zoom-in]');
  const can = (track && track.getCapabilities && track.getCapabilities()) || {}, got = (track && track.getSettings && track.getSettings()) || {};
  const res = $('[data-res]');
  if (res) res.textContent = got.width ? `${got.width} × ${got.height}` : '';
  if (!can.zoom || !(can.zoom.max > can.zoom.min)) { wrap.hidden = true; return; }
  wrap.hidden = false;
  z.min = can.zoom.min; z.max = can.zoom.max; z.step = can.zoom.step || .1; z.value = got.zoom || can.zoom.min;
  z.oninput = () => track.applyConstraints({advanced: [{zoom: Number(z.value)}]}).catch(() => {});
}
function stopCam(){
  cancelAnimationFrame(camLoop);
  if (stream) stream.getTracks().forEach(t => t.stop());
  stream = null; okSince = 0;
}

function guide(hit){
  const W = video.videoWidth, H = video.videoHeight;
  live.width = live.clientWidth * (devicePixelRatio || 1); live.height = live.clientHeight * (devicePixelRatio || 1);
  const g = live.getContext('2d'); g.clearRect(0, 0, live.width, live.height);
  const checks = {frame: false, light: false, straight: false, still: false};
  let tip = 'Line your face up with the oval';
  if (hit) {
    // video is shown mirrored and cropped to cover the box, so map points the same way
    const s = Math.max(live.width / W, live.height / H), ox = (live.width - W * s) / 2, oy = (live.height - H * s) / 2;
    const P = p => ({x: live.width - (ox + p.x * W * s), y: oy + p.y * H * s});
    g.fillStyle = 'rgba(255,255,255,.75)';
    for (let i = 0; i < 468; i += 2) { const p = P(hit.lm[i]); g.fillRect(p.x - 1.2, p.y - 1.2, 2.4, 2.4); }
    g.fillStyle = '#E9C77C';
    for (const i of [468, 473]) { const p = P(hit.lm[i]); g.beginPath(); g.arc(p.x, p.y, 3, 0, Math.PI * 2); g.fill(); }

    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const p of hit.lm) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
    const fh = (y1 - y0) * H * s / live.height, cx = ((x0 + x1) / 2 * W * s + ox) / live.width, cy = ((y0 + y1) / 2 * H * s + oy) / live.height;
    // the oval is 58% of the frame's height, centred a little above the middle
    const centred = Math.abs(cx - .5) < .09 && Math.abs(cy - .48) < .1;
    checks.frame = centred && fh > .4 && fh < .66;
    if (!centred) tip = 'Move your face into the oval';
    else if (fh <= .4) tip = 'Come a little closer';
    else if (fh >= .66) tip = 'Move back a little';

    // light: the face area of a tiny copy of the frame, left half against right half
    tctx.drawImage(video, 0, 0, 64, 48);
    const d = tctx.getImageData(0, 0, 64, 48).data;
    let l = 0, r = 0, nl = 0, nr = 0;
    const X0 = Math.floor(x0 * 64), X1 = Math.ceil(x1 * 64), Y0 = Math.floor(y0 * 48), Y1 = Math.ceil(y1 * 48), mx = (X0 + X1) / 2;
    for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
      if (x < 0 || y < 0 || x >= 64 || y >= 48) continue;
      const o = (y * 64 + x) * 4, v = .2126 * d[o] + .7152 * d[o + 1] + .0722 * d[o + 2];
      if (x < mx) { l += v; nl++; } else { r += v; nr++; }
    }
    l /= nl || 1; r /= nr || 1;
    const mean = (l + r) / 2, side = Math.abs(l - r) / Math.max(1, mean);
    checks.light = mean > 70 && mean < 225 && side < .28;
    if (checks.frame && !checks.light) tip = mean <= 70 ? 'Find more light, facing a window' : mean >= 225 ? 'Too bright. Step out of direct light' : 'One side is in shadow. Turn toward the light';

    const p = hit.pose || {yaw: 0, pitch: 0, roll: 0};
    // the model reads a level head at a few degrees of pitch, so pitch gets more room than turn and tilt
    checks.straight = Math.abs(p.yaw) < 8 && Math.abs(p.pitch + 5) < 18 && Math.abs(p.roll) < 6;
    if (checks.frame && checks.light && !checks.straight) tip = Math.abs(p.roll) >= 6 ? 'Keep your head level' : Math.abs(p.yaw) >= 8 ? 'Look straight at the camera' : 'Lift or lower your chin a little';

    const n = hit.lm[1];
    lastNose.push({x: n.x, y: n.y}); if (lastNose.length > 8) lastNose.shift();
    const move = lastNose.length > 4 ? Math.max(...lastNose.map(q => Math.hypot(q.x - n.x, q.y - n.y))) : 1;
    checks.still = move < .006;
    if (checks.frame && checks.light && checks.straight && !checks.still) tip = 'Hold still';
  } else lastNose = [];

  $$('[data-check]').forEach(li => li.classList.toggle('is-ok', checks[li.dataset.check]));
  const all = Object.values(checks).every(Boolean);
  if (all) {
    if (!okSince) okSince = performance.now();
    const k = Math.min(1, (performance.now() - okSince) / 900);
    ring.style.setProperty('--k', k);
    say.textContent = 'Perfect. Hold still';
    if (k >= 1) burst();
  } else { okSince = 0; ring.style.setProperty('--k', 0); say.textContent = tip; }
}

/* five frames over about a second, then read them together */
async function burst(){
  if (!stream) return;
  const frames = [];
  for (let i = 0; i < 5; i++) {
    // frames are kept up to 2400 px on the long side: enough for the skin, light enough for five at once
    const k = Math.min(1, 2400 / Math.max(video.videoWidth, video.videoHeight));
    const c = document.createElement('canvas'), W = Math.round(video.videoWidth * k), H = Math.round(video.videoHeight * k);
    c.width = W; c.height = H;
    c.getContext('2d').drawImage(video, 0, 0, W, H);
    frames.push(c);
    if (i < 4) await sleep(180);
  }
  stopCam();
  isSample = false;
  run(frames[0], o => analyseFrames(frames, o));
}

/* ---------- scanning ---------- */
const photoC = $('[data-scan-photo]'), ovC = $('[data-scan-ov]');
let tess = null;
edges().then(e => (tess = e)).catch(() => {});

function runPhoto(canvas){ run(canvas, o => analyse(canvas, {passes: 4, ...o})); }

async function run(canvas, work){
  $('[data-results]').hidden = true;
  show('scan');
  photoC.width = ovC.width = canvas.width; photoC.height = ovC.height = canvas.height;
  photoC.getContext('2d').drawImage(canvas, 0, 0);
  $('[data-frame]').style.setProperty('--ar', (canvas.width / canvas.height).toFixed(4));
  $('[data-zoom]').style.transform = 'none';
  $$('[data-step]').forEach(li => li.className = '');
  $('[data-pass]').textContent = '';
  $('[data-meter]').style.width = '0%';
  $$('[data-ro]').forEach(d => (d.textContent = '–'));

  let mesh = null, meshAt = 0, raf = 0, stepName = 'find', frac = 0;
  const anim = t => {
    raf = requestAnimationFrame(anim);
    const g = ovC.getContext('2d'); g.clearRect(0, 0, ovC.width, ovC.height);
    if (!mesh) return;
    // the mesh draws in from the forehead down, then the edges, then the iris rings
    const k = Math.min(1, (t - meshAt) / 1400), W = mesh.canvas.width, H = mesh.canvas.height;
    const sx = ovC.width / W, sy = ovC.height / H, P = p => ({x: p.x * W * sx, y: p.y * H * sy});
    const r = Math.max(1.2, ovC.width / 520);
    let ymin = 1, ymax = 0; for (const p of mesh.lm) { ymin = Math.min(ymin, p.y); ymax = Math.max(ymax, p.y); }
    const cut = ymin + (ymax - ymin) * k * 1.05;
    if (tess && k > .3) {
      g.strokeStyle = `rgba(200,212,240,${.28 * Math.min(1, (k - .3) / .4)})`; g.lineWidth = r * .5;
      g.beginPath();
      for (const e of tess) { const a = mesh.lm[e.start], b = mesh.lm[e.end]; if (!a || !b || a.y > cut) continue; const A = P(a), B = P(b); g.moveTo(A.x, A.y); g.lineTo(B.x, B.y); }
      g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 468; i++) { const p = mesh.lm[i]; if (p.y > cut) continue; const q = P(p); g.fillRect(q.x - r / 2, q.y - r / 2, r, r); }
    if (k >= 1) {
      g.strokeStyle = '#E9C77C'; g.lineWidth = r;
      for (const [c, a] of [[468, 469], [473, 474]]) { const C = P(mesh.lm[c]), A = P(mesh.lm[a]); g.beginPath(); g.arc(C.x, C.y, Math.hypot(A.x - C.x, A.y - C.y) * (1 + .15 * Math.sin(t / 200)), 0, Math.PI * 2); g.stroke(); }
      // areas being read light up in turn
      if (stepName === 'read') {
        const zones = [[10, 151, 9], [117, 50, 205], [346, 280, 425], [145, 230], [374, 450], [1, 2, 98, 327]];
        const z = zones[Math.floor(t / 420) % zones.length];
        g.fillStyle = 'rgba(233,199,124,.22)';
        const pts = z.map(i => P(mesh.lm[i])), cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
        g.beginPath(); g.arc(cx, cy, ovC.width * .07, 0, Math.PI * 2); g.fill();
      }
    }
  };
  raf = requestAnimationFrame(anim);

  const mark = (name, f) => {
    const order = ['find', 'mesh', 'read', 'score'], at = order.indexOf(name);
    $$('[data-step]').forEach(li => { const i = order.indexOf(li.dataset.step); li.className = i < at ? 'is-done' : i === at ? 'is-on' : ''; });
    stepName = name; frac = f;
    $('[data-meter]').style.width = Math.round((at + (name === 'read' ? f : 0)) / 4 * 100 + 6) + '%';
  };
  const onStep = (name, f, hit) => {
    mark(name, f);
    if (hit && !mesh) {
      mesh = {lm: hit.lm, canvas: hit.canvas || canvas}; meshAt = performance.now();
      if (mesh.canvas !== canvas) { photoC.width = ovC.width = mesh.canvas.width; photoC.height = ovC.height = mesh.canvas.height; photoC.getContext('2d').drawImage(mesh.canvas, 0, 0); $('[data-frame]').style.setProperty('--ar', (mesh.canvas.width / mesh.canvas.height).toFixed(4)); }
      $('[data-ro="pts"]').textContent = hit.lm.length;
      // close in on the face so the mesh fills the frame
      let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
      for (const p of hit.lm) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
      const z = Math.max(1, Math.min(3, 1 / ((x1 - x0) * 1.5), 1 / ((y1 - y0) * 1.35)));
      const tx = Math.min(0, Math.max(1 - z, .5 - (x0 + x1) / 2 * z)), ty = Math.min(0, Math.max(1 - z, .5 - (y0 + y1) / 2 * z));
      if (!reduce) $('[data-zoom]').style.transform = `translate(${(tx * 100).toFixed(2)}%, ${(ty * 100).toFixed(2)}%) scale(${z.toFixed(3)})`;
      if (hit.pose) { $('[data-ro="yaw"]').textContent = Math.round(Math.abs(hit.pose.yaw)) + '°'; $('[data-ro="roll"]').textContent = Math.round(Math.abs(hit.pose.roll)) + '°'; }
    }
    if (name === 'read') { $('[data-ro="reads"]').textContent = Math.round(f * 4) + ' of 4'; $('[data-pass]').textContent = `· pass ${Math.max(1, Math.round(f * 4))}`; }
  };

  let out = null, error = null;
  // the scan runs for at least a few seconds so the steps can be followed
  await Promise.all([work({onStep}).then(r => (out = r), e => (error = e)), sleep(reduce ? 400 : 3400)]);
  mark('score', 1); $('[data-meter]').style.width = '100%';
  await sleep(reduce ? 0 : 450);
  cancelAnimationFrame(raf);
  if (error || !out) { const m = error && error.message; fail(ERR[m] ? m : /model|fetch|wasm/i.test(m || '') ? 'model' : 'read'); return; }
  result = out; sel = null; age = null;
  results();
  show('start');
  $('[data-scanner]').hidden = true;
  $('[data-results]').hidden = false;
  $('[data-results]').scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block: 'start'});
  const mine = result;
  guessAge(result.work).then(a => { if (result === mine) { age = a; showAge(); } }).catch(() => { if (result === mine) { age = undefined; showAge(); } });
}

/* ---------- results ---------- */
const resPhoto = $('[data-res-photo]'), resOv = $('[data-res-ov]');
function level(F, k){ return k === 'lid' ? (F.state === 'clear' ? 0 : F.state === 'faint' ? 1 : 2) : F.level; }
function row(k){
  const F = result.res.F[k], l = level(F, k);
  let lv = k === 'lid' ? LID[F.state] : LEVELS[F.level], w = Math.round(F.v * 100), at = '';
  if (k === 'balance' && result.raw.turn > .12) { lv = '–'; w = 0; at = '<span class="at">Face the camera to read this.</span>'; }
  if (F.unread) { lv = '–'; w = 0; at = '<span class="at">Photo too small to read this.</span>'; }
  if (F.area && F.level >= 1 && AREA[F.area]) at += `<span class="at">Most at <b>${esc(AREA[F.area])}</b></span>`;
  return `<li><button type="button" class="fac" data-f="${k}" aria-pressed="${sel === k}" style="--c:${LV[l]}">
    <span class="fac-h"><b>${esc(NAME[k])}</b><span class="fac-lv">${esc(lv)}</span></span>
    <span class="fac-bar"><span style="--w:${w}%"></span></span>
    <span class="fac-d">${esc(DESC[k])}</span>${at}</button></li>`;
}
function results(){
  const r = result, W = r.raw.W, H = r.raw.H;
  resPhoto.width = W; resPhoto.height = H; resPhoto.getContext('2d').drawImage(r.work.canvas, 0, 0);
  $('.res-pic').style.setProperty('--ar', (W / H).toFixed(4));
  $('[data-credit]').hidden = !isSample;
  $('[data-skin]').innerHTML = ORDER.map(row).join('');
  $('[data-face]').innerHTML = FACE.map(row).join('');
  $('[data-chips]').innerHTML = [...ORDER, ...FACE].map(k => `<button type="button" class="chip" data-f="${k}" aria-pressed="false" style="--c:${LV[level(r.res.F[k], k)]}"><i></i>${esc(SHORT[k])}</button>`).join('');
  $('[data-score]').innerHTML = `${r.res.score}`;
  $('[data-dial]').style.setProperty('--v', r.res.score);
  const steady = r.spread < .05 ? 'Steady' : r.spread < .09 ? 'Fairly steady' : 'Unsteady, take another photo';
  $('[data-steady]').innerHTML = `${esc(steady)} <small>${r.reads} reads</small>`;
  $('[data-warns]').innerHTML = r.issues.map(k => `<span>${esc(WARN[k] || '')}</span>`).join('');
  showAge();
  // face measure
  const m = r.mm, mm = $('[data-mm]');
  $('[data-measure]').hidden = !m;
  if (m) {
    r.raw.__mm = m;
    const thirds = m.thirds, fifths = m.fifths;
    mm.innerHTML = [
      ['Between the pupils', m.pupils + ' mm'], ['Face width', m.faceWidth + ' mm'], ['Face length', m.faceLength + ' mm'],
      ['Nose width', m.noseWidth + ' mm'], ['Mouth width', m.mouthWidth + ' mm'], ['Jaw width', m.jawWidth + ' mm'],
      ['Lower third to middle third', thirds.toFixed(2) + ` <small>${thirds > 1.12 ? 'lower is longer' : thirds < .9 ? 'lower is shorter' : 'balanced'}</small>`],
      ['Gap between the eyes to one eye', fifths.toFixed(2) + ` <small>${fifths > 1.12 ? 'wide set' : fifths < .88 ? 'close set' : 'balanced'}</small>`],
      ['Golden match', r.gold.women + '% <small>women</small> · ' + r.gold.men + '% <small>men</small>'],
    ].map(([a, b]) => `<div><dt>${esc(a)}</dt><dd>${b}</dd></div>`).join('');
  }
  nextSteps();
  select(worst());
}
function showAge(){
  const el = $('[data-age]');
  el.innerHTML = age === null ? '<small>reading…</small>' : `<small>about</small> ${skinAge(age === undefined ? null : age, result.res.concern)}`;
}
const worst = () => result.res.F.wrinkles.level >= 1 && !result.res.F.wrinkles.unread ? 'wrinkles' : ORDER.reduce((a, k) => (result.res.F[k].v > result.res.F[a].v ? k : a), ORDER[0]);
function select(k){
  sel = k;
  $$('[data-f]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === k)));
  paint(resOv, result.work, result.raw, k);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-f]');
  if (b && result) select(b.dataset.f);
});

function nextSteps(){
  const F = result.res.F;
  const top = ORDER.filter(k => F[k].level >= 1).sort((a, b) => F[b].v - F[a].v).slice(0, 3);
  const list = top.length ? top : ['spots'];
  $('[data-next]').innerHTML = list.map(k => {
    const h = HELP[k];
    const prods = h.store.map(id => `<a class="next-prod" href="../store/?p=${id}"><b>${esc(PRODUCTS[id][0])}</b><span>€${PRODUCTS[id][1]}</span></a>`).join('');
    const ask = h.ask ? `<a class="next-ask" href="../ask/?q=${encodeURIComponent(h.ask)}">Ask Dr. Sarah about ${esc(h.ask.toLowerCase())}</a>` : '';
    return `<li style="--c:${LV[F[k].level]}"><div class="next-h"><b>${esc(NAME[k])}</b><span>${esc(LEVELS[F[k].level])}</span></div><p>${esc(h.text)}</p><div class="next-prods">${prods}</div>${ask}</li>`;
  }).join('');
  if (!top.length) $('[data-next]').insertAdjacentHTML('afterbegin', '<li class="next-clear"><p>Nothing stands out in this photo. A daily mineral SPF keeps it that way.</p></li>');
}
