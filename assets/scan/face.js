/* Finding the face. MediaPipe Face Landmarker (Tasks Vision, the model the Apex PMS face planner uses) gives
   the same 478 points as the older Face Mesh, plus the head's turn as a matrix, so a turned head is measured
   instead of guessed from the outline. Taken from the Apex face tools and moved to the newer model.

   Everything runs on the visitor's device. No photo leaves it. */

const VENDOR = new URL('../vendor/', import.meta.url).href;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let imageLm = null, videoLm = null, vision = null;
async function fileset(){
  if (!vision) vision = await import(VENDOR + 'tasks-vision/vision_bundle.mjs');
  return {vision, files: await vision.FilesetResolver.forVisionTasks(VENDOR + 'tasks-vision/wasm')};
}
async function make(mode){
  const {vision, files} = await fileset();
  const opts = {
    baseOptions: {modelAssetPath: VENDOR + 'face_landmarker.task', delegate: globalThis.ALAGA_CPU ? 'CPU' : 'GPU'},
    runningMode: mode, numFaces: 1, outputFacialTransformationMatrixes: true,
    minFaceDetectionConfidence: .3, minFacePresenceConfidence: .3, minTrackingConfidence: .4
  };
  try { return await vision.FaceLandmarker.createFromOptions(files, opts); }
  catch (e) { opts.baseOptions.delegate = 'CPU'; return vision.FaceLandmarker.createFromOptions(files, opts); }
}
export async function ready(){ if (!imageLm) imageLm = await make('IMAGE'); return imageLm; }
async function readyVideo(){ if (!videoLm) videoLm = await make('VIDEO'); return videoLm; }

/* head turn in degrees from the face transform: yaw left/right, pitch up/down, roll tilt */
function pose(m){
  if (!m) return null;
  const d = m.data, deg = 180 / Math.PI;
  return {yaw: Math.asin(clamp(-d[8], -1, 1)) * deg, pitch: Math.atan2(d[9], d[10]) * deg, roll: Math.atan2(d[1], d[0]) * deg};
}
function unpack(r){
  const lm = r && r.faceLandmarks && r.faceLandmarks[0];
  if (!lm) return null;
  return {lm, pose: pose(r.facialTransformationMatrixes && r.facialTransformationMatrixes[0])};
}

/* one still image (canvas) -> {lm (0..1), pose} or null */
export async function detect(canvas){
  const lm = await ready();
  return unpack(lm.detect(canvas));
}
/* one video frame, for the live guide */
export async function track(video, t){
  const lm = await readyVideo();
  return unpack(lm.detectForVideo(video, t));
}

export const cut = (c, x, y, w, h, max = 1100, up = false) => {
  const k = up ? max / Math.max(w, h) : Math.min(1, max / Math.max(w, h)), o = document.createElement('canvas');
  o.width = Math.round(w * k); o.height = Math.round(h * k);
  o.getContext('2d').drawImage(c, x, y, w, h, 0, 0, o.width, o.height);
  return o;
};
/* the detector misses faces that fill only a small part of a wide photo, so a miss tries closer crops */
export async function find(canvas){
  let hit = await detect(canvas);
  if (hit) return {canvas, ...hit};
  const W = canvas.width, H = canvas.height, s = Math.min(W, H);
  const tries = [[(W - s) / 2, 0, s, s], [(W - s * .7) / 2, H * .05, s * .7, s * .7], [(W - s * .5) / 2, H * .12, s * .5, s * .5]];
  for (const [x, y, w, h] of tries) {
    const c = cut(canvas, x, Math.max(0, Math.min(H - h, y)), w, h);
    hit = await detect(c);
    if (hit) return {canvas: c, ...hit};
  }
  // a face that fills the whole photo is too close for the detector, so it also tries the photo with a border
  const pad = document.createElement('canvas'), m = Math.round(Math.max(W, H) * .3);
  pad.width = W + m * 2; pad.height = H + m * 2;
  const g = pad.getContext('2d'); g.fillStyle = '#808080'; g.fillRect(0, 0, pad.width, pad.height); g.drawImage(canvas, m, m);
  hit = await detect(pad);
  if (hit) {
    // map the points back onto the photo itself
    const lm = hit.lm.map(p => ({x: (p.x * pad.width - m) / W, y: (p.y * pad.height - m) / H, z: p.z}));
    return {canvas, lm, pose: hit.pose};
  }
  return null;
}
/* crop to the head and shoulders so the face is large enough to work on; wide sets the crop as a multiple of the face width */
export function frameFace(canvas, lm, wide = 2.1, min = 720, max = 1100){
  const W = canvas.width, H = canvas.height;
  let a = 1, b = 1, c = 0, d = 0;
  for (const p of lm) { a = Math.min(a, p.x); b = Math.min(b, p.y); c = Math.max(c, p.x); d = Math.max(d, p.y); }
  const fw = (c - a) * W, fh = (d - b) * H;
  const cw = Math.min(W, fw * wide), ch = Math.min(H, cw * 1.28);
  const cx = clamp((a + c) / 2 * W - cw / 2, 0, W - cw), cy = clamp((b + d) / 2 * H - ch * .46, 0, H - ch);
  let out = cut(canvas, cx, cy, cw, ch, max);
  if (out.width < min) { const k = min / out.width; out = cut(out, 0, 0, out.width, out.height, Math.max(out.width, out.height) * k, true); }
  const kx = out.width / cw, ky = out.height / ch;
  return {base: out, L: lm.map(p => ({x: (p.x * W - cx) * kx, y: (p.y * H - cy) * ky}))};
}
export const loadImage = src => new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
export function toCanvas(im, max = 1100){
  const w0 = im.naturalWidth || im.videoWidth || im.width, h0 = im.naturalHeight || im.videoHeight || im.height, r = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.round(w0 * r); c.height = Math.round(h0 * r);
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return c;
}

/* ---------- facial measure ---------- */
/* The iris is close to 11.7 mm across in most adults, so the refined iris points give a millimetre scale
   without a ruler in the photo. Good to a few millimetres, enough for a screening. */
export const IRIS_MM = 11.7;
const D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function irisScale(L){
  const ring = (c, a, b, e, f) => (D(L[a], L[e]) + D(L[b], L[f])) / 2;
  if (!L[477]) return null;
  const right = ring(468, 469, 470, 471, 472), left = ring(473, 474, 475, 476, 477);
  // a half-closed lid clips the vertical pair, so the wider ring is the truer one
  const px = Math.max(right, left);
  return px > 4 ? IRIS_MM / px : null;
}
export function measures(L){
  const mm = irisScale(L);
  if (!mm) return null;
  const f = (a, b) => Math.round(D(L[a], L[b]) * mm);
  const upper = D(L[9], L[2]), lower = D(L[2], L[152]);
  return {
    mmPerPx: mm,
    pupils: f(468, 473), faceWidth: f(234, 454), faceLength: f(10, 152), noseWidth: f(48, 278), mouthWidth: f(61, 291),
    jawWidth: f(172, 397), eyeWidth: Math.round((D(L[33], L[133]) + D(L[263], L[362])) / 2 * mm), eyeGap: f(133, 362),
    // middle third (brows to under the nose) against the lower third (under the nose to the chin)
    thirds: +(lower / upper).toFixed(2),
    // the inner eye gap against one eye's width: close to 1 reads as balanced
    fifths: +(D(L[133], L[362]) / ((D(L[33], L[133]) + D(L[263], L[362])) / 2)).toFixed(2),
  };
}

/* the mesh's triangle edges, for drawing the scan */
export async function edges(){
  const {vision} = await fileset();
  return vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION || [];
}
