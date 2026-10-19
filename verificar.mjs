/* Verificación de la web de Caserío da Castiñeira (Playwright).
   Uso: node verificar.mjs [--capturas]   → capturas en ./pruebas/
   Puerto propio: 8797. Una comprobación por cada punto del checklist y del ENCARGO.
   El 3D va BLOQUEADO en casi todas las pruebas (es de otro módulo y en headless es software puro):
   solo lo cargan las pruebas «con 3D», con ventana pequeña. Las partes de Secciones (#mapa, #anio)
   se comprueban si están; y aparte, que la web va igual sin ellas (__sin-partes.html).
   El navegador se cierra SIEMPRE (finally): un Chromium huérfano con WebGL satura la CPU. */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const { chromium } = require('playwright');
const sharp = require('sharp');

const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const PUERTO = 8797;
const CAPTURAS = process.argv.includes('--capturas');
const DIR_CAP = path.join(RAIZ, 'pruebas');
fs.mkdirSync(DIR_CAP, { recursive: true });
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.bin': 'application/octet-stream' };
const existe = (rel) => fs.existsSync(path.join(RAIZ, rel));

/* páginas virtuales: la portada sin el mando (receta del README) y sin lo de los otros agentes */
const INDEX = () => fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
const quitar = (html, ini, fin) => {
  const a = html.indexOf(ini), b = html.indexOf(fin, a);
  if (a < 0 || b < 0) throw new Error('No encuentro la marca ' + ini);
  return html.slice(0, a) + html.slice(b + fin.length);
};
const sinMando = () => {
  let h = INDEX();
  h = quitar(h, '<!-- MANDO DE MAQUETA: la tabla', '<!-- fin de la tabla del MANDO DE MAQUETA -->');
  h = quitar(h, '<!-- MANDO DE MAQUETA: solo con ?revision', '<!-- fin del MANDO DE MAQUETA -->');
  h = quitar(h, '  // MANDO DE MAQUETA', '  // fin del MANDO DE MAQUETA');
  return h;
};
const sinPartes = () => {
  let h = INDEX();
  h = quitar(h, '<!-- PARTE «Dibuja mi mapa»', '<!-- fin PARTE «Dibuja mi mapa» -->');
  h = quitar(h, '<!-- PARTE «Un año en la casa»', '<!-- fin PARTE «Un año en la casa» -->');
  return h.replace(/<link rel="stylesheet" href="css\/(mapa|anio|3d)\.css[^"]*">/g, '').replace(/<script src="js\/(mapa|anio)\.js[^"]*" defer><\/script>/g, '').replace(/<script type="module" src="js\/3d\/arranque\.js[^"]*"[^>]*><\/script>/g, '');
};
const servidor = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const virtual = { '/__sin-mando.html': sinMando, '/__sin-partes.html': sinPartes }[p];
  if (virtual) { res.writeHead(200, { 'Content-Type': TIPOS['.html'] }); res.end(virtual()); return; }
  const f = path.join(RAIZ, p);
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
servidor.on('error', (e) => { console.error(`El puerto ${PUERTO} está ocupado (¿otra sesión?): ${e.message}`); process.exit(2); });
await new Promise((r) => servidor.listen(PUERTO, r));
const BASE = `http://localhost:${PUERTO}/`;
console.log('sirviendo en ' + BASE);

const fallos = [], avisos = [];
let nOk = 0;
const mal = (m) => { fallos.push(m); console.log('  FALLO  ' + m); };
const ok = (m) => { nOk++; console.log('  ok     ' + m); };
const aviso = (m) => { avisos.push(m); console.log('  aviso  ' + m); };
const comprobar = (cond, m, detalle) => (cond ? ok(m) : mal(m + (detalle !== undefined ? ' → ' + JSON.stringify(detalle).slice(0, 700) : '')));
const cap = async (page, nombre, op) => { if (!CAPTURAS) return; try { await page.screenshot({ path: path.join(DIR_CAP, nombre + '.png'), timeout: 60000, ...(op || {}) }); } catch (e) { console.log('  (aviso) no se pudo capturar ' + nombre + ': ' + e.message.split(/\n/)[0]); } };
const LLAVE = 'castineira-cookies';
const sinCookies = () => { try { localStorage.setItem('castineira-cookies', 'si'); } catch (e) {} };
const MOVIL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const html = INDEX();
const HAY_3D = existe('js/3d/arranque.js') && /js\/3d\/arranque\.js/.test(html);
const HAY = { mapa: /<section id="mapa"/.test(html), anio: /<section id="anio"/.test(html) };

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {

async function nueva(op = {}, { script, sin3d = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...op });
  // Google Fonts y Maps no salen a la red: así la prueba no depende de nadie
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await ctx.route(/google\.com\/maps/, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<p>mapa</p>' }));
  if (sin3d) await ctx.route(/\/js\/3d\//, (r) => r.abort());
  if (script) await ctx.addInitScript(script);
  const page = await ctx.newPage();
  page._errores = [];
  page.on('pageerror', (e) => page._errores.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !(sin3d && /3d|ERR_FAILED/.test(m.text()))) page._errores.push('consola: ' + m.text()); });
  page.on('response', (r) => { if (r.status() >= 400) page._errores.push(r.status() + ' ' + r.url()); });
  return { ctx, page };
}
async function bajarA(page, sel, margen = 70) {
  const top = () => page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top, sel);
  for (let i = 0; i < 160; i++) {
    const t = await top();
    if (Math.abs(t - margen) < 24) break;
    await page.mouse.wheel(0, Math.max(-600, Math.min(600, t - margen)));
    await page.waitForTimeout(50);
    if (t - margen > 0 && await page.evaluate(() => innerHeight + scrollY >= document.documentElement.scrollHeight - 2)) break;
  }
  await page.waitForTimeout(300);
}
async function bajarTodo(page) {
  for (let i = 0; i < 600; i++) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(40);
    if (await page.evaluate(() => innerHeight + scrollY >= document.documentElement.scrollHeight - 2)) break;
  }
  await page.waitForTimeout(1200);
}
const esperarCortina = async (page, extra = 400) => {
  await page.waitForFunction(() => { const c = document.getElementById('cortina'); return !c || getComputedStyle(c).display === 'none'; }, null, { timeout: 12000 });
  await page.waitForTimeout(extra);
};
const pixel = async (buf, x, y) => { const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true }); const i = (Math.round(y) * info.width + Math.round(x)) * info.channels; return [data[i], data[i + 1], data[i + 2]]; };
const cerca = (a, b, t = 14) => a.every((v, i) => Math.abs(v - b[i]) <= t);
const NOCHE = [8, 13, 24];
const naranja = (p) => p[0] > 200 && p[1] > 100 && p[2] < 170;

