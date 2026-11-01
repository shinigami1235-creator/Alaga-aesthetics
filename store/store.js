/*
  Store preview: slide tray, microscope, specimen card, routine planner,
  doctor codes and the professional cabinet. Prices and codes are mock.
*/
(function () {
  const products = window.ALAGA_PRODUCTS;
  const routines = window.ALAGA_ROUTINES;
  const byId = (id) => products.find((p) => p.id === id);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const eur = (n) => "€" + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0).replace(".", ",");
  const LEVELS = ["Product", "Texture, 40×", "Skin, 400×", "Molecule"];
  let proIn = false, bag = 0, code = "", current = null;

  /* ---------- Microscope ---------- */
  const lens = window.AlagaScope.mount($("[data-lens]"));

  function setLevel(l, user) {
    if (user) lens.focus(l);
    $$("[data-level]").forEach((b) => b.setAttribute("aria-checked", String(+b.dataset.level === l)));
    $("[data-focus]").style.setProperty("--lv", l);
    const p = current;
    const fig = l === 0 ? `${p.name}, ${p.size}.` : p.cap[l - 1];
    $("[data-fig]").innerHTML = `<span>Fig. ${p.no}.${l + 1}</span> ${LEVELS[l]}. ${fig}`;
    $("[data-lens-tag]").textContent = `No. ${p.no} · ${p.sym}`;
  }

  $("[data-focus]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-level]");
    if (b) setLevel(+b.dataset.level, true);
  });
  $("[data-focus]").addEventListener("keydown", (e) => {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    const l = Math.max(0, Math.min(3, lens.level() + d));
    setLevel(l, true);
    $(`[data-level="${l}"]`).focus();
  });
  // The knob can be dragged along the rail.
  (function () {
    const rail = $(".focus-rail"), knob = $("[data-knob]");
    let drag = false;
    const pick = (y) => {
      const r = rail.getBoundingClientRect();
      const l = Math.round(Math.max(0, Math.min(1, (y - r.top) / r.height)) * 3);
      if (l !== lens.level()) setLevel(l, true);
    };
    knob.addEventListener("pointerdown", (e) => { drag = true; knob.setPointerCapture(e.pointerId); });
    knob.addEventListener("pointermove", (e) => { if (drag) pick(e.clientY); });
    knob.addEventListener("pointerup", () => { drag = false; });
    rail.addEventListener("click", (e) => pick(e.clientY));
  })();
  // Scroll wheel over the lens turns the focus, then lets the page scroll at either end.
  let wheelAt = 0;
  $("[data-lens]").addEventListener("wheel", (e) => {
    const d = Math.sign(e.deltaY), l = lens.level() + d;
    if (l < 0 || l > 3) return;
    e.preventDefault();
    if (performance.now() - wheelAt < 450) return;
    wheelAt = performance.now();
    setLevel(l, true);
  }, { passive: false });

  /* ---------- Specimen card ---------- */
  function price(p) {
    const off = code && p.shelf === "skin" ? 0.9 : 1;
    return p.price * off;
  }
  function fillCard() {
    const p = current;
    $("[data-spec-kind]").textContent = p.shelf === "pro" ? "For professionals" : "Skincare";
    $("[data-spec-name]").textContent = p.name;
    $("[data-spec-size]").textContent = p.size;
    $("[data-spec-desc]").textContent = p.desc;
    $("[data-spec-ings]").innerHTML = p.ings.map((i) => `<li>${i}</li>`).join("");
    $("[data-spec-use]").textContent = p.use;
    const note = $("[data-spec-note]");
    note.textContent = p.note || ""; note.hidden = !p.note;
    const locked = p.shelf === "pro" && !proIn;
    $("[data-code-form]").hidden = p.shelf === "pro";
    $("[data-price]").textContent = locked ? "Price after BIG login" : eur(price(p));
    $("[data-price]").classList.toggle("is-locked", locked);
    const was = $("[data-was]");
    was.hidden = locked || price(p) === p.price;
    was.textContent = eur(p.price);
    $("[data-add]").textContent = locked ? "Log in with BIG number" : "Add to bag";
    // Dr. Sarah's answers about this product sit under the buy button, so they never get in the way of it
    const qa = (window.ALAGA_QA || []).filter((x) => (x.product || []).includes(p.id)).slice(0, 2);
    $("[data-spec-qa]").innerHTML = p.shelf === "pro" ? "" : `<p class="qa-h">Dr. Sarah answered</p>` +
      qa.map((x) => `<details><summary>${x.q}</summary><p>${x.a}</p></details>`).join("") +
      `<a class="qa-ask" href="../ask/?p=${p.id}">${qa.length ? "Ask her something else" : "Ask her about this product"}</a>`;
  }

  function load(id, level = 0) {
    const p = byId(id);
    current = p;
    lens.show(p, level);
    setLevel(level, false);
    fillCard();
    $$("[data-slide]").forEach((s) => s.setAttribute("aria-pressed", String(s.dataset.slide === id)));
    $(".specimen").classList.remove("is-new"); void $(".specimen").offsetWidth; $(".specimen").classList.add("is-new");
  }

  /* ---------- Slide tray ---------- */
  const skin = products.filter((p) => p.shelf === "skin");
  $("[data-tray]").innerHTML = skin.map((p, i) => `
    <li style="--tilt:${[-1.6, 1.1, -0.6, 1.8, -1.2, 0.7][i]}deg">
      <button type="button" class="slide" data-slide="${p.id}" data-tags="${p.tags.join(" ")}" aria-pressed="false">
        <span class="slide-label"><span class="slide-no">No. ${p.no}</span><span class="slide-name">${p.name}</span><span class="slide-price">${eur(p.price)}</span></span>
        <span class="slide-spot" data-spot="${p.id}"></span>
      </button>
    </li>`).join("");
  document.fonts.ready.then(() => {
    $$("[data-spot]").forEach((el) => el.appendChild(window.AlagaScope.thumb(byId(el.dataset.spot), 3, 120)));
  });
  $("[data-tray]").addEventListener("click", (e) => {
    const s = e.target.closest("[data-slide]");
    if (s) load(s.dataset.slide, Math.max(lens.level(), 0));
  });

  const tags = ["All", ...new Set(skin.flatMap((p) => p.tags))];
  $("[data-chips]").innerHTML = tags.map((t, i) => `<button type="button" class="chip" aria-pressed="${i === 0}" data-tag="${t}">${t}</button>`).join("");
  $("[data-chips]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tag]");
    if (!b) return;
    $$("[data-tag]").forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
    $$("[data-slide]").forEach((s) => s.classList.toggle("is-dim", b.dataset.tag !== "All" && !s.dataset.tags.split(" ").includes(b.dataset.tag)));
  });

  /* ---------- Doctor code ---------- */
  $("[data-code-form]").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("#code").value.trim().toUpperCase();
    const msg = $("[data-code-msg]");
    if (!v) { code = ""; msg.textContent = ""; }
    else if (/^DR-[A-Z]{2,}$/.test(v)) { code = v; msg.textContent = `Code ${v} applied: 10% off skincare.`; }
    else msg.textContent = "That code isn't right. Doctor codes look like DR-SARAH.";
    fillCard();
    renderRoutineTotal();
  });

  /* ---------- Bag and toast ---------- */
  function toast(text) {
    const t = $("[data-toast]");
    t.textContent = text; t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (t.hidden = true), 2800);
  }
  function addToBag(n, label) {
    bag += n;
    $("[data-bag-count]").textContent = bag;
    $("[data-bag]").setAttribute("aria-label", `Bag, ${bag} item${bag === 1 ? "" : "s"}`);
    $("[data-bag]").classList.remove("is-bump"); void $("[data-bag]").offsetWidth; $("[data-bag]").classList.add("is-bump");
    toast(`${label} added. Checkout isn't built yet.`);
  }
  $("[data-add]").addEventListener("click", () => {
    if (current.shelf === "pro" && !proIn) { login(); return; }
    addToBag(1, current.name);
  });
  $("[data-bag]").addEventListener("click", () => toast(bag ? `${bag} in your bag. Checkout comes with the backend.` : "Your bag is empty."));

  /* ---------- Routine planner ---------- */
  let treatment = Object.keys(routines)[0], day = 1;
  $("[data-treatments]").innerHTML = Object.keys(routines).map((t, i) => `<button type="button" class="chip" aria-pressed="${i === 0}" data-treat="${t}">${t}</button>`).join("");
  $("[data-plan-days]").innerHTML = Array.from({ length: 28 }, (_, i) => `<span${(i + 1) % 7 === 0 || i === 0 ? ' class="is-mark"' : ""}>${i + 1}</span>`).join("");
  $("[data-treatments]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-treat]");
    if (!b) return;
    $$("[data-treat]").forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
    treatment = b.dataset.treat;
    renderPlan();
  });

  function renderPlan() {
    const rows = routines[treatment];
    $("[data-plan-lanes]").innerHTML = rows.map((r, i) => {
      const p = byId(r.id);
      return `<li style="--i:${i}">
        <button type="button" class="lane-name" data-look="${p.id}">${p.name}</button>
        <span class="lane-track"><span class="lane-bar ${r.when === "AM" ? "is-am" : r.when === "PM" ? "is-pm" : ""}" style="--from:${r.from};--to:${r.to}"><span>${r.when}</span></span></span>
      </li>`;
    }).join("");
    renderDay();
    renderRoutineTotal();
  }
  function renderDay() {
    const rows = routines[treatment].filter((r) => day >= r.from && day <= r.to);
    const item = (r) => `<li><button type="button" data-look="${r.id}">${byId(r.id).name}</button></li>`;
    $("[data-am]").innerHTML = rows.filter((r) => r.when.includes("AM")).map(item).join("") || "<li>Nothing</li>";
    $("[data-pm]").innerHTML = rows.filter((r) => r.when.includes("PM")).map(item).join("") || "<li>Nothing</li>";
    $("[data-today-day]").innerHTML = `Day <b>${day}</b> after ${treatment.toLowerCase()}`;
    $("[data-plan]").style.setProperty("--day", day);
    $$(".lane-bar").forEach((b, i) => {
      const r = routines[treatment][i];
      b.classList.toggle("is-today", day >= r.from && day <= r.to);
    });
  }
  function renderRoutineTotal() {
    const ids = [...new Set(routines[treatment].map((r) => r.id))];
    const full = ids.reduce((s, id) => s + byId(id).price, 0);
    const now = ids.reduce((s, id) => s + price(byId(id)), 0);
    $("[data-routine-total]").innerHTML = `${ids.length} products · <b>${eur(now)}</b>${now !== full ? ` <s>${eur(full)}</s>` : ""}${code ? "" : " · 10% off with your doctor's code"}`;
  }
  $("[data-scrub]").addEventListener("input", (e) => { day = +e.target.value; renderDay(); });
  $("[data-add-routine]").addEventListener("click", () => addToBag(new Set(routines[treatment].map((r) => r.id)).size, `The ${treatment.toLowerCase()} routine`));
  document.addEventListener("click", (e) => {
    const l = e.target.closest("[data-look]");
    if (!l) return;
    load(l.dataset.look, 0);
    $("#scope").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  });

  /* ---------- Professional cabinet ---------- */
  const pro = products.filter((p) => p.shelf === "pro");
  function box(p) {
    const [w, h, d] = p.dims;
    return `<span class="box is-pro" style="--w:${w};--h:${h};--d:${d}">
      <span class="face f-front"><span class="band"></span>
        <span class="el"><span class="el-top"><span>${p.no}</span><span>${p.dose}</span></span><span class="el-sym${p.sym.length > 3 ? " is-long" : ""}">${p.sym}</span><span class="el-name">${p.el}</span></span>
        <span class="mark">ALAGA</span></span>
      <span class="face f-right"><span>Alaga Aesthetics</span></span>
      <span class="face f-top"></span>
    </span>`;
  }
  function renderPro() {
    $("[data-pro]").innerHTML = pro.map((p) => `<li>
      <button type="button" class="cab-item" data-look="${p.id}" ${proIn ? "" : "tabindex=\"-1\""}>
        <span class="cab-box">${box(p)}</span>
        <span class="cab-name">${p.name}</span>
        <span class="cab-price">${proIn ? eur(p.price) : "BIG login"}</span>
      </button></li>`).join("");
  }
  function login() {
    proIn = true;
    renderPro();
    $("[data-cabinet]").classList.add("is-open");
    const b = $("[data-big-login]");
    b.textContent = "Logged in (demo)"; b.disabled = true;
    if (current) fillCard();
    toast("Demo login. The real one checks your BIG number in the BIG register.");
  }
  $("[data-big-login]").addEventListener("click", login);

  renderPro();
  renderPlan();
  // a link like store/?p=pn-cream opens on that product
  const start = new URLSearchParams(location.search).get("p");
  document.fonts.ready.then(() => {
    const id = byId(start) ? start : "pdrn-serum";
    load(id, 0);
  });
})();
