/* Alaga pages: menu, reveal, forms, and on the finance page the clinic map and calculator. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  
  /* Header shadow once the page moves, and the phone menu. */
  const bar = $(".bar");
  const onScroll = () => bar.classList.toggle("is-stuck", scrollY > 8);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  /* The drawer is a native popover, which closes on Esc and on a tap outside it.
     Older browsers without popover get a plain show and hide. */
  const menu = $(".menu"), drawer = $("#drawer");
  const hasPopover = HTMLElement.prototype.hasOwnProperty("popover");
  if (hasPopover) {
    drawer.addEventListener("toggle", (e) => menu.classList.toggle("is-open", e.newState === "open"));
  } else {
    drawer.removeAttribute("popover");
    drawer.hidden = true;
    menu.setAttribute("aria-expanded", "false");
    menu.addEventListener("click", () => {
      drawer.hidden = !drawer.hidden;
      menu.setAttribute("aria-expanded", String(!drawer.hidden));
      menu.classList.toggle("is-open", !drawer.hidden);
    });
  }
  drawer.addEventListener("click", (e) => {
    if (!e.target.closest("a")) return;
    if (hasPopover) drawer.hidePopover();
    else { drawer.hidden = true; menu.setAttribute("aria-expanded", "false"); menu.classList.remove("is-open"); }
  });

  /* Finance page: the clinic floor plan. A spot or a chip picks the investment and the
     card shows what to check before signing. */
  if ($(".map")) {
    const MAP = {
      equipment: { tile: "tile-microscope-r", h: "Equipment",
        p: "Lasers, HIFU, RF and IPL devices, financed or leased so you keep cash in the clinic.",
        l: ["Buying or leasing", "Repayment period against the device's working life", "Treatments a month to cover the repayment"] },
      expand: { tile: "tile-cells-tr", h: "New treatment room",
        p: "A second room, a new team member or a new treatment line.",
        l: ["What the room earns in its first year", "Who works in it and how long the fit-out takes", "Cash to keep aside while it fills up"] },
      fitout: { tile: "tile-tissue-bl", h: "Fit-out and working capital",
        p: "A renovation, new interiors or cash for a slow quarter.",
        l: ["A short loan or a credit line", "What the repayment does to your monthly figures", "How long until the renovation pays for itself"] },
      start: { tile: "tile-dna-top", h: "New clinic",
        p: "Financing for the equipment, the fit-out, stock and working capital of a first clinic.",
        l: ["Business plan and first-year forecast the bank will accept", "How much of your own money goes in", "What the bank asks a new clinic for"] },
      premises: { tile: "tile-cell-tl", h: "Clinic premises",
        p: "Buying your clinic building or refinancing the one you own, arranged through Hypotheekadvies Drechtsteden.",
        l: ["Buying or renting", "Business mortgage terms", "Refinancing your current mortgage"] },
    };
    function pick(key) {
      const d = MAP[key];
      if (!d) return;
      $$(".spot, .map-chips .chip").forEach((el) => {
        const on = el.dataset.key === key;
        el.classList.toggle("is-on", on);
        el.setAttribute("aria-pressed", String(on));
      });
      const card = $(".map-card");
      card.classList.remove("is-in");
      void card.offsetWidth;
      card.classList.add("is-in");
      const mt = $("#m-tile"); mt.src = mt.src.replace(/[^/]+\.webp$/, d.tile + ".webp");
      $("#m-h").textContent = d.h;
      $("#m-p").textContent = d.p;
      $("#m-l").innerHTML = d.l.map((x) => `<li>${x}</li>`).join("");
    }
    $$(".spot").forEach((s) => {
      s.addEventListener("click", () => pick(s.dataset.key));
      s.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(s.dataset.key); }
      });
    });
    $$(".map-chips .chip").forEach((c) => c.addEventListener("click", () => pick(c.dataset.key)));
    $$("[data-pick]").forEach((a) => a.addEventListener("click", () => pick(a.dataset.pick)));
    pick("equipment");
  }

  /* Testimonials: one tab per service. */
  $$("[data-tab]").forEach((b) => b.addEventListener("click", () => {
    $$("[data-tab]").forEach((x) => { const on = x === b; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", String(on)); });
    $$("[data-panel]").forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.tab; });
  }));

  /* Reveal sections as they arrive. */
  if ("IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-seen"); io.unobserve(e.target); }
    }), { threshold: 0 });
    $$(".rise").forEach((el) => io.observe(el));
    document.documentElement.classList.add("has-rise");
  }

  /* Forms that open an email (finance consultation, Clinical Alliance). A field shows
     its error once the visitor has left it or tried to send, and aria-invalid changes at
     the same moment so a screen reader hears the error only after the visitor acts. */
  const labelOf = (el) => {
    if (el.type === "radio" || el.type === "checkbox") {
      const fs = el.closest("fieldset");
      if (fs) return fs.querySelector("legend").textContent.trim();
    }
    const l = el.id && document.querySelector(`label[for="${el.id}"]`);
    return l ? l.textContent.replace(/\(optional\)/i, "").trim() : el.name;
  };
  $$("form[data-mailto]").forEach((form) => {
    const status = $(".form-status", form);
    const checked = $$("[data-error]", form);
    const sync = (el) => {
      if (!el.dataset.touched) return;
      const bad = !el.validity.valid;
      el.setAttribute("aria-invalid", String(bad));
      el.closest(".field").classList.toggle("is-bad", bad);
      const ids = (el.getAttribute("aria-describedby") || "").split(/\s+/).filter((id) => id && id !== el.dataset.error);
      if (bad) ids.push(el.dataset.error);
      if (ids.length) el.setAttribute("aria-describedby", ids.join(" "));
      else el.removeAttribute("aria-describedby");
    };
    checked.forEach((el) => {
      el.setAttribute("aria-invalid", "false");
      el.addEventListener("blur", () => { if (el.value && el.type !== "checkbox") { el.dataset.touched = "1"; sync(el); } });
      el.addEventListener("input", () => sync(el));
      el.addEventListener("change", () => { el.dataset.touched = "1"; sync(el); });
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      checked.forEach((el) => { el.dataset.touched = "1"; sync(el); });
      const first = checked.find((el) => !el.validity.valid);
      if (first) { status.hidden = true; first.focus(); return; }
      const rows = new Map();
      $$("input[name], textarea[name], select[name]", form).forEach((el) => {
        if (el.name === "consent") return;
        if ((el.type === "radio" || el.type === "checkbox") && !el.checked) return;
        const key = labelOf(el), val = el.value.trim();
        if (!val) return;
        rows.set(key, rows.has(key) ? rows.get(key) + ", " + val : val);
      });
      const body = [...rows].map(([k, v]) => (k.startsWith("Notes") || k.startsWith("Your question") ? "\n" + v : `${k}: ${v}`)).join("\n");
      const name = form.elements.name.value.trim();
      status.hidden = false;
      status.textContent = "Press send in your email app.";
      location.href = `mailto:info@alagaaesthetics.nl?subject=${encodeURIComponent(form.dataset.mailto + ": " + name)}&body=${encodeURIComponent(body)}`;
    });
  });
})();
