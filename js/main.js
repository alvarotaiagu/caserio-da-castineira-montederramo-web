/* Caserío da Castiñeira · main.js (sin librerías: Web Animations e IntersectionObserver)
   1 utilidades · 2 cortina: la ventana encendida · 3 cabecera, lectura y menú · 4 portada y botones al motor
   5 entradas al bajar · 6 capítulos «Somos»: la pared y las letras · 7 galería de los alojamientos
   8 mapa · 9 cookies · 10 barra del móvil · 11 sin 3D · 12 MANDO DE MAQUETA
   El 3D (js/3d/) y las secciones «Dibuja mi mapa» y «Un año en la casa» (js/mapa.js, js/anio.js)
   son de otros módulos: aquí solo se da la señal de la cortina y se respetan sus ids. */
(() => {
  'use strict';

  /* ================= 1. utilidades ================= */
  const d = document.documentElement;
  const $ = (id) => document.getElementById(id);
  const MOV = d.classList.contains('con-movimiento');
  const F = (window.__castineira = window.__castineira || {});
  F.rehechos = 0;
  const sobria = () => d.classList.contains('densidad-sobria');
  const irA = (sel) => {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) return;
    // de lejos, salto directo: un desplazamiento suave de varios miles de píxeles marea y se corta
    const lejos = Math.abs(el.getBoundingClientRect().top) > innerHeight * 2.5;
    el.scrollIntoView({ behavior: MOV && !lejos ? 'smooth' : 'auto', block: 'start' });
  };
  // La barra del navegador del móvil lanza resize al subir y bajar: si solo cambia el alto, NO se rehace nada
  let anchoVista = innerWidth, altoVista = innerHeight;
  addEventListener('resize', () => {
    if (innerWidth === anchoVista && Math.abs(innerHeight - altoVista) < 160) return;
    anchoVista = innerWidth; altoVista = innerHeight;
    F.rehechos++;
    document.dispatchEvent(new Event('castineira:rehacer'));
  });

  /* ================= 2. cortina: una ventana se enciende en la noche y entramos por un cristal ================= */
  (function cortina() {
    const c = $('cortina');
    if (!c) return;
    if (!MOV || c.hidden || d.classList.contains('cortina-fuera')) { c.hidden = true; window.__castineiraFuera(); return; }
    // se arranca tras el primer fotograma pintado: el primer layout de la página no se come el encendido
    requestAnimationFrame(() => requestAnimationFrame(empezar));
  })();
  function empezar() {
    const c = $('cortina');
    if (c.hidden || d.classList.contains('cortina-fuera')) return;
    const anims = [];
    const A = (el, kf, op) => {
      if (!el) return null;
      const a = el.animate(kf, Object.assign({ fill: 'both', easing: 'cubic-bezier(.65,0,.35,1)' }, op));
      anims.push(a);
      return a;
    };
    const CRUCE = 1750;   // ms: aquí la ventana empieza a crecer y sale la señal al 3D
    const DUR = 1150;
    // 1. los cuatro cristales se encienden poco a poco, con un parpadeo de bombilla vieja
    const orden = [3, 1, 4, 2];
    orden.forEach((n, i) => A(c.querySelector(`.cristal[data-n="${n}"] .vidrio`),
      [{ opacity: 0 }, { opacity: .55, offset: .25 }, { opacity: .2, offset: .4 }, { opacity: .85, offset: .7 }, { opacity: 1 }],
      { delay: 180 + i * 190, duration: 760, easing: 'ease-out' }));
    A($('cortina-halo'), [{ opacity: 0 }, { opacity: 1 }], { delay: 520, duration: 1100, easing: 'ease-out' });
    // 2. el cruce: el cristal 2 se vuelve hueco y la ventana crece ×34 desde él; la cortina se funde
    const marca = A(c, [{ visibility: 'visible' }, { visibility: 'visible' }], { duration: CRUCE, fill: 'none' });
    A($('cortina-paso'), [{ opacity: 1 }, { opacity: 0 }], { delay: CRUCE, duration: 380, easing: 'ease-out' });
    A($('cortina-halo'), [{ opacity: 1 }, { opacity: 0 }], { delay: CRUCE, duration: 500, easing: 'ease-out', fill: 'forwards' });
    A($('cortina-muro'), [{ transform: 'scale(1)' }, { transform: 'scale(34)' }], { delay: CRUCE + 60, duration: DUR, easing: 'cubic-bezier(.7,0,.84,0)' });
    const fundido = A(c, [{ opacity: 1 }, { opacity: 1, offset: .62 }, { opacity: 0 }], { delay: CRUCE + 60, duration: DUR, easing: 'linear' });
    // detrás, la portada: el póster se asienta (solo transform) y entra el texto
    // (si el 3D ya ha llegado, el póster no se mueve: el primer fotograma del vuelo coincide con él a escala 1)
    if (!$('vuelo')?.classList.contains('con-3d')) A($('vuelo-poster'), [{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { delay: CRUCE, duration: 1200, easing: 'cubic-bezier(.16,1,.3,1)' });
    const piezas = [...document.querySelectorAll('.portada-txt > *, .rapida, .altimetro')];
    piezas.forEach((p, i) => A(p, [{ opacity: .02, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { delay: CRUCE + 420 + i * 110, duration: 1000, easing: 'cubic-bezier(.16,1,.3,1)' }));
    marca.finished.then(() => { c.style.pointerEvents = 'none'; window.__castineiraFuera(); }).catch(() => {});
    fundido.finished.then(() => { c.hidden = true; F.cortina = 'fuera'; window.__cortina.fin = performance.now(); }).catch(() => {});
    window.__cortina = {
      anims, CRUCE, DUR, t0: performance.now(), fin: null,
      pausar(t) { anims.forEach((a) => { a.pause(); if (t != null) a.currentTime = t; }); },
      seguir() { anims.forEach((a) => a.play()); },
    };
    // para las pruebas: congelar un fotograma concreto
    if (typeof window.__cortinaPausaEn === 'number') { window.__cortina.pausar(window.__cortinaPausaEn); window.__cortinaPausada = true; }
  }

  /* ================= 3. cabecera: la ventana se enciende al leer, y el menú ================= */
  const cab = $('cab');
  const cristales = [...document.querySelectorAll('#cab-ventana .cristal')];
  const UMBRAL = [0.1, 0.36, 0.62, 0.975];
  let pendiente = false;
  const alLeer = [];
  const leer = () => {
    pendiente = false;
    const max = d.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    cristales.forEach((cr, i) => cr.classList.toggle('es-encendido', p >= UMBRAL[i]));
    cab.classList.toggle('es-solida', scrollY > 40);
    cab.classList.toggle('es-completa', p >= UMBRAL[3]);
    F.lectura = p;
    alLeer.forEach((fn) => fn());
  };
  addEventListener('scroll', () => { if (!pendiente) { pendiente = true; requestAnimationFrame(leer); } }, { passive: true });
  leer();

  // los enlaces a secciones que aún no están (las de otro módulo) se ocultan
  document.querySelectorAll('.cab-nav a[href^="#"], .menu-movil a[href^="#"]').forEach((a) => { if (!document.getElementById(a.getAttribute('href').slice(1))) a.hidden = true; });

  (function menu() {
    const btn = $('menu-btn'), m = $('menu-movil');
    if (!btn || !m) return;
    const poner = (abrir) => {
      m.hidden = !abrir;
      btn.setAttribute('aria-expanded', String(abrir));
      btn.textContent = abrir ? 'Cerrar' : 'Menú';
      document.body.classList.toggle('menu-abierto', abrir);
      cab.classList.toggle('es-solida', abrir || scrollY > 40);
      if (abrir) m.querySelector('a:not([hidden])')?.focus();
    };
    btn.addEventListener('click', () => poner(m.hidden));
    m.addEventListener('click', (e) => { if (e.target.closest('a')) poner(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !m.hidden) { poner(false); btn.focus(); } });
    document.addEventListener('castineira:rehacer', () => { if (innerWidth > 1020 && !m.hidden) poner(false); });
  })();

  /* ================= 4. portada: reserva rápida y botones que llevan al motor ================= */
  (function portada() {
    const f = $('rapida'), llega = $('rapida-llega'), sale = $('rapida-sale');
    if (!f) return;
    const clave = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    llega.min = clave(hoy);
    const masUno = (k, n) => { const x = new Date(k + 'T00:00'); x.setDate(x.getDate() + n); return clave(x); };
    sale.min = masUno(llega.min, 1);
    llega.addEventListener('change', () => {
      if (!llega.value) return;
      sale.min = masUno(llega.value, 1);
      if (!sale.value || sale.value <= llega.value) sale.value = masUno(llega.value, 2);
    });
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const ini = llega.value || null, fin = sale.value && ini && sale.value > ini ? sale.value : null;
      const n = +$('rapida-gente').value;
      window.CASTINEIRAmotor?.preparar({ ini, fin, personas: n, modo: n >= 16 ? 'casa' : 'aloj' });
      irA('#reserva');
    });
    document.querySelectorAll('[data-ver-aloj]').forEach((b) => b.addEventListener('click', () => {
      window.CASTINEIRAmotor?.preparar({ aloj: b.dataset.verAloj });
      irA('#reserva');
    }));
  })();

  /* ================= 5. entradas al bajar y la ventana del pie ================= */
  const ver = (el) => el.classList.add('es-visto');
  const observados = document.querySelectorAll('[data-entra], .pie-ventana');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { ver(e.target); io.unobserve(e.target); } }), { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    observados.forEach((el) => io.observe(el));
  } else observados.forEach(ver);

  /* ================= 6. capítulos «Somos»: el color de la pared y la foto dentro de las letras ================= */
  (function somos() {
    const caja = $('somos');
    if (!caja) return;
    // 6a. la pared: el capítulo que cruza el centro de la pantalla pone su color a toda la página.
    // Es contenido (qué capítulo estás leyendo): se cambia también con movimiento reducido; la transición la quita el CSS.
    const caps = [...caja.querySelectorAll('.capitulo[data-pared]')];
    // Se mira en cada scroll (ya va por rAF): el capítulo que tiene debajo la mitad de la pantalla.
    // (Un IntersectionObserver avisa tarde cuando el equipo va cargado: aquí no puede quedarse la pared de antes.)
    const pared = () => {
      const mitad = innerHeight / 2;
      const c = caps.find((x) => { const r = x.getBoundingClientRect(); return r.top <= mitad && r.bottom > mitad; });
      const p = c ? c.dataset.pared : caps[0].getBoundingClientRect().top > mitad ? caps[0].dataset.pared : caps[caps.length - 1].dataset.pared;
      if (caja.dataset.pared !== p) { caja.dataset.pared = p; F.pared = p; }
    };
    if (caps.length) { pared(); alLeer.push(pared); }

    // 6b. las letras: Anybody de ancho variable; se ensanchan hacia el puntero (o el dedo)
    const ANCHOS = { puerta: [800, 1200], fuego: [800, 1200], desayuno: [800, 1080] };
    const palabras = [...caja.querySelectorAll('.palabra[data-letras]')].map((h) => {
      const txt = h.querySelector('.palabra-txt');
      const lineas = h.classList.contains('es-larga') ? ['LO QUE', 'COMEMOS'] : [txt.textContent.trim().toUpperCase()];
      txt.textContent = '';
      const letras = [];
      lineas.forEach((l, i) => {
        if (i) txt.appendChild(document.createElement('br'));
        [...l].forEach((ch) => {
          if (ch === ' ') { txt.appendChild(document.createTextNode(' ')); return; }
          const s = document.createElement('span'); s.className = 'letra'; s.textContent = ch; txt.appendChild(s); letras.push(s);
        });
      });
      const nombre = h.dataset.letras, an = ANCHOS[nombre] || [800];
      return { h, txt, letras, nombre, an, w: letras.map(() => 100), base: [], px: null, visible: false, cerca: false, raf: 0, foto: '' };
    });
    F.palabras = palabras.length;
    const fv = (s, w) => { s.style.fontVariationSettings = `"wdth" ${w.toFixed(1)}`; };
    // tamaño: la línea más ancha cabe en el 90 % del ancho (a ancho 100)
    const ajustar = (p) => {
      p.txt.style.fontSize = '100px';
      p.letras.forEach((s) => fv(s, 100));
      const cont = p.h.getBoundingClientRect().width;
      const filas = {};
      p.letras.forEach((s) => { const r = s.getBoundingClientRect(); const k = Math.round(r.top); filas[k] = filas[k] || [Infinity, -Infinity]; filas[k][0] = Math.min(filas[k][0], r.left); filas[k][1] = Math.max(filas[k][1], r.right); });
      const ancho = Math.max(...Object.values(filas).map(([a, b]) => b - a), 1);
      const tam = Math.max(40, Math.min(300, 100 * cont * 0.9 / ancho));
      p.txt.style.fontSize = tam.toFixed(1) + 'px';
      const o = p.txt.getBoundingClientRect();
      p.base = p.letras.map((s) => { const q = s.getBoundingClientRect(); return q.left - o.left + q.width / 2; });
      p.letras.forEach((s, i) => fv(s, p.w[i]));
      fondo(p);
    };
    // la foto cubre la palabra entera: cada letra lleva su trozo (se recoloca al cambiar de ancho)
    const fondo = (p) => {
      if (!p.foto) return;
      const o = p.txt.getBoundingClientRect();
      p.letras.forEach((s) => {
        const q = s.getBoundingClientRect();
        s.style.backgroundSize = `${o.width.toFixed(1)}px ${o.height.toFixed(1)}px`;
        s.style.backgroundPosition = `${(-(q.left - o.left)).toFixed(1)}px ${(-(q.top - o.top)).toFixed(1)}px`;
      });
    };
    const ponerFoto = (p) => {
      if (sobria()) { p.h.classList.remove('con-foto'); return; }
      if (!p.cerca) return;
      if (!p.foto) {
        const w = p.an.find((x) => x >= Math.min(innerWidth, 1400) * Math.min(devicePixelRatio || 1, 1.5) * 0.9) || p.an[p.an.length - 1];
        p.foto = `img/fotos/${p.nombre}-${w}.webp`;
        p.letras.forEach((s) => { s.style.backgroundImage = `url("${p.foto}")`; });
      }
      p.h.classList.add('con-foto');
      fondo(p);
    };
    const bucle = (p) => (t) => {
      p.raf = 0;
      if (!p.visible || sobria()) return;
      const o = p.txt.getBoundingClientRect(), ancho = o.width || 1;
      let mueve = false;
      p.letras.forEach((s, i) => {
        let obj = 100 + 7 * Math.sin(t / 900 + i * 0.8);
        if (p.px !== null) { const dd = Math.abs(p.px - o.left - p.base[i]) / (ancho * 0.3); obj = 70 + 78 * Math.pow(Math.max(0, 1 - dd), 2); }
        const nuevo = p.w[i] + (obj - p.w[i]) * 0.14;
        if (Math.abs(nuevo - p.w[i]) > 0.05) mueve = true;
        p.w[i] = nuevo; fv(s, nuevo);
      });
      if (mueve) fondo(p);
      p.raf = requestAnimationFrame(bucle(p));
    };
    const arrancar = (p) => { cancelAnimationFrame(p.raf); p.raf = 0; if (p.visible && MOV && !sobria()) p.raf = requestAnimationFrame(bucle(p)); };
    palabras.forEach((p) => {
      const sitio = (e) => { p.px = e.clientX; };
      p.txt.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || e.buttons) sitio(e); });
      p.txt.addEventListener('pointerdown', sitio);
      p.txt.addEventListener('pointerleave', () => { p.px = null; });
      p.txt.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') p.px = null; });
      p.txt.addEventListener('pointercancel', () => { p.px = null; });
      if ('IntersectionObserver' in window) {
        new IntersectionObserver((es) => { p.visible = es[0].isIntersecting; arrancar(p); }, { rootMargin: '60px 0px' }).observe(p.h);
        // la foto se pide al acercarse (no compite con la portada)
        new IntersectionObserver((es) => { if (es[0].isIntersecting) { p.cerca = true; ponerFoto(p); } }, { rootMargin: '700px 0px' }).observe(p.h);
      } else { p.visible = p.cerca = true; ponerFoto(p); }
      ajustar(p);
    });
    const todo = () => palabras.forEach((p) => { ajustar(p); ponerFoto(p); arrancar(p); });
    document.fonts?.ready.then(todo);
    document.addEventListener('castineira:rehacer', todo);
    document.addEventListener('castineira:densidad', () => palabras.forEach((p) => { if (sobria()) { p.w = p.w.map(() => 100); p.letras.forEach((s) => fv(s, 100)); } ponerFoto(p); ajustar(p); arrancar(p); }));
    F.letras = () => palabras.map((p) => ({ n: p.letras.length, foto: p.h.classList.contains('con-foto'), w: p.w.map((x) => Math.round(x)) }));
    F.apuntar = (i, x) => { palabras[i].px = x; };
  })();

  /* ================= 7. galería de los alojamientos (carril con botones) ================= */
  (function galeria() {
    const carril = $('carril'), ant = $('gal-ant'), sig = $('gal-sig'), cuenta = $('gal-cuenta');
    if (!carril) return;
    const items = [...carril.children];
    const paso = () => { const a = items[0].getBoundingClientRect(), b = items[1].getBoundingClientRect(); return b.left - a.left; };
    const pintar = () => {
      const i = Math.min(items.length - 1, Math.round(carril.scrollLeft / paso()));
      cuenta.textContent = `${i + 1} / ${items.length}`;
      ant.disabled = carril.scrollLeft < 8;
      sig.disabled = carril.scrollLeft > carril.scrollWidth - carril.clientWidth - 8;
      F.galeria = i;
    };
    const mover = (n) => carril.scrollBy({ left: n * paso(), behavior: MOV ? 'smooth' : 'auto' });
    ant.addEventListener('click', () => mover(-1));
    sig.addEventListener('click', () => mover(1));
    let raf = 0;
    carril.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(pintar); }, { passive: true });
    pintar();
  })();

  /* ================= 8. mapa de Google, solo al pedirlo ================= */
  document.querySelectorAll('.map-consent').forEach((btn) => btn.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = btn.dataset.mapSrc; f.title = btn.dataset.mapTitle || 'Mapa';
    f.loading = 'lazy'; f.referrerPolicy = 'no-referrer-when-downgrade'; f.allowFullscreen = true;
    btn.replaceWith(f);
  }));

  /* ================= 9. aviso de cookies ================= */
  (function cookies() {
    const LLAVE = 'castineira-cookies', aviso = $('cookies');
    if (!aviso) return;
    let visto = null;
    try { visto = localStorage.getItem(LLAVE); } catch (e) {}
    aviso.hidden = visto === 'si';
    $('ck-si').addEventListener('click', () => { try { localStorage.setItem(LLAVE, 'si'); } catch (e) {} aviso.hidden = true; });
    $('ck-no').addEventListener('click', () => { aviso.hidden = true; });
    $('abrir-cookies')?.addEventListener('click', () => { aviso.hidden = false; $('ck-si').focus(); });
  })();

  /* ================= 10. barra fija del móvil: sale al dejar la portada, se aparta en el motor ================= */
  (function barra() {
    const b = $('barra'), portada = $('arriba'), reserva = $('reserva'), pie = $('pie');
    if (!b) return;
    let enReserva = false, enPie = false;
    const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => {
      if (e.target === reserva) enReserva = e.isIntersecting; else enPie = e.isIntersecting;
      poner();
    }), { threshold: 0 }) : null;
    const poner = () => b.classList.toggle('es-visible', scrollY > portada.offsetHeight * 0.75 && !enReserva && !enPie);
    io?.observe(reserva); io?.observe(pie);
    alLeer.push(poner);
    poner();
  })();

  /* ================= 11. sin el módulo 3D en la página: se queda la imagen ================= */
  if (!document.querySelector('script[src*="js/3d/arranque.js"]')) window.__castineira3dFallo?.();

  /* ================= 12. MANDO DE MAQUETA: dos densidades, solo con ?revision ================= */
  (function mando() {
    const m = $('mando');
    if (!m || !d.classList.contains('en-revision')) return;
    m.hidden = false;
    const marcar = () => m.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.densidad === 'sobria') === d.classList.contains('densidad-sobria'))));
    m.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-densidad]');
      if (!b) return;
      const s = b.dataset.densidad === 'sobria';
      d.classList.toggle('densidad-sobria', s);
      const q = new URLSearchParams(location.search);
      if (s) q.set('densidad', 'sobria'); else q.delete('densidad');
      history.replaceState(null, '', location.pathname + '?' + q.toString().replace(/revision=(&|$)/, 'revision$1') + location.hash);
      marcar();
      document.dispatchEvent(new Event('castineira:densidad'));
    });
    marcar();
  })();
  /* fin del MANDO DE MAQUETA */
})();
