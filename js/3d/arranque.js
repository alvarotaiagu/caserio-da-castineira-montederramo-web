// Arranque del 3D. La web lo carga al final del <body>: <script type="module" src="js/3d/arranque.js"></script>
// No pide nada hasta después de `load` y de un rato libre: el 3D no puede empeorar el LCP.
// Con WebGL2: monta el vuelo (portada) y el claro al acercarse. Sin WebGL2, con ahorro de datos o si algo falla:
// clase `sin-3d` en #vuelo y #claro (se quedan el póster y el plano) y nada más.
// VERSION: súbela al cambiar cualquier fichero de js/3d/ o img/terreno/. Cambia la huella de este fichero
// (versionar.mjs de la web la pone en el <script>) y todo lo que se pide desde aquí lleva ?v=VERSION.
const VERSION = '2026-10-19.1', V = '?v=' + VERSION;
const $ = id => document.getElementById(id);
const vueloEl = $('vuelo'), claroEl = $('claro');
const MOV = !matchMedia('(prefers-reduced-motion: reduce)').matches;

function sinTres(motivo) {
  try { window.CASTINEIRA_3D?.motor?.detener(); } catch (e) { /* nada */ }
  for (const el of [vueloEl, claroEl]) if (el) { el.classList.remove('con-3d'); el.classList.add('sin-3d'); el.querySelector('canvas.lienzo3d')?.remove(); }
  const carga = $('claro-carga');
  if (carga) { carga.hidden = false; carga.textContent = motivo; }
  const b = $('vuelo-pausa'); if (b) b.hidden = true;
  vueloEl?.querySelector('.rotulos3d')?.remove();
  window.CASTINEIRA_3D = { estado: 'sin-3d', motivo };
}

function hayWebGL2() {
  try {
    const c = document.createElement('canvas'), gl = c.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch (e) { return false; }
}

const trasCarga = () => new Promise(res => {
  const libre = () => ('requestIdleCallback' in window ? requestIdleCallback(() => res(), { timeout: 2000 }) : setTimeout(res, 300));
  if (document.readyState === 'complete') libre(); else addEventListener('load', libre, { once: true });
});
const alAcercarse = (el, margen) => new Promise(res => {
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); res(); } }, { rootMargin: margen });
  io.observe(el);
});

async function iniciar() {
  await trasCarga();
  // el chip de la portada dice la verdad aunque no haya 3D
  const sol = await import('./sol.js' + V);
  const chip = $('ahora-castineira');
  if (chip) { const poner = () => { chip.textContent = sol.textoChip(); }; poner(); setInterval(poner, 30000); }

  if (!vueloEl && !claroEl) return;
  if (navigator.connection?.saveData) return sinTres('Con el ahorro de datos activado no se carga el relieve 3D: aquí lo tienes en plano.');
  if (!hayWebGL2()) return sinTres('Este navegador no puede mostrar el 3D: aquí tienes el relieve en plano.');

  window.CASTINEIRA_3D = { estado: 'cargando' };
  let motor = null;
  // la cortina se retira (o 6 s de red de seguridad): hasta entonces nada de tareas largas que traben su ventana
  const cortinaFuera = Promise.race([
    new Promise(r => document.documentElement.classList.contains('cortina-fuera') ? r() : document.addEventListener('castineira:cortina-fuera', r, { once: true })),
    new Promise(r => setTimeout(r, 6000)),
  ]);
  const preparar = (async () => {
    // los datos se descargan ya; el motor (shaders, malla, texturas) se crea cuando la cortina se ha ido
    const [E, D] = await import('./escena.js' + V).then(async E => [E, await E.cargarDatos(V)]);
    await cortinaFuera;
    motor = E.crearMotor(D, { S: sol, movimiento: MOV, alFallar: () => sinTres('El 3D se ha detenido en este equipo: aquí tienes el relieve en plano.') });
    await motor.listo;
    window.CASTINEIRA_3D = { estado: 'listo', motor };
    return motor;
  })();
  const fallo = e => { console.warn('[3d]', e); sinTres('El 3D no ha podido cargar aquí: se queda el relieve en plano.'); };
  const avisoLento = setTimeout(() => { const c = $('claro-carga'); if (c && claroEl && !claroEl.classList.contains('con-3d')) c.textContent = 'El relieve 3D está tardando: mientras, el plano.'; }, 15000);

  if (vueloEl) alAcercarse(vueloEl, '200px').then(async () => {
    try {
      await cortinaFuera;
      const [m, mV] = await Promise.all([preparar, import('./vuelo.js' + V)]);
      window.CASTINEIRA_3D.vuelo = mV.montarVuelo(m, { movimiento: MOV });
    } catch (e) { fallo(e); }
  });
  if (claroEl) alAcercarse(claroEl, '700px').then(async () => {
    try {
      const [m, C] = await Promise.all([preparar, import('./claro.js' + V)]);
      window.CASTINEIRA_3D.claro = C.montarClaro(m, { movimiento: MOV });
      clearTimeout(avisoLento);
    } catch (e) { fallo(e); }
  });
}

iniciar().catch(e => { console.warn('[3d]', e); sinTres('El 3D no ha podido cargar aquí: se queda el relieve en plano.'); });
