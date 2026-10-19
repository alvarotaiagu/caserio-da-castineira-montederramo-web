/* Genera las páginas a partir de sus fuentes *.src.html:
   1. <!--parte:partes/x.html--> → el contenido de ese fichero (las secciones «Dibuja mi mapa» y
      «Un año en la casa», que hace el agente de Secciones). Si aún no existe, deja un comentario.
   2. <!--poster-->, <!--precarga-poster--> y <!--plano--> → las imágenes del 3D que haya en
      img/terreno/ (<picture> con AVIF/WebP/JPG y anchos si el 3D los ha entregado; si no, el JPG).
   3. <img data-foto="nombre" ...> → <picture> con AVIF, WebP y JPG en todos los anchos de
      img/fotos/fotos.json (el <img> conserva sus demás atributos). También dentro de las partes.
   4. <!--svg:ruta/archivo.svg atributos--> → el SVG en línea.
   5. <!--css:ruta-->, <!--js:ruta--> y <!--modulo:ruta--> → <link>/<script> SOLO si el fichero existe
      (css/3d.css, css/mapa.css, css/anio.css, js/mapa.js, js/anio.js, js/3d/arranque.js): así la web
      no pide nada que dé 404 mientras los otros agentes trabajan. Vuelve a construir cuando lleguen.
   6. Ejecuta versionar.mjs para poner ?v=<huella> a CSS y JS.
   Se edita SIEMPRE el *.src.html; el .html generado se sobrescribe. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const sharp = require('sharp');
const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const existe = (rel) => fs.existsSync(path.join(RAIZ, rel));
const FOTOS = new Map(JSON.parse(fs.readFileSync(path.join(RAIZ, 'img/fotos/fotos.json'), 'utf8')).map((f) => [f.nombre, f]));

function picture(atrs) {
  const nombre = /data-foto="([^"]+)"/.exec(atrs)[1];
  const f = FOTOS.get(nombre);
  if (!f) throw new Error('Foto desconocida: ' + nombre + ' (mira img/fotos/fotos.json)');
  const sizes = (/\bsizes="([^"]+)"/.exec(atrs) || [, '100vw'])[1];
  const set = (ext) => f.anchos.map((w) => `img/fotos/${nombre}-${w}.${ext} ${w}w`).join(', ');
  // el JPG por defecto: el ancho intermedio (o el más grande que haya por debajo)
  const base = f.anchos.includes(800) ? 800 : f.anchos[f.anchos.length - 1];
  const alto = Math.round(f.alto * base / f.ancho);
  let resto = atrs.replace(/\s*data-foto="[^"]+"/, '').replace(/\s*\bsizes="[^"]+"/, '');
  if (!/\bloading=/.test(resto) && !/fetchpriority="high"/.test(resto)) resto += ' loading="lazy"';
  if (!/\bdecoding=/.test(resto)) resto += ' decoding="async"';
  return `<picture data-foto="${nombre}">`
    + `<source type="image/avif" srcset="${set('avif')}" sizes="${sizes}">`
    + `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">`
    + `<img src="img/fotos/${nombre}-${base}.jpg" srcset="${set('jpg')}" sizes="${sizes}" width="${base}" height="${alto}"${resto}>`
    + `</picture>`;
}

function svgEnLinea(ruta, atrs) {
  let s = fs.readFileSync(path.join(RAIZ, ruta), 'utf8').replace(/<\?xml[^>]*>\s*/, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  s = s.replace(/\sid="[^"]*"/g, '');
  s = s.replace(/<svg\b([^>]*)>/, (m, a) => '<svg' + a.replace(/\s(role|aria-label)="[^"]*"/g, '') + ' ' + atrs.trim() + '>');
  return s;
}