/* ================= 0. archivos y contratos ================= */
console.log('\n0. Archivos y contratos');
const htmls = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.html') && !f.endsWith('.src.html'));
for (const f of htmls) {
  const s = fs.readFileSync(path.join(RAIZ, f), 'utf8');
  comprobar(/^<!DOCTYPE html>\s*<html lang="es">\s*<head>\s*<meta charset="utf-8">\s*<meta name="robots" content="noindex, nofollow">/.test(s), `${f}: charset lo primero y noindex justo detrás`);
  const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const rep = ids.filter((x, i) => ids.indexOf(x) !== i);
  comprobar(rep.length === 0, `${f}: ningún id repetido`, [...new Set(rep)]);
}
comprobar(['.nojekyll', '404.html', 'manifest.json', 'img/og.jpg', 'img/marca/favicon.svg', 'img/marca/favicon-32.png', 'img/marca/apple-touch-icon.png', '.gitignore', 'README.md'].every(existe), '.nojekyll, 404, manifest, og:image, favicons, .gitignore y README');
{
  const gi = fs.readFileSync(path.join(RAIZ, '.gitignore'), 'utf8');
  comprobar(/^pruebas\/\*$/m.test(gi) && /^!pruebas\/3d-\*\.mjs$/m.test(gi) && /^!pruebas\/sec-\*\.mjs$/m.test(gi) && /^PENDIENTES\.md$/m.test(gi), '.gitignore: fuera pruebas/* (salvo las del 3D y de Secciones) y PENDIENTES.md');
}
const src = fs.readFileSync(path.join(RAIZ, 'index.src.html'), 'utf8');
const css = fs.readFileSync(path.join(RAIZ, 'css/estilos.css'), 'utf8');
const mainjs = fs.readFileSync(path.join(RAIZ, 'js/main.js'), 'utf8');
const texto = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
{
  const rutas = new Set();
  for (const m of html.matchAll(/(src|srcset|href|imagesrcset)="([^"]+)"/g)) for (const parte of (/srcset/.test(m[1]) ? m[2].split(',') : [m[2]])) {
    const r = parte.trim().split(/\s+/)[0].split('?')[0];
    if (r && !/^(https?:|mailto:|tel:|#|data:)/.test(r)) rutas.add(r.replace(/&amp;/g, '&'));
  }
  const faltan = [...rutas].filter((r) => !existe(r));
  comprobar(faltan.length === 0, `index.html: existen los ${rutas.size} archivos que enlaza`, faltan);
  comprobar(!/<img\b[^>]*data-foto="[^"]+"(?![^<]*<\/picture>)/.test(html.replace(/<picture data-foto="[^"]+">/g, '')) && !/<!--(parte|css|js|modulo):|<!--poster-->|<!--plano-->|<!--precarga-poster-->/.test(html), 'index.html construido: sin <img data-foto> ni marcas de construir.mjs por expandir');
  // index.html al día con lo que han entregado los otros agentes (si no, vuelve a ejecutar construir.mjs)
  const deOtros = [['css/3d.css', /href="css\/3d\.css/], ['css/mapa.css', /href="css\/mapa\.css/], ['css/anio.css', /href="css\/anio\.css/], ['js/mapa.js', /src="js\/mapa\.js/], ['js/anio.js', /src="js\/anio\.js/], ['js/3d/arranque.js', /src="js\/3d\/arranque\.js/], ['partes/mapa.html', /<section id="mapa"/], ['partes/anio.html', /<section id="anio"/]];
  const viejos = deOtros.filter(([f, re]) => existe(f) && !re.test(html)).map(([f]) => f);
  comprobar(viejos.length === 0, 'index.html al día con las partes, el CSS y el JS de los otros agentes (si falla: node construir.mjs)', viejos);
  comprobar(['puerta-800', 'puerta-1200', 'fuego-800', 'fuego-1200', 'desayuno-800', 'desayuno-1080'].every((n) => existe(`img/fotos/${n}.webp`)), 'existen las fotos que van dentro de las letras (puerta, fuego, desayuno)');
  comprobar(!/\b1 (reseña|opinión)\b|\b(con|tiene|solo|sólo) una (sola |única )?(reseña|opinión)\b/i.test(texto), 'sin recuento de «una reseña»');
  comprobar(!/clientes satisfechos|cientos de|miles de|el mejor alojamiento|sin permanencia|sin comisiones|mejor precio garantizado/i.test(texto), 'sin prueba social inventada ni condiciones de reclamo');
  comprobar(!/Tripadvisor|\d,\d\s*en Google/i.test(texto), 'sin notas de Google ni Tripadvisor (no están confirmadas)');
  comprobar(!/(cañ[oó]n|Sil)[^.]{0,60}\b10 minutos|a diez minutos del cañ/i.test(texto), 'no dice que el cañón está «a 10 minutos»');
  comprobar(/TR-OR-000017/.test(texto), 'la licencia TR-OR-000017 va en la página');
  comprobar(/Instituto Geográfico Nacional/.test(texto) && /OpenStreetMap/.test(texto), 'créditos del IGN y de OpenStreetMap');
  comprobar([...html.matchAll(/<img\b[^>]*>/g)].every((m) => /\salt="/.test(m[0])), 'todas las imágenes llevan alt');
  comprobar((() => { try { JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]); return true; } catch (e) { return false; } })(), 'el JSON-LD se lee');
  comprobar(/«la única construcción del lugar de A Castiñeira»/.test(texto) && /«ecológica, vegana y terapéutica»/.test(texto), 'las frases suyas van citadas como suyas («única construcción», «terapéutica»)');
  comprobar(/Próximamente/.test(texto) && /Precios de su blog/.test(texto) && /100 €\/día/.test(texto), 'detox: «próximamente», con sus precios marcados como de su blog');
  // fotos: del blog y de Booking, nunca ampliadas, sin el logo, la escalera con la familia, carteles ni miniaturas
  const lista = fs.readFileSync(path.join(RAIZ, 'scripts/fotos-lista.json'), 'utf8');
  const fotos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'img/fotos/fotos.json'), 'utf8'));
  comprobar(fotos.every((f) => f.ancho <= f.ancho_origen), 'fotos: ningún tamaño generado por encima del original');
  comprobar(fotos.every((f) => /^(booking\/\d+|blog\/b\d\d)\.jpg$/.test(f.origen)), 'fotos: todas de Booking o del blog de la casa (ninguna generada)');
  comprobar(!/blog\/b0[0-2]\.jpg|blog\/b(19|20|21|22|23|24|57|7[1-6])\.jpg/.test(lista), 'fotos: fuera el logo, «sin imagen», los carteles y las miniaturas de 72 px');
  comprobar(!/12016835/.test(lista) && !/12016835/.test(html), 'la foto de la familia en la escalera no se usa (a pendientes)');
  comprobar(!/id="castano"|<use href="#castano"/.test(html), 'el logo de la casa no se redibuja (el símbolo del tablero no se usa)');
  comprobar(/Caserío <i>da<\/i> Castiñeira/.test(html), 'en la cabecera, el nombre en letra');
}
// contrato con el 3D
{
  const c = (re, m) => comprobar(re.test(html), 'contrato 3D: ' + m);
  c(/<div class="vuelo" id="vuelo">[\s\S]{0,1600}<img id="vuelo-poster" src="img\/terreno\/poster-vuelo\.jpg"[^>]*fetchpriority="high" width="\d+" height="\d+">/, '#vuelo con #vuelo-poster (prioridad alta, con su tamaño)');
  if (existe('img/terreno/poster-vuelo-movil-600.avif')) c(/<picture>\s*<source type="image\/avif" media="\(max-aspect-ratio: 1\/1\)"[\s\S]*?<img id="vuelo-poster"/.test(html) ? /./ : /^$/, 'el póster va en <picture> con los anchos que ha entregado el 3D (AVIF del móvil primero)');
  if (existe('img/terreno/poster-vuelo-movil-600.avif')) c(/<link rel="preload" as="image" type="image\/avif" media="\(max-aspect-ratio: 1\/1\)" imagesrcset="img\/terreno\/poster-vuelo-movil-600\.avif/, 'el póster del móvil va precargado (AVIF, misma media que su <source>)');
  c(/<div class="altimetro" aria-hidden="true">[\s\S]*?<b id="altimetro-valor">917 m<\/b>[\s\S]*?--y:13%">Pena da Cruz · 1\.289 m[\s\S]*?--y:86%">Valle · 488 m[\s\S]*?<span class="aguja" id="altimetro-aguja"/, 'altímetro con #altimetro-valor, la regla (1.289 → 13 %, 488 → 86 %) y #altimetro-aguja');
  c(/<p class="chip" id="ahora-castineira">42,312° N · 7,450° O · 917 m<\/p>/, 'chip #ahora-castineira con las coordenadas');
  c(/<button type="button" id="vuelo-pausa" class="vuelo-pausa" hidden>Pausar el vuelo<\/button>/, '#vuelo-pausa oculto hasta que haya vuelo');
  c(/<section id="claro" class="claro" aria-labelledby="t-claro">/, '<section id="claro">');
  comprobar(['claro-marco', 'claro-plano', 'claro-lienzo', 'claro-rotulos', 'claro-mover', 'claro-carga', 'claro-hora', 'claro-hora-txt', 'claro-lectura', 'claro-modo-3d', 'claro-modo-plano', 'claro-bajar', 'claro-aeros'].every((id) => html.includes(`id="${id}"`)) && /data-momento="ahora"[\s\S]*data-momento="sale"[\s\S]*data-momento="mediodia"[\s\S]*data-momento="pone"[\s\S]*data-momento="noche"/.test(html) && /id="claro-aeros" aria-pressed="true">Aerogeneradores</.test(html) && /id="claro-bajar"[^>]*>Bajar a la casa</.test(html) && !/id="claro-bajar"[^>]*aria-pressed/.test(html), 'contrato 3D: todos los ids y botones del claro (Bajar a la casa, Aerogeneradores, momentos)');
  c(/<input type="range" id="claro-hora" min="0" max="1439"/, '#claro-hora de 0 a 1439');
  c(/Relieve MDT05 y ortofoto PNOA © IGN \(CC BY 4\.0\)\. Aerogeneradores: © OpenStreetMap\. Altura del relieve ×1,8/, 'pie de fuente del claro, literal');
  if (existe('css/3d.css')) c(/<link rel="stylesheet" href="css\/3d\.css(\?v=[0-9a-f]+)?">[\s\S]*<\/head>/, 'css/3d.css en el <head>');
  if (existe('js/3d/arranque.js')) c(/<script type="module" src="js\/3d\/arranque\.js(\?v=[0-9a-f]+)?"[^>]*><\/script>\s*<\/body>/, 'js/3d/arranque.js como módulo al final del <body>');
  comprobar(!/importmap|cdn\.jsdelivr|unpkg|cdnjs/.test(html), 'contrato 3D: sin importmap ni CDN (Three.js autoalojado)');
  comprobar(/__castineiraFuera[\s\S]*cortina-fuera[\s\S]*castineira:cortina-fuera/.test(html), 'contrato 3D: la señal cortina-fuera + evento castineira:cortina-fuera');
}
// contrato con Secciones
{
  comprobar(/<!--parte:partes\/mapa\.html-->[\s\S]*<!--parte:partes\/anio\.html-->[\s\S]*id="manolo"/.test(src) && src.indexOf('id="alojamientos"') < src.indexOf('<!--parte:partes/mapa.html-->'), 'contrato Secciones: las dos inclusiones van tras los alojamientos y antes de Manolo');
  comprobar(/<!--css:css\/mapa\.css-->\s*<!--css:css\/anio\.css-->[\s\S]*<\/head>/.test(src) && /<!--js:js\/mapa\.js-->\s*<!--js:js\/anio\.js-->[\s\S]*<\/body>/.test(src), 'contrato Secciones: su CSS en el <head> y su JS (defer) al final, solo si existen');
  const raiz = css.match(/:root \{[\s\S]*?\n\}/)[0];
  comprobar(['noche', 'noche-2', 'alba', 'alba-texto', 'luz', 'cal', 'granito', 'mostaza', 'teja', 'verde', 'puerta', 'papel', 'tinta', 'musgo', 'f-tit', 'f-ancha', 'f-txt', 'f-mono', 'f-mano'].every((t) => raiz.includes(`--${t}:`)) && /\n\.btn \{/.test(css) && /\.btn-sec[,\s{]/.test(css), 'contrato Secciones: tokens y letras en :root, y las clases .btn y .btn-sec');
  comprobar(/family=Anybody[^"]*family=Geist[^"]*family=Geist\+Mono[^"]*family=Instrument\+Serif[^"]*family=Reenie\+Beanie/.test(html) && /media="print" onload="this.media='all'"/.test(html), 'letras de Google Fonts (las cinco del encargo), sin bloquear el pintado');
}
comprobar(/\.cookies:not\(\[hidden\]\)\s*\{\s*display:\s*flex/.test(css) && !/\.cookies\s*\{[^}]*display:\s*flex/.test(css), 'cookies: display:flex solo en :not([hidden])');
comprobar(!/cursor:\s*none/.test(css) && !/position:\s*sticky/.test(css), 'sin cursor propio ni pila sticky (quitados a propósito)');
comprobar(!/\b100dvh\b/.test(css.replace(/\.menu-movil \{[^}]*\}/, '')) && /height:\s*100dvh/.test(css.match(/\.menu-movil \{[^}]*\}/)?.[0] || ''), 'dvh solo en la capa fija del menú, con altura explícita');
comprobar(!/scroll-behavior:\s*smooth/.test(css.replace(/@media \(prefers-reduced-motion[\s\S]*$/, '')), 'sin scroll-behavior:smooth global');
comprobar(/<!-- MANDO DE MAQUETA/.test(src) && /fin del MANDO DE MAQUETA/.test(src) && /12\. MANDO DE MAQUETA/.test(mainjs) && /fin del MANDO DE MAQUETA/.test(mainjs), 'receta de borrado del mando: marcas en index.src.html y main.js');
{
  const ck = fs.readFileSync(path.join(RAIZ, 'cookies.html'), 'utf8');
  comprobar(/Google Fonts/.test(ck) && /Google Maps/.test(ck) && /castineira-cookies/.test(ck), 'la página de cookies cita Google Fonts, el mapa de Google y la clave guardada');
}

/* ================= 1. la cortina: la ventana encendida ================= */
console.log('\n1. Cortina');
{
  const { ctx, page } = await nueva({}, { script: () => {
    try { localStorage.setItem('castineira-cookies', 'si'); } catch (e) {}
    window.__muestras = []; window.__evento = null;
    document.addEventListener('castineira:cortina-fuera', () => { const c = document.getElementById('cortina'); window.__evento = { t: performance.now(), visible: c && getComputedStyle(c).display !== 'none', op: c ? +getComputedStyle(c).opacity : 0 }; });
    const t0 = performance.now();
    const tomar = () => {
      const c = document.getElementById('cortina');
      if (c) {
        const v = [...document.querySelectorAll('.cortina .vidrio')].map((x) => +getComputedStyle(x).opacity);
        window.__muestras.push({ t: performance.now() - t0, vis: getComputedStyle(c).display !== 'none', v, muro: getComputedStyle(document.getElementById('cortina-muro')).transform, op: +getComputedStyle(c).opacity, fondo: getComputedStyle(c).backgroundColor });
      }
      if (performance.now() - t0 < 6000) requestAnimationFrame(tomar);
    };
    requestAnimationFrame(tomar);
  } });
  const t0 = Date.now();
  await page.goto(BASE);
  await esperarCortina(page, 200);
  const dur = Date.now() - t0;
  const m = await page.evaluate(() => window.__muestras);
  const ev = await page.evaluate(() => window.__evento);
  comprobar(m.length > 20 && m[0].vis, 'la cortina tapa al cargar', m.length);
  comprobar(m.some((x) => x.v.some((o) => o > 0.05 && o < 0.95)) && m.some((x) => x.v.every((o) => o > 0.97)), 'los cuatro cristales se encienden poco a poco (fotogramas a medias y luego todos encendidos)', m.filter((x, i) => i % 15 === 0).map((x) => x.v.map((o) => o.toFixed(2)).join('/')));
  const escalas = m.map((x) => { const r = /matrix\(([\d.]+)/.exec(x.muro); return r ? +r[1] : 1; });
  comprobar(escalas.some((s) => s > 2 && s < 30) && Math.max(...escalas) > 25, 'al cruzar, la ventana crece hasta ~×34 (escalas intermedias)', [...new Set(escalas.map((s) => Math.round(s)))].slice(-8));
  comprobar(m.every((x) => x.fondo === 'rgba(0, 0, 0, 0)'), 'la capa de la cortina no tiene fondo propio (el cristal hueco destapa la portada)');
  comprobar(ev && ev.visible && ev.op > 0.5 && m.some((x) => x.vis && x.t > ev.t - 20 && x.op > 0.5), 'la señal al 3D sale al EMPEZAR a crecer, con la cortina aún puesta (handoff)', ev);
  const anim = await page.evaluate(() => Math.round(window.__cortina.fin - window.__cortina.t0));
  comprobar(anim > 2600 && anim < 3800 && dur < 9000, 'la cortina dura unos 3 s desde que arranca (y se va antes de 9 s desde que se pide la página)', { anim, dur });
  comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none' && document.documentElement.classList.contains('cortina-fuera') && !document.documentElement.classList.contains('cortina-puesta')), 'la cortina desaparece de verdad y se libera el scroll');
  await page.waitForTimeout(1300);
  comprobar(await page.evaluate(() => getComputedStyle(document.querySelector('.portada h1')).opacity === '1'), 'tras la cortina, el titular se lee');
  comprobar(page._errores.length === 0, 'sin errores', page._errores);
  await ctx.close();
}
// fotogramas congelados: el centro del cristal 2 (por el que se entra) y del 1, en 1440 × 900 (viewBox 400, «meet»: ×2,25 y 270 px de margen)
const P2 = [270 + 215 * 2.25, 169 * 2.25], P1 = [270 + 185 * 2.25, 169 * 2.25];
for (const [t, nombre] of [[700, 'encendido'], [1650, 'ventana'], [2350, 'cruce']]) {
  const { ctx, page } = await nueva({}, { script: `try{localStorage.setItem('castineira-cookies','si')}catch(e){}; window.__cortinaPausaEn = ${t};` });
  await page.goto(BASE);
  await page.waitForFunction(() => window.__cortinaPausada === true, null, { timeout: 8000 });
  await page.waitForFunction(() => document.getElementById('vuelo-poster').complete, null, { timeout: 8000 });
  await page.waitForTimeout(300);
  const buf = await page.screenshot();
  if (CAPTURAS) fs.writeFileSync(path.join(DIR_CAP, `01-cortina-${nombre}.png`), buf);
  const esquina = await pixel(buf, 6, 6), p1 = await pixel(buf, ...P1), p2 = await pixel(buf, ...P2);
  if (nombre === 'encendido') {
    const v = await page.evaluate(() => [...document.querySelectorAll('.cortina .vidrio')].map((x) => +(+getComputedStyle(x).opacity).toFixed(2)));
    comprobar(cerca(esquina, NOCHE) && v.some((o) => o > 0.05 && o < 0.95) && v[1] < 0.05, 'fotograma a 0,7 s: noche, y la ventana encendiéndose cristal a cristal', { esquina, v });
  } else if (nombre === 'ventana') {
    comprobar(cerca(esquina, NOCHE) && naranja(p1) && naranja(p2), 'fotograma a 1,65 s: una ventana de cuatro cristales encendida en naranja en la noche', { esquina, p1, p2 });
  } else {
    comprobar(cerca(esquina, NOCHE, 20) && !cerca(p2, NOCHE, 20) && !naranja(p2), 'fotograma a medias del cruce: el borde sigue de noche y por el cristal se ve la portada (otro color)', { esquina, p2 });
  }
  await page.evaluate(() => window.__cortina.seguir());
  await esperarCortina(page, 100);
  await ctx.close();
}
{
  const { ctx, page } = await nueva({ reducedMotion: 'reduce' }, { script: sinCookies });
  await page.goto(BASE);
  await page.waitForTimeout(150);
  comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none' && document.documentElement.classList.contains('cortina-fuera')), 'movimiento reducido: ni un fotograma de cortina y la señal al 3D ya está');
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => ({ h1: getComputedStyle(document.querySelector('.portada h1')).opacity, entra: [...document.querySelectorAll('[data-entra]')].every((e) => getComputedStyle(e).opacity === '1'), mov: document.documentElement.classList.contains('con-movimiento') }));
  comprobar(r.h1 === '1' && r.entra && !r.mov, 'movimiento reducido: el contenido se ve entero, sin entradas', r);
  await bajarA(page, '#comemos', 270);
  await page.waitForTimeout(400);
  const c = await page.evaluate(() => ({ pared: document.getElementById('somos').dataset.pared, fondo: getComputedStyle(document.getElementById('somos')).backgroundColor, letras: window.__castineira.letras() }));
  comprobar(c.pared === 'verde' && c.fondo === 'rgb(141, 160, 44)' && c.letras.every((p) => p.foto && p.w.every((w) => w === 100)), 'movimiento reducido: la pared cambia igual (contenido) y la foto sigue dentro de las letras, quietas', c);
  await cap(page, '02-somos-reducido');
  await ctx.close();
}
{
  const { ctx, page } = await nueva({ javaScriptEnabled: false });
  await page.goto(BASE);
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({ cortina: getComputedStyle(document.getElementById('cortina')).display, h1: getComputedStyle(document.querySelector('.portada h1')).opacity, entra: [...document.querySelectorAll('[data-entra]')].every((e) => getComputedStyle(e).opacity === '1'), cookies: document.getElementById('cookies').hidden, poster: getComputedStyle(document.getElementById('vuelo-poster')).opacity, palabra: document.querySelector('#hogar .palabra-txt').textContent, fuego: getComputedStyle(document.getElementById('fuego')).backgroundColor }));
  comprobar(r.cortina === 'none' && r.h1 === '1' && r.entra && r.poster === '1' && r.palabra === 'Hogar' && r.fuego === 'rgb(194, 80, 45)', 'sin JS: no hay cortina y todo se lee (portada con su póster, palabras lisas, cada capítulo con su pared)', r);
  await cap(page, '02-portada-sinjs');
  await ctx.close();
}
{
  // main.js no llega: la red de seguridad inline retira la cortina a los 7 s
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await ctx.route(/js\/main\.js/, (r) => r.abort());
  await page.goto(BASE);
  await page.waitForTimeout(7600);
  comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cortina')).display === 'none' && document.documentElement.classList.contains('cortina-fuera')), 'sin main.js: la red de seguridad inline retira la cortina y da la señal');
  await ctx.close();
}

/* ================= 2. portada, reserva rápida y 3D ================= */
console.log('\n2. Portada y 3D');
{
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page, 600);
  const libre = await page.evaluate(() => { const m = window.__motor; m.st.personas = 4; return m.primeraLibre(m.sumar(m.HOY, 10), 2); });
  const fin = await page.evaluate((l) => window.__motor.sumar(l, 2), libre);
  await page.fill('#rapida-llega', libre);
  await page.fill('#rapida-sale', fin);
  await page.selectOption('#rapida-gente', '4');
  await page.click('#rapida button[type="submit"]');
  await page.waitForTimeout(2200);
  const mo = await page.evaluate(() => ({ ini: window.__motor.st.ini, fin: window.__motor.st.fin, p: window.__motor.st.personas, top: document.getElementById('reserva').getBoundingClientRect().top, sel: window.__motor.st.sel, cap: window.__motor.capacidad() }));
  comprobar(mo.ini === libre && mo.fin === fin && mo.p === 4 && Math.abs(mo.top) < 120, '«Ver disponibilidad» baja al motor con llegada, salida y personas', mo);
  comprobar(mo.sel.length >= 1 && mo.cap >= 4, 'y el motor propone alojamiento para el grupo', mo);
  const r = await page.evaluate(() => ({ vuelo: document.getElementById('vuelo').className, claro: document.getElementById('claro').className, poster: getComputedStyle(document.getElementById('vuelo-poster')).opacity, pausa: document.getElementById('vuelo-pausa').hidden }));
  comprobar(/sin-3d/.test(r.vuelo) && /sin-3d/.test(r.claro) && r.poster === '1' && r.pausa, 'sin 3D: clase sin-3d, se queda el póster y no sale «Pausar»', r);
  await bajarA(page, '#claro');
  await page.waitForTimeout(600);
  const c = await page.evaluate(() => ({ hora: getComputedStyle(document.querySelector('.claro-hora')).display, lectura: getComputedStyle(document.getElementById('claro-lectura')).display, vista: getComputedStyle(document.querySelector('.claro-vista')).display, extras: getComputedStyle(document.querySelector('.claro-extras')).display, carga: getComputedStyle(document.getElementById('claro-carga')).display, plano: document.getElementById('claro-plano').naturalWidth, fit: getComputedStyle(document.getElementById('claro-plano')).objectFit, pista: getComputedStyle(document.querySelector('.vuelo-pista')).display }));
  comprobar(c.hora === 'none' && c.lectura === 'none' && c.vista === 'none' && c.extras === 'none' && c.carga === 'none' && c.plano > 0 && c.fit === 'contain' && c.pista === 'none', 'sin 3D: el claro queda en plano entero con su pie, sin mandos, sin «Cargando» ni pista del gesto', c);
  await cap(page, '03-claro-sin-3d');
  comprobar(page._errores.length === 0, 'sin errores', page._errores);
  await ctx.close();
}
if (HAY_3D) {
  // con el 3D de verdad, en ventana pequeña (SwiftShader): responde y la web hace su parte
  const { ctx, page } = await nueva({ viewport: { width: 800, height: 560 } }, { script: sinCookies, sin3d: false });
  await page.goto(BASE);
  await esperarCortina(page, 600);
  const est = await page.waitForFunction(() => { const v = document.getElementById('vuelo'); return v.classList.contains('con-3d') || v.classList.contains('sin-3d') ? v.className : null; }, null, { timeout: 45000 }).then((h) => h.jsonValue()).catch(() => 'sin respuesta');
  comprobar(/con-3d|sin-3d/.test(est), 'con 3D: la portada responde (con-3d o sin-3d) tras la cortina', est);
  if (/con-3d/.test(est)) {
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => ({ poster: getComputedStyle(document.getElementById('vuelo-poster')).opacity, filtro: getComputedStyle(document.getElementById('vuelo-poster')).filter, pausa: !document.getElementById('vuelo-pausa').hidden, alt: document.getElementById('altimetro-valor').textContent, chip: document.getElementById('ahora-castineira').textContent, pista: getComputedStyle(document.querySelector('.vuelo-pista')).display }));
    comprobar(r.poster === '1' && r.filtro === 'none' && /^[\d.]+ m$/.test(r.alt) && r.pausa && r.pista === 'block', 'con 3D: el póster se queda debajo sin filtro, el altímetro da metros, sale «Pausar» y la pista del gesto', r);
    await cap(page, '02-portada-3d');
  }
  comprobar(page._errores.length === 0, 'con 3D: sin errores', page._errores);
  await ctx.close();
} else ok('el 3D aún no está en la página: la portada se queda con el póster (sin comprobar el vuelo)');

