/* Logo intro on the home page: the logo appears, turns once and flies into the hero.
   Browsers that play see-through WebM get the 3D render; Safari gets a CSS turn of the flat logo.
   Runs once per visit, never with reduced motion or data saver, and any click or key skips it. */
(() => {
  const root = document.documentElement;
  const target = document.querySelector(".home-logo");
  if (!root.classList.contains("intro") || !target || !Element.prototype.animate) { root.classList.remove("intro"); return; }

  const overlay = document.createElement("div");
  overlay.className = "intro-overlay";
  overlay.setAttribute("aria-hidden", "true");
  const stage = document.createElement("div");
  stage.className = "intro-stage";
  overlay.append(stage);
  document.body.append(overlay);

  const done = () => {
    if (done.ran) return; done.ran = true;
    root.classList.remove("intro");
    overlay.remove();
    try { sessionStorage.setItem("alaga-intro", "1"); } catch (e) {}
  };
  addEventListener("pointerdown", done, { once: true });
  addEventListener("keydown", done, { once: true });
  setTimeout(done, 11000);

  const ua = navigator.userAgent;
  const safari = /Safari\//.test(ua) && !/(Chrome|Chromium|CriOS|Edg|OPR|Android)/.test(ua);
  const saveData = navigator.connection && navigator.connection.saveData;
  const useVideo = !safari && !saveData &&
    document.createElement("video").canPlayType('video/webm; codecs="vp9"') !== "";

  const flat = () => {
    // stacked copies give the flat logo some thickness while it turns
    const LAYERS = 7;
    for (let i = LAYERS; i >= 0; i--) {
      const img = document.createElement("img");
      img.src = target.currentSrc || target.src; img.alt = "";
      img.style.transform = `translateZ(${-i * 1.6}px)`;
      if (i) img.style.filter = `brightness(${0.5 + 0.04 * (LAYERS - i)})`;
      stage.append(img);
    }
    stage.classList.add("is-flat");
  };

  const appear = () => stage.animate(
    [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1)" }],
    { duration: 450, easing: "cubic-bezier(.23,1,.32,1)", fill: "forwards" }).finished;

  const flyIn = async (measure = stage) => {
    const from = measure.getBoundingClientRect(), to = target.getBoundingClientRect(), box = stage.getBoundingClientRect();
    stage.style.transformOrigin = `${from.left + from.width / 2 - box.left}px ${from.top + from.height / 2 - box.top}px`;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const k = to.height / from.height;
    overlay.animate([{ backgroundColor: getComputedStyle(overlay).backgroundColor }, { backgroundColor: "transparent" }],
      { duration: 700, easing: "ease-out", fill: "forwards" });
    await stage.animate(
      [{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${dx}px, ${dy}px) scale(${k})` }],
      { duration: 750, easing: "cubic-bezier(.23,1,.32,1)", fill: "forwards" }).finished;
    done();
  };

  const runFlat = async () => {
    flat();
    const img0 = stage.lastElementChild;
    if (!img0.complete) await new Promise(r => { img0.onload = img0.onerror = r; });
    await appear();
    await stage.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(360deg)" }],
      { duration: 2800, easing: "cubic-bezier(.37,0,.63,1)", fill: "forwards" }).finished;
    await flyIn();
  };

  const runVideo = async () => {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto";
    v.src = "assets/video/logo-spin.webm";
    const still = document.createElement("img");
    still.src = target.currentSrc || target.src; still.alt = ""; still.className = "intro-still";
    stage.classList.add("is-video");
    stage.append(v, still);
    const ready = await Promise.race([
      new Promise(r => v.addEventListener("canplaythrough", () => r(true), { once: true })),
      new Promise(r => v.addEventListener("error", () => r(false), { once: true })),
      new Promise(r => setTimeout(() => r(false), 1800))
    ]);
    if (!ready) { stage.replaceChildren(); stage.classList.remove("is-video"); return runFlat(); }
    await appear();
    await v.play().catch(() => {});
    await new Promise(r => { v.onended = r; setTimeout(r, 6500); });
    // hand over to the flat logo image, then fly into place
    await still.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, fill: "forwards" }).finished;
    await flyIn(still);
  };

  (useVideo ? runVideo : runFlat)();
})();
