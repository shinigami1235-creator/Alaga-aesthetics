/*
  Store preview catalogue. Products, prices and concentrations are
  placeholders until the backend exists.

  tex   = what the 40× texture view draws
  skin  = what the 400× skin view draws: dermis, surface or matrix
  mol   = molecules drawn at the last focus level
  cap   = captions for texture, skin and molecule
*/
window.ALAGA_PRODUCTS = [
  {
    id: "pdrn-serum", shelf: "skin", no: "01", sym: "PDRN", el: "Polydeoxyribonucleotide", dose: "1%",
    name: "PDRN Recovery Serum", size: "30 mL", price: 64, dims: [5, 8.4, 3], tags: ["PDRN", "HA"],
    tex: "gel", skin: "dermis", mol: ["pdrn"],
    cap: [
      "A thin gel. It spreads in one pass and leaves no film.",
      "PDRN binds the adenosine A2A receptor on skin cells, the signal behind its calming effect.",
      "Short DNA fragments from salmon. Shorter than PN, so it works as a signal, not a scaffold."
    ],
    desc: "A light serum for skin that has just been treated. PDRN is a salmon DNA fraction that supports repair and calms redness.",
    ings: ["PDRN (hydrolyzed DNA) 1%", "Sodium hyaluronate", "Panthenol"],
    use: "Two to three drops morning and evening, from the day after microneedling, laser or a skin booster. Keep going for four weeks."
  },
  {
    id: "pn-cream", shelf: "skin", no: "02", sym: "PN", el: "Polynucleotides", dose: "0.5%",
    name: "PN Barrier Cream", size: "50 mL", price: 58, dims: [6.2, 6.2, 6.2], tags: ["PN", "Ceramides"],
    tex: "cream", skin: "surface", mol: ["pn"],
    cap: [
      "A rich cream with a soft peak. It melts at skin temperature.",
      "Ceramides fill the gaps between the flattened top cells. PN holds water underneath.",
      "Long DNA chains. Longer than PDRN, so they form a gel network instead of a quick signal."
    ],
    desc: "A rich cream that puts the barrier back together. Long-chain polynucleotides hold water in the skin; ceramides seal it in.",
    ings: ["Polynucleotides (PN) 0.5%", "Ceramide NP, AP, EOP", "Squalane"],
    use: "Evening, after serum. On dry or tight areas you can use it in the morning too."
  },
  {
    id: "exo-amp", shelf: "skin", no: "03", sym: "Ex", el: "Plant exosomes", dose: "7 × 2 mL",
    name: "Plant Exosome Ampoules", size: "7 × 2 mL", price: 89, dims: [8.6, 4.4, 3.6], tags: ["Exosomes", "Peptides"],
    tex: "liquid", skin: "dermis", mol: ["exo"],
    cap: [
      "Watery and clear. One ampoule covers face and neck.",
      "The vesicles settle on the skin and release the lipids and proteins they carry.",
      "A plant exosome: a lipid bubble about a ten-thousandth of a millimetre across, with cargo inside."
    ],
    desc: "A one-week course in glass ampoules. Exosomes from plant cells carry lipids and proteins that help skin look rested and even.",
    ings: ["Plant-derived exosomes", "Acetyl hexapeptide-8", "Niacinamide"],
    use: "One ampoule each evening for seven days, on clean skin, before cream.",
    note: "Plant-derived only. EU cosmetics law does not allow exosomes from human cells."
  },
  {
    id: "pep-conc", shelf: "skin", no: "04", sym: "Pep", el: "Signal peptides", dose: "4%",
    name: "Peptide Firming Concentrate", size: "30 mL", price: 54, dims: [4.6, 9.2, 4.6], tags: ["Peptides", "HA"],
    tex: "gel", skin: "dermis", mol: ["pep"],
    cap: [
      "A fluid concentrate, a little silky.",
      "Signal peptides ask fibroblasts to make more collagen. The copper peptide helps the repair along.",
      "GHK-Cu: three amino acids holding a copper ion, next to the five-amino-acid matrix peptide."
    ],
    desc: "A firming concentrate with copper peptides and a collagen signal peptide, for use between biostimulator sessions.",
    ings: ["Copper tripeptide-1 (GHK-Cu)", "Palmitoyl pentapeptide-4", "Sodium hyaluronate"],
    use: "Mornings, after cleansing. Don't use on the same evening as retinol."
  },
  {
    id: "spf", shelf: "skin", no: "05", sym: "Zn", el: "Mineral SPF 50", dose: "SPF 50",
    name: "Mineral SPF 50", size: "50 mL", price: 38, dims: [4.4, 8, 3], tags: ["SPF"],
    tex: "mineral", skin: "surface", mol: ["zn"],
    cap: [
      "Zinc oxide grains in a light lotion.",
      "The mineral film stays on top of the skin and scatters and absorbs UV there.",
      "A zinc oxide crystal: zinc and oxygen in a hexagonal lattice."
    ],
    desc: "A mineral sunscreen that sits well on treated skin.",
    ings: ["Zinc oxide 20%", "Glycerin", "Tocopherol"],
    use: "Every morning as the last step. Top up every two hours outdoors."
  },
  {
    id: "kit", shelf: "skin", no: "06", sym: "Set", el: "After-treatment kit", dose: "3 pieces",
    name: "After-Treatment Kit", size: "Serum, cream, SPF", price: 139, dims: [10, 7, 4.4], tags: ["PDRN", "PN", "SPF"],
    tex: "mix", skin: "surface", mol: ["pdrn", "pn", "zn"],
    cap: [
      "Three textures in one box: gel, cream and lotion.",
      "Serum for the signal, cream for the barrier, SPF on top.",
      "PDRN fragments, PN chains and zinc oxide in one routine."
    ],
    desc: "The PDRN serum, the PN cream and the SPF in one box, for the four weeks after a procedure.",
    ings: ["PDRN Recovery Serum 30 mL", "PN Barrier Cream 50 mL", "Mineral SPF 50, 50 mL"],
    use: "Serum and cream morning and evening, SPF every morning. Four weeks."
  },

  {
    id: "pn-boost", shelf: "pro", no: "11", sym: "PN", el: "Polynucleotides", dose: "20 mg/mL",
    name: "PN Skin Booster", size: "1 × 2 mL syringe", price: 92, dims: [9.4, 3.4, 3], tags: ["PN"],
    tex: "gel", skin: "dermis", mol: ["pn"],
    cap: [
      "A clear, slightly thick gel that passes through a fine needle.",
      "In the dermis the chains act as a scaffold and draw water to it.",
      "Long polynucleotide chains, 20 mg in every millilitre."
    ],
    desc: "Polynucleotide gel for intradermal injection. Used for skin quality around the eyes, face and neck.",
    ings: ["Polynucleotides 20 mg/mL", "Physiological buffer"],
    use: "Three sessions two to three weeks apart. Microdroplet or linear threading technique.",
    note: "Medical device. For BIG-registered practitioners only."
  },
  {
    id: "pn-ha", shelf: "pro", no: "12", sym: "PN·HA", el: "PN with hyaluronic acid", dose: "2 mL",
    name: "PN + HA Booster", size: "1 × 2 mL syringe", price: 98, dims: [9.4, 3.4, 3], tags: ["PN", "HA"],
    tex: "gel", skin: "dermis", mol: ["pn", "ha"],
    cap: [
      "PN and free hyaluronic acid in one gel.",
      "HA holds water straight away. PN keeps working on the tissue after the HA is gone.",
      "Polynucleotide chains wound through hyaluronic acid."
    ],
    desc: "Polynucleotides with non-crosslinked hyaluronic acid for hydration and repair in one treatment.",
    ings: ["Polynucleotides", "Non-crosslinked sodium hyaluronate"],
    use: "Two to three sessions three weeks apart.",
    note: "Medical device. For BIG-registered practitioners only."
  },
  {
    id: "pdrn-pro", shelf: "pro", no: "13", sym: "PDRN", el: "Polydeoxyribonucleotide", dose: "5 × 3 mL",
    name: "PDRN Ampoules", size: "5 × 3 mL", price: 120, dims: [8.2, 4.2, 4.2], tags: ["PDRN"],
    tex: "liquid", skin: "dermis", mol: ["pdrn"],
    cap: [
      "A clear solution for mesotherapy or microneedling.",
      "PDRN binds the adenosine A2A receptor on skin cells, the signal behind its calming effect.",
      "Short DNA fragments from salmon."
    ],
    desc: "PDRN solution for mesotherapy and for use with microneedling in the clinic.",
    ings: ["PDRN 5.625 mg / 3 mL"],
    use: "Follow the instructions for use. One ampoule per session.",
    note: "For BIG-registered practitioners only."
  },
  {
    id: "plla", shelf: "pro", no: "14", sym: "PLLA", el: "Poly-L-lactic acid", dose: "150 mg",
    name: "PLLA Biostimulator", size: "2 vials, 150 mg", price: 260, dims: [6, 6.6, 4], tags: ["Biostimulators"],
    tex: "powder", skin: "matrix", mol: ["plla"],
    cap: [
      "Once mixed, a milky suspension of fine particles.",
      "Fibroblasts gather around the particles and lay down new collagen over the following months.",
      "Poly-L-lactic acid: a chain the body slowly breaks down to lactic acid."
    ],
    desc: "Powder for reconstitution. Builds collagen gradually over months; results can last two years or more.",
    ings: ["Poly-L-lactic acid", "Carboxymethylcellulose", "Mannitol"],
    use: "Reconstitute ahead of time as the instructions say. Usually two to three sessions.",
    note: "Medical device. For BIG-registered practitioners only."
  },
  {
    id: "caha", shelf: "pro", no: "15", sym: "CaHA", el: "Calcium hydroxylapatite", dose: "1.25 mL",
    name: "CaHA + HA", size: "1 × 1.25 mL syringe", price: 190, dims: [9.4, 3.4, 3], tags: ["Biostimulators", "HA"],
    tex: "spheres", skin: "matrix", mol: ["caha", "ha"],
    cap: [
      "Microspheres held in a hyaluronic acid gel.",
      "The gel gives lift at once. The microspheres act as a frame for new collagen.",
      "Calcium hydroxylapatite, the same mineral that bone is made of."
    ],
    desc: "Calcium hydroxylapatite in a hyaluronic acid gel: lift you can see the same day, then new collagen over the following months.",
    ings: ["Calcium hydroxylapatite microspheres", "Hyaluronic acid gel"],
    use: "Deep injection or cannula. Results usually last 12 to 18 months.",
    note: "Medical device. For BIG-registered practitioners only."
  },
  {
    id: "pcl", shelf: "pro", no: "16", sym: "PCL", el: "Polycaprolactone", dose: "1 mL",
    name: "PCL Collagen Stimulator", size: "2 × 1 mL syringe", price: 240, dims: [9.4, 3.4, 3], tags: ["Biostimulators"],
    tex: "spheres", skin: "matrix", mol: ["pcl"],
    cap: [
      "Smooth microspheres in a carrier gel.",
      "The carrier gives the first volume. Collagen forms around the spheres as the gel is absorbed.",
      "Polycaprolactone: a polyester chain that breaks down slowly, which is why it lasts years."
    ],
    desc: "Polycaprolactone microspheres in a carrier gel. Volume at once, collagen after; lasts one to four years depending on the version.",
    ings: ["Polycaprolactone microspheres", "Carboxymethylcellulose gel"],
    use: "Subdermal or supraperiosteal injection.",
    note: "Medical device. For BIG-registered practitioners only."
  }
];

