// Pruebas del 3D sobre el banco propio (pruebas/3d-banco.html), puerto 8798.
// Uso (desde la carpeta de la web): node pruebas/3d-probar.mjs
// WebGL por software (SwiftShader, ~6–18 fps): se comprueba que las cosas pasan, no la fluidez. Ventanas pequeñas
// (1024 × 640 y Pixel 7) para no saturar la CPU; el navegador se cierra siempre en un finally.
import { servir, lanzar, chromium, devices, URL_BANCO, espera } from './3d-comun.mjs';
import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/')('sharp');

const res = [];
const ok = (nombre, cond, detalle = '') => { res.push({ nombre, ok: !!cond }); console.log(`${cond ? 'OK  ' : 'MAL '} ${nombre}${detalle ? ' · ' + detalle : ''}`); };
const HORA = '2026-10-19T16:30';
const RECURSOS = /three\.module|OrbitControls|\/js\/3d\/(escena|vuelo|claro|sol)\.js|img\/terreno\/(orto|finca|alturas|terreno\.json)/;
const ESC = { viewport: { width: 1024, height: 640 }, screen: { width: 1440, height: 900 } };   // ventana pequeña en una pantalla de escritorio

// Registra en la página los eventos del contrato, desde antes de que cargue nada
const ESPIAS = () => {
  window.__ev = [];
  document.addEventListener('castineira:3d-listo', e => window.__ev.push(e.detail?.vista || '?'));
};
const tVuelo = pag => pag.evaluate(() => window.CASTINEIRA_3D?.vuelo?.t ?? -1);
const palas = pag => pag.evaluate(() => Array.from(window.CASTINEIRA_3D.motor.viento.children[1].instanceMatrix.array.slice(0, 16)).map(x => x.toFixed(4)).join());
const metrosDe = txt => +txt.replace(/\s*m$/, '').replace('.', '');

