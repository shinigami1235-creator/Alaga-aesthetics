/* Repayment calculator on the clinic finance section: an ordinary amortising loan,
   plus how many treatments a month cover the repayment. */
(() => {
  const $ = (s) => document.querySelector(s);
  const amount = $("#amount"), rate = $("#rate"), margin = $("#margin");
  if (!amount) return;
  const eur = (n) => "€" + Math.round(n).toLocaleString("en-GB");
  const fill = (el) => el.style.setProperty("--p", ((el.value - el.min) / (el.max - el.min)) * 100 + "%");
  function calc() {
    const P = +amount.value, r = +rate.value / 100 / 12, n = +document.querySelector('input[name="years"]:checked').value * 12;
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
})();
