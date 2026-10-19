/* «Un año en la casa» (agente Secciones). Sin globales.
   Los textos de los meses salen de la lista del HTML (partes/anio.html). Empieza en el mes de hoy.
   - Fundido entre las cuatro fotos de estación al cambiar de estación (sin mezclas fijas, que enturbian).
   - Lo que cae del cielo: nieve, pétalos, polvo dorado y hojas. Fuera con movimiento reducido,
     con html.densidad-sobria, fuera de pantalla y con la pestaña oculta.
   - El resize de la barra del móvil (solo cambia el alto) no rehace nada. */
(() => {
  'use strict';
  const sec = document.getElementById('anio');
  if (!sec) return;
  const $ = s => sec.querySelector(s);
  const raiz = document.documentElement;
  const quieto = matchMedia('(prefers-reduced-motion: reduce)');
  const mueve = () => !quieto.matches;
  const sobria = () => raiz.classList.contains('densidad-sobria');

  const MES = [...sec.querySelectorAll('#anio-meses > li')].map(li => ({
    n: li.querySelector('b').textContent.trim(),
    h: li.querySelector('i').textContent.trim(),
    t: li.querySelector('span').textContent.trim(),
    c: (li.dataset.cerca || '').split('|').filter(Boolean)
  }));
  if (MES.length !== 12) return;
  const EST = [{ n: 'Invierno', c: '#cfd9e3' }, { n: 'Primavera', c: '#b5d27a' }, { n: 'Verano', c: '#e8c35b' }, { n: 'Otoño', c: '#ee9a4a' }];
  const CLAVE = [.5, 3.5, 6.5, 9.5];   // el centro de cada estación, en meses
  const pesos = m => CLAVE.map(k => { let d = Math.abs(m + .5 - k); d = Math.min(d, 12 - d); return Math.max(0, 1 - d / 3); });
  const HOY = new Date().getMonth();

  const esc = $('#anio-escena'), reloj = $('#anio-reloj'), carta = $('#anio-carta');
  const fotos = [...esc.querySelectorAll('.anio-foto')].sort((a, b) => +a.dataset.est - +b.dataset.est);
  const bPasar = $('#anio-pasar'), bHoy = $('#anio-hoy');
  let mes = HOY, tPasar = 0, visible = false, tFundido = 0;

  // ---------- el reloj ----------
  const btns = MES.map((m, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'anio-hora';
    b.textContent = m.n.slice(0, 3);
    b.setAttribute('aria-label', m.n + (i === HOY ? ' (este mes)' : ''));
    b.style.setProperty('--a', i * 30 + 'deg');
    b.dataset.mes = String(i);
    if (i === HOY) b.classList.add('anio-hora--hoy');
    b.addEventListener('click', () => ir(i, true));
    b.addEventListener('keydown', e => {
      const k = e.key;
      let j = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') j = (mes + 1) % 12;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') j = (mes + 11) % 12;
      else if (k === 'Home') j = 0;
      else if (k === 'End') j = 11;
      if (j == null) return;
      e.preventDefault();
      ir(j, true);
      btns[j].focus();
    });
    reloj.appendChild(b);
    return b;
  });
  let anchoReloj = 0;
  const medirReloj = () => {
    const w = reloj.clientWidth;
    if (!w || w === anchoReloj) return;
    anchoReloj = w;
    reloj.style.setProperty('--R', (w * .41).toFixed(1) + 'px');
  };

  // ---------- un mes ----------
  const ponerTexto = (sel, t) => { const e = $(sel); if (e.textContent !== t) e.textContent = t; };
  const ir = (i, manual) => {
    mes = i;
    if (manual) parar();
    const w = pesos(i), d = w.indexOf(Math.max(...w)), e = EST[d];
    // fundido: la que se va queda debajo y opaca mientras la nueva aparece encima; luego, solo la del mes
    const antes = fotos.findIndex(f => f.classList.contains('anio-foto--ya'));
    fotos.forEach((f, k) => {
      f.style.transition = mueve() ? 'opacity 1.1s ease' : 'none';
      f.classList.toggle('anio-foto--ya', k === d);
      f.style.zIndex = k === d ? '-2' : (k === antes ? '-3' : '-4');
      f.style.opacity = k === d || (k === antes && mueve()) ? '1' : '0';
    });
    clearTimeout(tFundido);
    if (antes >= 0 && antes !== d) tFundido = setTimeout(() => { const f = fotos[antes]; if (!f.classList.contains('anio-foto--ya')) { f.style.transition = 'none'; f.style.opacity = '0'; } }, mueve() ? 1150 : 0);
    esc.style.setProperty('--est', e.c);
    sec.dataset.estacion = String(d);
    sec.dataset.mes = String(i);
    btns.forEach((b, k) => {
      b.setAttribute('aria-pressed', String(k === i));
      b.tabIndex = k === i ? 0 : -1;   // un solo tabulador para el reloj; dentro, flechas
    });
    ponerTexto('#anio-est', e.n);
    ponerTexto('#anio-mes', MES[i].n);
    ponerTexto('#anio-txt', MES[i].t);
    const ul = $('#anio-cerca');
    ul.textContent = '';
    MES[i].c.forEach(c => { const li = document.createElement('li'); li.textContent = c; ul.appendChild(li); });
    ponerTexto('#anio-reloj-mes', MES[i].n);
    ponerTexto('#anio-reloj-est', e.n);
    cielo.tipo(d);
  };

  // ---------- lo que cae del cielo ----------
  const cielo = (() => {
    const cv = $('#anio-cielo'), x = cv.getContext && cv.getContext('2d');
    let W = 0, H = 0, P = [], raf = 0, tipo = 0;
    const nuevo = (p, primera) => {
      p.x = Math.random() * W; p.y = primera ? Math.random() * H : -12;
      p.r = Math.random(); p.ph = Math.random() * 6.28; p.a = Math.random() * 6.28; p.va = (Math.random() - .5) * .05; p.k = Math.random();
    };
    const medir = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      const w = Math.round(r.width), h = Math.round(r.height);
      if (!w || !h || (w === W && h === H)) return false;
      const cambiaAncho = w !== W;
      W = w; H = h;
      cv.width = W * dpr; cv.height = H * dpr;
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (cambiaAncho || !P.length) P = Array.from({ length: Math.round(Math.min(110, W / 9)) }, () => { const p = {}; nuevo(p, true); return p; });
      return true;
    };
    const hoja = (p, s, col) => {
      x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = col;
      x.beginPath(); x.moveTo(-s, 0); x.quadraticCurveTo(0, -s * .6, s, 0); x.quadraticCurveTo(0, s * .6, -s, 0); x.fill();
      x.strokeStyle = 'rgb(60 30 10 / .55)'; x.lineWidth = .8; x.beginPath(); x.moveTo(-s, 0); x.lineTo(s, 0); x.stroke(); x.restore();
    };
    const pintar = () => {
      x.clearRect(0, 0, W, H);
      for (const p of P) {
        p.ph += .02; p.a += p.va;
        if (tipo === 0) { p.y += .5 + p.r * .9; p.x += Math.sin(p.ph) * .35; x.fillStyle = 'rgb(255 255 255 / .88)'; x.beginPath(); x.arc(p.x, p.y, .9 + p.r * 2.2, 0, 7); x.fill(); }
        else if (tipo === 1) { p.y += .3 + p.r * .5; p.x += Math.sin(p.ph) * .6; p.a += .01; x.save(); x.translate(p.x, p.y); x.rotate(p.a); x.fillStyle = p.k > .5 ? 'rgb(255 236 240 / .85)' : 'rgb(235 246 205 / .8)'; x.beginPath(); x.ellipse(0, 0, 3 + p.r * 2.5, 1.7 + p.r, 0, 0, 7); x.fill(); x.restore(); }
        else if (tipo === 2) { p.y += Math.sin(p.ph * .6) * .25 - .08; p.x += Math.cos(p.ph * .5) * .3; if (p.y < -10) p.y = H + 5; x.fillStyle = `rgb(255 224 130 / ${(.25 + .5 * Math.abs(Math.sin(p.ph))).toFixed(2)})`; x.beginPath(); x.arc(p.x, p.y, 1 + p.r * 1.8, 0, 7); x.fill(); }
        else { p.y += .55 + p.r * 1.1; p.x += Math.sin(p.ph) * .9 + .15; p.a += .035; hoja(p, 6 + p.r * 6, ['#d9822b', '#b9501f', '#e0b040', '#8a5a2b'][Math.floor(p.k * 4)]); }
        if (p.y > H + 14 || p.x > W + 20 || p.x < -20) nuevo(p, false);
      }
    };
    const bucle = () => { pintar(); raf = requestAnimationFrame(bucle); };
    const debe = () => !!x && visible && mueve() && !sobria() && !document.hidden;
    const decidir = () => {
      const si = debe();
      sec.dataset.cielo = si ? 'vivo' : 'quieto';
      if (si && !raf) { medir(); raf = requestAnimationFrame(bucle); }
      else if (!si && raf) { cancelAnimationFrame(raf); raf = 0; }
      if (!si && x && W) x.clearRect(0, 0, W, H);
    };
    if (x) new ResizeObserver(() => { medir(); }).observe(cv);
    return { tipo: t => { tipo = t; }, decidir };
  })();

  // ---------- pasar el año ----------
  const parar = () => {
    clearInterval(tPasar); tPasar = 0;
    bPasar.setAttribute('aria-pressed', 'false');
    bPasar.textContent = 'Pasar el año';
    carta.setAttribute('aria-live', 'polite');
  };
  bPasar.addEventListener('click', () => {
    if (tPasar) { parar(); return; }
    bPasar.setAttribute('aria-pressed', 'true');
    bPasar.textContent = 'Parar';
    carta.setAttribute('aria-live', 'off');   // doce avisos seguidos no: se dice al parar o al elegir
    tPasar = setInterval(() => { if (visible) ir((mes + 1) % 12, false); }, 1900);
  });
  bHoy.addEventListener('click', () => ir(HOY, true));

  // ---------- arranque ----------
  sec.classList.add('anio--vivo');
  bHoy.hidden = false;
  const ajustarMov = () => {
    bPasar.hidden = !mueve();
    if (!mueve()) parar();
    fotos.forEach(f => { f.style.transition = mueve() ? 'opacity 1.1s ease' : 'none'; });
    cielo.decidir();
  };
  ajustarMov();
  if (quieto.addEventListener) quieto.addEventListener('change', ajustarMov);
  new MutationObserver(cielo.decidir).observe(raiz, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', cielo.decidir);
  new IntersectionObserver(es => { visible = es.some(e => e.isIntersecting); cielo.decidir(); }, { rootMargin: '80px 0px' }).observe(esc);
  new ResizeObserver(medirReloj).observe(reloj);
  medirReloj();
  ir(HOY, false);
})();
