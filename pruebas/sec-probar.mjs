// Pruebas de Secciones («Dibuja mi mapa» y «Un año en la casa») sobre el banco, puerto 8796.
// Uso (desde la carpeta de la web): node pruebas/sec-probar.mjs      → resultado N/N al final
import { montarBanco, servir, lanzar, URL_BANCO, espera, RAIZ } from './sec-comun.mjs';
import fs from 'node:fs';
import path from 'node:path';

const res = [];
const ok = (nombre, cond, detalle = '') => { res.push({ nombre, ok: !!cond }); console.log(`${cond ? 'OK  ' : 'MAL '} ${nombre}${detalle ? ' · ' + detalle : ''}`); };
const leer = r => fs.readFileSync(path.join(RAIZ, r), 'utf8');
const listo = pag => pag.waitForFunction(() => document.querySelector('#mapa').classList.contains('mapa--listo'), null, { timeout: 20000 });
const vbAncho = pag => pag.evaluate(() => +document.getElementById('mapa-svg').getAttribute('viewBox').split(' ')[2]);
const MES_HOY = 2;   // el reloj del navegador se fija en marzo de 2026
const FECHA = new Date('2026-03-10T12:00:00');

// ---------- 0. estáticas: nombres, selectores, letras ----------
{
  const usadas = montarBanco();
  console.log('     fotos del banco:', usadas.map(([n, o]) => `${n} (${o})`).join(', '));
  const sel = (css, raiz) => {
    const limpio = css.replace(/\/\*[\s\S]*?\*\//g, '');
    const malos = [];
    for (const m of limpio.matchAll(/([^{}]+)\{/g)) {
      const s = m[1].trim();
      if (!s || s.startsWith('@') || /^(from|to|\d+%)$/.test(s)) continue;
      s.split(',').map(x => x.trim()).filter(x => x && !x.includes(raiz)).forEach(x => malos.push(x));
    }
    return malos;
  };
  const mM = sel(leer('css/mapa.css'), '#mapa'), mA = sel(leer('css/anio.css'), '#anio');
  ok('css/mapa.css: todo selector va bajo #mapa', !mM.length, mM.join(' | '));
  ok('css/anio.css: todo selector va bajo #anio', !mA.length, mA.join(' | '));
  const todo = ['partes/mapa.html', 'partes/anio.html', 'css/mapa.css', 'css/anio.css', 'js/mapa.js', 'js/anio.js'].map(leer).join('\n');
  ok('ni Fraunces, ni Manrope, ni Newsreader', !/Fraunces|Manrope|Newsreader/.test(todo));
  ok('Reenie Beanie solo en el mapa', !/Reenie/.test(leer('css/anio.css') + leer('js/anio.js') + leer('partes/anio.html')));
  const pm = leer('partes/mapa.html'), pa = leer('partes/anio.html');
  ok('las partes son una <section> completa con su h2 (contrato)', /^<section id="mapa" class="mapa" aria-labelledby="t-mapa">/.test(pm.trim()) && /<h2 id="t-mapa">/.test(pm) && pm.trim().endsWith('</section>')
    && /^<section id="anio" class="anio" aria-labelledby="t-anio">/.test(pa.trim()) && /<h2 id="t-anio">/.test(pa) && pa.trim().endsWith('</section>'));
  const fotos = fs.existsSync(path.join(RAIZ, 'img/fotos/fotos.json')) ? JSON.parse(leer('img/fotos/fotos.json')).map(f => f.nombre) : [];
  const pedidas = [...pa.matchAll(/data-foto="([^"]+)"/g)].map(m => m[1]);
  ok('las fotos del año existen en img/fotos/fotos.json de la web', pedidas.length === 4 && pedidas.every(n => fotos.includes(n)), pedidas.map(n => n + (fotos.includes(n) ? '' : ' (FALTA)')).join(', '));
  ok('las rutas no van incrustadas en el HTML (JSON aparte)', !/"perfil"|"lugares"/.test(pm) && fs.existsSync(path.join(RAIZ, 'img/mapa/rutas.json')));
  const pesos = ['papel-1800.avif', 'papel-3600.avif', 'rutas.json'].map(f => [f, Math.round(fs.statSync(path.join(RAIZ, 'img/mapa', f)).size / 1024)]);
  ok('pesos del mapa contenidos (papel 1800 ≤ 400 KB, 3600 ≤ 650 KB AVIF, rutas ≤ 40 KB)', pesos[0][1] <= 400 && pesos[1][1] <= 650 && pesos[2][1] <= 40, pesos.map(([f, k]) => `${f} ${k} KB`).join(', '));
}

const srv = await servir();
const nav = await lanzar();
try {
  // ---------- 1. escritorio ----------
  {
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    const pag = await ctx.newPage();
    await pag.clock.setFixedTime(FECHA);
    const errores = [], pedidos = [];
    pag.on('console', m => { if (m.type() === 'error' && !/fonts\.g/.test(m.text())) errores.push(m.text()); });
    pag.on('pageerror', e => errores.push(e.message));
    pag.on('request', r => pedidos.push(r.url()));
    await pag.goto(URL_BANCO, { waitUntil: 'load' });
    await espera(600);
    ok('perezoso: arriba del todo no se piden ni las rutas ni el papel', !pedidos.some(u => /img\/mapa\//.test(u)), pedidos.filter(u => /img\/mapa/.test(u)).join(', '));
    const globales = await pag.evaluate(() => { const a = new Set(window.__globalesAntes); return Object.getOwnPropertyNames(window).filter(k => !a.has(k) && k !== '__globalesAntes'); });
    ok('sin variables globales nuevas', !globales.length, globales.join(', '));

    await pag.locator('#mapa-pliego').scrollIntoViewIfNeeded();
    await listo(pag);
    ok('al acercarse se piden rutas.json y un papel', pedidos.some(u => /img\/mapa\/rutas\.json/.test(u)) && pedidos.some(u => /img\/mapa\/papel-\d+\.(avif|webp|jpg)/.test(u)));
    ok('el papel llega en AVIF (lo elige el navegador)', pedidos.some(u => /papel-\d+\.avif/.test(u)) && !pedidos.some(u => /papel-\d+\.jpg/.test(u)));
    await espera(3400);
    const m1 = await pag.evaluate(() => {
      const s = document.getElementById('mapa');
      return {
        rutas: s.querySelectorAll('.mapa-capas path[data-ref]').length, tarjetas: s.querySelectorAll('#mapa-plan .mapa-dia').length,
        flechas: s.querySelectorAll('.mapa-capas path[transform]').length, leyenda: !!s.querySelector('.mapa-leyenda'), casa: !!s.querySelector('.mapa-casa'),
        nums: [...s.querySelectorAll('.mapa-capas text')].filter(t => /^\d$/.test(t.textContent)).length,
        letra: getComputedStyle(s.querySelector('.mapa-capas text')).fontFamily, total: s.querySelector('#mapa-total').textContent, dicho: s.querySelector('#mapa-dicho').textContent,
        vivo: s.querySelector('#mapa-resumen').getAttribute('aria-live'), href: s.querySelector('image.mapa-papel').getAttribute('href')
      };
    });
    ok('2 días por defecto: 2 rutas dibujadas y 2 tarjetas', m1.rutas === 2 && m1.tarjetas === 2, JSON.stringify({ r: m1.rutas, t: m1.tarjetas }));
    ok('trazo a mano: flechas rojas, número en la salida, leyenda y la casa', m1.flechas >= 6 && m1.nums === 2 && m1.leyenda && m1.casa, `${m1.flechas} flechas, ${m1.nums} números`);
    ok('las notas del mapa van en Reenie Beanie', /Reenie Beanie/.test(m1.letra), m1.letra);
    ok('el plan, también en texto y con aria-live', m1.vivo === 'polite' && /Tu plan de 2 días: día 1, PR-G \d+/.test(m1.dicho) && /2 días · [\d,]+ km · \+[\d.]+ m andando/.test(m1.total), m1.total);
    ok('zoom a lo elegido (viewBox más estrecho que el mapa entero)', (await vbAncho(pag)) < 1500, String(await vbAncho(pag)));
    // las cifras son las de Manolo (no las de OSM) y los minutos, los de OSRM
    const rj = JSON.parse(leer('img/mapa/rutas.json'));
    const cifras = await pag.evaluate(() => [...document.querySelectorAll('#mapa-plan .mapa-dia[data-ruta]')].map(b => {
      const li = document.querySelector(`[data-ruta="${b.dataset.ruta}"]:not(button)`);
      return { ref: b.dataset.ruta, datos: [...b.querySelectorAll('.mapa-datos span')].map(s => s.textContent), km: li.dataset.km, asc: li.dataset.desnivel };
    }));
    ok('tarjetas con los km y el desnivel de Manolo y los minutos de OSRM', cifras.length === 2 && cifras.every(c =>
      c.datos[0] === `${(+c.km).toLocaleString('es-ES')} km` && c.datos[1] === `+${new Intl.NumberFormat('es-ES', { useGrouping: 'always' }).format(+c.asc)} m` && c.datos.includes(`${rj.rutas[c.ref].coche} min en coche`)), JSON.stringify(cifras.map(c => [c.ref, ...c.datos])));

    // gustos, días y nivel
    await pag.click('#mapa [data-grupo="dias"] [data-valor="3"]');
    await pag.click('#mapa [data-grupo="nivel"] [data-valor="suave"]');
    await espera(400);
    const m2 = await pag.evaluate(() => ({
      rutas: [...document.querySelectorAll('#mapa .mapa-capas path[data-ref]')].map(p => p.dataset.ref),
      libres: document.querySelectorAll('#mapa .mapa-dia--libre').length,
      textos: [...document.querySelectorAll('#mapa .mapa-capas text')].map(t => t.textContent)
    }));
    ok('3 días y «suave»: una sola ruta suave (PR-G 4) y dos días sin mochila', m2.rutas.join() === 'PR-G 4' && m2.libres === 2, JSON.stringify(m2.rutas));
    ok('el día de pueblos pone sus lugares en el mapa', ['Mosteiro de Montederramo', 'Castro Caldelas', 'San Paio de Abeleda'].every(t => m2.textos.includes(t)));
    await pag.click('#mapa [data-grupo="nivel"] [data-valor="fuerte"]');
    await pag.click('#mapa [data-grupo="gustos"] [data-valor="vina"]');
    await espera(400);
    const m3 = await pag.evaluate(() => [...document.querySelectorAll('#mapa .mapa-capas path[data-ref]')].map(p => p.dataset.ref));
    ok('«con ganas» y viñas: entra Penas de Matacás (PR-G 237)', m3.length === 3 && m3.includes('PR-G 237'), m3.join(', '));

    // ruta enfocada al pulsar su tarjeta, con el teclado
    await espera(1000);
    const antes = await vbAncho(pag);
    const tarjeta = pag.locator('#mapa-plan .mapa-dia[data-ruta]').first();
    const ref = await tarjeta.getAttribute('data-ruta');
    await tarjeta.focus();
    await pag.keyboard.press('Enter');
    await espera(1100);
    const f1 = await pag.evaluate(r => ({
      pulsada: document.querySelector(`#mapa-plan .mapa-dia[data-ruta="${r}"]`).getAttribute('aria-pressed'),
      foco: document.activeElement.dataset.ruta,
      ops: [...document.querySelectorAll('#mapa .mapa-capas path[data-ref]')].map(p => [p.dataset.ref, +p.getAttribute('opacity')]),
      dicho: document.getElementById('mapa-dicho').textContent
    }), ref);
    ok('tarjeta con Enter: se acerca a su ruta y apaga las otras', f1.pulsada === 'true' && (await vbAncho(pag)) < antes && f1.ops.every(([r, o]) => r === ref ? o === 1 : o < .5), `${Math.round(antes)} → ${Math.round(await vbAncho(pag))}`);
    ok('el foco del teclado sigue en la misma tarjeta y se anuncia', f1.foco === ref && f1.dicho.includes(`Mapa acercado a ${ref}`));
    await pag.keyboard.press('Space');
    await espera(1100);
    ok('otra vez (Espacio): vuelve al plan entero', (await tarjeta.getAttribute('aria-pressed')) === 'false' && (await vbAncho(pag)) > antes - 5);

    // perfil de altura: ratón y teclado mueven el punto por el mapa
    const zona = pag.locator('#mapa-perfil-zona');
    const bz = await zona.boundingBox();
    await pag.mouse.move(bz.x + bz.width * .5, bz.y + bz.height * .5);
    await espera(100);
    const pf = await pag.evaluate(() => {
      const c = document.querySelector('#mapa .mapa-punto'), vb = document.getElementById('mapa-svg').getAttribute('viewBox').split(' ').map(Number);
      return { op: c.getAttribute('opacity'), x: +c.getAttribute('cx'), y: +c.getAttribute('cy'), vb, dato: document.getElementById('mapa-perfil-dato').textContent };
    });
    ok('el perfil mueve un punto por el mapa (ratón)', pf.op === '1' && pf.x >= pf.vb[0] && pf.x <= pf.vb[0] + pf.vb[2] && pf.y >= pf.vb[1] && pf.y <= pf.vb[1] + pf.vb[3] && /^km [\d,]+ \(aprox\.\) · \d+ m$/.test(pf.dato), pf.dato);
    await pag.mouse.move(10, 10);
    await zona.focus();
    for (let i = 0; i < 6; i++) await pag.keyboard.press('ArrowRight');
    const pk = await pag.evaluate(() => ({ now: +document.getElementById('mapa-perfil-zona').getAttribute('aria-valuenow'), txt: document.getElementById('mapa-perfil-zona').getAttribute('aria-valuetext'), op: document.querySelector('#mapa .mapa-punto').getAttribute('opacity') }));
    ok('el perfil también con las flechas (role=slider)', pk.now > 0 && /^Kilómetro [\d,]+, \d+ metros de altura$/.test(pk.txt) && pk.op === '1', pk.txt);

    // descarga del PNG con <a download>
    const [dl] = await Promise.all([pag.waitForEvent('download', { timeout: 20000 }), pag.click('#mapa-bajar')]);
    const fich = await dl.path();
    const b = fs.readFileSync(fich);
    const anchoPng = b.readUInt32BE(16), altoPng = b.readUInt32BE(20);
    ok('«Descargar mi mapa» baja un PNG de 1800 px', dl.suggestedFilename() === 'mapa-caserio-da-castineira.png' && b.subarray(1, 4).toString() === 'PNG' && anchoPng === 1800 && altoPng > 900, `${dl.suggestedFilename()} ${anchoPng}×${altoPng} ${Math.round(b.length / 1024)} KB`);
    fs.copyFileSync(fich, path.join(RAIZ, 'pruebas', 'sec-mapa-descarga.png'));
    ok('el PNG se hace con el papel grande (3600)', (await pag.evaluate(() => document.getElementById('mapa').dataset.papel)) === '3600');
    // verlo en grande
    await pag.click('#mapa-ver');
    await pag.waitForFunction(() => document.getElementById('mapa-visor').open && document.getElementById('mapa-visor-img').naturalWidth > 0, null, { timeout: 15000 });
    const vz = await pag.evaluate(() => { const a = document.getElementById('mapa-visor-bajar'); return { w: document.getElementById('mapa-visor-img').naturalWidth, href: a.href, dl: a.getAttribute('download'), foco: document.activeElement.id }; });
    ok('«Verlo en grande»: diálogo con la imagen y su enlace de descarga', vz.w === 1800 && vz.href.startsWith('blob:') && vz.dl === 'mapa-caserio-da-castineira.png' && vz.foco === 'mapa-visor-cerrar', JSON.stringify(vz));
    await pag.keyboard.press('Escape');
    await espera(200);
    ok('Escape cierra el visor y el foco vuelve al botón', await pag.evaluate(() => !document.getElementById('mapa-visor').open && document.activeElement.id === 'mapa-ver'));
    await pag.locator('#mapa').screenshot({ path: path.join(RAIZ, 'pruebas', 'sec-mapa-1440-3dias.png') });

    // contrastes (texto ≥ 4,5:1)
    const contrastes = await pag.evaluate(() => {
      const rgb = s => s.match(/[\d.]+/g).slice(0, 3).map(Number);
      const L = c => { const v = c.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2]; };
      const cr = (a, b) => { const x = L(a), y = L(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
      const casos = [['#mapa .mapa-antetitulo', [241, 235, 221]], ['#mapa h2 em', [241, 235, 221]], ['#mapa .mapa-intro', [241, 235, 221]], ['#mapa .mapa-fuente', [241, 235, 221]],
        ['#mapa .mapa-grupo legend', [241, 235, 221]], ['#mapa .mapa-dia-txt', [250, 246, 236]], ['#mapa .mapa-dia-sal', [250, 246, 236]], ['#mapa .mapa-dia-zoom', [250, 246, 236]],
        ['#mapa .mapa-perfil-cab span', [250, 246, 236]], ['#mapa .mapa-perfil-ayuda', [250, 246, 236]], ['#mapa .mapa-accion', [163, 40, 27]],
        ['#anio .anio-antetitulo', [16, 26, 46]], ['#anio .anio-intro', [16, 26, 46]], ['#anio .anio-ayuda', [16, 26, 46]], ['#anio .anio-fuente', [16, 26, 46]],
        ['#anio .anio-fechas dt', [27, 36, 54]], ['#anio .anio-ficha-pie', [27, 36, 54]], ['#anio .anio-boton', [16, 26, 46]]];
      return casos.map(([s, bg]) => { const e = document.querySelector(s); return [s, e ? +cr(rgb(getComputedStyle(e).color), bg).toFixed(2) : 0]; });
    });
    const bajos = contrastes.filter(([, c]) => c < 4.5);
    ok('contraste del texto ≥ 4,5:1 en las dos secciones', !bajos.length, bajos.length ? JSON.stringify(bajos) : `mínimo ${Math.min(...contrastes.map(c => c[1]))}`);

    // ---------- el año (escritorio) ----------
    await pag.locator('#anio-escena').scrollIntoViewIfNeeded();
    await espera(1500);
    const a1 = await pag.evaluate(() => {
      const s = document.getElementById('anio');
      return {
        mes: s.dataset.mes, est: s.dataset.estacion, h: s.querySelector('#anio-mes').textContent, botones: s.querySelectorAll('.anio-hora').length,
        tab0: [...s.querySelectorAll('.anio-hora')].filter(b => b.tabIndex === 0).map(b => b.dataset.mes), hoy: s.querySelector('.anio-hora--hoy').dataset.mes,
        cielo: s.dataset.cielo, lista: getComputedStyle(s.querySelector('#anio-meses')).display,
        fotos: [...s.querySelectorAll('.anio-foto')].map(f => [f.currentSrc.split('/').pop(), f.complete && f.naturalWidth > 0, getComputedStyle(f).opacity])
      };
    });
    ok('el año empieza en el mes de hoy (marzo, primavera)', a1.mes === String(MES_HOY) && a1.est === '1' && a1.h === 'Marzo' && a1.hoy === String(MES_HOY), `${a1.h} · estación ${a1.est}`);
    ok('reloj de doce meses con un solo tabulador (el mes elegido)', a1.botones === 12 && a1.tab0.join() === String(MES_HOY));
    ok('las cuatro fotos de estación cargan', a1.fotos.every(f => f[1]), JSON.stringify(a1.fotos));
    ok('con guion, la lista de meses se oculta (está en el reloj)', a1.lista === 'none');
    const pix = await pag.evaluate(() => { const c = document.getElementById('anio-cielo'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n; });
    ok('partículas de primavera (pétalos) en marcha', a1.cielo === 'vivo' && pix > 200, `${pix} px pintados`);
    await pag.click('#anio .anio-hora[data-mes="0"]');
    await espera(1300);
    const a2 = await pag.evaluate(() => ({ h: document.getElementById('anio-mes').textContent, e: document.getElementById('anio-est').textContent, cerca: [...document.querySelectorAll('#anio-cerca li')].map(l => l.textContent),
      ops: [...document.querySelectorAll('#anio .anio-foto')].map(f => +getComputedStyle(f).opacity), centro: document.getElementById('anio-reloj-mes').textContent }));
    ok('enero: invierno, la foto de la nieve opaca y su «cerca»', a2.h === 'Enero' && a2.e === 'Invierno' && a2.ops[0] === 1 && a2.ops[2] === 0 && a2.cerca.join() === 'Manzaneda · 62 min,Estufa en cada estancia' && a2.centro === 'Enero', JSON.stringify(a2.ops));
    await pag.keyboard.press('ArrowRight');
    await espera(1300);
    const a3 = await pag.evaluate(() => ({ h: document.getElementById('anio-mes').textContent, foco: document.activeElement.dataset.mes, ops: [...document.querySelectorAll('#anio .anio-foto')].map(f => +(+getComputedStyle(f).opacity).toFixed(2)) }));
    ok('flecha derecha: febrero (aún invierno), con el foco en su botón', a3.h === 'Febrero' && a3.foco === '1' && a3.ops.join() === '1,0,0,0', JSON.stringify(a3.ops));
    await pag.keyboard.press('ArrowRight');
    let a4 = null;
    for (let i = 0; i < 12 && !a4; i++) {
      const o = await pag.evaluate(() => [...document.querySelectorAll('#anio .anio-foto')].map(f => +(+getComputedStyle(f).opacity).toFixed(2)));
      if (o[1] > 0 && o[1] < 1) a4 = o; else await espera(60);
    }
    a4 = a4 || [0, 0];
    await espera(1800);
    const a5 = await pag.evaluate(() => [...document.querySelectorAll('#anio .anio-foto')].map(f => +(+getComputedStyle(f).opacity).toFixed(2)));
    ok('marzo: fundido nieve → prado y al final solo el prado', a4[0] === 1 && a4[1] > 0 && a4[1] < 1 && a5.join() === '0,1,0,0', JSON.stringify([a4, a5]));
    await pag.click('#anio-pasar');
    const vivo1 = await pag.getAttribute('#anio-carta', 'aria-live');
    await espera(4200);
    const pasado = await pag.evaluate(() => +document.getElementById('anio').dataset.mes);
    await pag.click('#anio-pasar');
    ok('«Pasar el año» avanza solo y calla el aria-live mientras pasa', vivo1 === 'off' && pasado >= 3 && (await pag.getAttribute('#anio-carta', 'aria-live')) === 'polite' && (await pag.textContent('#anio-pasar')) === 'Pasar el año', `mes ${pasado}`);
    await pag.click('#anio-hoy');
    ok('«Ir a hoy» vuelve a marzo', (await pag.evaluate(() => document.getElementById('anio').dataset.mes)) === String(MES_HOY));
    ok('vales regalo y fiestas en la sección', await pag.evaluate(() => { const t = document.getElementById('anio').textContent; return /Vales regalo/.test(t) && /el vale que no caduca/.test(t) && /14 al 16 de agosto/.test(t) && /12 y 28 de cada mes/.test(t) && /8 de septiembre/.test(t); }));
    // densidad sobria: sin partículas
    await pag.evaluate(() => document.documentElement.classList.add('densidad-sobria'));
    await espera(200);
    const so = await pag.evaluate(() => ({ cielo: document.getElementById('anio').dataset.cielo, d: getComputedStyle(document.getElementById('anio-cielo')).display }));
    ok('densidad sobria: el año sin partículas (y vuelven al quitarla)', so.cielo === 'quieto' && so.d === 'none' && await pag.evaluate(async () => { document.documentElement.classList.remove('densidad-sobria'); await new Promise(r => setTimeout(r, 100)); return document.getElementById('anio').dataset.cielo === 'vivo'; }));
    await pag.locator('#anio').screenshot({ path: path.join(RAIZ, 'pruebas', 'sec-anio-1440.png') });
    ok('escritorio sin errores en consola', !errores.length, errores.join(' | '));
    await ctx.close();
  }

  // ---------- 2. móvil: 390 (densidad 3) y 360 ----------
  for (const [w, h, dpr] of [[390, 844, 3], [360, 740, 2]]) {
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: true, hasTouch: true });
    const pag = await ctx.newPage();
    await pag.clock.setFixedTime(FECHA);
    const errores = [];
    pag.on('pageerror', e => errores.push(e.message));
    await pag.goto(URL_BANCO, { waitUntil: 'load' });
    // en Playwright los vh del relleno cambian con el alto: se fijan en px para medir saltos
    await pag.addStyleTag({ content: `.relleno{min-height:${Math.round(h * 2.6)}px !important}.relleno.fin{min-height:${Math.round(h * .6)}px !important}` });
    await pag.locator('#mapa-pliego').scrollIntoViewIfNeeded();
    await listo(pag);
    await espera(3200);
    if (w === 390) ok('móvil denso: el plan se ve de cerca y pide el papel grande', (await pag.evaluate(() => document.getElementById('mapa').dataset.papel)) === '3600');
    await pag.locator('#anio-escena').scrollIntoViewIfNeeded();
    await espera(900);
    const desb = await pag.evaluate(() => {
      const W = innerWidth, malos = [];
      document.querySelectorAll('#mapa *, #anio *').forEach(e => {
        if (e.closest('svg') && e.tagName !== 'svg' || e.closest('dialog') || e.closest('details:not([open])')) return;
        const r = e.getBoundingClientRect();
        if (r.width && (r.left < -.5 || r.right > W + .5)) malos.push(`${e.tagName.toLowerCase()}.${e.className && e.className.baseVal == null ? e.className : ''} ${Math.round(r.left)}–${Math.round(r.right)}`);
      });
      return { scroll: document.documentElement.scrollWidth, W, malos: malos.slice(0, 6) };
    });
    ok(`${w}: sin desbordes a lo ancho`, desb.scroll <= desb.W && !desb.malos.length, JSON.stringify(desb));
    const geo = await pag.evaluate(() => {
      const e = document.getElementById('anio-escena').getBoundingClientRect(), c = document.getElementById('anio-carta').getBoundingClientRect();
      const bs = [...document.querySelectorAll('#anio .anio-hora')].map(b => b.getBoundingClientRect());
      return { dentro: bs.every(b => b.left >= e.left && b.right <= e.right && b.top >= e.top), relojAbajo: Math.max(...bs.map(b => b.bottom)), cartaArriba: c.top, cartaAbajo: c.bottom, escAbajo: e.bottom, minBoton: Math.min(...bs.map(b => b.width)) };
    });
    ok(`${w}: el reloj cabe en la foto, no pisa la carta y sus botones miden ≥ 32 px`, geo.dentro && geo.relojAbajo + 6 <= geo.cartaArriba && geo.cartaAbajo <= geo.escAbajo && geo.minBoton >= 32, JSON.stringify(geo));
    if (w === 390) {
      // la barra del navegador: solo cambia el alto → nada se rehace ni salta
      const foto = () => pag.evaluate(() => ({
        pint: document.getElementById('mapa').dataset.pintadas, vb: document.getElementById('mapa-svg').getAttribute('viewBox'),
        R: document.getElementById('anio-reloj').style.getPropertyValue('--R'), top: Math.round(document.getElementById('anio-carta').getBoundingClientRect().top + scrollY),
        topM: Math.round(document.getElementById('mapa-plan').getBoundingClientRect().top + scrollY)
      }));
      const f0 = await foto();
      await pag.setViewportSize({ width: w, height: h - 56 });
      await espera(500);
      const f1 = await foto();
      await pag.setViewportSize({ width: w, height: h });
      await espera(500);
      const f2 = await foto();
      ok('390: la barra del móvil (solo alto) no rehace el mapa ni mueve nada', JSON.stringify(f0) === JSON.stringify(f1) && JSON.stringify(f0) === JSON.stringify(f2), JSON.stringify([f0, f1]));
      await pag.locator('#mapa').screenshot({ path: path.join(RAIZ, 'pruebas', 'sec-mapa-390.png') });
      await pag.locator('#anio').screenshot({ path: path.join(RAIZ, 'pruebas', 'sec-anio-390.png') });
    } else {
      await pag.locator('#mapa').screenshot({ path: path.join(RAIZ, 'pruebas', 'sec-mapa-360.png') });
      await pag.locator('#anio').screenshot({ path: path.join(RAIZ, 'pruebas', 'sec-anio-360.png') });
    }
    ok(`${w}: sin errores`, !errores.length, errores.join(' | '));
    await ctx.close();
  }

  // ---------- 3. movimiento reducido ----------
  {
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const pag = await ctx.newPage();
    await pag.clock.setFixedTime(FECHA);
    await pag.goto(URL_BANCO, { waitUntil: 'load' });
    await pag.locator('#mapa-pliego').scrollIntoViewIfNeeded();
    await listo(pag);
    await espera(150);
    const r1 = await pag.evaluate(() => ({ anim: document.getAnimations().length, rutas: document.querySelectorAll('#mapa .mapa-capas path[data-ref]').length, vb: +document.getElementById('mapa-svg').getAttribute('viewBox').split(' ')[2] }));
    ok('reducido: el mapa sale dibujado y quieto (sin animaciones ni viaje)', r1.anim === 0 && r1.rutas === 2 && r1.vb < 1500, JSON.stringify(r1));
    await pag.locator('#anio-escena').scrollIntoViewIfNeeded();
    await espera(300);
    const r2 = await pag.evaluate(() => ({ cielo: document.getElementById('anio').dataset.cielo, pasar: document.getElementById('anio-pasar').hidden, hoy: document.getElementById('anio-hoy').hidden, tr: getComputedStyle(document.querySelector('#anio .anio-foto')).transitionDuration, mes: document.getElementById('anio-mes').textContent }));
    ok('reducido: el año sin partículas ni «Pasar el año», legible y con «Ir a hoy»', r2.cielo === 'quieto' && r2.pasar && !r2.hoy && r2.tr === '0s' && r2.mes === 'Marzo', JSON.stringify(r2));
    await ctx.close();
  }

  // ---------- 4. sin JavaScript ----------
  {
    const ctx = await nav.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
    const pag = await ctx.newPage();
    await pag.goto(URL_BANCO, { waitUntil: 'load' });
    const s = await pag.evaluate(() => ({
      meses: [...document.querySelectorAll('#anio-meses li')].filter(l => l.getBoundingClientRect().height > 0).length,
      carta: getComputedStyle(document.getElementById('anio-carta')).display, rutas: document.querySelectorAll('#mapa .mapa-rutas-lista li').length,
      fotoOtono: getComputedStyle(document.querySelector('#anio .anio-foto[data-est="3"]')).opacity
    }));
    ok('sin guion: los doce meses en lista, una foto y las rutas en texto', s.meses === 12 && s.carta === 'none' && s.rutas === 9 && s.fotoOtono === '1', JSON.stringify(s));
    await ctx.close();
  }

  // ---------- 5. en la página de verdad (index.html de la web), si ya lleva las partes de ahora ----------
  {
    const idx = fs.existsSync(path.join(RAIZ, 'index.html')) ? leer('index.html') : '';
    const pm = leer('partes/mapa.html').trim(), pa = leer('partes/anio.html');
    const meses = pa.slice(pa.indexOf('<ol class="anio-meses"'), pa.indexOf('</ol>', pa.indexOf('<ol class="anio-meses"')));
    if (!idx || !idx.includes(pm) || !idx.includes(meses)) {
      console.log('SALTADA la prueba en index.html: aún no está construido con las partes de ahora (node construir.mjs, lo hace la web)');
    } else {
      const ctx = await nav.newContext({ viewport: { width: 1280, height: 800 } });
      const pag = await ctx.newPage();
      await pag.clock.setFixedTime(FECHA);
      const errores = [];
      pag.on('pageerror', e => errores.push(e.message));
      pag.on('console', m => { if (m.type() === 'error' && /mapa|anio/.test(m.text())) errores.push(m.text()); });
      await pag.goto(`http://127.0.0.1:8796/index.html`, { waitUntil: 'load' });
      await pag.waitForFunction(() => document.documentElement.classList.contains('cortina-fuera') || !document.querySelector('.cortina'), null, { timeout: 15000 }).catch(() => {});
      await espera(1500);
      await pag.locator('#mapa-pliego').scrollIntoViewIfNeeded();
      await listo(pag);
      await espera(800);
      await pag.locator('#anio-escena').scrollIntoViewIfNeeded();
      await espera(800);
      const r = await pag.evaluate(() => ({
        rutas: document.querySelectorAll('#mapa .mapa-capas path[data-ref]').length, mes: document.getElementById('anio-mes').textContent,
        fotos: [...document.querySelectorAll('#anio .anio-foto')].filter(f => f.complete && f.naturalWidth > 0).length,
        letraH2: getComputedStyle(document.querySelector('#mapa h2')).fontFamily, scroll: document.documentElement.scrollWidth <= innerWidth
      }));
      ok('en index.html: el mapa se dibuja, el año empieza en marzo y cargan sus fotos', r.rutas === 2 && r.mes === 'Marzo' && r.fotos === 4 && /Instrument Serif/.test(r.letraH2) && r.scroll, JSON.stringify(r));
      ok('en index.html: sin errores de las secciones', !errores.length, errores.join(' | '));
      await ctx.close();
    }
  }
} finally {
  await nav.close();
  srv.close();
}
const bien = res.filter(r => r.ok).length;
console.log(`\n${bien}/${res.length} pruebas de Secciones`);
process.exitCode = bien === res.length ? 0 : 1;