/* ================= 3. capítulos «Somos» ================= */
console.log('\n3. Capítulos «Somos»');
{
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page);
  await bajarA(page, '#hogar', 100);
  await page.waitForTimeout(900);
  const l = await page.evaluate(() => window.__castineira.letras());
  comprobar(l.length === 3 && l.map((p) => p.n).join() === '5,5,12', 'tres palabras («Hogar», «Fuego», «Lo que comemos»), letra a letra', l.map((p) => p.n));
  const f = await page.evaluate(() => { const s = document.querySelector('#hogar .letra'); const c = getComputedStyle(s); return { foto: document.getElementById('t-hogar').classList.contains('con-foto'), img: c.backgroundImage, clip: c.webkitBackgroundClip || c.backgroundClip, fill: c.webkitTextFillColor, fam: c.fontFamily }; });
  comprobar(f.foto && /img\/fotos\/puerta-\d+\.webp/.test(f.img) && f.clip === 'text' && /Anybody/.test(f.fam), 'la foto de la puerta roja va dentro de las letras (Anybody, background-clip: text)', f);
  const caben = await page.evaluate(() => [...document.querySelectorAll('.palabra')].every((h) => { const r = h.getBoundingClientRect(); return [...h.querySelectorAll('.letra')].every((s) => s.getBoundingClientRect().right <= r.right + 2); }));
  comprobar(caben, 'las palabras caben en su caja (1440 px)');
  // las letras se ensanchan hacia el puntero
  const pos = await page.evaluate(() => { const s = [...document.querySelectorAll('#hogar .letra')]; const a = s[0].getBoundingClientRect(); return { x: a.left + a.width / 2, y: a.top + a.height / 2 }; });
  await page.mouse.move(pos.x, pos.y, { steps: 4 });
  await page.waitForTimeout(900);
  const w = (await page.evaluate(() => window.__castineira.letras()))[0].w;
  comprobar(w[0] > 130 && w[0] > w[4] + 40, 'las letras se ensanchan donde está el puntero (H ancha, R estrecha)', w);
  await page.mouse.move(5, 5);
  await cap(page, '03-hogar');
  // la pared: el color de la página es el del capítulo que se lee
  const pared = async (id, rgb, color) => {
    await bajarA(page, '#' + id, 250);
    await page.waitForTimeout(1300);
    const r = await page.evaluate(() => ({ p: document.getElementById('somos').dataset.pared, bg: getComputedStyle(document.getElementById('somos')).backgroundColor, c: getComputedStyle(document.getElementById('somos')).color }));
    comprobar(r.bg === rgb && r.c === color, `al leer «${id}», la página toma el color de su pared`, r);
  };
  await pared('fuego', 'rgb(194, 80, 45)', 'rgb(255, 255, 255)');
  await cap(page, '03-fuego');
  await pared('comemos', 'rgb(141, 160, 44)', 'rgb(31, 30, 28)');
  await cap(page, '03-comemos');
  await pared('hogar', 'rgb(227, 169, 42)', 'rgb(31, 30, 28)');
  comprobar(await page.evaluate(() => /Próximamente/.test(document.querySelector('.detox').textContent) && document.querySelectorAll('#somos figure img').length >= 9), 'cada capítulo con sus fotos y el detox «próximamente»');
  comprobar(page._errores.length === 0, 'sin errores', page._errores);
  await ctx.close();
}

