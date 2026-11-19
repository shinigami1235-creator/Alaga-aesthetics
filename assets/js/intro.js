/* Logo intro on the home page: the logo appears, spins once and flies into the hero.
   Runs once per visit, never with reduced motion, and any click or key skips it. */
(() => {
  const root = document.documentElement;
  const target = document.querySelector(".home-logo");
  if (!root.classList.contains("intro") || !target || !Element.prototype.animate) { root.classList.remove("intro"); return; }

  const done = () => {
    if (done.ran) return; done.ran = true;
    root.classList.remove("intro");
    overlay.remove();
    try { sessionStorage.setItem("alaga-intro", "1"); } catch (e) {}
  };

  const overlay = document.createElement("div");
  overlay.className = "intro-overlay";
  overlay.setAttribute("aria-hidden", "true");
  const stage = document.createElement("div");
  stage.className = "intro-stage";
  // a few stacked copies give the flat logo some thickness while it turns
  const LAYERS = 7;
  for (let i = LAYERS; i >= 0; i--) {
    const img = document.createElement("img");
    img.src = target.currentSrc || target.src;
    img.alt = "";
    img.style.transform = `translateZ(${-i * 1.6}px)`;
    if (i) img.style.filter = `brightness(${0.5 + 0.04 * (LAYERS - i)})`;
    stage.append(img);
  }
  overlay.append(stage);
  document.body.append(overlay);

  const skip = () => done();
  addEventListener("pointerdown", skip, { once: true });
  addEventListener("keydown", skip, { once: true });
  setTimeout(done, 5000);

  const run = async () => {
    const appear = stage.animate(
      [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: 450, easing: "cubic-bezier(.23,1,.32,1)", fill: "forwards" });
    await appear.finished;
    const spin = stage.animate(
      [{ transform: "rotateY(0deg)" }, { transform: "rotateY(360deg)" }],
      { duration: 1100, easing: "cubic-bezier(.65,0,.35,1)", fill: "forwards" });
    await spin.finished;
    // fly from the centre of the screen into the hero spot
    const from = stage.getBoundingClientRect(), to = target.getBoundingClientRect();
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const k = to.height / from.height;
    overlay.animate([{ backgroundColor: getComputedStyle(overlay).backgroundColor }, { backgroundColor: "transparent" }],
      { duration: 700, easing: "ease-out", fill: "forwards" });
    const fly = stage.animate(
      [{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${dx}px, ${dy}px) scale(${k})` }],
      { duration: 750, easing: "cubic-bezier(.23,1,.32,1)", fill: "forwards" });
    await fly.finished;
    done();
  };
  const img0 = stage.lastElementChild;
  (img0.complete ? Promise.resolve() : new Promise(r => { img0.onload = img0.onerror = r; })).then(run);
})();