const srv = await servir();
const nav = await lanzar();
try {
  // ---------- 1. Escritorio: carga, señales, vuelo, pausa, gesto, claro ----------
  {
    const ctx = await nav.newContext(ESC);
    const pag = await ctx.newPage();
    const errores = [];
    pag.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errores.push(m.text()); });
    pag.on('pageerror', e => errores.push(e.message));
    await pag.addInitScript(ESPIAS);
    await pag.goto(`${URL_BANCO}?cortina=2500&ahora3d=${HORA}`);
    await pag.waitForLoadState('load');
    await espera(1800);
    const antes = await pag.evaluate(() => ({ montado: !!window.CASTINEIRA_3D?.vuelo, canvas: !!document.querySelector('#vuelo canvas') }));
    ok('el vuelo espera a la cortina (no se monta antes de castineira:cortina-fuera)', !antes.montado && !antes.canvas, JSON.stringify(antes));
    await pag.waitForFunction(() => document.getElementById('vuelo').classList.contains('con-3d'), null, { timeout: 90000 });
    const ev = await pag.evaluate(() => window.__ev);
    ok('primer fotograma: clase con-3d en #vuelo y evento castineira:3d-listo', ev.includes('vuelo'), JSON.stringify(ev));
    // recursos pesados solo después de load
    const tiempos = await pag.evaluate(re => {
      const nav = performance.getEntriesByType('navigation')[0];
      return { load: nav.loadEventStart, pedidos: performance.getEntriesByType('resource').filter(r => new RegExp(re).test(r.name)).map(r => [r.name.split('/').slice(-2).join('/'), Math.round(r.startTime)]) };
    }, RECURSOS.source);
    const pronto = tiempos.pedidos.filter(([, t]) => t < tiempos.load);
    ok('los recursos del 3D solo se piden después de load', tiempos.pedidos.length >= 6 && !pronto.length, `load ${Math.round(tiempos.load)} ms; ${tiempos.pedidos.length} pedidos; antes: ${JSON.stringify(pronto)}`);
    const pesos = await pag.evaluate(() => performance.getEntriesByType('resource').filter(r => /js\/3d|img\/terreno/.test(r.name)).map(r => [r.name.split('/').pop().split('?')[0], Math.round(r.encodedBodySize / 1024)]));
    console.log('     pedidos en escritorio:', pesos.map(([n, k]) => `${n} ${k} KB`).join(', '));
    ok('escritorio pide la malla 384, la ortofoto 3072 y la finca 2048 en WebP', ['alturas-384.bin', 'orto-3072.webp', 'finca-2048.webp'].every(f => pesos.some(([n]) => n === f)));
    const inst = await pag.evaluate(() => { const v = window.CASTINEIRA_3D.motor.viento; return v.children.map(c => c.isInstancedMesh ? c.count : c.type); });
    ok('los 56 aerogeneradores son dos mallas instanciadas (torres y rotores)', inst[0] === 56 && inst[1] === 56, JSON.stringify(inst));
    // el vuelo avanza y mueve el altímetro
    const t0 = await tVuelo(pag), a0 = await pag.textContent('#altimetro-valor');
    await espera(3000);
    const t1 = await tVuelo(pag), a1 = await pag.textContent('#altimetro-valor');
    ok('el vuelo avanza', t1 > t0 + 500, `${Math.round(t0)} → ${Math.round(t1)} ms`);
    ok('el altímetro dice metros reales, con punto de miles («1.730 m»)', /^(\d\.\d{3}|\d{3}) m$/.test(a1) && metrosDe(a1) >= 917 && metrosDe(a1) < 1900, `${a0} → ${a1}`);
    const chip = await pag.textContent('#ahora-castineira');
    ok('chip «Ahora en A Castiñeira · hh:mm · sol a N° por el …»', /^Ahora en A Castiñeira · 16:3\d · sol a \d+° por el (norte|nordeste|este|sudeste|sur|suroeste|oeste|noroeste)$/.test(chip), chip);
    ok('el botón de pausa aparece', await pag.isVisible('#vuelo-pausa'));
    // las palas giran mientras se vuela
    const pa0 = await palas(pag); await espera(1200); const pa1 = await palas(pag);
    ok('las palas giran durante el vuelo', pa0 !== pa1);
    // pausa: para el vuelo y las palas
    await pag.click('#vuelo-pausa');
    await espera(400);
    const p0 = await tVuelo(pag), q0 = await palas(pag); await espera(1500); const p1 = await tVuelo(pag), q1 = await palas(pag);
    ok('la pausa para el vuelo y las palas', p0 === p1 && q0 === q1 && (await pag.textContent('#vuelo-pausa')) === 'Seguir el vuelo' && (await pag.getAttribute('#vuelo-pausa', 'data-pausa')) === 'true', `${Math.round(p0)} / ${Math.round(p1)}`);
    // gesto: arrastrar con el ratón hacia la izquierda adelanta; hacia la derecha retrocede
    await pag.evaluate(() => { window.CASTINEIRA_3D.vuelo.t = 3000; });
    const g0 = await tVuelo(pag);
    await pag.mouse.move(800, 300); await pag.mouse.down(); for (let i = 1; i <= 8; i++) await pag.mouse.move(800 - i * 50, 302); await pag.mouse.up();
    await espera(800);
    const g1 = await tVuelo(pag);
    await pag.mouse.move(300, 300); await pag.mouse.down(); for (let i = 1; i <= 8; i++) await pag.mouse.move(300 + i * 40, 298); await pag.mouse.up();
    await espera(800);
    const g2 = await tVuelo(pag);
    ok('arrastrar a la izquierda adelanta el vuelo', g1 > g0 + 2500, `${Math.round(g0)} → ${Math.round(g1)}`);
    ok('arrastrar a la derecha lo retrasa', g2 < g1 - 2000, `${Math.round(g1)} → ${Math.round(g2)}`);
    const ta = await pag.evaluate(() => getComputedStyle(document.getElementById('portada')).touchAction);
    ok('la portada deja el dedo vertical al scroll (touch-action: pan-y)', ta === 'pan-y', ta);
    // el vuelo nunca pasa entre las palas ni roza el suelo: 300 puntos de la curva con la pose real de la cámara
    const seguro = await pag.evaluate(() => {
      const { vuelo: v, motor: m } = window.CASTINEIRA_3D, { T, EX, suelo } = m.D;
      let peorPala = 1e9, peorSuelo = 1e9;
      for (let i = 0; i <= 300; i++) {
        v.t = v.DUR * i / 300;
        const p = v.camara.position;
        peorSuelo = Math.min(peorSuelo, p.y / EX - suelo(p.x, p.z));
        for (const [x, z, h] of T.aeros) {
          const top = h * EX + T.aero.torre + T.aero.pala, dh = Math.hypot(p.x - x, p.z - z);
          peorPala = Math.min(peorPala, p.y > top ? Math.hypot(dh, p.y - top) : dh);
        }
      }
      return { peorPala: Math.round(peorPala), peorSuelo: Math.round(peorSuelo) };
    });
    ok('el vuelo nunca pasa entre las palas (más de 250 unidades de cualquier molino)', seguro.peorPala > 250, `mínimo ${seguro.peorPala}`);
    ok('el vuelo nunca baja de 65 m sobre el suelo', seguro.peorSuelo >= 65, `mínimo ${seguro.peorSuelo} m`);
    // final: los tejados a la vista (la casa en el cuadro, arriba a la derecha), la aguja oculta, el rótulo y el altímetro
    await pag.evaluate(() => { const v = window.CASTINEIRA_3D.vuelo; v.t = v.DUR; });
    await espera(1200);
    const fin = await pag.evaluate(() => {
      const m = window.CASTINEIRA_3D.motor, c = m.aPantalla(m.CASA, {}), r = document.querySelector('#vuelo .rotulo3d.casa'), b = r.getBoundingClientRect();
      return { x: c.x / innerWidth, y: c.y / innerHeight, aguja: m.aguja.visible, dist: Math.round(m.activa.camara.position.distanceTo(m.CASA)), op: +r.style.opacity, rx: b.x, ry: b.y,
        alt: document.getElementById('altimetro-valor').textContent, top: document.getElementById('altimetro-aguja').style.top };
    });
    ok('al final se ven los tejados: la casa en el cuadro, arriba a la derecha, a menos de 300 unidades', fin.x > .5 && fin.x < .8 && fin.y > .25 && fin.y < .55 && fin.dist < 300, JSON.stringify(fin));
    ok('al final la aguja se oculta y el rótulo de la casa se ve', !fin.aguja && fin.op > .5 && fin.rx > 0 && fin.rx < 1024 && fin.ry > 0 && fin.ry < 640);
    const mFin = metrosDe(fin.alt), topEsperado = 13 + (1289 - mFin) / (1289 - 488) * 73;
    ok('altímetro: 1.289 m → 13 %, 488 m → 86 % (la aguja cuadra con los metros)', Math.abs(parseFloat(fin.top) - topEsperado) < .15 && mFin > 917 && mFin < 1100, `${fin.alt} → ${fin.top} (esperado ${topEsperado.toFixed(1)} %)`);
    await pag.evaluate(() => { window.CASTINEIRA_3D.vuelo.t = 0; });
    await espera(600);
    const ini = await pag.evaluate(() => ({ aguja: window.CASTINEIRA_3D.motor.aguja.visible, top: document.getElementById('altimetro-aguja').style.top, alt: document.getElementById('altimetro-valor').textContent }));
    ok('al principio (sobre la sierra) la aguja de la casa se ve y el altímetro topa arriba', ini.aguja && parseFloat(ini.top) === 0 && metrosDe(ini.alt) > 1289, JSON.stringify(ini));
    // fuera de pantalla: se para
    await pag.click('#vuelo-pausa');   // sigue
    await pag.evaluate(() => { window.CASTINEIRA_3D.vuelo.t = 1000; });
    await pag.evaluate(() => window.scrollTo(0, document.querySelector('.relleno').offsetTop + 500));
    await pag.waitForFunction(() => window.CASTINEIRA_3D.vuelo.vista.visible === false, null, { timeout: 10000 }).catch(() => {});
    await espera(400);
    const f0 = await tVuelo(pag); await espera(1500); const f1 = await tVuelo(pag);
    ok('fuera de pantalla el vuelo no corre', f0 === f1, `${Math.round(f0)} / ${Math.round(f1)}`);
    await pag.evaluate(() => window.scrollTo(0, 0));
    await espera(1000);
    await pag.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    const h0 = await tVuelo(pag); await espera(1500); const h1 = await tVuelo(pag);
    ok('con la pestaña oculta el vuelo no corre', h0 === h1, `${Math.round(h0)} / ${Math.round(h1)}`);
    await pag.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    const v0 = await tVuelo(pag); await espera(1500); const v1 = await tVuelo(pag);
    ok('al volver, sigue', v1 > v0, `${Math.round(v0)} → ${Math.round(v1)}`);
    // calidad automática: con SwiftShader tiene que bajar sola (densidad y luego sombras)
    const baja = await pag.waitForFunction(() => window.CASTINEIRA_3D.motor.calidad.nivel >= 1, null, { timeout: 90000 }).then(() => true, () => false);
    const cal = await pag.evaluate(() => window.CASTINEIRA_3D.motor.calidad);
    ok('la calidad baja sola si va lento', baja, JSON.stringify(cal));

    // ---------- el claro ----------
    await pag.evaluate(() => document.getElementById('claro-marco').scrollIntoView({ block: 'center' }));
    await pag.waitForFunction(() => document.getElementById('claro').classList.contains('con-3d'), null, { timeout: 90000 });
    await pag.waitForFunction(() => !!document.querySelector('#claro-lienzo canvas'), null, { timeout: 5000 }).catch(() => {});
    await espera(1500);
    const c = await pag.evaluate(() => ({
      ev: window.__ev, carga: document.getElementById('claro-carga').hidden, lienzos: document.querySelectorAll('canvas.lienzo3d').length,
      enClaro: !!document.querySelector('#claro-lienzo canvas'), rotulos: [...document.querySelectorAll('#claro-rotulos .rotulo3d')].filter(r => r.style.display !== 'none').map(r => r.dataset.lugar),
      lectura: document.getElementById('claro-lectura').textContent, hora: document.getElementById('claro-hora-txt').textContent, mover: document.getElementById('claro-mover').hidden,
      bajar: document.getElementById('claro-bajar').textContent, aeros: document.getElementById('claro-aeros').getAttribute('aria-pressed'),
    }));
    ok('claro: con-3d, evento y #claro-carga oculto', c.ev.includes('claro') && c.carga, JSON.stringify(c.ev));
    ok('una sola escena viva: un solo canvas, que se ha mudado al claro', c.lienzos === 1 && c.enClaro, `lienzos ${c.lienzos}, en el claro ${c.enClaro}`);
    ok('rótulos del claro (la casa y A Pena da Cruz)', c.rotulos.includes('casa') && c.rotulos.includes('cumbre'), c.rotulos.join(', '));
    ok('lectura de texto y hora de ahora', /^Hoy en A Castiñeira el sol sale a las \d\d:\d\d/.test(c.lectura) && c.hora === '16:30', c.hora);
    ok('con ratón no hace falta «Mover el mapa»', c.mover);
    ok('«Bajar a la casa» y «Aerogeneradores» (aria-pressed=true) al empezar', c.bajar === 'Bajar a la casa' && c.aeros === 'true', `${c.bajar} / ${c.aeros}`);
    // las palas giran al ralentí (sin tocar nada) y el bucle va a ritmo bajo
    const r0 = await palas(pag); await espera(1200); const r1 = await palas(pag);
    ok('en el claro, sin tocar nada, las palas siguen girando', r0 !== r1);
    // aerogeneradores fuera y dentro
    await pag.click('#claro-aeros'); await espera(700);
    const sinA = await pag.evaluate(() => ({ p: document.getElementById('claro-aeros').getAttribute('aria-pressed'), v: window.CASTINEIRA_3D.motor.viento.visible }));
    const s0 = await palas(pag); await espera(1000); const s1 = await palas(pag);
    ok('«Aerogeneradores» los quita (aria-pressed=false) y sin ellos no hay bucle', sinA.p === 'false' && !sinA.v && s0 === s1, JSON.stringify(sinA));
    await pag.click('#claro-aeros'); await espera(700);
    ok('y los vuelve a poner', await pag.evaluate(() => document.getElementById('claro-aeros').getAttribute('aria-pressed') === 'true' && window.CASTINEIRA_3D.motor.viento.visible));
    // bajar a la casa: viaje, la aguja se oculta, el rótulo de la casa se queda, el botón cambia de texto
    const lejos = await pag.evaluate(() => Math.round(window.CASTINEIRA_3D.motor.activa.camara.position.distanceTo(window.CASTINEIRA_3D.motor.CASA)));
    await pag.click('#claro-bajar');
    await pag.waitForFunction(() => !window.CASTINEIRA_3D.claro.viajando, null, { timeout: 30000 });
    await espera(800);
    const ab = await pag.evaluate(() => {
      const m = window.CASTINEIRA_3D.motor, c = m.aPantalla(m.CASA, {}), r = document.querySelector('#claro-rotulos .rotulo3d.casa');
      return { d: Math.round(m.activa.camara.position.distanceTo(m.CASA)), aguja: m.aguja.visible, txt: document.getElementById('claro-bajar').textContent, x: Math.round(c.x), y: Math.round(c.y), rot: r.style.display !== 'none' };
    });
    ok('«Bajar a la casa» acerca la cámara al claro (y la casa queda en el cuadro)', lejos > 5000 && ab.d < 600 && ab.x > 0 && ab.y > 0, `${lejos} → ${ab.d}; casa en ${ab.x}, ${ab.y}`);
    ok('de cerca la aguja se oculta, el rótulo se queda y el botón dice «Volver a la sierra»', !ab.aguja && ab.rot && ab.txt === 'Volver a la sierra', JSON.stringify(ab));
    // de noche: la casa enciende su luz
    await pag.click('#claro [data-momento="noche"]');
    await espera(800);
    const noche = await pag.evaluate(() => { const m = window.CASTINEIRA_3D.motor; let luz = 0; m.escena.traverse(o => { if (o.isPointLight) luz = o.intensity; }); return { luz, lect: document.getElementById('claro-lectura').textContent }; });
    ok('el botón Noche: la casa enciende su luz y la lectura lo dice', noche.luz > 100 && /es de noche: se ve la luz de la casa/.test(noche.lect), `luz ${Math.round(noche.luz)}`);
    await pag.$eval('#claro-hora', el => { el.value = '780'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    await espera(700);
    const dia = await pag.evaluate(() => { let luz = 0; window.CASTINEIRA_3D.motor.escena.traverse(o => { if (o.isPointLight) luz = o.intensity; }); return luz; });
    ok('la barra de hora mueve la hora y la lectura (y de día la luz de la casa se apaga)', (await pag.textContent('#claro-hora-txt')) === '13:00' && /A las 13:00/.test(await pag.textContent('#claro-lectura')) && dia === 0);
    await pag.click('#claro-bajar');
    await pag.waitForFunction(() => !window.CASTINEIRA_3D.claro.viajando, null, { timeout: 30000 });
    const vuelta = await pag.evaluate(() => ({ d: Math.round(window.CASTINEIRA_3D.motor.activa.camara.position.distanceTo(window.CASTINEIRA_3D.motor.CASA)), txt: document.getElementById('claro-bajar').textContent }));
    ok('«Volver a la sierra» aleja la cámara otra vez', vuelta.d > 5000 && vuelta.txt === 'Bajar a la casa', JSON.stringify(vuelta));
    // teclado
    const cam0 = await pag.evaluate(() => window.CASTINEIRA_3D.motor.activa.camara.position.toArray().map(Math.round).join());
    await pag.focus('#claro-lienzo'); await pag.keyboard.press('ArrowLeft'); await pag.keyboard.press('+'); await espera(500);
    const cam1 = await pag.evaluate(() => window.CASTINEIRA_3D.motor.activa.camara.position.toArray().map(Math.round).join());
    ok('el teclado gira y acerca el relieve', cam0 !== cam1);
    // arrastrar con el ratón gira
    const caja = await pag.locator('#claro-lienzo').boundingBox();
    await pag.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2); await pag.mouse.down();
    for (let i = 1; i <= 6; i++) await pag.mouse.move(caja.x + caja.width / 2 + i * 30, caja.y + caja.height / 2);
    await pag.mouse.up(); await espera(800);
    const cam2 = await pag.evaluate(() => window.CASTINEIRA_3D.motor.activa.camara.position.toArray().map(Math.round).join());
    ok('arrastrar con el ratón gira el relieve', cam1 !== cam2);
    // En plano
    await pag.click('#claro-modo-plano'); await espera(500);
    const pl = await pag.evaluate(() => {
      const marco = document.getElementById('claro-marco'), img = document.getElementById('claro-plano'), cv = document.querySelector('#claro-lienzo');
      const r = img.getBoundingClientRect(), s = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight), dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      const casa = document.querySelector('#claro-rotulos .rotulo3d.casa').getBoundingClientRect();
      const T = window.CASTINEIRA_3D.motor.D.L.casa.uv;
      const esperado = { x: r.left + (r.width - dw) / 2 + T[0] * dw, y: r.top + (r.height - dh) / 2 + T[1] * dh };
      return { clase: marco.classList.contains('plano'), oculto: getComputedStyle(cv).visibility === 'hidden', pulsado: document.getElementById('claro-modo-plano').getAttribute('aria-pressed'),
        dx: Math.round(casa.left + casa.width / 2 - esperado.x), dy: Math.round(casa.bottom + 12 - esperado.y), bajar: document.getElementById('claro-bajar').disabled };
    });
    ok('En plano: clase .plano, lienzo oculto, botón pulsado y «Bajar» desactivado', pl.clase && pl.oculto && pl.pulsado === 'true' && pl.bajar);
    ok('En plano: el rótulo de la casa cae en su sitio (cuenta de contain)', Math.abs(pl.dx) <= 3 && Math.abs(pl.dy) <= 8, `desvío ${pl.dx}, ${pl.dy} px`);
    const e0 = await palas(pag); await espera(1000); const e1 = await palas(pag);
    ok('En plano no se pinta nada (las palas paradas)', e0 === e1);
    await pag.click('#claro-modo-3d'); await espera(400);
    ok('vuelta a En 3D', !(await pag.evaluate(() => document.getElementById('claro-marco').classList.contains('plano'))));
    // vuelta a la portada: el canvas vuelve al vuelo, con los molinos aunque en el claro se quiten
    await pag.click('#claro-aeros'); await espera(300);
    await pag.evaluate(() => window.scrollTo(0, 0)); await espera(1500);
    const vu = await pag.evaluate(() => ({ canvas: !!document.querySelector('#vuelo canvas.lienzo3d'), viento: window.CASTINEIRA_3D.motor.viento.visible }));
    ok('al volver arriba, el canvas vuelve a la portada (y allí los molinos siguen)', vu.canvas && vu.viento, JSON.stringify(vu));
    const calidad = await pag.evaluate(() => window.CASTINEIRA_3D.motor.calidad);
    console.log('     calidad automática (SwiftShader):', JSON.stringify(calidad));
    ok('sin errores de consola', !errores.length, errores.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ---------- 2. Móvil (Pixel 7): mallas pequeñas, «Mover el mapa», barra del navegador, dedo ----------
  {
    const ctx = await nav.newContext({ ...devices['Pixel 7'] });
    const pag = await ctx.newPage();
    const errores = [];
    pag.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errores.push(m.text()); });
    pag.on('pageerror', e => errores.push(e.message));
    await pag.goto(`${URL_BANCO}?cortina=0&ahora3d=${HORA}`);
    await pag.waitForFunction(() => document.getElementById('vuelo').classList.contains('con-3d'), null, { timeout: 120000 });
    const pesos = await pag.evaluate(() => performance.getEntriesByType('resource').filter(r => /img\/terreno/.test(r.name)).map(r => r.name.split('/').pop().split('?')[0]));
    ok('móvil pide la malla 256, la ortofoto 2048 y la finca 1536', ['alturas-256.bin', 'orto-2048.webp', 'finca-1536.webp'].every(f => pesos.includes(f)), pesos.join(', '));
    const dpr = await pag.evaluate(() => window.CASTINEIRA_3D.motor.renderer.getPixelRatio());
    ok('tope de densidad 1,5 en móvil', dpr <= 1.5, `dpr ${dpr} (pantalla 2,625)`);
    // final del vuelo en vertical: la casa arriba (el texto tapa la mitad de abajo)
    await pag.evaluate(() => { document.getElementById('vuelo-pausa').click(); const v = window.CASTINEIRA_3D.vuelo; v.t = v.DUR; });
    await espera(1500);
    const fm = await pag.evaluate(() => { const m = window.CASTINEIRA_3D.motor, c = m.aPantalla(m.CASA, {}); return { x: c.x / innerWidth, y: c.y / innerHeight }; });
    ok('móvil: al final la casa queda en la mitad de arriba, en el cuadro', fm.x > .15 && fm.x < .85 && fm.y > .1 && fm.y < .45, JSON.stringify(fm));
    // barra del navegador: el alto cambia 56 px y no se rehace el lienzo
    const lienzo0 = await pag.evaluate(() => { const c = document.querySelector('canvas.lienzo3d'); return c.width + 'x' + c.height; });
    await pag.addStyleTag({ content: '.portada { min-height: 0 !important; height: 860px !important; }' });
    await espera(500);
    const l1 = await pag.evaluate(() => { const c = document.querySelector('canvas.lienzo3d'); return c.width + 'x' + c.height; });
    await pag.addStyleTag({ content: '.portada { height: 804px !important; }' });
    await espera(500);
    const l2 = await pag.evaluate(() => { const c = document.querySelector('canvas.lienzo3d'); return c.width + 'x' + c.height; });
    ok('el resize de la barra del móvil no rehace el lienzo', lienzo0 === l1 && l1 === l2, `${lienzo0} / ${l1} / ${l2}`);
    // el claro en táctil: «Mover el mapa»
    await pag.evaluate(() => document.getElementById('claro-marco').scrollIntoView({ block: 'center' }));
    await pag.waitForFunction(() => document.getElementById('claro').classList.contains('con-3d'), null, { timeout: 120000 });
    await espera(1000);
    const m0 = await pag.evaluate(() => ({ visible: !document.getElementById('claro-mover').hidden, ta: document.getElementById('claro-lienzo').style.touchAction }));
    ok('táctil: «Mover el mapa» visible y el lienzo deja hacer scroll (pan-y)', m0.visible && m0.ta === 'pan-y', JSON.stringify(m0));
    await pag.tap('#claro-mover'); await espera(400);
    const m1 = await pag.evaluate(() => ({ ta: document.getElementById('claro-lienzo').style.touchAction, p: document.getElementById('claro-mover').getAttribute('aria-pressed') }));
    await pag.tap('#claro-mover'); await espera(400);
    const m2 = await pag.evaluate(() => ({ ta: document.getElementById('claro-lienzo').style.touchAction, p: document.getElementById('claro-mover').getAttribute('aria-pressed') }));
    ok('«Mover el mapa» pone touch-action none y al soltar vuelve a pan-y', m1.ta === 'none' && m1.p === 'true' && m2.ta === 'pan-y' && m2.p === 'false', `${JSON.stringify(m1)} → ${JSON.stringify(m2)}`);
    await pag.tap('#claro-bajar');
    await pag.waitForFunction(() => window.CASTINEIRA_3D.claro.abajo && !window.CASTINEIRA_3D.claro.viajando, null, { timeout: 30000 });
    await espera(600);
    const mb = await pag.evaluate(() => { const m = window.CASTINEIRA_3D.motor, c = m.aPantalla(m.CASA, {}), b = document.getElementById('claro-lienzo').getBoundingClientRect(); return { d: Math.round(m.activa.camara.position.distanceTo(m.CASA)), x: c.x / b.width, y: c.y / b.height }; });
    ok('móvil: «Bajar a la casa» deja la casa en el cuadro', mb.d < 600 && mb.x > .1 && mb.x < .9 && mb.y > .1 && mb.y < .9, JSON.stringify(mb));
    // gesto con el dedo: deslizar de lado mueve el vuelo
    await pag.evaluate(() => window.scrollTo(0, 0)); await espera(1500);
    await pag.evaluate(() => { window.CASTINEIRA_3D.vuelo.t = 2000; });
    const cdp = await ctx.newCDPSession(pag);
    const t0 = await tVuelo(pag);
    const toque = async (tipo, x, y) => cdp.send('Input.dispatchTouchEvent', { type: tipo, touchPoints: tipo === 'touchEnd' ? [] : [{ x, y }] });
    await toque('touchStart', 300, 420); for (let i = 1; i <= 8; i++) await toque('touchMove', 300 - i * 25, 422); await toque('touchEnd');
    await espera(900);
    const t1 = await tVuelo(pag);
    ok('deslizar el dedo de lado mueve el vuelo', t1 > t0 + 1500, `${Math.round(t0)} → ${Math.round(t1)}`);
    ok('móvil sin errores de consola', !errores.length, errores.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ---------- 3. Movimiento reducido: el fotograma final, quieto, sin palas que giren, y el contenido igual de verdadero ----------
  {
    const ctx = await nav.newContext({ ...ESC, reducedMotion: 'reduce' });
    const pag = await ctx.newPage();
    await pag.goto(`${URL_BANCO}?cortina=0&ahora3d=${HORA}`);
    await pag.waitForFunction(() => document.getElementById('vuelo').classList.contains('con-3d'), null, { timeout: 90000 });
    const DUR = await pag.evaluate(() => window.CASTINEIRA_3D.vuelo.DUR);
    const t0 = await tVuelo(pag), a0 = await palas(pag); await espera(2000); const t1 = await tVuelo(pag), a1 = await palas(pag);
    ok('movimiento reducido: sin vuelo ni palas, en el fotograma final', t0 === DUR && t1 === DUR && a0 === a1, `${t0} / ${t1}`);
    const r = await pag.evaluate(() => ({ alt: document.getElementById('altimetro-valor').textContent, chip: document.getElementById('ahora-castineira').textContent, pausa: document.getElementById('vuelo-pausa').hidden }));
    ok('movimiento reducido: altímetro y chip con datos verdaderos, sin botón de pausa', /^(\d\.\d{3}|\d{3}) m$/.test(r.alt) && /^Ahora en A Castiñeira · 16:30/.test(r.chip) && r.pausa, JSON.stringify(r));
    await pag.evaluate(() => document.getElementById('claro-marco').scrollIntoView({ block: 'center' }));
    await pag.waitForFunction(() => document.getElementById('claro').classList.contains('con-3d'), null, { timeout: 90000 });
    await pag.click('#claro-bajar'); await espera(300);
    const rb = await pag.evaluate(() => ({ viaje: window.CASTINEIRA_3D.claro.viajando, d: Math.round(window.CASTINEIRA_3D.motor.activa.camara.position.distanceTo(window.CASTINEIRA_3D.motor.CASA)) }));
    ok('movimiento reducido: «Bajar a la casa» salta sin viaje', !rb.viaje && rb.d < 600, JSON.stringify(rb));
    await ctx.close();
  }
  // ---------- 4. El póster es el primer fotograma: el paso póster → 3D no salta ----------
  for (const [nombre, op] of [['escritorio 1024 × 640', ESC], ['Pixel 7', { ...devices['Pixel 7'] }]]) {
    const ctx = await nav.newContext(op); const pag = await ctx.newPage();
    await pag.goto(`${URL_BANCO}?cortina=600000&ahora3d=${HORA}`);   // la luz del póster: 16:30
    await pag.addStyleTag({ content: '.portada > :not(#vuelo), .rotulos3d, .cortina { visibility: hidden !important; } canvas.lienzo3d { transition: none !important; }' });
    await espera(2500);
    const a = await pag.locator('#vuelo').screenshot();
    await pag.evaluate(() => { document.documentElement.classList.add('cortina-fuera'); document.dispatchEvent(new Event('castineira:cortina-fuera')); });
    await pag.waitForFunction(() => document.getElementById('vuelo').classList.contains('con-3d'), null, { timeout: 120000 });
    await pag.evaluate(() => { document.getElementById('vuelo-pausa').click(); window.CASTINEIRA_3D.vuelo.t = 0; });
    await espera(1500);
    const b = await pag.locator('#vuelo').screenshot();
    const [ra, rb] = await Promise.all([a, b].map(x => sharp(x).resize(160, 100, { fit: 'fill' }).removeAlpha().raw().toBuffer()));
    let dif = 0; for (let i = 0; i < ra.length; i++) dif += Math.abs(ra[i] - rb[i]);
    dif /= ra.length;
    ok(`${nombre}: el póster coincide con el primer fotograma del vuelo`, dif < 4, `diferencia media ${dif.toFixed(1)} / 255`);
    await ctx.close();
  }
} finally { await nav.close(); }