/* After-treatment routines: which product, which days, morning or evening. */
window.ALAGA_ROUTINES = {
  "Microneedling": [
    { id: "pdrn-serum", from: 1, to: 28, when: "AM + PM" },
    { id: "exo-amp", from: 2, to: 8, when: "PM" },
    { id: "pn-cream", from: 1, to: 28, when: "PM" },
    { id: "spf", from: 1, to: 28, when: "AM" }
  ],
  "Laser": [
    { id: "pdrn-serum", from: 1, to: 28, when: "AM + PM" },
    { id: "pn-cream", from: 1, to: 28, when: "AM + PM" },
    { id: "pep-conc", from: 15, to: 28, when: "AM" },
    { id: "spf", from: 1, to: 28, when: "AM" }
  ],
  "Skin booster": [
    { id: "exo-amp", from: 1, to: 7, when: "PM" },
    { id: "pdrn-serum", from: 1, to: 14, when: "AM + PM" },
    { id: "pep-conc", from: 15, to: 28, when: "AM" },
    { id: "spf", from: 1, to: 28, when: "AM" }
  ],
  "Biostimulator": [
    { id: "pn-cream", from: 1, to: 28, when: "PM" },
    { id: "pep-conc", from: 8, to: 28, when: "AM" },
    { id: "spf", from: 1, to: 28, when: "AM" }
  ]
};