/* ---------- imágenes del 3D: lo que haya en img/terreno/ ---------- */
const T = 'img/terreno/';
const terreno = fs.existsSync(path.join(RAIZ, T)) ? fs.readdirSync(path.join(RAIZ, T)) : [];
const variantes = (re) => terreno.map((f) => re.exec(f)).filter(Boolean).map((m) => ({ f: m[0], w: +m[1], ext: m[2] })).sort((a, b) => a.w - b.w);
const conAncho = (lista, ext) => lista.filter((v) => v.ext === ext).map((v) => `${T}${v.f} ${v.w}w`).join(', ');
async function medidas(rel, porDefecto) {
  try { const m = await sharp(path.join(RAIZ, rel)).metadata(); return [m.width, m.height]; } catch (e) { return porDefecto; }
}
const movil = variantes(/^poster-vuelo-movil-(\d+)\.(avif|webp|jpg)$/);
const escritorio = variantes(/^poster-vuelo-(\d+)\.(avif|webp|jpg)$/);
const [pw, ph] = await medidas(T + 'poster-vuelo.jpg', [1280, 720]);
const ALT_POSTER = 'La sierra de A Pena da Cruz y sus aerogeneradores vistos desde el aire; a la derecha, la meseta donde está la casa';
const MEDIA_MOVIL = '(max-aspect-ratio: 1/1)';
function poster() {
  const fuentes = [];
  for (const ext of ['avif', 'webp', 'jpg']) {
    const s = conAncho(movil, ext);
    if (s) fuentes.push(`<source${ext === 'jpg' ? '' : ` type="image/${ext}"`} media="${MEDIA_MOVIL}" srcset="${s}" sizes="100vw">`);
  }
  for (const ext of ['avif', 'webp']) {
    const s = conAncho(escritorio, ext);
    if (s) fuentes.push(`<source type="image/${ext}" srcset="${s}" sizes="100vw">`);
  }
  const jpg = conAncho(escritorio, 'jpg');
  const img = `<img id="vuelo-poster" src="${T}poster-vuelo.jpg"${jpg ? ` srcset="${jpg}" sizes="100vw"` : ''} alt="${ALT_POSTER}" fetchpriority="high" width="${pw}" height="${ph}">`;
  if (!fuentes.length) return img;
  return `<picture>\n      ${fuentes.join('\n      ')}\n      ${img}\n    </picture>`;
}
function precarga() {
  const l = [];
  const am = conAncho(movil, 'avif'), ae = conAncho(escritorio, 'avif');
  if (am) l.push(`<link rel="preload" as="image" type="image/avif" media="${MEDIA_MOVIL}" imagesrcset="${am}" imagesizes="100vw" fetchpriority="high">`);
  if (ae) l.push(`<link rel="preload" as="image" type="image/avif" media="${am ? '(min-aspect-ratio: 1.001/1)' : 'all'}" imagesrcset="${ae}" imagesizes="100vw" fetchpriority="high">`);
  return l.join('\n') || '<!-- (sin precarga: el 3D aún no ha entregado el póster en AVIF) -->';
}
const [lw, lh] = await medidas(T + 'plano.jpg', [1400, 1179]);
function plano() {
  const img = `<img id="claro-plano" src="${T}plano.jpg" alt="Relieve de la meseta de Montederramo y la Serra do Burgo, en plano, con la casa en su claro" loading="lazy" width="${lw}" height="${lh}">`;
  return terreno.includes('plano.webp') ? `<picture><source type="image/webp" srcset="${T}plano.webp">${img}</picture>` : img;
}

/* ---------- construir cada página ---------- */
const avisos = [];
const fuentes = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.src.html'));
for (const src of fuentes) {
  const antes = fs.readFileSync(path.join(RAIZ, src), 'utf8');
  let html = antes.replace(/<!--parte:([^\s>]+)\s*-->/g, (m, ruta) => {
    if (!existe(ruta)) { avisos.push(`${ruta} aún no existe`); return `<!-- parte ${ruta}: aún no existe -->`; }
    return fs.readFileSync(path.join(RAIZ, ruta), 'utf8').trim();
  });
  html = html.replace('<!--poster-->', poster).replace('<!--precarga-poster-->', precarga).replace('<!--plano-->', plano);
  html = html.replace(/<img\b([^>]*\bdata-foto="[^"]+"[^>]*)>/g, (m, a) => picture(a.replace(/\s*\/$/, '')));
  html = html.replace(/<!--svg:([^\s>]+)\s*([^>]*?)-->/g, (m, ruta, a) => svgEnLinea(ruta, a));
  html = html.replace(/<!--css:([^\s>]+)\s*-->/g, (m, ruta) => existe(ruta) ? `<link rel="stylesheet" href="${ruta}">` : (avisos.push(`${ruta} aún no existe`), `<!-- ${ruta}: aún no existe -->`));
  html = html.replace(/<!--js:([^\s>]+)\s*-->/g, (m, ruta) => existe(ruta) ? `<script src="${ruta}" defer></script>` : (avisos.push(`${ruta} aún no existe`), `<!-- ${ruta}: aún no existe -->`));
  html = html.replace(/<!--modulo:([^\s>]+)\s*-->/g, (m, ruta) => existe(ruta)
    ? `<script type="module" src="${ruta}" onerror="window.__castineira3dFallo &amp;&amp; window.__castineira3dFallo()"></script>`
    : (avisos.push(`${ruta} aún no existe`), `<!-- ${ruta}: aún no existe (main.js pone sin-3d) -->`));
  const destino = src.replace('.src.html', '.html');
  fs.writeFileSync(path.join(RAIZ, destino), html);
  console.log(`${src} → ${destino} (${(html.length / 1024).toFixed(0)} KB)`);
}
if (avisos.length) console.log('Aún no han llegado (vuelve a construir cuando estén):\n  ' + [...new Set(avisos)].join('\n  '));
execFileSync(process.execPath, [path.join(RAIZ, 'versionar.mjs')], { stdio: 'inherit' });
