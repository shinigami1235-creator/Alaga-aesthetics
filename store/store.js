/*
  Store preview. Products, prices and codes are placeholders until the
  backend exists. Each product draws its own CSS box: size in box units
  (width, height, depth), an ingredient "element" on the front.
*/
(function () {
  const products = [
    {
      id: "pdrn-serum", shelf: "skin", no: "01", sym: "PDRN", el: "Polydeoxyribonucleotide", dose: "1%",
      name: "PDRN Recovery Serum", size: "30 mL", price: 64, dims: [5, 8.4, 3], tags: ["PDRN", "HA"],
      desc: "A light serum for skin that has just been treated. PDRN is a salmon DNA fraction that supports repair and calms redness.",
      ings: ["PDRN (hydrolyzed DNA) 1%", "Sodium hyaluronate", "Panthenol"],
      use: "Two to three drops morning and evening, from the day after microneedling, laser or a skin booster. Keep going for four weeks."
    },
    {
      id: "pn-cream", shelf: "skin", no: "02", sym: "PN", el: "Polynucleotides", dose: "0.5%",
      name: "PN Barrier Cream", size: "50 mL", price: 58, dims: [6.2, 6.2, 6.2], tags: ["PN", "Ceramides"],
      desc: "A rich cream that puts the barrier back together. Long-chain polynucleotides hold water in the skin; ceramides seal it in.",
      ings: ["Polynucleotides (PN) 0.5%", "Ceramide NP, AP, EOP", "Squalane"],
      use: "Evening, after serum. On dry or tight areas you can use it in the morning too."
    },
    {
      id: "exo-amp", shelf: "skin", no: "03", sym: "Ex", el: "Plant exosomes", dose: "7 × 2 mL",
      name: "Plant Exosome Ampoules", size: "7 × 2 mL", price: 89, dims: [8.6, 4.4, 3.6], tags: ["Exosomes", "Peptides"],
      desc: "A one-week course in glass ampoules. Exosomes from plant cells carry lipids and proteins that help skin look rested and even.",
      ings: ["Plant-derived exosomes", "Acetyl hexapeptide-8", "Niacinamide"],
      use: "One ampoule each evening for seven days, on clean skin, before cream.",
      note: "Plant-derived only. EU cosmetics law does not allow exosomes from human cells."
    },
    {
      id: "pep-conc", shelf: "skin", no: "04", sym: "Pep", el: "Signal peptides", dose: "4%",
      name: "Peptide Firming Concentrate", size: "30 mL", price: 54, dims: [4.6, 9.2, 4.6], tags: ["Peptides", "HA"],
      desc: "A firming concentrate with copper peptides and a collagen signal peptide, for use between biostimulator sessions.",
      ings: ["Copper tripeptide-1 (GHK-Cu)", "Palmitoyl pentapeptide-4", "Sodium hyaluronate"],
      use: "Mornings, after cleansing. Don't use on the same evening as retinol."
    },
    {
      id: "spf", shelf: "skin", no: "05", sym: "Zn", el: "Mineral SPF 50", dose: "SPF 50",
      name: "Mineral SPF 50", size: "50 mL", price: 38, dims: [4.4, 8, 3], tags: ["SPF"],
      desc: "A mineral sunscreen that sits well on treated skin and doesn't sting.",
      ings: ["Zinc oxide 20%", "Glycerin", "Tocopherol"],
      use: "Every morning as the last step. Top up every two hours outdoors."
    },
    {
      id: "kit", shelf: "skin", no: "06", sym: "Set", el: "After-treatment kit", dose: "3 pieces",
      name: "After-Treatment Kit", size: "Serum, cream, SPF", price: 139, dims: [10, 7, 4.4], tags: ["PDRN", "PN", "SPF"],
      desc: "The PDRN serum, the PN cream and the SPF in one box, for the four weeks after a procedure.",
      ings: ["PDRN Recovery Serum 30 mL", "PN Barrier Cream 50 mL", "Mineral SPF 50, 50 mL"],
      use: "Serum and cream morning and evening, SPF every morning. Four weeks."
    },

    {
      id: "pn-boost", shelf: "pro", no: "11", sym: "PN", el: "Polynucleotides", dose: "20 mg/mL",
      name: "PN Skin Booster", size: "1 × 2 mL syringe", price: 92, dims: [9.4, 3.4, 3], tags: ["PN"],
      desc: "Polynucleotide gel for intradermal injection. Used for skin quality around the eyes, face and neck.",
      ings: ["Polynucleotides 20 mg/mL", "Physiological buffer"],
      use: "Three sessions two to three weeks apart. Microdroplet or linear threading technique.",
      note: "Medical device. For BIG-registered practitioners only."
    },
    {
      id: "pn-ha", shelf: "pro", no: "12", sym: "PN·HA", el: "PN with hyaluronic acid", dose: "2 mL",
      name: "PN + HA Booster", size: "1 × 2 mL syringe", price: 98, dims: [9.4, 3.4, 3], tags: ["PN", "HA"],
      desc: "Polynucleotides with non-crosslinked hyaluronic acid for hydration and repair in one treatment.",
      ings: ["Polynucleotides", "Non-crosslinked sodium hyaluronate"],
      use: "Two to three sessions three weeks apart.",
      note: "Medical device. For BIG-registered practitioners only."
    },
    {
      id: "pdrn-pro", shelf: "pro", no: "13", sym: "PDRN", el: "Polydeoxyribonucleotide", dose: "5 × 3 mL",
      name: "PDRN Ampoules", size: "5 × 3 mL", price: 120, dims: [8.2, 4.2, 4.2], tags: ["PDRN"],
      desc: "PDRN solution for mesotherapy and for use with microneedling in the clinic.",
      ings: ["PDRN 5.625 mg / 3 mL"],
      use: "Follow the instructions for use. One ampoule per session.",
      note: "For BIG-registered practitioners only."
    },
    {
      id: "plla", shelf: "pro", no: "14", sym: "PLLA", el: "Poly-L-lactic acid", dose: "150 mg",
      name: "PLLA Biostimulator", size: "2 vials, 150 mg", price: 260, dims: [6, 6.6, 4], tags: ["Biostimulators"],
      desc: "Powder for reconstitution. Builds collagen gradually over months; results can last two years or more.",
      ings: ["Poly-L-lactic acid", "Carboxymethylcellulose", "Mannitol"],
      use: "Reconstitute ahead of time as the instructions say. Usually two to three sessions.",
      note: "Medical device. For BIG-registered practitioners only."
    },
    {
      id: "caha", shelf: "pro", no: "15", sym: "CaHA", el: "Calcium hydroxylapatite", dose: "1.25 mL",
      name: "CaHA + HA", size: "1 × 1.25 mL syringe", price: 190, dims: [9.4, 3.4, 3], tags: ["Biostimulators", "HA"],
      desc: "Calcium hydroxylapatite in a hyaluronic acid gel: lift you can see the same day, then new collagen over the following months.",
      ings: ["Calcium hydroxylapatite microspheres", "Hyaluronic acid gel"],
      use: "Deep injection or cannula. Results usually last 12 to 18 months.",
      note: "Medical device. For BIG-registered practitioners only."
    },
    {
      id: "pcl", shelf: "pro", no: "16", sym: "PCL", el: "Polycaprolactone", dose: "1 mL",
      name: "PCL Collagen Stimulator", size: "2 × 1 mL syringe", price: 240, dims: [9.4, 3.4, 3], tags: ["Biostimulators"],
      desc: "Polycaprolactone microspheres in a carrier gel. Volume at once, collagen after; lasts one to four years depending on the version.",
      ings: ["Polycaprolactone microspheres", "Carboxymethylcellulose gel"],
      use: "Subdermal or supraperiosteal injection.",
      note: "Medical device. For BIG-registered practitioners only."
    }
  ];

  const $ = (s, el = document) => el.querySelector(s);
  const eur = (n) => "€" + n.toFixed(n % 1 ? 2 : 0).replace(".", ",");
  let proIn = false, bag = 0, current = null, code = "";

  function box(p, big) {
    const [w, h, d] = p.dims;
    return `<div class="box ${p.shelf === "pro" ? "is-pro" : ""}${big ? " is-big" : ""}" style="--w:${w};--h:${h};--d:${d}">
      <div class="face f-front">
        <span class="band" aria-hidden="true"></span>
        <span class="el">
          <span class="el-top"><span>${p.no}</span><span>${p.dose}</span></span>
          <span class="el-sym${p.sym.length > 3 ? " is-long" : ""}">${p.sym}</span>
          <span class="el-name">${p.el}</span>
        </span>
        <span class="mark">ALAGA</span>
      </div>
      <div class="face f-back"></div>
      <div class="face f-right"><span>Alaga Aesthetics</span></div>
      <div class="face f-left"></div>
      <div class="face f-top"></div>
    </div>`;
  }

  function priceHtml(p) {
    if (p.shelf === "pro" && !proIn) return `<span class="card-lock">Log in to see price</span>`;
    return `<span class="card-price">${eur(p.price)}</span>`;
  }

  function card(p) {
    return `<li class="card" data-tags="${p.tags.join(" ")}">
      <button type="button" class="card-btn" data-open="${p.id}" aria-label="${p.name}, details">
        <span class="plinth">${box(p)}</span>
        <span class="card-text">
          <span class="card-name">${p.name}</span>
          <span class="card-size">${p.size}</span>
          ${priceHtml(p)}
        </span>
      </button>
    </li>`;
  }

  function render() {
    document.querySelectorAll("[data-grid]").forEach((g) => {
      g.innerHTML = products.filter((p) => p.shelf === g.dataset.grid).map(card).join("");
    });
  }

  // Featured trio on the counter.
  $("[data-featured]").innerHTML = ["pn-cream", "pdrn-serum", "exo-amp"]
    .map((id, i) => `<button type="button" class="feat feat-${i}" data-open="${id}" aria-label="${products.find((p) => p.id === id).name}"><span class="plinth">${box(products.find((p) => p.id === id), true)}</span></button>`)
    .join("");

  // Ingredient chips filter the skincare shelf.
  const tags = ["All", ...new Set(products.filter((p) => p.shelf === "skin").flatMap((p) => p.tags))];
  $("[data-chips]").innerHTML = tags.map((t, i) => `<button type="button" class="chip" aria-pressed="${i === 0}" data-tag="${t}">${t}</button>`).join("");
  $("[data-chips]").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tag]");
    if (!b) return;
    document.querySelectorAll("[data-tag]").forEach((c) => c.setAttribute("aria-pressed", c === b));
    document.querySelectorAll('[data-grid="skin"] .card').forEach((c) => {
      c.hidden = b.dataset.tag !== "All" && !c.dataset.tags.split(" ").includes(b.dataset.tag);
    });
  });

  // Boxes lean toward the pointer.
  document.addEventListener("pointermove", (e) => {
    const plinth = e.target.closest && e.target.closest(".plinth");
    document.querySelectorAll(".plinth.is-tilt").forEach((p) => { if (p !== plinth) { p.classList.remove("is-tilt"); p.style.removeProperty("--tx"); p.style.removeProperty("--ty"); } });
    if (!plinth || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = plinth.getBoundingClientRect();
    plinth.classList.add("is-tilt");
    plinth.style.setProperty("--tx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    plinth.style.setProperty("--ty", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  });

  // Detail sheet.
  const sheet = $("[data-sheet]");
  function setPrice() {
    const p = current;
    const priceEl = $("[data-sheet-price]"), was = $("[data-sheet-was]");
    if (p.shelf === "pro" && !proIn) {
      priceEl.textContent = "Price after BIG login";
      was.hidden = true;
      return;
    }
    const off = code && p.shelf === "skin" ? 0.9 : 1;
    priceEl.textContent = eur(Math.round(p.price * off * 100) / 100);
    was.hidden = off === 1;
    was.textContent = eur(p.price);
  }
  function open(id) {
    current = products.find((p) => p.id === id);
    const p = current;
    $("[data-sheet-box]").innerHTML = `<span class="plinth is-spin">${box(p, true)}</span>`;
    $("[data-sheet-kind]").textContent = p.shelf === "pro" ? "For professionals" : "Skincare";
    $("[data-sheet-name]").textContent = p.name;
    $("[data-sheet-size]").textContent = p.size;
    $("[data-sheet-desc]").textContent = p.desc;
    $("[data-sheet-ings]").innerHTML = p.ings.map((i) => `<li>${i}</li>`).join("");
    $("[data-sheet-use]").textContent = p.use;
    const note = $("[data-sheet-note]");
    note.textContent = p.note || "";
    note.hidden = !p.note;
    $("[data-code-form]").hidden = p.shelf === "pro";
    $("[data-code-msg]").textContent = code ? `Code ${code} applied: 10% off.` : "";
    $("#code").value = code;
    const add = $("[data-add]");
    add.textContent = p.shelf === "pro" && !proIn ? "Log in with BIG number" : "Add to bag";
    setPrice();
    sheet.showModal();
  }
  document.addEventListener("click", (e) => {
    const o = e.target.closest("[data-open]");
    if (o) open(o.dataset.open);
  });
  $("[data-close]").addEventListener("click", () => sheet.close());
  sheet.addEventListener("click", (e) => { if (e.target === sheet) sheet.close(); });

  $("[data-code-form]").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("#code").value.trim().toUpperCase();
    const msg = $("[data-code-msg]");
    if (!v) { code = ""; msg.textContent = ""; }
    else if (/^DR-[A-Z]{2,}$/.test(v)) { code = v; msg.textContent = `Code ${v} applied: 10% off.`; }
    else { msg.textContent = "That code isn't right. Doctor codes look like DR-SARAH."; }
    setPrice();
  });

  function toast(text) {
    const t = $("[data-toast]");
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (t.hidden = true), 2600);
  }

  function login() {
    proIn = true;
    render();
    const b = $("[data-big-login]");
    b.textContent = "Logged in (demo)";
    b.disabled = true;
    toast("Demo login. The real one checks your BIG number in the BIG register.");
  }
  $("[data-big-login]").addEventListener("click", login);

  $("[data-add]").addEventListener("click", () => {
    if (current.shelf === "pro" && !proIn) { login(); open(current.id); return; }
    bag += 1;
    $("[data-bag-count]").textContent = bag;
    $("[data-bag]").setAttribute("aria-label", `Bag, ${bag} item${bag === 1 ? "" : "s"}`);
    sheet.close();
    toast(`${current.name} added. Checkout isn't built yet.`);
  });
  $("[data-bag]").addEventListener("click", () => toast(bag ? `${bag} in your bag. Checkout comes with the backend.` : "Your bag is empty."));

  render();
})();