/* ================= 4. alojamientos ================= */
console.log('\n4. Alojamientos');
{
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page);
  await bajarA(page, '#alojamientos');
  const f = await page.evaluate(() => [...document.querySelectorAll('.ficha')].map((x) => ({ n: x.querySelector('h3').textContent, p: x.querySelector('.ficha-plazas b').textContent, e: x.querySelector('.ficha-precio b').textContent })));
  comprobar(f.length === 5 && f.map((x) => x.p).join() === '6,3,4,6,3' && f.map((x) => x.e).join() === '18 €,22 €,20 €,17 €,18 €', 'cinco alojamientos con sus plazas (6, 3, 4, 6, 3) y su «desde» por persona (18, 22, 20, 17, 18 €)', f);
  comprobar(await page.evaluate(() => /casasrurales\.net, sin fecha/.test(document.querySelector('.nota-precio').textContent)), 'el precio va marcado como de un portal, sin fecha');
  comprobar(await page.evaluate(() => document.querySelectorAll('#carril img').length === 15 && !document.querySelector('#carril [data-aloj], #carril [data-ver-aloj]')), 'galería de 15 fotos, sin asignarlas a ningún alojamiento');
  const saber = await page.evaluate(() => document.querySelector('.saber').textContent.replace(/\s+/g, ' '));
  comprobar(['15:00 a 22:00', '8:30 a 12:00', 'Cuna gratis', '12 €', 'Gratis', '0:00 a 10:00', 'efectivo'].every((t) => saber.includes(t)), '«Lo que hay que saber»: entrada, salida, cuna, supletoria, mascotas, silencio y pago', saber);
  await bajarA(page, '.galeria', 90);
  await page.click('#gal-sig');
  await page.waitForTimeout(900);
  comprobar(await page.evaluate(() => /^2 \/ 15$/.test(document.getElementById('gal-cuenta').textContent) && !document.getElementById('gal-ant').disabled), 'la galería avanza con su botón y el contador la sigue');
  await bajarA(page, '#fichas', 90);
  await page.click('.ficha [data-ver-aloj="buhardilla"]');
  await page.waitForTimeout(1600);
  const r = await page.evaluate(() => ({ sel: window.__motor.st.sel, ini: window.__motor.st.ini, p: window.__motor.st.personas, top: document.getElementById('reserva').getBoundingClientRect().top, t: document.getElementById('m-total').textContent, dia: new Date(window.__motor.st.ini + 'T00:00').getDay() }));
  comprobar(r.sel.join() === 'buhardilla' && r.dia === 5 && Math.abs(r.top) < 120 && r.p === 2 && /88 €/.test(r.t), '«Ver fechas» del apartamento de 1 habitación lleva al motor con él y su primer fin de semana libre (2 × 2 × 22 €)', r);
  await cap(page, '04-alojamientos');
  comprobar(page._errores.length === 0, 'sin errores', page._errores);
  await ctx.close();
}

