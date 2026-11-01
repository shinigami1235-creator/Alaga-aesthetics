/*
  Shared behaviour for every layout: language, the A/B/C preview switch,
  and the clinic registration form.
*/
(function () {
  const C = window.ALAGA_CONTENT;
  // Dutch is written but switched off until the English copy is approved. Set to ["en", "nl"] to turn it back on.
  const LANGS = ["en"];

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  function pickLang() {
    const q = new URLSearchParams(location.search).get("lang");
    if (LANGS.includes(q)) return q;
    const saved = store("alaga-lang");
    if (LANGS.includes(saved)) return saved;
    return "en";
  }

  let lang = pickLang();
  const t = (key) => (C[lang] && C[lang][key]) ?? (C.en[key] ?? key);

  function apply() {
    document.documentElement.lang = lang;
    document.title = t("meta.title") + (document.body.dataset.titleSuffix ? " | " + t(document.body.dataset.titleSuffix) : "");
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t("meta.desc"));
    document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = t(el.dataset.t); });
    document.querySelectorAll("[data-t-alt]").forEach((el) => { el.setAttribute("alt", t(el.dataset.tAlt)); });
    document.querySelectorAll("[data-t-aria]").forEach((el) => { el.setAttribute("aria-label", t(el.dataset.tAria)); });
    document.querySelectorAll("[data-t-placeholder]").forEach((el) => { el.setAttribute("placeholder", t(el.dataset.tPlaceholder)); });
    document.querySelectorAll("[data-lang-toggle]").forEach((el) => {
      el.hidden = LANGS.length < 2;
      el.textContent = t("lang.other");
      el.setAttribute("aria-label", t("lang.label"));
      el.setAttribute("lang", lang === "en" ? "nl" : "en");
    });
    document.querySelectorAll("a[data-keep-lang]").forEach((a) => {
      const url = new URL(a.getAttribute("href"), location.href);
      url.searchParams.set("lang", lang);
      a.href = url.pathname + url.search + url.hash;
    });
    document.dispatchEvent(new CustomEvent("alaga:lang", { detail: { lang } }));
  }

  function setLang(next) {
    lang = next;
    store("alaga-lang", lang);
    const url = new URL(location.href);
    url.searchParams.set("lang", lang);
    history.replaceState(null, "", url);
    apply();
    updateSwitch();
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-lang-toggle]");
    if (btn) setLang(lang === "en" ? "nl" : "en");
  });

  /* Preview switch between layouts A, B and C. Remove once a layout is chosen. */
  let switchEl;
  function buildSwitch() {
    const current = document.body.dataset.layout;
    if (!current) return;
    switchEl = document.createElement("nav");
    switchEl.className = "preview-switch";
    switchEl.setAttribute("aria-label", "Layout preview");
    switchEl.innerHTML = ["a", "b", "c"].map((l) =>
      `<a href="../${l}/" data-l="${l}"${l === current ? ' aria-current="page"' : ""}>${l.toUpperCase()}</a>`
    ).join("");
    document.body.appendChild(switchEl);
    const style = document.createElement("style");
    style.textContent = `
      .preview-switch{position:fixed;left:16px;bottom:16px;z-index:9999;display:flex;gap:2px;padding:4px;
        background:rgba(11,29,74,.92);border-radius:999px;box-shadow:0 6px 18px rgba(11,29,74,.28);font:600 13px/1 system-ui,sans-serif}
      .preview-switch a{color:#dfe5f7;text-decoration:none;width:30px;height:30px;display:grid;place-items:center;border-radius:999px}
      .preview-switch a:hover{background:rgba(255,255,255,.14)}
      .preview-switch a[aria-current]{background:#fff;color:#0b1d4a}
      .preview-switch a:focus-visible{outline:2px solid #f2b8c6;outline-offset:2px}
      @media print{.preview-switch{display:none}}`;
    document.head.appendChild(style);
    updateSwitch();
  }
  function updateSwitch() {
    if (!switchEl) return;
    switchEl.querySelectorAll("a").forEach((a) => {
      a.href = `../${a.dataset.l}/?lang=${lang}${location.hash}`;
    });
  }
  window.addEventListener("hashchange", updateSwitch);

  /* Intake form: checks the fields, then opens an email with the details. */
  function initForm() {
    const form = document.querySelector("form[data-register]");
    if (!form) return;
    const status = form.querySelector("[data-form-status]");

    function setError(field, message) {
      const wrap = field.closest("[data-field]") || field.parentElement;
      let err = wrap.querySelector(".field-error");
      if (!message) {
        field.removeAttribute("aria-invalid");
        if (err) err.remove();
        return;
      }
      if (!err) {
        err = document.createElement("p");
        err.className = "field-error";
        err.id = field.id + "-error";
        wrap.appendChild(err);
      }
      err.textContent = message;
      field.setAttribute("aria-invalid", "true");
      const ids = new Set((field.getAttribute("aria-describedby") || "").split(" ").filter(Boolean));
      ids.add(err.id);
      field.setAttribute("aria-describedby", [...ids].join(" "));
    }

    function check(field) {
      const v = field.type === "checkbox" ? field.checked : field.value.trim();
      const label = t(field.dataset.label || "");
      if (field.required && !v) {
        return field.type === "checkbox" ? t("form.err.consent") : t("form.err.required").replace("{field}", /^.[A-Z]/.test(label) ? label : label.charAt(0).toLowerCase() + label.slice(1));
      }
      if (!v) return "";
      const digits = String(v).replace(/\D/g, "");
      if (field.name === "big" && digits.length !== 11) return t("form.err.big");
      if (field.name === "kvk" && digits.length !== 8) return t("form.err.kvk");
      if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return t("form.err.email");
      return "";
    }

    form.addEventListener("input", (e) => {
      const f = e.target;
      if (f.getAttribute("aria-invalid")) setError(f, check(f));
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let first = null;
      form.querySelectorAll("input, textarea, select").forEach((f) => {
        if (!f.name) return;
        const msg = check(f);
        setError(f, msg);
        if (msg && !first) first = f;
      });
      if (first) { first.focus(); return; }

      const lines = [];
      form.querySelectorAll("[data-label]").forEach((f) => {
        if (f.type === "checkbox" && f.name !== "consent") return;
        if (f.name === "consent") return;
        if (f.type === "radio") return;
        if (f.value.trim()) lines.push(`${t(f.dataset.label)}: ${f.value.trim()}`);
      });
      form.querySelectorAll("fieldset").forEach((fs) => {
        const picked = [...fs.querySelectorAll("input:checked")].map((i) => t(i.dataset.option));
        if (picked.length) lines.push(`${fs.querySelector("legend").textContent}: ${picked.join(", ")}`);
      });
      const to = t("contact.email");
      const href = `mailto:${to}?subject=${encodeURIComponent(t("form.mail.subject") + ": " + form.elements.name.value.trim())}&body=${encodeURIComponent(lines.join("\n"))}`;
      if (status) { status.textContent = t("form.sent"); status.hidden = false; }
      location.href = href;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    apply();
    buildSwitch();
    initForm();
  });

  window.ALAGA = { t: (k) => t(k), lang: () => lang };
})();
