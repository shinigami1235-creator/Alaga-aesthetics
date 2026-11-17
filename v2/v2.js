/* Design draft 2: menu, the repayment calculator and the consultation form. */
(() => {
  const $ = (s) => document.querySelector(s);
  const eur = (n) => "€" + Math.round(n).toLocaleString("en-GB");

  // menu on phones
  const menu = $(".menu"), drawer = $("#drawer");
  menu.addEventListener("click", () => {
    const open = drawer.hidden;
    drawer.hidden = !open;
    menu.setAttribute("aria-expanded", String(open));
  });
  drawer.addEventListener("click", (e) => { if (e.target.closest("a")) { drawer.hidden = true; menu.setAttribute("aria-expanded", "false"); } });

  // calculator: an ordinary amortising loan
  const amount = $("#amount"), rate = $("#rate"), margin = $("#margin");
  const fill = (el) => el.style.setProperty("--p", ((el.value - el.min) / (el.max - el.min)) * 100 + "%");
  function calc() {
    const P = +amount.value, r = +rate.value / 100 / 12, years = +document.querySelector('input[name="years"]:checked').value, n = years * 12;
    const m = r ? (P * r) / (1 - Math.pow(1 + r, -n)) : P / n;
    $("#o-amount").textContent = eur(P);
    $("#o-rate").textContent = (+rate.value).toFixed(1) + "%";
    $("#o-margin").textContent = eur(+margin.value);
    $("#r-month").textContent = eur(m);
    $("#r-total").textContent = eur(m * n);
    $("#r-interest").textContent = eur(m * n - P);
    $("#r-treat").textContent = Math.ceil(m / +margin.value);
    [amount, rate, margin].forEach(fill);
  }
  document.querySelectorAll("#calc input").forEach((el) => el.addEventListener("input", calc));
  calc();

  // tiles preselect the need in the form
  document.querySelectorAll("[data-need]").forEach((a) => a.addEventListener("click", () => { $("#consult-form").elements.need.value = a.dataset.need; }));

  // form: opens the visitor's own email, so nothing is stored on the site
  $("#consult-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = e.target;
    if (!f.reportValidity()) return;
    const need = f.elements.need.selectedOptions[0].textContent;
    const body = [`Name: ${f.elements.name.value}`, `Clinic: ${f.elements.clinic.value}`, `Email: ${f.elements.email.value}`, `Planning: ${need}`, "", f.elements.notes.value].join("\n");
    location.href = `mailto:info@alagaaesthetics.nl?subject=${encodeURIComponent("Free consultation: " + f.elements.name.value)}&body=${encodeURIComponent(body)}`;
  });
})();