/* ================= 5. las partes de Secciones ================= */
console.log('\n5. Las secciones del otro agente');
{
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page);
  if (HAY.mapa || HAY.anio) {
    const r = await page.evaluate(() => {
      const y = (id) => { const e = document.getElementById(id); return e ? e.getBoundingClientRect().top + scrollY : null; };
      return { aloj: y('alojamientos'), mapa: y('mapa'), anio: y('anio'), manolo: y('manolo'), mapaOk: !!document.querySelector('section#mapa.mapa[aria-labelledby="t-mapa"] h2#t-mapa'), anioOk: !!document.querySelector('section#anio.anio[aria-labelledby="t-anio"] h2#t-anio'), nav: !document.querySelector('.cab-nav a[href="#mapa"]').hidden };
    });
    if (HAY.mapa) comprobar(r.mapaOk && r.mapa > r.aloj && r.mapa < r.manolo && r.nav, '«Dibuja mi mapa»: su <section id="mapa"> con su titular, tras los alojamientos, y el enlace «Rutas» de la cabecera', r);
    if (HAY.anio) comprobar(r.anioOk && r.anio > (r.mapa || r.aloj) && r.anio < r.manolo, '«Un año en la casa»: su <section id="anio"> con su titular, antes de Manolo', r);
    await bajarTodo(page);
    comprobar(page._errores.length === 0, 'con las dos partes y su JS: sin errores en toda la página', page._errores);
  } else ok('las partes de Secciones aún no han llegado');
  await ctx.close();
}
{
  // y sin ellas (ni el 3D): la web va igual y no enlaza a lo que no está
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await page.goto(BASE + '__sin-partes.html');
  await esperarCortina(page);
  const r = await page.evaluate(() => ({ mapa: !!document.getElementById('mapa'), anio: !!document.getElementById('anio'), rutas: document.querySelector('.cab-nav a[href="#mapa"]').hidden, menu: document.querySelector('.menu-movil a[href="#anio"]').hidden, secciones: ['arriba', 'hogar', 'fuego', 'comemos', 'alojamientos', 'manolo', 'claro', 'opiniones', 'reserva', 'llegar', 'pie'].every((id) => document.getElementById(id)), motor: document.querySelectorAll('#motor .dia').length, sin3d: document.getElementById('claro').classList.contains('sin-3d') && getComputedStyle(document.getElementById('claro-carga')).display === 'none' }));
  comprobar(!r.mapa && !r.anio && r.rutas && r.menu && r.secciones && r.motor > 20 && r.sin3d, 'sin las partes ni el 3D: el resto funciona, los enlaces a «Rutas» y «Un año» se ocultan y el claro queda en plano', r);
  await bajarTodo(page);
  comprobar(page._errores.length === 0, 'sin las partes ni el 3D: sin errores', page._errores);
  await ctx.close();
}

/* ================= 6. Manolo, minutos y opiniones ================= */
console.log('\n6. Manolo, minutos y opiniones');
{
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page);
  await bajarA(page, '#manolo');
  const m = await page.evaluate(() => ({ fotos: [...document.querySelectorAll('#manolo picture')].map((p) => p.dataset.foto), txt: document.getElementById('manolo').textContent.replace(/\s+/g, ' ') }));
  comprobar(m.fotos.join() === 'mapa-mano' && /esta casa es mi sueño/.test(m.txt) && /80 cm/.test(m.txt) && /PR-G 98/.test(m.txt) && /catalán, castellano, gallego e inglés/.test(m.txt) && /informática/.test(m.txt), 'Manolo: su mapa a mano (sin foto de su cara), su frase, «80 cm» de TVE y sus idiomas', m);
  await cap(page, '06-manolo');
  await bajarA(page, '#minutos', 90);
  await page.waitForTimeout(1500);
  const mm = await page.evaluate(() => ({ n: document.querySelectorAll('.minutos-lista li').length, visto: document.querySelector('.minutos-lista').classList.contains('es-visto'), lista: [...document.querySelectorAll('.minutos-lista li')].map((li) => li.querySelector('.m-dato').textContent.split(' ')[0]).join(), primero: document.querySelector('.minutos-lista li').textContent, fuente: /OSRM/.test(document.getElementById('minutos').textContent) && /por confirmar/.test(document.getElementById('minutos').textContent) }));
  comprobar(mm.n === 10 && mm.visto && mm.lista === '11,15,26,28,30,38,39,43,55,62' && /Montederramo/.test(mm.primero) && mm.fuente, '«A cuántos minutos»: los 10 lugares de OSRM (11 a 62 min), de cerca a lejos, con su «por confirmar»', mm);
  await bajarA(page, '#opiniones');
  await page.waitForTimeout(1200);
  const o = await page.evaluate(() => ({ nota: document.querySelector('.nota-grande b').textContent, n: /130 comentarios/.test(document.querySelector('.nota-grande').textContent), desglose: [...document.querySelectorAll('.desglose li')].map((li) => li.querySelector('b').textContent).join(' '), citas: [...document.querySelectorAll('.citas cite')].map((c) => c.textContent), txt: document.querySelector('.citas').textContent }));
  comprobar(o.nota === '9,2' && o.n && o.desglose === '9,8 9,3 9,0 8,9 8,7 8,7 8,6', 'opiniones: 9,2 de Booking con 130 comentarios y el desglose real', o);
  comprobar(o.citas.length === 4 && o.citas.every((c) => /^(Booking|Escapada Rural)$/.test(c)) && !/Eugenio|Leticia|Magdalena|Judith|Sandra|Donna|Horcajada|Paloma/.test(o.txt), 'cuatro frases literales, sin nombre, con su portal', o.citas);
  await cap(page, '06-opiniones');
  comprobar(page._errores.length === 0, 'sin errores', page._errores);
  await ctx.close();
}

