/* Repayment calculator on /finance/calculator/: an ordinary amortising loan,
   plus how many treatments a month cover the repayment. */
(() => {
  const $ = (s) => document.querySelector(s);
  const amount = $("#amount"), rate = $("#rate"), margin = $("#margin"), tray = $("#tray"), live = $("#calc-live");
  if (!amount) return;
  const eur = (n) => "€" + Math.round(n).toLocaleString("en-GB");
  const fill = (el) => el.style.setProperty("--p", ((el.value - el.min) / (el.max - el.min)) * 100 + "%");
  let liveTimer;
  function calc() {
    const P = +amount.value, r = +rate.value / 1200, n = +document.querySelector('input[name="years"]:checked').value * 12;
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
    if (tray.childElementCount !== shown) tray.innerHTML = "<i></i>".repeat(shown) + (treat > 60 ? `<span>+${treat - 60}</span>` : "");
    amount.setAttribute("aria-valuetext", eur(P));
    rate.setAttribute("aria-valuetext", (+rate.value).toFixed(1) + " percent");
    margin.setAttribute("aria-valuetext", eur(+margin.value));
    [amount, rate, margin].forEach(fill);
    clearTimeout(liveTimer);
    liveTimer = setTimeout(() => { live.textContent = `Monthly repayment ${eur(m)}. ${treat} treatments a month cover it.`; }, 700);
  }
  document.querySelectorAll("#calc input").forEach((el) => el.addEventListener("input", calc));
  calc();
})();
