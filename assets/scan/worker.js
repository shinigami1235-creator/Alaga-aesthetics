/* Runs the skin reading off the main thread so the scanning screen stays smooth while it works */
import {read} from './skin.js';
self.onmessage = e => {
  const {id, img, L} = e.data;
  try { self.postMessage({id, r: read({img, L})}); }
  catch (err) { self.postMessage({id, error: String(err && err.message || err)}); }
};