/* ================= 7. motor de reservas (demostración) ================= */
console.log('\n7. Motor de reservas');
{
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page);
  await bajarA(page, '#reserva', 0);
  const M = (fn, a) => page.evaluate(fn, a);
  await page.click('#motor .redondo[aria-label="Mes siguiente"]');
  const est = await M(() => [...document.querySelectorAll('#motor .dia')].map((b) => b.dataset.estado));
  comprobar(est.includes('libre') && est.includes('completo') && est.includes('pocos'), 'el calendario enseña días libres, con pocos y completos', [...new Set(est)]);
  await page.click('#motor .redondo[aria-label="Mes anterior"]');
  comprobar(/Demostración/.test(await M(() => document.querySelector('#reserva .demo-aviso').textContent)) && /no envía, guarda ni cobra/.test(await M(() => document.getElementById('reserva').textContent)), 'el motor dice que es una demostración que no envía, guarda ni cobra');
  const sup = await M(() => document.querySelector('.supuestos').textContent);
  comprobar(/casasrurales\.net/.test(sup) && /inventada/.test(sup) && /16 plazas/.test(sup) && /cenas está por confirmar/.test(sup) && /tarjeta o Bizum/.test(sup), 'los supuestos (precio del portal, ocupación inventada, casa entera, cenas, pago) están junto al motor');
  // cada alojamiento, su ocupación
  const dist = await M(() => { const m = window.__motor; let n = 0; for (let i = 1; i < 150; i++) { const k = m.sumar(m.HOY, i); if (m.libre('deluxe', k) !== m.libre('doble', k)) n++; } return n; });
  comprobar(dist > 5, 'cada alojamiento tiene su propia ocupación (días con uno libre y otro no)', dist);
  await M(() => window.CASTINEIRAmotor.preparar({ aloj: 'deluxe' }));
  const solo = await M(() => { const m = window.__motor; return [...document.querySelectorAll('#motor .dia')].filter((b) => /libre|pocos/.test(b.dataset.estado)).every((b) => m.libre('deluxe', b.dataset.k)); });
  comprobar(solo && /Apartamento Deluxe/.test(await M(() => document.getElementById('m-et-cal').textContent)), 'con un alojamiento elegido, el calendario enseña SUS días libres', solo);
  // tope de personas = capacidad
  await M(() => window.CASTINEIRAmotor.preparar({ aloj: 'buhardilla' }));
  await page.click('#motor .m-contador button[aria-label="Añadir personas"]');
  comprobar(await M(() => window.__motor.st.personas === 3 && document.querySelector('#motor .m-contador button[aria-label="Añadir personas"]').disabled), 'el número de personas tiene el tope de la capacidad (3 en el apartamento de 1 habitación)');
  // propuesta para un grupo que no cabe
  const r8 = await M(() => { const m = window.__motor; for (let i = 3; i < 300; i++) { const a = m.sumar(m.HOY, i), b = m.sumar(a, 2); m.st.ini = a; m.st.fin = b; const p = m.propuesta(8); if (p && p.length >= 2) return [a, b]; } return null; });
  await M((p) => window.CASTINEIRAmotor.preparar({ ini: p[0], fin: p[1], personas: 8 }), r8);
  const g = await M(() => ({ sel: window.__motor.st.sel.slice(), cap: window.__motor.capacidad(), txt: document.getElementById('m-elegidos').textContent }));
  comprobar(g.sel.length >= 2 && g.cap >= 8 && /\+/.test(g.txt), 'para 8 personas propone varios alojamientos libres esas noches', g);
  const mayor = await M(() => [...window.__motor.st.sel].sort((a, b) => window.__motor.ALOJ[b].plazas - window.__motor.ALOJ[a].plazas)[0]);
  await page.click(`#motor .m-aloj[data-aloj="${mayor}"] button`);
  comprobar(await M(() => /Sois 8/.test(document.getElementById('m-propuesta')?.textContent || '')), 'si se quita uno y ya no caben, lo dice y propone');
  await page.click('#m-usar-propuesta');
  comprobar(await M(() => window.__motor.capacidad() >= 8 && !document.getElementById('m-propuesta')), '«Usar esta propuesta» vuelve a dar sitio para todos');
  // fechas con clics
  await M(() => window.__motor.cambiarModo('casa'));
  await M(() => window.__motor.cambiarModo('aloj'));
  const libres = await M(() => [...document.querySelectorAll('#motor .dia[data-estado="libre"]:not([aria-disabled])')].map((b) => b.dataset.k));
  const a = libres[0];
  await page.click(`#motor .dia[data-k="${a}"]`);
  const sigK = await M((k) => window.__motor.sumar(k, 1), a);
  await page.click(`#motor .dia[data-k="${sigK}"]`);
  const r2 = await M(() => ({ ini: window.__motor.st.ini, fin: window.__motor.st.fin, n: document.getElementById('m-noches').textContent, pres: document.querySelectorAll('#motor .dia[aria-pressed="true"]').length, sel: window.__motor.st.sel.length }));
  comprobar(r2.ini === a && r2.fin === sigK && r2.n === '1' && r2.pres === 2 && r2.sel >= 1, 'con clics: llegada y salida marcadas, 1 noche, y propone alojamiento', r2);
  await page.check('#m-perro');
  await page.check('#m-cenas');
  const tot = await M(() => document.querySelector('.m-total').textContent.replace(/\s+/g, ''));
  comprobar(/Perrogratis/.test(tot) && /Cenas\d+cenas·precioporconfirmar/.test(tot), '«Viajo con perro (gratis)» y «Cenas veganas (precio por confirmar)» van al resumen', tot);
  // no caben: error al seguir
  await M(() => window.CASTINEIRAmotor.preparar({ aloj: 'doble' }));
  await M(() => { window.__motor.st.personas = 5; });
  await page.click('#m-seguir');
  comprobar(/caben 3 y sois 5/.test(await M(() => document.getElementById('m-msg').textContent)), 'avisa si lo elegido no da para el grupo');
  await M(() => window.CASTINEIRAmotor.preparar({ aloj: 'doble' }));
  await page.click('#m-seguir');
  await page.click('#motor button[type="submit"]');
  comprobar(/Falta el nombre, un correo válido, un móvil, la hora de llegada y aceptar la privacidad/.test(await M(() => document.getElementById('m-error').textContent)) && await M(() => document.activeElement.id === 'm-nombre'), 'datos: dice lo que falta y pone el foco en el primero');
  comprobar(await M(() => [...document.querySelectorAll('#m-hora option')].map((o) => o.value).filter(Boolean).join() === '15:00,16:00,17:00,18:00,19:00,20:00,21:00,22:00'), 'hora de llegada de 15:00 a 22:00');
  await page.fill('#m-nombre', 'Lucía Prueba'); await page.fill('#m-correo', 'lucia@ejemplo.es'); await page.fill('#m-tel', '600 000 000'); await page.selectOption('#m-hora', '18:00'); await page.check('#m-ok');
  await page.click('#motor button[type="submit"]');
  const fin = await M(() => ({ loc: document.getElementById('m-loc')?.textContent, txt: document.querySelector('.m-hecho')?.textContent || '', ini: window.__motor.st.ini }));
  comprobar(/^CAS-\d{6}-\d{3}$/.test(fin.loc) && fin.loc.slice(4, 10) === fin.ini.slice(2).replace(/-/g, ''), 'confirmación con localizador CAS-AAMMDD-NNN', fin.loc);
  comprobar(/no se ha enviado, guardado ni cobrado nada/.test(fin.txt) && /Pago en la casa/.test(fin.txt) && /72 €/.test(fin.txt), 'la confirmación dice que es una demostración, el total (2 × 2 × 18 €) y «pago en la casa»', fin.txt.slice(0, 300));
  await cap(page, '07-motor-hecho');
  // la casa entera
  await page.click('.m-hecho .btn-sec');
  await page.click('.m-modo button:nth-child(2)');
  const casa = await M(() => { const m = window.__motor; const ds = [...document.querySelectorAll('#motor .dia[data-estado="libre"]')].map((b) => b.dataset.k); return { todos: ds.every((k) => m.nocheVacia(k)), n: ds.length }; });
  comprobar(casa.todos && casa.n > 0, 'casa entera: solo se ofrecen las noches sin nadie', casa);
  const pc = await M(() => { const m = window.__motor; let k = m.sumar(m.HOY, 2); for (let i = 0; i < 300; i++, k = m.sumar(k, 1)) if (m.casaRango(k, m.sumar(k, 2))) return [k, m.sumar(k, 2)]; return null; });
  await M((p) => window.CASTINEIRAmotor.preparar({ ini: p[0], fin: p[1], modo: 'casa', personas: 16 }), pc);
  comprobar(await M(() => document.getElementById('m-total').textContent === 'a consultar' && document.getElementById('m-seguir').textContent === 'Pedir precio' && window.__motor.st.personas === 16 && document.querySelector('#motor .m-contador button[aria-label="Añadir personas"]').disabled), 'casa entera: hasta 16 personas, total «a consultar» y botón «Pedir precio»');
  await cap(page, '07-motor');
  comprobar(page._errores.length === 0, 'sin errores', page._errores);
  await ctx.close();
}

