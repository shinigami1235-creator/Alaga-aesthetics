# Alaga Aesthetics website

The basic website for Alaga Aesthetics by Bosselaar, built in three layouts from the same English and Dutch copy. Open `index.html` to pick a layout, then use the A, B and C switch in the bottom-left corner to compare them.

- `a/` The journal: cobalt cover, contents list, the Delft engraving as figure 1.
- `b/` The Delft tile wall: tiles cut from the engraving and the logo's DNA ring in 3D (`assets/js/wreath.js`).
- `c/` The stained slide: haematoxylin and eosin colours, a microscope field with a focus knob.
- `privacy/` Privacy statement shared by all three.

## Editing text

All wording lives in `assets/js/content.js`, with English under `en` and Dutch under `nl`. A change there shows up in every layout.

## Before going live

- Replace `info@alagaaesthetics.nl` in `content.js` and the three `index.html` files once the real address exists.
- Add the KVK number to the footer after registration.
- The registration form opens the visitor's email app since there is no server yet.
- Photos marked "on Unsplash" load from Unsplash and should be replaced with Alaga's own photos.
- Delete the A/B/C switch (`buildSwitch` in `assets/js/site.js`) once a layout is chosen.

Static HTML, CSS and JavaScript with no build step. Fonts are self-hosted.
