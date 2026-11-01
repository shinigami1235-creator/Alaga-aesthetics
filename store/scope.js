/*
  The microscope lens. Draws one product at four focus levels on a canvas:
  0 the box, 1 the texture (40×), 2 the skin (400×), 3 the molecule.
  Everything is drawn in code, in Delft cobalt with a blush stain, like a
  stained slide. Coordinates: the lens radius is 1 and the centre is 0,0.

  window.AlagaScope.mount(canvas) returns { show(product), focus(level), thumb(product, size) }
*/
(function () {
  const COB = "#24489a", COB2 = "#5f7fd0", INK = "#0b1d4a", PERI = "#8a96c6";
  const BLUSH = "#f6dde1", BLUSHD = "#eec6cd", BINK = "#883451", OCH = "#d9a441", HEMA = "#6c4f9e";
  const TAU = Math.PI * 2;

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  const lerp = (a, b, k) => a + (b - a) * k;

  /* ---------- Shared helpers ---------- */
  function blob(ctx, x, y, r, pts, wob) {
    ctx.beginPath();
    for (let i = 0; i <= pts.length; i++) {
      const a = (i % pts.length) / pts.length * TAU;
      const rr = r * (1 + pts[i % pts.length] * wob);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
  }

  // A DNA-like double helix along a sampled path.
  function helix(ctx, path, amp, period, phase, w) {
    const n = path.length;
    const A = [], B = [];
    let dist = 0;
    for (let i = 0; i < n; i++) {
      const p = path[i], q = path[Math.min(i + 1, n - 1)], o = path[Math.max(i - 1, 0)];
      const dx = q.x - o.x, dy = q.y - o.y, l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l, ny = dx / l;
      if (i) dist += Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y);
      const s = (dist / period) * TAU + phase;
      A.push({ x: p.x + nx * amp * Math.sin(s), y: p.y + ny * amp * Math.sin(s), z: Math.cos(s) });
      B.push({ x: p.x + nx * amp * Math.sin(s + 2.4), y: p.y + ny * amp * Math.sin(s + 2.4), z: Math.cos(s + 2.4) });
    }
    ctx.lineCap = "round";
    for (let i = 0; i < n; i += 3) {
      ctx.strokeStyle = i % 2 ? BLUSHD : OCH;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = w * 0.45;
      ctx.beginPath(); ctx.moveTo(A[i].x, A[i].y); ctx.lineTo(B[i].x, B[i].y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    [[B, COB2], [A, COB]].forEach(([S, col]) => {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath();
      S.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
    });
  }

  function straight(x, y, ang, len, steps) {
    const out = [];
    for (let i = 0; i <= steps; i++) {
      const u = i / steps - 0.5;
      out.push({ x: x + Math.cos(ang) * u * len, y: y + Math.sin(ang) * u * len });
    }
    return out;
  }

  function curve(p0, p1, p2, p3, steps) {
    const out = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, m = 1 - t;
      out.push({
        x: m * m * m * p0.x + 3 * m * m * t * p1.x + 3 * m * t * t * p2.x + t * t * t * p3.x,
        y: m * m * m * p0.y + 3 * m * m * t * p1.y + 3 * m * t * t * p2.y + t * t * t * p3.y
      });
    }
    return out;
  }

  function atom(ctx, x, y, r, col) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, col);
    g.addColorStop(1, shade(col));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  function shade(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) * 0.62, g = ((n >> 8) & 255) * 0.62, b = (n & 255) * 0.62;
    return `rgb(${r | 0},${g | 0},${b | 0})`;
  }

  // Canvas text at tiny unit sizes renders badly, so draw it 100× larger and scale down.
  function txt(ctx, str, x, y, size, font, align, maxW) {
    ctx.save(); ctx.scale(0.01, 0.01);
    ctx.font = font.replace("SIZE", (size * 100).toFixed(2) + "px");
    ctx.textAlign = align || "center";
    if (maxW) ctx.fillText(str, x * 100, y * 100, maxW * 100); else ctx.fillText(str, x * 100, y * 100);
    ctx.restore();
  }

  /* ---------- Level 0: the product box, front on ---------- */
  function drawProduct(ctx, p, t) {
    const [w, h, d] = p.dims;
    const s = 1.18 / Math.max(w, h * 1.05);
    const W = w * s, H = h * s, D = d * s * 0.32;
    const bob = Math.sin(t * 0.8) * 0.012;
    const x0 = -W / 2 - D / 3, y0 = -H / 2 + 0.04 + bob;
    const pro = p.shelf === "pro";

    // Floor shadow
    const sh = ctx.createRadialGradient(0, H / 2 + 0.07, 0, 0, H / 2 + 0.07, W * 0.85);
    sh.addColorStop(0, "rgba(11,29,74,.25)"); sh.addColorStop(1, "rgba(11,29,74,0)");
    ctx.save(); ctx.scale(1, 0.16); ctx.fillStyle = sh;
    ctx.beginPath(); ctx.arc(0, (H / 2 + 0.07) / 0.16, W * 0.85, 0, TAU); ctx.fill(); ctx.restore();

    // Side and top faces
    ctx.fillStyle = pro ? "#183274" : "#cfd7ec";
    ctx.beginPath(); ctx.moveTo(x0 + W, y0); ctx.lineTo(x0 + W + D, y0 - D * 0.6); ctx.lineTo(x0 + W + D, y0 + H - D * 0.6); ctx.lineTo(x0 + W, y0 + H); ctx.fill();
    ctx.fillStyle = pro ? "#3a62c0" : "#f2f5fc";
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + D, y0 - D * 0.6); ctx.lineTo(x0 + W + D, y0 - D * 0.6); ctx.lineTo(x0 + W, y0); ctx.fill();

    // Front
    const fg = ctx.createLinearGradient(x0, y0, x0 + W, y0 + H);
    if (pro) { fg.addColorStop(0, "#3159b8"); fg.addColorStop(0.6, COB); fg.addColorStop(1, "#1a3678"); }
    else { fg.addColorStop(0, "#ffffff"); fg.addColorStop(0.6, "#f5f7fd"); fg.addColorStop(1, "#e6ebf7"); }
    ctx.fillStyle = fg;
    ctx.fillRect(x0, y0, W, H);

    // Scalloped band
    const u = Math.min(W, H) * 0.075;
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, W, H); ctx.clip();
    ctx.fillStyle = pro ? OCH : COB;
    ctx.fillRect(x0, y0, W, u * 0.35);
    if (!pro) for (let x = x0 + u * 0.5; x < x0 + W + u; x += u) { ctx.beginPath(); ctx.arc(x, y0, u * 0.42, 0, Math.PI); ctx.fill(); }
    ctx.restore();

    // Element tile
    const tw = Math.min(W * 0.7, H * 0.62, 0.62), th = tw * 0.92;
    const tx = x0 + W / 2 - tw / 2, ty = y0 + H * (H > W ? 0.46 : 0.52) - th / 2;
    const ink = pro ? "#ffffff" : COB;
    ctx.strokeStyle = ink; ctx.lineWidth = tw * 0.025;
    ctx.fillStyle = pro ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.75)";
    ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, tw * 0.06); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink; ctx.textBaseline = "alphabetic";
    const NS = '700 SIZE "Nunito Sans", sans-serif', MS = "400 SIZE Marcellus, serif";
    txt(ctx, p.no, tx + tw * 0.08, ty + th * 0.17, tw * 0.1, NS, "left");
    txt(ctx, p.dose, tx + tw * 0.92, ty + th * 0.17, tw * 0.1, NS, "right");
    txt(ctx, p.sym, tx + tw / 2, ty + th * 0.64, tw * (p.sym.length > 3 ? 0.28 : 0.38), MS);
    ctx.fillStyle = pro ? "#d6def4" : "#414d75";
    txt(ctx, p.el, tx + tw / 2, ty + th * 0.85, tw * 0.075, '600 SIZE "Nunito Sans", sans-serif', "center", tw * 0.9);
    if (H > 0.55) {
      ctx.fillStyle = pro ? "#ffffff" : INK;
      txt(ctx, "A L A G A", x0 + W / 2, y0 + H - u * 0.7, u * 0.62, MS);
    }
    // Glaze highlight
    const hl = ctx.createLinearGradient(x0, y0, x0 + W * 0.6, y0 + H);
    hl.addColorStop(0, "rgba(255,255,255,.35)"); hl.addColorStop(0.4, "rgba(255,255,255,0)");
    ctx.fillStyle = hl; ctx.fillRect(x0, y0, W, H);
  }

  /* ---------- Level 1: texture at 40× ---------- */
  function buildTexture(p) {
    const r = rng(hash(p.id + "tex"));
    const kind = p.tex;
    const s = { kind, items: [] };
    const n = { gel: 46, liquid: 14, mineral: 520, powder: 110, spheres: 46, cream: 9 }[kind] || 30;
    for (let i = 0; i < n; i++) {
      s.items.push({
        x: r() * 2.2 - 1.1, y: r() * 2.2 - 1.1, r: r(), a: r() * TAU,
        vx: (r() - 0.5) * 0.02, vy: (r() - 0.5) * 0.02 - 0.01, k: r(), pts: Array.from({ length: 6 }, () => r() - 0.5)
      });
    }
    if (kind === "mix") s.parts = ["gel", "cream", "mineral"].map((k) => buildTexture({ ...p, id: p.id + k, tex: k }));
    return s;
  }
  const wrap = (v) => ((v + 1.2) % 2.4 + 2.4) % 2.4 - 1.2;

  function drawTexture(ctx, s, t) {
    const k = s.kind;
    if (k === "mix") {
      s.parts.forEach((part, i) => {
        ctx.save();
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1.3, -Math.PI / 2 + i * TAU / 3, -Math.PI / 2 + (i + 1) * TAU / 3); ctx.closePath(); ctx.clip();
        drawTexture(ctx, part, t);
        ctx.restore();
      });
      ctx.strokeStyle = "rgba(36,72,154,.5)"; ctx.lineWidth = 0.008;
      for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 1.3, Math.sin(a) * 1.3); ctx.stroke(); }
      return;
    }
    const bg = { gel: "#f7f2f8", liquid: "#f6f9ff", mineral: "#f8f8f6", powder: "#f6f4f7", spheres: "#f3f0f7", cream: "#fbfbfd" }[k];
    ctx.fillStyle = bg; ctx.fillRect(-1.3, -1.3, 2.6, 2.6);

    if (k === "cream") {
      for (let i = 0; i < 11; i++) {
        const base = -1.2 + i * 0.24;
        ctx.beginPath();
        ctx.moveTo(-1.3, 1.3);
        for (let x = -1.3; x <= 1.3; x += 0.04) {
          ctx.lineTo(x, base + 0.07 * Math.sin(x * 3.2 + i * 1.7 + t * 0.25) + 0.03 * Math.sin(x * 7 - i));
        }
        ctx.lineTo(1.3, 1.3); ctx.closePath();
        ctx.fillStyle = i % 2 ? "rgba(238,242,251,.85)" : "rgba(253,247,249,.85)";
        ctx.fill();
        ctx.strokeStyle = "rgba(36,72,154,.16)"; ctx.lineWidth = 0.008; ctx.stroke();
      }
      s.items.forEach((b) => {
        ctx.strokeStyle = "rgba(36,72,154,.3)"; ctx.lineWidth = 0.006;
        ctx.beginPath(); ctx.arc(b.x, b.y, 0.012 + b.r * 0.02, 0, TAU); ctx.stroke();
      });
      return;
    }
    s.items.forEach((b) => {
      const x = wrap(b.x + b.vx * t), y = wrap(b.y + b.vy * t);
      if (k === "gel" || k === "liquid") {
        const rad = k === "gel" ? 0.03 + b.r * b.r * 0.16 : 0.02 + b.r * 0.06;
        const g = ctx.createRadialGradient(x - rad * 0.3, y - rad * 0.3, rad * 0.1, x, y, rad);
        g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(0.75, "rgba(238,198,205,.18)"); g.addColorStop(1, "rgba(36,72,154,.22)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
        ctx.strokeStyle = "rgba(36,72,154,.45)"; ctx.lineWidth = 0.006; ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.lineWidth = rad * 0.12;
        ctx.beginPath(); ctx.arc(x, y, rad * 0.7, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
        if (k === "liquid" && b.k > 0.5) {
          const tw = 0.5 + 0.5 * Math.sin(t * 2 + b.a * 4);
          ctx.fillStyle = `rgba(217,164,65,${0.6 * tw})`;
          const sx = wrap(b.x * 0.7 + 0.3), sy = wrap(b.y * 0.8 - 0.2), z = 0.02 + 0.02 * tw;
          ctx.beginPath(); ctx.moveTo(sx, sy - z); ctx.lineTo(sx + z * 0.25, sy); ctx.lineTo(sx, sy + z); ctx.lineTo(sx - z * 0.25, sy); ctx.closePath(); ctx.fill();
          ctx.beginPath(); ctx.moveTo(sx - z, sy); ctx.lineTo(sx, sy + z * 0.25); ctx.lineTo(sx + z, sy); ctx.lineTo(sx, sy - z * 0.25); ctx.closePath(); ctx.fill();
        }
      } else if (k === "mineral") {
        const jx = Math.sin(t * 1.3 + b.a * 9) * 0.004, jy = Math.cos(t * 1.1 + b.a * 7) * 0.004;
        ctx.fillStyle = b.k > 0.7 ? "rgba(65,77,117,.55)" : "rgba(138,150,198,.5)";
        ctx.beginPath(); ctx.arc(b.x + jx, b.y + jy, 0.004 + b.r * 0.011, 0, TAU); ctx.fill();
      } else if (k === "powder") {
        ctx.save(); ctx.translate(x, y); ctx.rotate(b.a + t * 0.1 * (b.k - 0.5));
        blob(ctx, 0, 0, 0.012 + b.r * 0.03, b.pts, 0.9);
        ctx.fillStyle = b.k > 0.5 ? "rgba(246,221,225,.9)" : "rgba(231,236,248,.95)"; ctx.fill();
        ctx.strokeStyle = "rgba(36,72,154,.5)"; ctx.lineWidth = 0.005; ctx.stroke();
        ctx.restore();
      } else if (k === "spheres") {
        const rad = 0.025 + b.r * 0.05;
        atom(ctx, x, y, rad, b.k > 0.5 ? "#c9d3ef" : "#e8d3dc");
        ctx.strokeStyle = "rgba(36,72,154,.35)"; ctx.lineWidth = 0.005; ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.stroke();
      }
    });
  }

  /* ---------- Level 2: skin at 400× ---------- */
  function buildSkin(p) {
    const r = rng(hash(p.id + "skin"));
    const s = { kind: p.skin, cells: [], fibres: [], parts: [], mol: p.mol[0] };
    if (p.skin === "dermis") {
      for (let gy = -1.2; gy <= 1.2; gy += 0.34) for (let gx = -1.2; gx <= 1.2; gx += 0.34) {
        if (r() < 0.38) continue;
        s.cells.push({ x: gx + (r() - 0.5) * 0.2, y: gy + (r() - 0.5) * 0.2, r: 0.07 + r() * 0.05, a: r() * TAU, el: 1.4 + r() * 1.4, pts: Array.from({ length: 12 }, () => r() - 0.5), on: r() < 0.3, ph: r() * TAU });
      }
      for (let i = 0; i < 16; i++) s.fibres.push({ y: r() * 2.4 - 1.2, a: (r() - 0.5) * 1.2, f: 3 + r() * 4, ph: r() * TAU, w: 0.004 + r() * 0.006 });
      for (let i = 0; i < 46; i++) s.parts.push({ x: r() * 2.4 - 1.2, y: r() * 2.4 - 1.2, a: r() * TAU, v: 0.02 + r() * 0.03, k: r() });
    } else if (p.skin === "surface") {
      // Flattened top cells (bricks), then rounder living cells below.
      for (let row = 0; row < 5; row++) {
        const y = -0.62 + row * 0.115, off = row % 2 ? 0.14 : 0;
        for (let x = -1.3 + off; x < 1.3; x += 0.28) s.cells.push({ brick: true, x: x + (r() - 0.5) * 0.02, y, w: 0.25, h: 0.085 });
      }
      for (let gy = 0.05; gy <= 1.2; gy += 0.22) for (let gx = -1.2; gx <= 1.2; gx += 0.22) {
        s.cells.push({ x: gx + (r() - 0.5) * 0.08 + (Math.round(gy / 0.22) % 2) * 0.11, y: gy + (r() - 0.5) * 0.06, r: 0.09 + r() * 0.02, a: 0, el: 1, pts: Array.from({ length: 12 }, () => r() - 0.5), on: false, ph: r() * TAU });
      }
      for (let i = 0; i < (p.mol.includes("zn") ? 260 : 60); i++) s.parts.push({ x: r() * 2.6 - 1.3, y: -0.78 + r() * 0.12, k: r(), a: r() * TAU });
    } else {
      // Matrix: spindle fibroblasts around particles or spheres, collagen laid down over time.
      for (let i = 0; i < 8; i++) s.parts.push({ x: (i % 3 - 1) * 0.62 + (r() - 0.5) * 0.3, y: (Math.floor(i / 3) - 1) * 0.62 + (r() - 0.5) * 0.3, r: 0.09 + r() * 0.07, k: r(), pts: Array.from({ length: 7 }, () => r() - 0.5) });
      s.parts.forEach((pt) => {
        for (let j = 0; j < 2; j++) {
          const a = r() * TAU, d = pt.r + 0.08 + r() * 0.05;
          s.cells.push({ spindle: true, x: pt.x + Math.cos(a) * d, y: pt.y + Math.sin(a) * d, a: a + Math.PI / 2, r: 0.14 + r() * 0.05, ph: r() * TAU });
        }
      });
      for (let i = 0; i < 18; i++) s.fibres.push({ y: r() * 2.4 - 1.2, a: (r() - 0.5) * 2, f: 2 + r() * 3, ph: r() * TAU, w: 0.005 + r() * 0.006, d: r() });
    }
    return s;
  }

  function drawCell(ctx, c, t, glow) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a); ctx.scale(c.el, 1 / Math.sqrt(c.el));
    blob(ctx, 0, 0, c.r, c.pts, 0.28);
    ctx.restore();
    ctx.fillStyle = "rgba(244,214,222,.92)"; ctx.fill();
    ctx.strokeStyle = "rgba(136,52,81,.42)"; ctx.lineWidth = 0.007; ctx.stroke();
    if (glow) {
      ctx.strokeStyle = `rgba(217,164,65,${0.35 + 0.35 * Math.sin(t * 2 + c.ph)})`; ctx.lineWidth = 0.018; ctx.stroke();
    }
    ctx.fillStyle = "rgba(108,79,158,.55)";
    ctx.beginPath(); ctx.ellipse(c.x, c.y, c.r * 0.38 * Math.sqrt(c.el), c.r * 0.3, c.a, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(108,79,158,.8)";
    ctx.beginPath(); ctx.arc(c.x + c.r * 0.08, c.y - c.r * 0.04, c.r * 0.08, 0, TAU); ctx.fill();
  }

  function fibre(ctx, f, t, reveal) {
    ctx.strokeStyle = `rgba(36,72,154,${0.22 + f.w * 20})`; ctx.lineWidth = f.w;
    ctx.beginPath();
    const steps = 60, end = Math.floor(steps * (reveal ?? 1));
    for (let i = 0; i <= end; i++) {
      const u = -1.3 + (2.6 * i) / steps;
      const x = u * Math.cos(f.a) - (f.y + 0.04 * Math.sin(u * f.f + f.ph + t * 0.2)) * Math.sin(f.a);
      const y = u * Math.sin(f.a) + (f.y + 0.04 * Math.sin(u * f.f + f.ph + t * 0.2)) * Math.cos(f.a);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  function particleGlyph(ctx, kind, x, y, a, sc) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(sc, sc);
    ctx.lineCap = "round";
    if (kind === "pdrn" || kind === "pn") {
      const len = kind === "pn" ? 0.09 : 0.05;
      ctx.strokeStyle = COB; ctx.lineWidth = 0.008;
      ctx.beginPath(); for (let i = 0; i <= 10; i++) { const u = -len / 2 + (len * i) / 10; ctx.lineTo(u, 0.008 * Math.sin(i * 1.3)); } ctx.stroke();
      ctx.strokeStyle = COB2;
      ctx.beginPath(); for (let i = 0; i <= 10; i++) { const u = -len / 2 + (len * i) / 10; ctx.lineTo(u, -0.008 * Math.sin(i * 1.3)); } ctx.stroke();
    } else if (kind === "exo") {
      ctx.strokeStyle = COB; ctx.lineWidth = 0.006; ctx.fillStyle = "rgba(255,255,255,.7)";
      ctx.beginPath(); ctx.arc(0, 0, 0.022, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = OCH; ctx.beginPath(); ctx.arc(0.004, -0.003, 0.006, 0, TAU); ctx.fill();
    } else if (kind === "pep") {
      [[-0.02, 0, COB], [0, 0.008, BINK], [0.02, 0, OCH]].forEach(([px, py, c]) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(px, py, 0.009, 0, TAU); ctx.fill(); });
    }
    ctx.restore();
  }

  function drawSkin(ctx, s, t) {
    if (s.kind === "dermis") {
      ctx.fillStyle = "#fbf4f6"; ctx.fillRect(-1.3, -1.3, 2.6, 2.6);
      s.fibres.forEach((f) => fibre(ctx, f, t));
      s.cells.forEach((c) => drawCell(ctx, c, t, c.on));
      s.parts.forEach((p) => {
        const x = wrap(p.x + Math.cos(p.a) * p.v * t), y = wrap(p.y + Math.sin(p.a) * p.v * t);
        particleGlyph(ctx, s.mol, x, y, p.a + t * 0.3 * (p.k - 0.5), 1.1);
      });
    } else if (s.kind === "surface") {
      ctx.fillStyle = "#fbf4f6"; ctx.fillRect(-1.3, -1.3, 2.6, 2.6);
      // Air above the skin
      ctx.fillStyle = "#f4f7fc"; ctx.fillRect(-1.3, -1.3, 2.6, 0.62);
      s.cells.forEach((c) => {
        if (c.brick) {
          ctx.fillStyle = "rgba(240,206,214,.95)"; ctx.strokeStyle = "rgba(136,52,81,.4)"; ctx.lineWidth = 0.006;
          ctx.beginPath(); ctx.roundRect(c.x - c.w / 2, c.y - c.h / 2, c.w, c.h, 0.03); ctx.fill(); ctx.stroke();
        } else drawCell(ctx, c, t, false);
      });
      // Lipid mortar between the bricks
      ctx.strokeStyle = "rgba(217,164,65,.55)"; ctx.lineWidth = 0.012;
      for (let row = 0; row < 5; row++) {
        const y = -0.62 + row * 0.115 - 0.0575;
        ctx.beginPath(); ctx.moveTo(-1.3, y); ctx.lineTo(1.3, y); ctx.stroke();
      }
      // Film on top: zinc oxide grains or PN gel
      s.parts.forEach((p) => {
        const jx = Math.sin(t + p.a * 5) * 0.004;
        if (s.mol === "zn" || p.k > 0.5) {
          ctx.fillStyle = p.k > 0.6 ? "rgba(65,77,117,.6)" : "rgba(138,150,198,.6)";
          ctx.beginPath(); ctx.arc(p.x + jx, p.y, 0.008 + p.k * 0.01, 0, TAU); ctx.fill();
        } else particleGlyph(ctx, "pn", p.x + jx, p.y + 0.02, p.a, 1);
      });
      // Sun rays bouncing off the film, for zinc oxide
      if (s.mol === "zn") {
        ctx.strokeStyle = "rgba(217,164,65,.7)"; ctx.lineWidth = 0.01; ctx.setLineDash([0.03, 0.025]);
        for (let i = 0; i < 4; i++) {
          const x = -0.75 + i * 0.5, ph = ((t * 0.35 + i * 0.25) % 1);
          ctx.lineDashOffset = -ph * 0.11;
          ctx.beginPath(); ctx.moveTo(x - 0.35, -1.25); ctx.lineTo(x, -0.76); ctx.lineTo(x + 0.35, -1.25); ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    } else {
      ctx.fillStyle = "#fbf4f6"; ctx.fillRect(-1.3, -1.3, 2.6, 2.6);
      const grow = (t * 0.08) % 1.4;
      s.fibres.forEach((f) => fibre(ctx, f, t, Math.min(1, Math.max(0.15, grow - f.d * 0.4))));
      s.parts.forEach((p) => {
        if (p.k > 0.45) {
          atom(ctx, p.x, p.y, p.r, "#c9d3ef");
        } else {
          blob(ctx, p.x, p.y, p.r, p.pts, 0.7);
          ctx.fillStyle = "rgba(231,236,248,.95)"; ctx.fill(); ctx.strokeStyle = "rgba(36,72,154,.5)"; ctx.lineWidth = 0.006; ctx.stroke();
        }
      });
      s.cells.forEach((c) => {
        ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.a + Math.sin(t * 0.5 + c.ph) * 0.08);
        ctx.beginPath(); ctx.moveTo(-c.r, 0); ctx.quadraticCurveTo(0, -c.r * 0.5, c.r, 0); ctx.quadraticCurveTo(0, c.r * 0.5, -c.r, 0);
        ctx.fillStyle = "rgba(244,214,222,.95)"; ctx.fill(); ctx.strokeStyle = "rgba(136,52,81,.45)"; ctx.lineWidth = 0.006; ctx.stroke();
        ctx.fillStyle = "rgba(108,79,158,.65)"; ctx.beginPath(); ctx.ellipse(0, 0, c.r * 0.28, c.r * 0.1, 0, 0, TAU); ctx.fill();
        ctx.restore();
      });
    }
  }

  /* ---------- Level 3: molecules ---------- */
  function buildMol(p) {
    const r = rng(hash(p.id + "mol"));
    const layers = p.mol.map((kind, li) => {
      const L = { kind, items: [] };
      const share = p.mol.length > 1 ? 0.5 : 1;
      if (kind === "pdrn") for (let i = 0; i < Math.round(12 * share); i++) L.items.push({ x: (r() - 0.5) * 1.6, y: (r() - 0.5) * 1.6, a: r() * TAU, len: 0.4 + r() * 0.22, ph: r() * TAU, spin: (r() - 0.5) * 0.3 });
      if (kind === "pn" || kind === "ha") for (let i = 0; i < (kind === "ha" ? 3 : Math.max(2, Math.round(3 * share))); i++) {
        const a = r() * TAU, b = a + Math.PI + (r() - 0.5);
        L.items.push({ p0: { x: Math.cos(a) * 1.3, y: Math.sin(a) * 1.3 }, p1: { x: (r() - 0.5) * 1.6, y: (r() - 0.5) * 1.6 }, p2: { x: (r() - 0.5) * 1.6, y: (r() - 0.5) * 1.6 }, p3: { x: Math.cos(b) * 1.3, y: Math.sin(b) * 1.3 }, ph: r() * TAU });
      }
      if (kind === "exo") for (let i = 0; i < 7; i++) L.items.push({ x: (i % 3 - 1) * 0.6 + (r() - 0.5) * 0.25, y: (Math.floor(i / 3) - 1) * 0.6 + (r() - 0.5) * 0.25, r: 0.16 + r() * 0.1, ph: r() * TAU, cargo: Array.from({ length: 6 }, () => [r() - 0.5, r() - 0.5, r()]) });
      if (kind === "pep") for (let i = 0; i < 8; i++) L.items.push({ x: (i % 3 - 1) * 0.55 + (r() - 0.5) * 0.2 - 0.1, y: (Math.floor(i / 3) - 1) * 0.55 + (r() - 0.5) * 0.2, n: i < 3 ? 3 : 5, a: r() * TAU, ph: r() * TAU, cu: i < 3 });
      if (kind === "zn") L.items.push({ ox: (r() - 0.5) * 0.2, oy: (r() - 0.5) * 0.2, size: share < 1 ? 0.4 : 1.25 });
      if (kind === "plla" || kind === "pcl") for (let i = 0; i < 5; i++) L.items.push({ y: -0.9 + i * 0.45 + (r() - 0.5) * 0.1, a: (r() - 0.5) * 0.5, ph: r() * TAU });
      if (kind === "caha") L.items.push({});
      L.offset = li;
      return L;
    });
    return { layers };
  }

  function drawMol(ctx, s, t) {
    const bg = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1.3);
    bg.addColorStop(0, "#ffffff"); bg.addColorStop(1, "#eef2fb");
    ctx.fillStyle = bg; ctx.fillRect(-1.3, -1.3, 2.6, 2.6);
    s.layers.forEach((L) => {
      const k = L.kind;
      if (k === "pdrn") L.items.forEach((f) => {
        const a = f.a + t * f.spin * 0.3;
        const x = f.x + Math.sin(t * 0.3 + f.ph) * 0.03, y = f.y + Math.cos(t * 0.25 + f.ph) * 0.03;
        helix(ctx, straight(x, y, a, f.len, 48), 0.048, 0.16, f.ph + t * 1.2, 0.017);
      });
      if (k === "pn") L.items.forEach((c) => helix(ctx, curve(c.p0, c.p1, c.p2, c.p3, 160), 0.04, 0.15, c.ph + t * 1.0, 0.014));
      if (k === "ha") L.items.forEach((c) => {
        const path = curve(c.p0, c.p1, c.p2, c.p3, 40);
        ctx.strokeStyle = "rgba(136,52,81,.55)"; ctx.lineWidth = 0.006;
        path.forEach((pt, i) => {
          const w = Math.sin(t * 0.6 + i * 0.5 + c.ph) * 0.01;
          ctx.beginPath();
          for (let j = 0; j <= 6; j++) { const a = (j / 6) * TAU; ctx.lineTo(pt.x + w + Math.cos(a) * 0.022, pt.y + Math.sin(a) * 0.022); }
          ctx.stroke();
        });
      });
      if (k === "exo") L.items.forEach((v) => {
        const x = v.x + Math.sin(t * 0.25 + v.ph) * 0.04, y = v.y + Math.cos(t * 0.2 + v.ph) * 0.04;
        const R = v.r * (1 + Math.sin(t * 0.9 + v.ph) * 0.025);
        ctx.fillStyle = "rgba(246,221,225,.35)"; ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill();
        const heads = Math.round(R * 160);
        for (let i = 0; i < heads; i++) {
          const a = (i / heads) * TAU;
          [R, R - 0.034].forEach((rr, j) => {
            ctx.fillStyle = j ? COB2 : COB;
            ctx.beginPath(); ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, 0.0075, 0, TAU); ctx.fill();
          });
          ctx.strokeStyle = "rgba(36,72,154,.35)"; ctx.lineWidth = 0.003;
          ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * (R - 0.008), y + Math.sin(a) * (R - 0.008)); ctx.lineTo(x + Math.cos(a) * (R - 0.026), y + Math.sin(a) * (R - 0.026)); ctx.stroke();
        }
        v.cargo.forEach(([cx, cy, ck], i) => {
          const px = x + cx * R * 0.9, py = y + cy * R * 0.9;
          if (ck > 0.5) { ctx.fillStyle = OCH; ctx.beginPath(); ctx.arc(px, py, 0.012, 0, TAU); ctx.fill(); }
          else { ctx.strokeStyle = BINK; ctx.lineWidth = 0.005; ctx.beginPath(); for (let j = 0; j < 8; j++) ctx.lineTo(px + j * 0.007 - 0.028, py + Math.sin(j + t * 2 + i) * 0.008); ctx.stroke(); }
        });
      });
      if (k === "pep") L.items.forEach((c) => {
        const cols = [COB, BINK, OCH, COB2, HEMA];
        const pts = [];
        for (let i = 0; i < c.n; i++) {
          const a = c.a + i * 0.9 + Math.sin(t * 0.8 + c.ph + i) * 0.35;
          const prev = pts[i - 1] || { x: c.x + Math.sin(t * 0.2 + c.ph) * 0.03, y: c.y };
          pts.push(i ? { x: prev.x + Math.cos(a) * 0.115, y: prev.y + Math.sin(a) * 0.115 } : prev);
        }
        ctx.strokeStyle = "rgba(11,29,74,.45)"; ctx.lineWidth = 0.014;
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
        if (c.cu) {
          const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length + 0.05;
          ctx.setLineDash([0.012, 0.01]); ctx.strokeStyle = "rgba(217,164,65,.9)"; ctx.lineWidth = 0.005;
          pts.forEach((p) => { ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(cx, cy); ctx.stroke(); });
          ctx.setLineDash([]);
          atom(ctx, cx, cy, 0.045, OCH);
        }
        pts.forEach((p, i) => atom(ctx, p.x, p.y, 0.05, cols[i % cols.length]));
      });
      if (k === "zn") L.items.forEach((c) => {
        ctx.save(); ctx.translate(c.ox + (L.offset ? 0.45 : 0), c.oy + (L.offset ? 0.45 : 0)); ctx.rotate(t * 0.05);
        const sp = 0.13, lim = c.size;
        for (let row = -10; row <= 10; row++) for (let col = -10; col <= 10; col++) {
          const x = col * sp + (row % 2 ? sp / 2 : 0), y = row * sp * 0.866;
          if (Math.hypot(x, y) > lim) continue;
          if (col < 10) { ctx.strokeStyle = "rgba(65,77,117,.35)"; ctx.lineWidth = 0.008; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sp, y); ctx.stroke(); }
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sp / 2, y + sp * 0.866); ctx.stroke();
        }
        for (let row = -10; row <= 10; row++) for (let col = -10; col <= 10; col++) {
          const x = col * sp + (row % 2 ? sp / 2 : 0), y = row * sp * 0.866;
          if (Math.hypot(x, y) > lim) continue;
          const zn = (row + col) % 2 === 0;
          atom(ctx, x, y, zn ? 0.036 : 0.024, zn ? PERI : BINK);
        }
        ctx.restore();
      });
      if (k === "plla" || k === "pcl") L.items.forEach((c) => {
        const step = 0.07, oEvery = k === "plla" ? 3 : 7;
        const pts = [];
        for (let i = 0; i <= 40; i++) {
          const u = -1.4 + i * step;
          const yy = c.y + Math.sin(u * 2 + c.ph + t * 0.25) * 0.08 + (i % 2 ? 0.035 : -0.035);
          pts.push({ x: u * Math.cos(c.a) - yy * Math.sin(c.a), y: u * Math.sin(c.a) + yy * Math.cos(c.a) });
        }
        ctx.strokeStyle = "rgba(11,29,74,.55)"; ctx.lineWidth = 0.009;
        ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.stroke();
        pts.forEach((p, i) => {
          if (i % oEvery === 0) atom(ctx, p.x, p.y, 0.026, BINK);
          else atom(ctx, p.x, p.y, 0.019, "#9aa5c2");
          if (k === "plla" && i % 3 === 1) {
            ctx.strokeStyle = "rgba(11,29,74,.45)"; ctx.lineWidth = 0.006;
            const ny = i % 2 ? 0.05 : -0.05;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x, p.y + ny); ctx.stroke();
            atom(ctx, p.x, p.y + ny, 0.014, "#c3cad9");
          }
        });
      });
      if (k === "caha") {
        ctx.save(); ctx.rotate(t * 0.04);
        for (let ring = 0; ring < 4; ring++) {
          const n = ring ? ring * 6 : 1;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU + ring * 0.3, rr = ring * 0.14;
            const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
            atom(ctx, x, y, 0.045, OCH);
            for (let j = 0; j < 3; j++) {
              const b = a + j * 2.1 + 0.4;
              atom(ctx, x + Math.cos(b) * 0.065, y + Math.sin(b) * 0.065, 0.022, j ? BINK : COB);
            }
          }
        }
        ctx.restore();
      }
    });
  }

  /* ---------- Overlay: reticle, scale bar, vignette ---------- */
  const SCALE = [["1 cm", 0.4], ["500 µm", 0.32], ["50 µm", 0.3], ["10 nm", 0.34]];
  function overlay(ctx, level, alpha) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(36,72,154,.16)"; ctx.lineWidth = 0.004;
    ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(1, 0); ctx.moveTo(0, -1); ctx.lineTo(0, 1); ctx.stroke();
    for (let i = -9; i <= 9; i++) { ctx.beginPath(); ctx.moveTo(i * 0.1, -0.015); ctx.lineTo(i * 0.1, 0.015); ctx.stroke(); }
    const [label, len] = SCALE[level];
    ctx.fillStyle = INK; ctx.fillRect(-len / 2, 0.8, len, 0.012);
    ctx.fillRect(-len / 2, 0.785, 0.008, 0.042); ctx.fillRect(len / 2 - 0.008, 0.785, 0.008, 0.042);
    txt(ctx, label, 0, 0.77, 0.05, '700 SIZE "Nunito Sans", sans-serif');
    ctx.globalAlpha = 1;
    const v = ctx.createRadialGradient(0, 0, 0.72, 0, 0, 1.0);
    v.addColorStop(0, "rgba(11,29,74,0)"); v.addColorStop(1, "rgba(11,29,74,.32)");
    ctx.fillStyle = v; ctx.fillRect(-1.1, -1.1, 2.2, 2.2);
  }

  /* ---------- The lens ---------- */
  function mount(canvas) {
    const ctx = canvas.getContext("2d");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cache = new Map();
    let product = null, level = 0, from = 0, fromProduct = null, k = 1, kStart = 0, start = performance.now(), visible = true, size = 0;

    function scene(p, l) {
      const key = p.id + l;
      if (!cache.has(key)) cache.set(key, l === 1 ? buildTexture(p) : l === 2 ? buildSkin(p) : l === 3 ? buildMol(p) : {});
      return cache.get(key);
    }
    function drawLevel(p, l, t) {
      if (l === 0) {
        const g = ctx.createRadialGradient(0, -0.2, 0.1, 0, 0, 1.2);
        g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#e7ecf8");
        ctx.fillStyle = g; ctx.fillRect(-1.3, -1.3, 2.6, 2.6);
        drawProduct(ctx, p, t);
      } else if (l === 1) drawTexture(ctx, scene(p, 1), t);
      else if (l === 2) drawSkin(ctx, scene(p, 2), t);
      else drawMol(ctx, scene(p, 3), t);
    }

    function resize() {
      const b = canvas.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      size = b.width;
      canvas.width = Math.round(b.width * dpr); canvas.height = Math.round(b.width * dpr);
    }
    new ResizeObserver(() => { resize(); if (reduce) frame(performance.now()); }).observe(canvas);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

    function frame(now) {
      if (!product || !canvas.width) return;
      const t = reduce ? 4 : (now - start) / 1000;
      if (k < 1) k = Math.min(1, (now - kStart) / 720);
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      const R = canvas.width / 2;
      ctx.setTransform(R, 0, 0, R, R, R);
      ctx.clearRect(-1, -1, 2, 2);
      ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.clip();
      if (k < 1) {
        const zoomIn = level > from || fromProduct !== product;
        // Outgoing view: grows (zooming in) or shrinks (zooming out) and blurs away.
        ctx.save();
        ctx.globalAlpha = 1 - e;
        const so = zoomIn ? 1 + e * 2.2 : 1 - e * 0.55;
        ctx.scale(so, so);
        ctx.filter = `blur(${(e * 10).toFixed(1)}px)`;
        drawLevel(fromProduct || product, from, t);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = e;
        const si = zoomIn ? 0.45 + 0.55 * e : 2.4 - 1.4 * e;
        ctx.scale(si, si);
        ctx.filter = `blur(${((1 - e) * 10).toFixed(1)}px)`;
        drawLevel(product, level, t);
        ctx.restore();
        ctx.filter = "none";
      } else drawLevel(product, level, t);
      overlay(ctx, level, k < 1 ? e : 1);
      ctx.restore();
    }
    function loop(now) {
      requestAnimationFrame(loop);
      if (visible) frame(now);
    }

    resize();
    if (!reduce) requestAnimationFrame(loop);

    return {
      show(p, l = 0) {
        fromProduct = product; from = level;
        product = p; level = l;
        if (fromProduct) { k = 0; kStart = performance.now(); } else k = 1;
        if (reduce) { k = 1; frame(performance.now()); }
      },
      focus(l) {
        if (l === level) return;
        fromProduct = product; from = level; level = l; k = 0; kStart = performance.now();
        if (reduce) { k = 1; frame(performance.now()); }
      },
      level: () => level
    };
  }

  // A small still of one level, for the specimen spot on each slide.
  function thumb(p, level, px) {
    const c = document.createElement("canvas");
    c.width = c.height = px;
    const ctx = c.getContext("2d");
    const R = px / 2;
    ctx.setTransform(R, 0, 0, R, R, R);
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.clip();
    const s = level === 1 ? buildTexture(p) : level === 2 ? buildSkin(p) : buildMol(p);
    ctx.scale(1.6, 1.6);
    (level === 1 ? drawTexture : level === 2 ? drawSkin : drawMol)(ctx, s, 3);
    return c;
  }

  window.AlagaScope = { mount, thumb };
})();