// ---------- 5. Sin WebGL: póster, plano y mensaje ----------
const sin = await chromium.launch({ args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
try {
  const pag = await sin.newPage(ESC);
  const errores = [], pedidos = [];
  pag.on('pageerror', e => errores.push(e.message));
  pag.on('request', q => { if (RECURSOS.test(q.url()) && !/sol\.js/.test(q.url())) pedidos.push(q.url()); });
  await pag.goto(`${URL_BANCO}?cortina=0&ahora3d=${HORA}`);
  await pag.waitForFunction(() => document.getElementById('vuelo').classList.contains('sin-3d'), null, { timeout: 30000 }).catch(() => {});
  await espera(1000);
  const s = await pag.evaluate(() => ({
    vuelo: document.getElementById('vuelo').className, claro: document.getElementById('claro').className,
    poster: document.getElementById('vuelo-poster').complete && document.getElementById('vuelo-poster').naturalWidth > 0,
    lienzos: document.querySelectorAll('canvas').length, carga: document.getElementById('claro-carga').textContent, cargaVisible: !document.getElementById('claro-carga').hidden,
    pausa: document.getElementById('vuelo-pausa').hidden, chip: document.getElementById('ahora-castineira').textContent,
  }));
  ok('sin WebGL: sin-3d en #vuelo y #claro, sin canvas', /sin-3d/.test(s.vuelo) && /sin-3d/.test(s.claro) && !s.lienzos, `${s.vuelo} / ${s.claro}`);
  ok('sin WebGL: queda el póster y el botón de pausa sigue oculto', s.poster && s.pausa);
  await pag.evaluate(() => document.getElementById('claro-marco').scrollIntoView({ block: 'center' }));
  await espera(800);
  const plano = await pag.evaluate(() => { const i = document.getElementById('claro-plano'); return i.complete && i.naturalWidth > 0; });
  ok('sin WebGL: el plano se ve y #claro-carga explica por qué', plano && s.cargaVisible && /3D/.test(s.carga), s.carga);
  ok('sin WebGL: no se baja Three.js ni las texturas', !pedidos.length, pedidos.join(', '));
  ok('sin WebGL: el chip sigue diciendo la hora y el sol', /^Ahora en A Castiñeira · 16:30/.test(s.chip), s.chip);
  ok('sin WebGL: sin errores', !errores.length, errores.join(' | '));
} finally { await sin.close(); srv.close(); }
const bien = res.filter(r => r.ok).length;
console.log(`\n${bien}/${res.length} pruebas del 3D bien`);
process.exit(bien === res.length ? 0 : 1);
