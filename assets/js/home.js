/* Alaga home page: menu, clinic map, repayment calculator, consultation form. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const eur = (n) => "€" + Math.round(n).toLocaleString("en-GB");

  /* Header shadow once the page moves, and the phone menu. */
  const bar = $(".bar");
  const onScroll = () => bar.classList.toggle("is-stuck", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  const menu = $(".menu"), drawer = $("#drawer");
  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", open);
    drawer.hidden = !open;
  });
  drawer.addEventListener("click", (e) => {
    if (e.target.closest("a")) { menu.setAttribute("aria-expanded", "false"); drawer.hidden = true; }
  });

  /* Calculator. */
  const amount = $("#amount"), rate = $("#rate"), margin = $("#margin"), tray = $("#tray");
  const fill = (el) => el.style.setProperty("--p", ((el.value - el.min) / (el.max - el.min)) * 100 + "%");
  function calc() {
    const P = +amount.value, r = +rate.value / 1200, n = +$('input[name="years"]:checked').value * 12;
    const m = r ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n;
    const treat = Math.ceil(m / +margin.value);
    $("#o-amount").textContent = eur(P);
    $("#o-rate").textContent = (+rate.value).toFixed(1) + "%";
    $("#o-margin").textContent = eur(+margin.value);
    $("#r-month").textContent = eur(m);
    $("#r-total").textContent = eur(m * n);
    $("#r-interest").textContent = eur(m * n - P);
    $("#r-treat").textContent = treat;
    const shown = Math.min(treat, 60);
    if (tray.childElementCount !== shown) {
      tray.innerHTML = "<i></i>".repeat(shown) + (treat > 60 ? `<span>+${treat - 60}</span>` : "");
    }
    [amount, rate, margin].forEach(fill);
  }
  $$("#calc input").forEach((el) => el.addEventListener("input", calc));
  calc();

  /* Clinic map: a spot or a chip picks the investment, the card explains it,
     and "Run these numbers" loads its example amount into the calculator. */
  const MAP = {
    equipment: { tile: "tile-microscope-r", amt: 50000, years: 5,
      h: "Equipment",
      p: "Lasers, HIFU, RF and IPL devices, bought or leased.",
      l: ["Buying or leasing", "Repayment period against the device's working life", "Treatments a month to cover the repayment"] },
    expand: { tile: "tile-cells-tr", amt: 120000, years: 7,
      h: "New treatment room",
      p: "A second room, a new team member or a new treatment line.",
      l: ["What the room earns in its first year", "Who works in it and how long the fit-out takes", "Cash to keep aside while it fills up"] },
    fitout: { tile: "tile-tissue-bl", amt: 80000, years: 5,
      h: "Fit-out and working capital",
      p: "A renovation, new interiors or cash for a slow quarter.",
      l: ["A short loan or a credit line", "What the repayment does to your monthly figures", "How long until the renovation pays for itself"] },
    start: { tile: "tile-dna-top", amt: 250000, years: 10,
      h: "New clinic",
      p: "A first clinic needs a business plan and a first-year forecast before a bank will lend.",
      l: ["Business plan and first-year forecast", "How much of your own money goes in", "What the bank asks a new clinic for"] },
    premises: { tile: "tile-cell-tl", amt: 450000, years: 10,
      h: "Clinic premises",
      p: "Buying your clinic building or refinancing the one you own. Our financing partner handles this.",
      l: ["Buying or renting", "Business mortgage terms", "Refinancing your current mortgage"] },
  };
  let current = "equipment";
  function pick(key) {
    const d = MAP[key];
    if (!d) return;
    current = key;
    $$(".spot").forEach((s) => s.classList.toggle("is-on", s.dataset.key === key));
    $$(".map-chips .chip").forEach((c) => {
      const on = c.dataset.key === key;
      c.classList.toggle("is-on", on);
      c.setAttribute("aria-selected", on);
    });
    const card = $(".map-card");
    card.classList.remove("is-in");
    void card.offsetWidth;
    card.classList.add("is-in");
    $("#m-tile").src = `assets/img/${d.tile}.webp`;
    $("#m-h").textContent = d.h;
    $("#m-p").textContent = d.p;
    $("#m-l").innerHTML = d.l.map((x) => `<li>${x}</li>`).join("");
    $("#m-amt").textContent = eur(d.amt);
  }
  $$(".spot").forEach((s) => {
    s.addEventListener("click", () => pick(s.dataset.key));
    s.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(s.dataset.key); }
    });
  });
  $$(".map-chips .chip").forEach((c) => c.addEventListener("click", () => pick(c.dataset.key)));
  $("#m-go").addEventListener("click", () => {
    const d = MAP[current];
    amount.value = d.amt;
    const yr = $(`input[name="years"][value="${d.years}"]`);
    if (yr) yr.checked = true;
    calc();
  });
  pick("equipment");

  /* Reveal sections as they arrive. */
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-seen"); io.unobserve(e.target); }
    }), { threshold: 0 });
    $$(".rise").forEach((el) => io.observe(el));
    document.documentElement.classList.add("has-rise");
  }

  /* Consultation form: checks the required fields, then opens an email with the details. */
  const form = $("#consult-form"), status = $("#form-status");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = form.elements;
    let msg = "";
    if (!f.name.value.trim()) msg = "Enter your name.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.value.trim())) msg = "Enter an email address like name@clinic.nl.";
    else if (!f.consent.checked) msg = "Tick the box to agree to the privacy statement.";
    status.hidden = false;
    if (msg) { status.textContent = msg; status.classList.add("is-err"); return; }
    status.classList.remove("is-err");
    const body = [
      "Name: " + f.name.value.trim(),
      "Clinic: " + (f.clinic.value.trim() || "-"),
      "Email: " + f.email.value.trim(),
      "Planning: " + f.need.value,
      "",
      f.notes.value.trim(),
    ].join("\n");
    status.textContent = "Press send in your email app.";
    location.href = `mailto:info@alagaaesthetics.nl?subject=${encodeURIComponent("Free consultation: " + f.name.value.trim())}&body=${encodeURIComponent(body)}`;
  });
})();