/* ================= 8. cookies, cabecera, mapa y pie ================= */
console.log('\n8. Cookies, cabecera, mapa y pie');
{
  const { ctx, page } = await nueva();
  await page.goto(BASE);
  await esperarCortina(page);
  comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cookies')).display === 'flex'), 'cookies 1/4: se ven en la primera visita');
  await page.click('#ck-si');
  comprobar(await page.evaluate((k) => getComputedStyle(document.getElementById('cookies')).display === 'none' && localStorage.getItem(k) === 'si', LLAVE), 'cookies 2/4: «Entendido» las cierra y guarda la marca');
  await page.reload(); await esperarCortina(page);
  comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cookies')).display === 'none'), 'cookies 3/4: al recargar no vuelven');
  await page.evaluate((k) => localStorage.removeItem(k), LLAVE);
  await page.reload(); await esperarCortina(page);
  comprobar(await page.evaluate(() => getComputedStyle(document.getElementById('cookies')).display === 'flex'), 'cookies 4/4: borrando la marca vuelven a salir');
  await page.click('#ck-si');
  await bajarA(page, '#alojamientos', 0);
  const est = await page.evaluate(() => ({ n: document.querySelectorAll('#cab-ventana .cristal.es-encendido').length, solida: document.getElementById('cab').classList.contains('es-solida') }));
  comprobar(est.n >= 1 && est.n <= 3 && est.solida, 'cabecera: al bajar se pone sólida y la ventana se va encendiendo cristal a cristal', est);
  await bajarA(page, '#llegar', 70);
  await page.click('#mapa-btn');
  comprobar(await page.evaluate(() => { const f = document.querySelector('#mapa-google iframe'); return !!f && /google\.com\/maps\?q=42\.31216,-7\.4498/.test(f.src) && /output=embed/.test(f.src) && !document.getElementById('mapa-btn'); }), 'el mapa de Google (en las coordenadas) solo se carga al pedirlo');
  comprobar(await page.evaluate(() => { const t = [...document.querySelectorAll('.llegar .tel-num')].map((x) => [x.textContent, getComputedStyle(x).userSelect]); return t.length === 3 && t[0][0] === '609 31 42 35' && t[1][0] === '988 29 21 24' && t[2][0] === 'info@acastineira.com' && t.every((x) => x[1] === 'all'); }), 'los dos teléfonos y el correo van como texto seleccionable');
  await bajarTodo(page);
  await page.waitForTimeout(2200);
  const pie = await page.evaluate(() => ({ visto: document.getElementById('pie-ventana').classList.contains('es-visto'), cristales: [...document.querySelectorAll('.pie-cristal')].map((c) => +getComputedStyle(c).opacity), cab: document.querySelectorAll('#cab-ventana .cristal.es-encendido').length, completa: document.getElementById('cab').classList.contains('es-completa') }));
  comprobar(pie.visto && pie.cristales.length === 4 && pie.cristales.every((o) => o > 0.95), 'en el pie, la ventana entera se enciende sobre el muro de noche', pie);
  comprobar(pie.cab === 4 && pie.completa, 'y la ventana de la cabecera está encendida entera', pie);
  await cap(page, '08-pie');
  await page.click('#abrir-cookies');
  comprobar(await page.evaluate(() => !document.getElementById('cookies').hidden), '«Preferencias de cookies» vuelve a abrir el aviso');
  comprobar(page._errores.length === 0, 'sin errores', page._errores);
  await ctx.close();
}

/* ================= 9. móvil ================= */
console.log('\n9. Móvil');
const SUYAS = '#mapa, #anio';
for (const [w, h] of [[360, 640], [375, 667], [390, 844], [768, 1024]]) {
  const { ctx, page } = await nueva({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page, 900);
  const g = await page.evaluate(() => {
    const r = (s) => document.querySelector(s).getBoundingClientRect();
    const t = r('.portada-txt'), a = r('.altimetro'), f = r('.rapida'), c = r('#cab'), p = r('#arriba');
    const pisa = (x, y) => !(x.bottom <= y.top + 1 || y.bottom <= x.top + 1 || x.right <= y.left + 1 || y.right <= x.left + 1);
    return { solapaAlt: pisa(t, a), solapaBarra: pisa(t, f), altBajoCab: a.top >= c.bottom - 1, rapidaDentro: f.bottom <= p.bottom + 1 };
  });
  comprobar(!g.solapaAlt && !g.solapaBarra && g.altBajoCab && g.rapidaDentro, `${w}×${h}: en la portada el texto no pisa el altímetro ni la reserva rápida`, g);
  await bajarTodo(page);
  const fuera = await page.evaluate((suyas) => {
    const vw = document.documentElement.clientWidth, mios = [], suyos = [];
    document.querySelectorAll('body *').forEach((el) => {
      // .mapa-cinta: la cinta adhesiva rotada del mapa de Secciones, que asoma a propósito
      if (el.closest('.carril, .cortina, .vuelo, .claro-lienzo, .claro-rotulos, svg, [hidden], .barra, .menu-movil, iframe, .mapa-cinta')) return;
      const r = el.getBoundingClientRect();
      if (r.width && r.right > vw + 1) (el.closest(suyas) ? suyos : mios).push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + el.className).slice(0, 50) + ' ' + Math.round(r.right));
    });
    return { mios: mios.slice(0, 8), suyos: suyos.slice(0, 5) };
  }, SUYAS);
  comprobar(fuera.mios.length === 0, `${w}×${h}: ningún elemento se sale por la derecha (incluidas las palabras «Somos»)`, fuera.mios);
  if (fuera.suyos.length) aviso(`${w}×${h}: en las secciones de Secciones algo se sale por la derecha: ${fuera.suyos.join(', ')}`);
  if (w === 390) {
    await bajarA(page, '#arriba', 0);
    await page.waitForTimeout(400);
    await cap(page, '09-portada-390');
    await bajarA(page, '#hogar', 0);
    await page.waitForTimeout(900);
    comprobar(await page.evaluate(() => document.getElementById('barra').classList.contains('es-visible')), 'la barra fija del móvil sale al dejar la portada');
    await cap(page, '09-hogar-390');
    await page.click('#menu-btn');
    await page.waitForTimeout(300);
    const mm = await page.evaluate(() => { const r = document.getElementById('menu-movil').getBoundingClientRect(); return { h: r.height, vh: innerHeight, vis: getComputedStyle(document.getElementById('menu-movil')).display, txt: document.getElementById('menu-btn').textContent }; });
    comprobar(mm.vis !== 'none' && Math.abs(mm.h - mm.vh) < 2 && mm.txt === 'Cerrar', 'el menú del móvil abre a pantalla completa con la cabecera ya sólida', mm);
    await cap(page, '09-menu-390');
    await page.click('#menu-movil a[href="#alojamientos"]');
    await page.waitForTimeout(1500);
    comprobar(await page.evaluate(() => document.getElementById('menu-movil').hidden && Math.abs(document.getElementById('alojamientos').getBoundingClientRect().top) < 90), 'un enlace del menú lo cierra y lleva a su sección');
    await bajarA(page, '#motor', 80);
    await page.waitForTimeout(600);
    comprobar(await page.evaluate(() => !document.getElementById('barra').classList.contains('es-visible') && document.querySelectorAll('#motor .m-mes').length === 1), 'la barra se aparta sobre el motor, que enseña un mes en el móvil');
    await cap(page, '09-motor-390');
  }
  comprobar(page._errores.length === 0, `${w}×${h}: sin errores`, page._errores);
  await ctx.close();
}
if (HAY_3D) {
  // con el 3D en el móvil: la pausa y la pista del gesto no pisan el altímetro ni el texto
  const { ctx, page } = await nueva(MOVIL, { script: sinCookies, sin3d: false });
  await page.goto(BASE);
  await esperarCortina(page, 600);
  await page.waitForFunction(() => /con-3d|sin-3d/.test(document.getElementById('vuelo').className), null, { timeout: 45000, polling: 250 }).catch(() => {});
  await page.waitForTimeout(800);
  const g = await page.evaluate(() => {
    const pisa = (x, y) => !(x.bottom <= y.top + 1 || y.bottom <= x.top + 1 || x.right <= y.left + 1 || y.right <= x.left + 1);
    const a = document.querySelector('.altimetro').getBoundingClientRect(), t = document.querySelector('.portada-txt').getBoundingClientRect();
    const ex = ['#vuelo-pausa', '.vuelo-pista'].map((s) => document.querySelector(s)).filter((e) => e && !e.hidden && getComputedStyle(e).display !== 'none').map((e) => e.getBoundingClientRect());
    return { clase: document.getElementById('vuelo').className, visibles: ex.length, pisan: ex.some((r) => pisa(r, a) || pisa(r, t)) };
  });
  comprobar(!g.pisan, '390 con 3D: la pausa y la pista del gesto no pisan el altímetro ni el texto', g);
  await cap(page, '09-portada-390-3d');
  comprobar(page._errores.length === 0, '390 con 3D: sin errores', page._errores);
  await ctx.close();
}
{
  // la barra del navegador del móvil sube y baja: nada se rehace ni salta
  const { ctx, page } = await nueva(MOVIL, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page, 1200);
  await page.addStyleTag({ content: '.portada { min-height: 844px !important; }' });   // Playwright sí cambia los svh: se fijan para medir
  await bajarA(page, '#alojamientos', 0);
  await page.waitForTimeout(400);
  const medir = () => page.evaluate(() => ({ n: window.__castineira.rehechos, top: Math.round(document.getElementById('claro').getBoundingClientRect().top + scrollY), motor: document.querySelectorAll('#motor .m-mes').length }));
  const a = await medir();
  const tops = [];
  for (let i = 0; i < 6; i++) { await page.setViewportSize({ width: 390, height: i % 2 ? 844 : 788 }); await page.waitForTimeout(250); tops.push((await medir()).top); }
  const b = await medir();
  comprobar(b.n === a.n, 'barra del móvil: 0 «rehacer» en 6 cambios de alto', [a.n, b.n]);
  comprobar(tops.every((t) => Math.abs(t - a.top) < 1), 'barra del móvil: nada se mueve de sitio', [a.top, ...tops]);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(500);
  comprobar((await medir()).n > b.n, 'al girar el móvil sí se rehace');
  await ctx.close();
}

