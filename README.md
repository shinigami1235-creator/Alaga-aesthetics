# Alaga Aesthetics website

The basic website for Alaga Aesthetics by Bosselaar. Open `index.html` to view it. The page opens on the logo's DNA ring rebuilt in 3D as glazed Delft porcelain (`assets/js/wreath.js`), with the wordmark set inside it.

## Editing text

All wording lives in `assets/js/content.js`. The site shows English only for review: the Dutch text is written but switched off (`LANGS` in `assets/js/site.js`) and needs updating to match the current English before it goes back on.

## Before going live

- Replace `info@alagaaesthetics.nl` in `content.js` and `index.html` once the real address exists.
- Add the KVK number to the footer after registration.
- The registration form opens the visitor's email app since there is no server yet.
- Photos marked "on Unsplash" load from Unsplash and should be replaced with Alaga's own photos.

Static HTML, CSS and JavaScript with no build step. Fonts are self-hosted.
