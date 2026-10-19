/* «Dibuja mi mapa» (agente Secciones). Sin globales.
   - Las cifras y los textos de las rutas salen del propio HTML (partes/mapa.html, lista «en texto»).
   - La geometría (trazados OSM, perfil, minutos OSRM, lugares) y el papel se piden al acercarse:
     img/mapa/rutas.json y img/mapa/papel-<1800|3600>.<avif|webp|jpg> (los genera scripts/mapa.py).
   - Coordenadas: siempre 1800 × 1324 «unidades de mapa»; el papel grande se pone en el mismo sitio. */
(() => {
  'use strict';
  const sec = document.getElementById('mapa');
  if (!sec) return;
  const $ = s => sec.querySelector(s);
  const NS = 'http://www.w3.org/2000/svg';
  const script = document.currentScript;
  const BASE = new URL('../img/mapa/', script && script.src ? script.src : location.href);
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const mueve = () => !quieto.matches;
  const TINTA = '#1c1b19', ROJO = '#a3281b', VERDE = '#236b35', RIO = '#16708b', PAPEL = '#f4ecd8';
  const COL = [TINTA, ROJO, VERDE];
  const LETRA = '"Reenie Beanie", "Segoe Print", cursive';
  // «1.023 m» como en la lista de rutas (en español, los números de 4 cifras no se agrupan por defecto)
  let NUM;
  try { NUM = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2, useGrouping: 'always' }); NUM.format(1); } catch (e) { NUM = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 }); }
  const fmt = n => NUM.format(n);
  const el = (padre, t, a, txt) => {
    const e = document.createElementNS(NS, t);
    for (const k in a) if (a[k] != null) e.setAttribute(k, a[k]);
    if (txt != null) e.textContent = txt;
    padre.appendChild(e);
    return e;
  };

  // ---------- datos que ya están en la página (las cifras de Manolo) ----------
  const INFO = {};
  sec.querySelectorAll('[data-ruta]').forEach(li => {
    INFO[li.dataset.ruta] = {
      n: li.dataset.nombre, sal: li.dataset.salida, km: +li.dataset.km, asc: +li.dataset.desnivel,
      tags: li.dataset.gustos.split(' '), t: li.querySelector('p').textContent.trim()
    };
  });
  const DESCANSOS = [...sec.querySelectorAll('[data-descanso]')].map(li => ({
    n: li.dataset.nombre, t: li.querySelector('p').textContent.trim(),
    pins: (li.dataset.lugares || '').split(/ (?=\w+:)/).filter(Boolean).map(s => { const i = s.indexOf(':'); return [s.slice(0, i), s.slice(i + 1)]; })
  }));
  const LUG = { montederramo: 'Mosteiro de Montederramo', castro_caldelas: 'Castro Caldelas', santa_cristina: 'Santa Cristina', san_paio: 'San Paio de Abeleda', parada_sil: 'Parada de Sil', doade: 'Doade', rabacallos: 'Rabacallos', chandrexa: 'Chandrexa', xunqueira: 'Xunqueira', trives: 'A Pobra de Trives', manzaneda: 'Cabeza de Manzaneda' };
  const TOPE = { suave: 420, normal: 780, fuerte: 1100 };

  const svg = $('#mapa-svg'), pliego = $('#mapa-pliego'), lista = $('#mapa-plan');
  const pSvg = $('#mapa-perfil-svg'), pZona = $('#mapa-perfil-zona'), pTit = $('#mapa-perfil-tit'), pDato = $('#mapa-perfil-dato');
  const bBajar = $('#mapa-bajar'), bVer = $('#mapa-ver'), visor = $('#mapa-visor'), visorImg = $('#mapa-visor-img'), visorBajar = $('#mapa-visor-bajar');

  let D = null, MW = 1800, MH = 1324, pxy = p => p;
  const est = { dias: 2, nivel: 'normal', gustos: new Set(['mirador', 'monasterio']), foco: null };
  let plan = [], prim = [], vb = [0, 0, 1800, 1324], vbObj = null, raf = 0, imagen = null, papelImg = null, papelAncho = 0;
  let dibujado = false, visible = false, ultimoAncho = 0;
  let perfilRef = null, perfilI = 0, punto = null, marca = null;
  sec.dataset.pintadas = '0';

  // ---------- trazo a mano ----------
  const temblor = (pts, a = 1.6) => pts.map((p, i) => [p[0] + Math.sin(i * 1.7 + p[1] * .05) * a, p[1] + Math.cos(i * 2.3 + p[0] * .04) * a]);
  const camino = pts => {
    const f = v => v.toFixed(1);
    let d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const m = [(pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2];
      d += 'Q' + f(pts[i][0]) + ' ' + f(pts[i][1]) + ' ' + f(m[0]) + ' ' + f(m[1]);
    }
    const u = pts[pts.length - 1];
    return d + 'L' + f(u[0]) + ' ' + f(u[1]);
  };
  const cache = {};
  const rutaPts = ref => cache[ref] || (cache[ref] = temblor(D.rutas[ref].p.map(pxy)));

  // ---------- composición: la misma lista sirve para el SVG y para el PNG ----------
  const componer = (rutas, pins, foco) => {
    const out = [], ley = [];
    rutas.forEach(({ ref, col, n, etq }) => {
      const pts = rutaPts(ref), op = foco && foco !== ref ? .34 : 1, inf = INFO[ref];
      out.push({ t: 'ruta', ref, d: camino(pts), col, op, pts });
      for (let i = 8; i < pts.length - 2; i += 15) {
        const a = Math.atan2(pts[i + 1][1] - pts[i - 1][1], pts[i + 1][0] - pts[i - 1][0]);
        out.push({ t: 'flecha', ref, x: pts[i][0], y: pts[i][1], a, col: ROJO, op });
      }
      out.push({ t: 'num', ref, x: pts[0][0], y: pts[0][1], n, col, op });
      ley.push({ n: etq, col, op, txt: `${ref} · ${fmt(inf.km)} km · +${fmt(inf.asc)} m` });
    });
    pins.forEach(([k, n]) => {
      const l = D.lugares[k];
      if (!l) return;
      const p = pxy(l.p);
      out.push({ t: 'punto', x: p[0], y: p[1], col: ROJO, op: 1 });
      out.push({ t: 'texto', x: p[0] + 14, y: p[1] + 8, s: 1.1, txt: n, col: ROJO, op: 1, pin: true });
    });
    if (ley.length) out.push({ t: 'leyenda', items: ley });
    return out;
  };
  const fondo = pinsYa => {
    const out = [];
    for (const k in LUG) {
      const l = D.lugares[k];
      if (!l || pinsYa.has(k)) continue;
      const p = pxy(l.p);
      out.push({ t: 'lugar', x: p[0], y: p[1], txt: LUG[k] });
    }
    return out;
  };
  const encima = () => {
    const c = pxy(D.casa);
    return [{ t: 'texto', x: 905, y: 575, s: 1.5, txt: 'Río Sil', col: RIO, op: 1, rot: -22 }, { t: 'casa', x: c[0], y: c[1] }];
  };
  const lienzo = () => {
    const pinsYa = new Set(plan.flatMap(p => p.descanso ? p.descanso.pins.map(([k]) => k) : []));
    return [...fondo(pinsYa), ...prim, ...encima()];
  };

  // ---------- SVG ----------
  const escalaTexto = () => (pliego.clientWidth < 520 ? .78 : 1);
  const pintarSvg = (lista, caja, animar) => {
    const k = (svg.clientWidth || 600) / caja[2], u = escalaTexto() / k;   // 1 px de pantalla en unidades de mapa
    svg.querySelectorAll('g.mapa-capas').forEach(g => g.remove());
    const g = el(svg, 'g', { class: 'mapa-capas' });
    const capa = { r: el(g, 'g', {}), a: el(g, 'g', {}), l: el(g, 'g', {}), t: el(g, 'g', {}) };
    const anima = animar && mueve();
    let n = 0;
    lista.forEach(p => {
      if (p.t === 'ruta') {
        const e = el(capa.r, 'path', { d: p.d, fill: 'none', stroke: p.col, 'stroke-width': 3.6 * u / escalaTexto(), 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: p.op, pathLength: 1, 'data-ref': p.ref });
        if (anima) { e.style.strokeDasharray = 1; e.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 2200, delay: 200 + (n++) * 650, fill: 'both', easing: 'cubic-bezier(.45,0,.3,1)' }); }
      } else if (p.t === 'flecha') {
        const e = el(capa.a, 'path', { d: `M${-6 * u} ${-5 * u}L${3 * u} 0L${-6 * u} ${5 * u}`, fill: 'none', stroke: p.col, 'stroke-width': 2.2 * u, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: p.op, transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${(p.a * 180 / Math.PI).toFixed(1)})` });
        if (anima) e.animate([{ opacity: 0 }, { opacity: p.op }], { duration: 500, delay: 1300 + ((p.x * 7 + p.y * 3) % 1700), fill: 'backwards' });
      } else if (p.t === 'punto') {
        el(capa.l, 'circle', { cx: p.x, cy: p.y, r: 5 * u, fill: p.col, stroke: PAPEL, 'stroke-width': 2 * u, opacity: p.op });
      } else if (p.t === 'num') {
        el(capa.l, 'circle', { cx: p.x, cy: p.y, r: 12 * u, fill: PAPEL, stroke: p.col, 'stroke-width': 2.4 * u, opacity: p.op });
        el(capa.t, 'text', { x: p.x, y: p.y + 6.5 * u, fill: p.col, 'font-size': 21 * u, 'text-anchor': 'middle', 'stroke-width': 0, opacity: p.op }, String(p.n));
      } else if (p.t === 'leyenda') {
        const f = 21 * u, paso = 28 * u, h = p.items.length * paso + 14 * u;
        const ancho = Math.min(caja[2] - 24 * u, (Math.max(...p.items.map(i => (i.n + ' · ' + i.txt).length)) * 8.2 + 54) * u);
        const x0 = caja[0] + 12 * u, y0 = caja[1] + caja[3] - 12 * u - h;
        const rect = el(capa.t, 'rect', { x: x0, y: y0, width: ancho, height: h, fill: PAPEL, 'fill-opacity': .9, stroke: TINTA, 'stroke-width': 1.4 * u, rx: 3 * u, class: 'mapa-leyenda' });
        const textos = [];
        p.items.forEach((it, i) => {
          const y = y0 + 11 * u + (i + .78) * paso;
          el(capa.t, 'line', { x1: x0 + 8 * u, x2: x0 + 30 * u, y1: y - 6 * u, y2: y - 6 * u, stroke: it.col, 'stroke-width': 3.4 * u, 'stroke-linecap': 'round', opacity: it.op });
          textos.push(el(capa.t, 'text', { x: x0 + 38 * u, y, fill: TINTA, 'font-size': f, 'stroke-width': 0, opacity: it.op }, it.n + ' · ' + it.txt));
        });
        // la caja, a la medida del texto de verdad (la letra de mano es estrecha)
        try { const m = Math.max(...textos.map(t => t.getComputedTextLength())); if (m > 0) rect.setAttribute('width', Math.min(caja[2] - 24 * u, m + 50 * u)); } catch (e) { /* sin medida: se queda la estimada */ }
      } else if (p.t === 'lugar') {
        el(capa.l, 'circle', { cx: p.x, cy: p.y, r: 3 * u, fill: TINTA });
        el(capa.t, 'text', { x: p.x + 7 * u, y: p.y + 4 * u, fill: TINTA, 'font-size': 17 * u, 'stroke-width': 4 * u }, p.txt);
      } else if (p.t === 'texto') {
        const e = el(capa.t, 'text', { x: p.x, y: p.y, fill: p.col, 'font-size': 21 * u * p.s, 'stroke-width': 5 * u, opacity: p.op, transform: p.rot ? `rotate(${p.rot} ${p.x} ${p.y})` : null }, p.txt);
        if (p.pin) { e.setAttribute('x', p.x + 14 * u - 14); e.setAttribute('y', p.y + 8 * u - 8); }
        if (anima) e.animate([{ opacity: 0 }, { opacity: p.op }], { duration: 700, delay: 900 + (n++) * 200, fill: 'backwards' });
      } else if (p.t === 'casa') {
        const h = el(capa.l, 'g', { transform: `translate(${p.x} ${p.y})`, class: 'mapa-casa' });
        el(h, 'path', { d: `M${-11 * u} ${2 * u}L0 ${-10 * u}L${11 * u} ${2 * u}V${12 * u}H${-11 * u}Z`, fill: ROJO, stroke: PAPEL, 'stroke-width': 2 * u, 'stroke-linejoin': 'round' });
        el(h, 'rect', { x: -3 * u, y: 5 * u, width: 6 * u, height: 7 * u, fill: PAPEL });
        el(capa.t, 'text', { x: p.x + 16 * u, y: p.y - 10 * u, fill: ROJO, 'font-size': 26 * u, 'stroke-width': 6 * u, transform: `rotate(-4 ${p.x} ${p.y})` }, 'aquí dormimos');
      }
    });
    if (punto) svg.appendChild(punto);   // el punto del perfil, siempre encima
    sec.dataset.pintadas = String(+sec.dataset.pintadas + 1);
  };

  // ---------- encuadre ----------
  const bbox = lista => {
    const c = pxy(D.casa);
    let x0 = c[0], x1 = c[0], y0 = c[1], y1 = c[1];
    lista.forEach(p => {
      const pts = p.pts || (p.x != null && p.t !== 'lugar' && p.t !== 'texto' ? [[p.x, p.y]] : []);
      pts.forEach(([x, y]) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); });
    });
    return [x0, y0, x1, y1];
  };
  const ajustar = (b, ratio, pad = .12, minW = 520) => {
    let w = (b[2] - b[0]) * (1 + pad * 2), h = (b[3] - b[1]) * (1 + pad * 2);
    w = Math.max(w, minW, h * ratio);
    h = w / ratio;
    if (w > MW) { w = MW; h = w / ratio; }
    if (h > MH) { h = MH; w = h * ratio; }
    const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2 + h * .04;   // un poco de aire abajo para la leyenda
    return [Math.max(0, Math.min(MW - w, cx - w / 2)), Math.max(0, Math.min(MH - h, cy - h / 2)), w, h];
  };
  const razon = () => (pliego.clientWidth / pliego.clientHeight) || (MW / MH);
  const objetivo = () => {
    const r = razon();
    if (est.foco) return ajustar(bbox(prim.filter(p => p.ref === est.foco)), r, .14, 420);
    return ajustar(bbox(prim), r, .12, 520);
  };
  const ponerVb = a => { vb = a; svg.setAttribute('viewBox', a.map(v => v.toFixed(1)).join(' ')); };
  const viaje = a => {
    cancelAnimationFrame(raf);
    if (!mueve()) { ponerVb(a); return; }
    const de = vb.slice(), t0 = performance.now();
    const paso = t => {
      const k = Math.min(1, (t - t0) / 900), e = k * k * (3 - 2 * k);
      ponerVb(de.map((v, i) => v + (a[i] - v) * e));
      if (k < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
  };

  // ---------- papel: 1800 para ver entero, 3600 al acercarse y para el PNG ----------
  // El formato lo elige el navegador con un <picture> (AVIF, WebP o JPG); luego la misma URL va al SVG desde la caché.
  const cargarPapel = ancho => new Promise((ok, mal) => {
    const pic = document.createElement('picture');
    pic.innerHTML = `<source type="image/avif" srcset="${new URL(`papel-${ancho}.avif`, BASE)}"><source type="image/webp" srcset="${new URL(`papel-${ancho}.webp`, BASE)}">`;
    const im = document.createElement('img');
    im.alt = '';
    im.decoding = 'async';
    im.src = new URL(`papel-${ancho}.jpg`, BASE).href;
    pic.appendChild(im);
    im.onload = () => ok(im);
    im.onerror = mal;
  });
  let pidiendo = null;
  const papel = async ancho => {
    if (papelAncho >= ancho) return papelImg;
    if (pidiendo && pidiendo.ancho >= ancho) return pidiendo.p;
    const p = cargarPapel(ancho).then(im => {
      if (ancho > papelAncho) {
        papelAncho = ancho; papelImg = im;
        imagen.setAttribute('href', im.currentSrc || im.src);
        sec.dataset.papel = String(ancho);
      }
      return im;
    });
    pidiendo = { ancho, p };
    return p;
  };
  const papelSegunZoom = caja => {
    const necesita = pliego.clientWidth * Math.min(devicePixelRatio || 1, 3) * MW / caja[2];
    if (necesita > 1900) papel(3600).catch(() => {});
  };

  // ---------- el plan ----------
  const elegir = () => {
    const { dias, nivel, gustos } = est;
    const cand = Object.keys(INFO).filter(r => INFO[r].asc <= TOPE[nivel] && D.rutas[r]);
    const puntua = r => 3 * INFO[r].tags.filter(t => gustos.has(t)).length + (gustos.size ? 0 : 1) - INFO[r].asc / 2000 - D.rutas[r].coche / 70;
    cand.sort((a, b) => puntua(b) - puntua(a));
    const elegidas = [];
    for (const r of cand) {
      if (elegidas.length >= dias) break;
      if (gustos.size && !INFO[r].tags.some(t => gustos.has(t)) && elegidas.length) continue;
      if (elegidas.some(e => INFO[e].sal === INFO[r].sal) && cand.some(o => !elegidas.includes(o) && INFO[o].sal !== INFO[r].sal && puntua(o) > 0)) continue;
      elegidas.push(r);
    }
    for (const r of cand) { if (elegidas.length >= dias) break; if (!elegidas.includes(r)) elegidas.push(r); }
    const out = elegidas.slice(0, dias).map(r => ({ ruta: r }));
    let d = 0;
    while (out.length < dias) out.push({ descanso: DESCANSOS[d++ % DESCANSOS.length] });
    return out;
  };
  const colDe = ref => COL[Math.max(0, plan.findIndex(p => p.ruta === ref)) % 3];

  const dibujar = animar => {
    const rutas = plan.map((p, i) => p.ruta ? { ref: p.ruta, col: COL[i % 3], n: i + 1, etq: 'Día ' + (i + 1) } : null).filter(Boolean);
    const pins = plan.flatMap(p => p.descanso ? p.descanso.pins : []);
    prim = componer(rutas, pins, est.foco);
    vbObj = objetivo();
    pintarSvg(lienzo(), vbObj, animar);
    papelSegunZoom(vbObj);
    viaje(vbObj);
    ultimoAncho = pliego.clientWidth;
  };

  const tarjetas = () => {
    lista.textContent = '';
    if (!est.gustos.size) {
      const li = document.createElement('li');
      li.className = 'mapa-aviso';
      li.textContent = 'Sin gustos marcados: salen las rutas más cómodas. Marca lo que te apetezca y el mapa cambia.';
      lista.appendChild(li);
    }
    plan.forEach((p, i) => {
      const li = document.createElement('li'), col = COL[i % 3];
      li.style.setProperty('--c', col);
      if (p.ruta) {
        const inf = INFO[p.ruta], r = D.rutas[p.ruta];
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mapa-dia';
        b.setAttribute('aria-pressed', String(est.foco === p.ruta));
        b.dataset.ruta = p.ruta;
        b.innerHTML = '<span class="mapa-dia-cab"><span class="mapa-dia-n"></span><span class="mapa-dia-sal"></span></span><span class="mapa-dia-tit"></span><span class="mapa-dia-txt"></span><span class="mapa-datos"></span><span class="mapa-dia-zoom" aria-hidden="true"></span>';
        b.querySelector('.mapa-dia-n').textContent = `Día ${i + 1} · ${p.ruta}`;
        b.querySelector('.mapa-dia-sal').textContent = inf.sal;
        b.querySelector('.mapa-dia-tit').textContent = inf.n;
        b.querySelector('.mapa-dia-txt').textContent = inf.t;
        const datos = b.querySelector('.mapa-datos');
        [`${fmt(inf.km)} km`, `+${fmt(inf.asc)} m`, `${r.zmin}–${r.zmax} m de altura`, r.coche ? `${r.coche} min en coche` : null].filter(Boolean).forEach(t => {
          const s = document.createElement('span'); s.textContent = t; datos.appendChild(s);
        });
        b.querySelector('.mapa-dia-zoom').textContent = est.foco === p.ruta ? 'Ver el plan entero' : 'Acercar en el mapa';
        b.addEventListener('click', () => enfocar(p.ruta));
        li.appendChild(b);
      } else {
        const d = document.createElement('div');
        d.className = 'mapa-dia mapa-dia--libre';
        d.innerHTML = '<span class="mapa-dia-cab"><span class="mapa-dia-n"></span></span><span class="mapa-dia-tit"></span><span class="mapa-dia-txt"></span>';
        d.querySelector('.mapa-dia-n').textContent = `Día ${i + 1} · sin mochila`;
        d.querySelector('.mapa-dia-tit').textContent = p.descanso.n;
        d.querySelector('.mapa-dia-txt').textContent = p.descanso.t;
        if (p.descanso.pins.length) {
          const datos = document.createElement('span');
          datos.className = 'mapa-datos';
          p.descanso.pins.forEach(([k, n]) => {
            const s = document.createElement('span');
            const m = D.lugares[k] && D.lugares[k].min;
            s.textContent = m ? `${n} · ${m} min` : n;
            datos.appendChild(s);
          });
          d.appendChild(datos);
        }
        li.appendChild(d);
      }
      lista.appendChild(li);
    });
  };

  const decir = () => {
    const partes = plan.map((p, i) => p.ruta
      ? `día ${i + 1}, ${p.ruta} ${INFO[p.ruta].n}, ${fmt(INFO[p.ruta].km)} km y ${fmt(INFO[p.ruta].asc)} m de desnivel, desde ${INFO[p.ruta].sal}`
      : `día ${i + 1}, ${p.descanso.n.toLowerCase()}`);
    let t = `Tu plan de ${plan.length} ${plan.length === 1 ? 'día' : 'días'}: ${partes.join('; ')}.`;
    if (est.foco) t = `Mapa acercado a ${est.foco}, ${INFO[est.foco].n}. ` + t;
    const rutas = plan.filter(p => p.ruta), km = rutas.reduce((a, p) => a + INFO[p.ruta].km, 0), asc = rutas.reduce((a, p) => a + INFO[p.ruta].asc, 0);
    const libres = plan.length - rutas.length;
    $('#mapa-total').textContent = `${plan.length} ${plan.length === 1 ? 'día' : 'días'} · ` + (rutas.length ? `${fmt(Math.round(km * 10) / 10)} km · +${fmt(asc)} m andando` : 'sin mochila') + (rutas.length && libres ? ` · ${libres} sin mochila` : '');
    $('#mapa-dicho').textContent = ' ' + t;
  };

  // ---------- perfil de altura ----------
  const perfil = () => {
    const ref = est.foco || (plan.find(p => p.ruta) || {}).ruta;
    perfilRef = ref || null;
    pSvg.textContent = '';
    if (punto) punto.remove();
    punto = marca = null;
    if (!ref) {
      pTit.textContent = 'Perfil de la ruta';
      pDato.textContent = 'Sin rutas: días sin mochila';
      pZona.setAttribute('aria-valuetext', 'Sin ruta');
      pZona.setAttribute('tabindex', '-1');
      return;
    }
    pZona.setAttribute('tabindex', '0');
    const r = D.rutas[ref], inf = INFO[ref], P = r.perfil, kmMax = P[P.length - 1][0], zmin = r.zmin - 10, zmax = r.zmax + 10;
    const X = k => k / kmMax * 600, Y = z => 112 - (z - zmin) / (zmax - zmin) * 98;
    const d = P.map((q, i) => (i ? 'L' : 'M') + X(q[0]).toFixed(1) + ' ' + Y(q[1]).toFixed(1)).join('');
    const col = colDe(ref);
    el(pSvg, 'path', { d: d + 'L600 120L0 120Z', fill: col, opacity: .13 });
    el(pSvg, 'path', { d, fill: 'none', stroke: col, 'stroke-width': 2.2, 'vector-effect': 'non-scaling-stroke', 'stroke-linejoin': 'round' });
    marca = el(pSvg, 'line', { x1: 0, x2: 0, y1: 4, y2: 120, stroke: ROJO, 'stroke-width': 1.5, 'vector-effect': 'non-scaling-stroke', opacity: 0 });
    pTit.textContent = `${ref} · ${inf.n}`;
    pDato.textContent = `${fmt(inf.km)} km · +${fmt(inf.asc)} m · de ${r.zmin} a ${r.zmax} m`;
    pZona.setAttribute('aria-valuetext', `${ref}: ${pDato.textContent}`);
    pZona.setAttribute('aria-valuenow', '0');
    const k = (svg.clientWidth || 600) / (vbObj || vb)[2];
    punto = el(svg, 'circle', { class: 'mapa-punto', r: 8 / k, fill: ROJO, stroke: '#fff', 'stroke-width': 2.5 / k, opacity: 0 });
  };
  const perfilEn = f => {
    if (!perfilRef || !marca) return;
    const r = D.rutas[perfilRef], P = r.perfil;
    f = Math.max(0, Math.min(1, f));
    perfilI = Math.round(f * (P.length - 1));
    marca.setAttribute('x1', f * 600); marca.setAttribute('x2', f * 600); marca.setAttribute('opacity', 1);
    const q = pxy(r.p[perfilI]);
    punto.setAttribute('cx', q[0].toFixed(1)); punto.setAttribute('cy', q[1].toFixed(1)); punto.setAttribute('opacity', 1);
    // el perfil va en km medidos sobre el trazado de OSM; se dice como «km aprox.»
    pDato.textContent = `km ${fmt(P[perfilI][0])} (aprox.) · ${P[perfilI][1]} m`;
    pZona.setAttribute('aria-valuenow', String(Math.round(f * 100)));
    pZona.setAttribute('aria-valuetext', `Kilómetro ${fmt(P[perfilI][0])}, ${P[perfilI][1]} metros de altura`);
  };
  const perfilFuera = () => {
    if (!perfilRef || !marca) return;
    marca.setAttribute('opacity', 0); punto.setAttribute('opacity', 0);
    const r = D.rutas[perfilRef], inf = INFO[perfilRef];
    pDato.textContent = `${fmt(inf.km)} km · +${fmt(inf.asc)} m · de ${r.zmin} a ${r.zmax} m`;
  };
  pZona.addEventListener('pointermove', e => { const b = pZona.getBoundingClientRect(); perfilEn((e.clientX - b.left) / b.width); });
  pZona.addEventListener('pointerdown', e => { const b = pZona.getBoundingClientRect(); perfilEn((e.clientX - b.left) / b.width); });
  pZona.addEventListener('pointerleave', perfilFuera);
  pZona.addEventListener('blur', perfilFuera);
  pZona.addEventListener('keydown', e => {
    if (!perfilRef) return;
    const n = D.rutas[perfilRef].perfil.length - 1, paso = Math.max(1, Math.round(n / 40));
    let i = perfilI;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') i += paso;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') i -= paso;
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n;
    else return;
    e.preventDefault();
    perfilEn(Math.max(0, Math.min(n, i)) / n);
  });

  // ---------- mandos ----------
  const rehacer = animar => {
    plan = elegir();
    tarjetas();
    dibujar(animar);
    perfil();
    decir();
  };
  const enfocar = ref => {
    est.foco = est.foco === ref ? null : ref;
    // las tarjetas se rehacen: el foco del teclado vuelve a la misma
    tarjetas();
    const b = lista.querySelector(`.mapa-dia[data-ruta="${ref}"]`);
    if (b) b.focus({ preventScroll: true });
    dibujar(false);
    perfil();
    decir();
  };
  sec.querySelectorAll('.mapa-fila').forEach(fila => {
    const g = fila.dataset.grupo;
    fila.querySelectorAll('.mapa-opcion').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.valor;
      if (g === 'gustos') {
        est.gustos.has(v) ? est.gustos.delete(v) : est.gustos.add(v);
        b.setAttribute('aria-pressed', String(est.gustos.has(v)));
      } else {
        fila.querySelectorAll('.mapa-opcion').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
        est[g] = g === 'dias' ? +v : v;
      }
      est.foco = null;
      if (D) rehacer(true);
    }));
  });

  // ---------- el mapa como imagen ----------
  let urlPng = null;
  const hacerPng = async () => {
    try { await document.fonts.load(`40px ${LETRA}`); } catch (e) { /* sin letra de mano: sale con la de reserva */ }
    const im = await papel(3600).catch(() => papelImg);
    const caja = vbObj || vb;
    const W = 1800, H = Math.round(W * caja[3] / caja[2]), k = W / caja[2];
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.fillStyle = PAPEL; x.fillRect(0, 0, W, H);
    if (im) x.drawImage(im, caja[0] / MW * im.naturalWidth, caja[1] / MH * im.naturalHeight, caja[2] / MW * im.naturalWidth, caja[3] / MH * im.naturalHeight, 0, 0, W, H);
    const X = v => (v - caja[0]) * k, Y = v => (v - caja[1]) * k;
    const mano = (t, px, xx, yy, col, rot = 0, centro = false) => {
      x.save(); x.translate(xx, yy); x.rotate(rot * Math.PI / 180);
      x.font = `${px}px ${LETRA}`; x.textAlign = centro ? 'center' : 'left';
      x.lineJoin = 'round'; x.lineWidth = px * .26; x.strokeStyle = PAPEL; x.strokeText(t, 0, 0);
      x.fillStyle = col; x.fillText(t, 0, 0); x.restore();
    };
    const pie = 110;
    // en el PNG se pinta por capas, como en el SVG: trazos, flechas, marcas, letras y leyenda
    const CAPA = { ruta: 0, flecha: 1, lugar: 2, punto: 2, num: 2, casa: 2, texto: 3, leyenda: 4 };
    lienzo().map((p, i) => [p, i]).sort((a, b) => (CAPA[a[0].t] - CAPA[b[0].t]) || (a[1] - b[1])).map(([p]) => p).forEach(p => {
      x.globalAlpha = p.op == null ? 1 : p.op;
      if (p.t === 'ruta') {
        x.save(); x.setTransform(k, 0, 0, k, -caja[0] * k, -caja[1] * k);
        x.strokeStyle = p.col; x.lineWidth = 6.5 / k; x.lineCap = x.lineJoin = 'round'; x.stroke(new Path2D(p.d)); x.restore();
      } else if (p.t === 'flecha') {
        x.save(); x.translate(X(p.x), Y(p.y)); x.rotate(p.a); x.strokeStyle = p.col; x.lineWidth = 3.4; x.lineCap = x.lineJoin = 'round';
        x.beginPath(); x.moveTo(-9, -7); x.lineTo(5, 0); x.lineTo(-9, 7); x.stroke(); x.restore();
      } else if (p.t === 'punto') {
        x.beginPath(); x.arc(X(p.x), Y(p.y), 8, 0, 7); x.fillStyle = p.col; x.fill(); x.lineWidth = 3; x.strokeStyle = PAPEL; x.stroke();
      } else if (p.t === 'num') {
        x.beginPath(); x.arc(X(p.x), Y(p.y), 19, 0, 7); x.fillStyle = PAPEL; x.fill(); x.lineWidth = 3.6; x.strokeStyle = p.col; x.stroke();
        mano(String(p.n), 34, X(p.x), Y(p.y) + 11, p.col, 0, true);
      } else if (p.t === 'leyenda') {
        const f = 34, paso = 44, h = p.items.length * paso + 22;
        x.font = `${f}px ${LETRA}`;
        const ancho = Math.min(W - 48, Math.max(...p.items.map(i => x.measureText(i.n + ' · ' + i.txt).width)) + 92);
        const x0 = 24, y0 = H - pie - 24 - h - 14;
        x.globalAlpha = 1; x.fillStyle = 'rgba(244,236,216,.92)'; x.fillRect(x0, y0, ancho, h); x.lineWidth = 2; x.strokeStyle = TINTA; x.strokeRect(x0, y0, ancho, h);
        p.items.forEach((it, i) => {
          const y = y0 + 16 + (i + .78) * paso;
          x.globalAlpha = it.op; x.strokeStyle = it.col; x.lineWidth = 5; x.lineCap = 'round';
          x.beginPath(); x.moveTo(x0 + 14, y - 9); x.lineTo(x0 + 48, y - 9); x.stroke();
          mano(it.n + ' · ' + it.txt, f, x0 + 62, y, TINTA);
        });
      } else if (p.t === 'lugar') {
        x.beginPath(); x.arc(X(p.x), Y(p.y), 4, 0, 7); x.fillStyle = TINTA; x.fill(); mano(p.txt, 28, X(p.x) + 10, Y(p.y) + 7, TINTA);
      } else if (p.t === 'texto') {
        mano(p.txt, 33 * p.s, X(p.x), Y(p.y), p.col, p.rot || 0);
      } else if (p.t === 'casa') {
        const a = X(p.x), b = Y(p.y);
        x.fillStyle = ROJO; x.strokeStyle = PAPEL; x.lineWidth = 3;
        x.beginPath(); x.moveTo(a - 16, b + 3); x.lineTo(a, b - 15); x.lineTo(a + 16, b + 3); x.lineTo(a + 16, b + 18); x.lineTo(a - 16, b + 18); x.closePath(); x.fill(); x.stroke();
        x.fillStyle = PAPEL; x.fillRect(a - 4, b + 8, 8, 10);
        mano('aquí dormimos', 40, a + 24, b - 16, ROJO, -4);
      }
      x.globalAlpha = 1;
    });
    // el pie del mapa: título, autoría y licencias
    x.fillStyle = 'rgba(244,236,216,.94)'; x.fillRect(24, H - pie - 20, W - 48, pie); x.strokeStyle = TINTA; x.lineWidth = 2; x.strokeRect(24, H - pie - 20, W - 48, pie);
    mano(`Tu mapa de ${plan.length} ${plan.length === 1 ? 'día' : 'días'} · Caserío da Castiñeira`, 48, 48, H - pie + 30, ROJO);
    x.font = '500 19px "Geist Mono", ui-monospace, monospace'; x.fillStyle = TINTA; x.textAlign = 'left';
    x.fillText('Ejemplo: el de verdad lo dibuja Manolo · km y desnivel: Manolo Rolán · trazados aprox. © OpenStreetMap · relieve MDT25 © IGN', 48, H - pie + 70);
    const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'));
    if (urlPng) URL.revokeObjectURL(urlPng);
    urlPng = URL.createObjectURL(blob);
    sec.dataset.png = `${W}x${H}`;
    return urlPng;
  };
  const ocupado = (b, si) => { b.disabled = si; b.setAttribute('aria-busy', String(si)); };
  bBajar.addEventListener('click', async () => {
    ocupado(bBajar, true);
    try {
      const url = await hacerPng();
      const a = document.createElement('a');
      a.href = url; a.download = 'mapa-caserio-da-castineira.png';
      document.body.appendChild(a); a.click(); a.remove();
    } finally { ocupado(bBajar, false); }
  });
  bVer.addEventListener('click', async () => {
    ocupado(bVer, true);
    try {
      const url = await hacerPng();
      visorImg.src = url;
      visorBajar.href = url;
      if (typeof visor.showModal === 'function') visor.showModal(); else visor.setAttribute('open', '');
      $('#mapa-visor-cerrar').focus();
    } finally { ocupado(bVer, false); }
  });
  const cerrar = () => { if (visor.open) { if (typeof visor.close === 'function') visor.close(); else visor.removeAttribute('open'); } };
  $('#mapa-visor-cerrar').addEventListener('click', cerrar);
  visor.addEventListener('click', e => { if (e.target === visor) cerrar(); });
  visor.addEventListener('close', () => bVer.focus());

  // ---------- arranque perezoso ----------
  const carga = $('#mapa-carga');
  const arrancar = () => {
    if (!D || !visible || dibujado) return;
    dibujado = true;
    rehacer(true);
    bBajar.disabled = bVer.disabled = false;
    sec.classList.add('mapa--listo');
  };
  let pedido = false;
  const pedir = () => {
    if (pedido) return;
    pedido = true;
    fetch(new URL('rutas.json', BASE))
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(async datos => {
        D = datos; MW = D.w; MH = D.h;
        pxy = p => [p[0] / 100 * MW, p[1] / 100 * MH];
        imagen = el(svg, 'image', { x: 0, y: 0, width: MW, height: MH, preserveAspectRatio: 'none', class: 'mapa-papel' });
        svg.insertBefore(imagen, svg.querySelector('title').nextSibling);
        // si el plan inicial se ve muy de cerca (móvil, pantallas densas), se pide directamente el grande
        const necesita = pliego.clientWidth * Math.min(devicePixelRatio || 1, 3) * MW / 900;
        await papel(necesita > 1900 ? 3600 : 1800).catch(() => {});
        carga.hidden = true;
        arrancar();
      })
      .catch(() => { carga.textContent = 'No se ha podido cargar el mapa. Las rutas están en texto aquí debajo.'; });
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) pedir(); }, { rootMargin: '900px 0px' }).observe(sec);
    new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); arrancar(); }, { threshold: .25 }).observe(pliego);
  } else { visible = true; pedir(); }

  // Solo se repinta si cambia el ANCHO: la barra del móvil (solo alto) no rehace nada.
  new ResizeObserver(() => {
    const w = pliego.clientWidth;
    if (!dibujado || !w || w === ultimoAncho) return;
    ultimoAncho = w;
    vbObj = objetivo();
    cancelAnimationFrame(raf);
    ponerVb(vbObj);
    pintarSvg(lienzo(), vbObj, false);
    perfil();
    papelSegunZoom(vbObj);
  }).observe(pliego);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (dibujado) pintarSvg(lienzo(), vbObj, false); });
})();