/* ================= 10. densidades, foco, fotos y contraste ================= */
console.log('\n10. Densidades, foco, fotos y contraste');
{
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await page.goto(BASE + '?densidad=sobria');
  await esperarCortina(page);
  comprobar(await page.evaluate(() => document.getElementById('mando').hidden && getComputedStyle(document.getElementById('mando')).display === 'none' && !document.documentElement.classList.contains('densidad-sobria')), 'sin ?revision el mando no se ve y no se aplica ninguna densidad');
  await page.goto(BASE + '?revision');
  await esperarCortina(page);
  comprobar(await page.evaluate(() => !document.getElementById('mando').hidden && getComputedStyle(document.getElementById('mando')).display === 'flex' && /Somos/.test(document.querySelector('#mando [data-densidad="cargada"]').textContent)), 'con ?revision el mando se ve («Somos» / «Sobria»)');
  await page.click('#mando [data-densidad="sobria"]');
  await bajarA(page, '#fuego', 250);
  await page.waitForTimeout(700);
  const s = await page.evaluate(() => ({ cls: document.documentElement.classList.contains('densidad-sobria'), url: location.search, tabla: getComputedStyle(document.getElementById('vistazo')).display, fondo: getComputedStyle(document.getElementById('somos')).backgroundColor, foto: document.querySelectorAll('.palabra.con-foto').length, color: getComputedStyle(document.querySelector('#fuego .letra')).color, w: window.__castineira.letras().flatMap((p) => p.w) }));
  comprobar(s.cls && /revision/.test(s.url) && /densidad=sobria/.test(s.url) && s.tabla === 'block' && s.fondo === 'rgb(241, 235, 221)' && s.foto === 0 && s.color === 'rgb(194, 80, 45)' && s.w.every((x) => x === 100), '«Sobria»: fondo fijo, palabras lisas en su color, sin fotos ni letras que se estiran, y AÑADE la tabla «La casa, de un vistazo»', s);
  await cap(page, '10-sobria');
  await page.click('#mando [data-densidad="cargada"]');
  await page.waitForFunction(() => getComputedStyle(document.getElementById('somos')).backgroundColor === 'rgb(194, 80, 45)', null, { timeout: 4000, polling: 100 }).catch(() => {});
  const vuelta = await page.evaluate(() => ({ s: document.documentElement.classList.contains('densidad-sobria'), tabla: getComputedStyle(document.getElementById('vistazo')).display, fotos: document.querySelectorAll('.palabra.con-foto').length, fondo: getComputedStyle(document.getElementById('somos')).backgroundColor }));
  comprobar(!vuelta.s && vuelta.tabla === 'none' && vuelta.fotos >= 1 && vuelta.fondo === 'rgb(194, 80, 45)', '«Somos» vuelve a las fotos en las letras y a la pared de color (con su fundido)', vuelta);
  comprobar(page._errores.length === 0, 'densidades: sin errores', page._errores);
  await ctx.close();
}
{
  // receta de borrado del mando
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await page.goto(BASE + '__sin-mando.html?revision&densidad=sobria', { waitUntil: 'domcontentloaded' });
  await esperarCortina(page);
  comprobar(await page.evaluate(() => !document.getElementById('mando') && !document.getElementById('vistazo') && !document.documentElement.classList.contains('densidad-sobria') && document.querySelectorAll('#motor .dia').length > 20 && window.__castineira.letras().length === 3) && page._errores.length === 0, 'receta de borrado del mando: sin él, la web va igual y sin errores', page._errores);
  await ctx.close();
}
{
  // foco con forma de marco de ventana, fotos y contraste
  const { ctx, page } = await nueva({}, { script: sinCookies });
  await page.goto(BASE);
  await esperarCortina(page);
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
  const foco = await page.evaluate(() => { const e = document.activeElement, c = getComputedStyle(e); return { tag: e.tagName + (e.className ? '.' + e.className : ''), o: c.outlineStyle, w: parseFloat(c.outlineWidth) }; });
  comprobar(foco.o === 'double' && foco.w >= 3, 'el foco del teclado tiene forma de marco de ventana (doble línea)', foco);
  await page.focus('#motor .dia:not([aria-disabled])');
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab');
  const foco2 = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  comprobar(foco2 === 'double', 'también en los días del calendario', foco2);
  await bajarTodo(page);
  const fotos = JSON.parse(fs.readFileSync(path.join(RAIZ, 'img/fotos/fotos.json'), 'utf8'));
  const orig = Object.fromEntries(fotos.map((f) => [f.nombre, f.ancho_origen]));
  const grandes = await page.evaluate((o) => [...document.querySelectorAll('picture[data-foto] img')].map((i) => ({ n: i.parentElement.dataset.foto, w: Math.round(i.getBoundingClientRect().width), suya: !!i.closest('#mapa, #anio') })).filter((x) => o[x.n] && x.w > o[x.n] * 1.05), orig);
  comprobar(grandes.filter((x) => !x.suya).length === 0, 'ninguna foto se pinta más ancha que su original (1440 px)', grandes);
  if (grandes.some((x) => x.suya)) aviso('en las secciones de Secciones se amplía: ' + grandes.filter((x) => x.suya).map((x) => x.n + ' ' + x.w + ' px').join(', '));
  // contraste WCAG 2 de las parejas de texto
  const lum = (h) => { const c = h.match(/\w\w/g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const tok = Object.fromEntries([...css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]));
  const texto45 = [['granito', 'cal'], ['granito', 'cal-2'], ['granito-2', 'cal'], ['granito-2', 'cal-2'], ['alba-texto', 'cal'], ['alba-texto', 'cal-2'], ['luz', 'noche'], ['luz', 'noche-2'], ['luz-2', 'noche'], ['luz-2', 'noche-2'], ['alba', 'noche'], ['alba', 'noche-2'], ['blanco', 'puerta'], ['puerta', 'cal'], ['cal', 'granito'], ['granito', 'mostaza'], ['granito', 'verde'], ['blanco', 'teja']];
  const grande3 = [['mostaza-oscura', 'cal'], ['teja', 'cal'], ['verde-oscura', 'cal']];
  const malas = [...texto45.map(([a, b]) => [a, b, cr(tok[a], tok[b]), 4.5]), ...grande3.map(([a, b]) => [a, b, cr(tok[a], tok[b]), 3])].filter((p) => !(p[2] >= p[3])).map((p) => [p[0], p[1], Math.round(p[2] * 100) / 100]);
  comprobar(malas.length === 0 && [...texto45, ...grande3].every(([a, b]) => tok[a] && tok[b]), `contraste: las ${texto45.length} parejas de texto pasan 4,5:1 y las ${grande3.length} de las palabras gigantes («Sobria»), 3:1`, malas);
  comprobar(page._errores.length === 0, 'sin errores', page._errores);
  await ctx.close();
}
{
  // páginas legales y 404: se abren, noindex, no desbordan a 360
  const { ctx, page } = await nueva({ viewport: { width: 360, height: 700 } });
  for (const f of ['aviso-legal', 'privacidad', 'cookies', 'accesibilidad', '404']) {
    await page.goto(BASE + f + '.html');
    comprobar(await page.evaluate(() => !!document.querySelector('h1') && document.documentElement.scrollWidth <= innerWidth && /noindex/.test(document.querySelector('meta[name="robots"]').content)), `${f}.html se abre, lleva noindex y no desborda a 360`);
  }
  const legal = fs.readFileSync(path.join(RAIZ, 'aviso-legal.html'), 'utf8');
  comprobar(/TR-OR-000017/.test(legal) && /PENDIENTE: nombre o razón social del titular/.test(legal), 'aviso legal: la licencia y el titular como PENDIENTE visible');
  // el 404 lleva rutas absolutas del repo publicado: en local fallan a propósito
  comprobar(page._errores.filter((e) => !/caserio-da-castineira-montederramo-web\/|404\.html|Failed to load resource/.test(e)).length === 0, 'legales: sin errores', page._errores);
  await ctx.close();
}

} finally {
  await browser.close();
  servidor.close();
}
console.log(`\n${nOk} bien, ${fallos.length} mal (${nOk}/${nOk + fallos.length})`);
if (avisos.length) console.log('Avisos (no cuentan como fallo, son de otro módulo):\n' + avisos.map((a) => ' - ' + a).join('\n'));
if (fallos.length) { console.log(fallos.map((f) => ' - ' + f).join('\n')); process.exit(1); }
