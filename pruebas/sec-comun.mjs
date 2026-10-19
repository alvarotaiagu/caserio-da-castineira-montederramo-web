// Común a las pruebas de Secciones: monta el banco (pruebas/sec-banco.html) con las dos partes,
// sirve la carpeta de la web en el 8796 y lanza Chromium (sin WebGL: aquí no hace falta).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REF_FOTOS = path.resolve(RAIZ, '..', 'caserio-da-castineira-montederramo-bocetos', 'ref', 'fotos');
export const PUERTO = 8796;
export const URL_BANCO = `http://127.0.0.1:${PUERTO}/pruebas/sec-banco.html`;
const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
export const { chromium, devices } = require('playwright');
export const espera = ms => new Promise(r => setTimeout(r, ms));

// Si la web aún no tiene una foto en img/fotos/fotos.json, el banco usa la original del tablero
const RESERVA = { nieve: 'booking/5382945.jpg', prado: 'booking/5378491.jpg', puerta: 'booking/11815341.jpg', atardecer: 'blog/b03.jpg' };

function fotosWeb() {
  const f = path.join(RAIZ, 'img/fotos/fotos.json');
  if (!fs.existsSync(f)) return new Map();
  return new Map(JSON.parse(fs.readFileSync(f, 'utf8')).map(x => [x.nombre, x]));
}

// La misma expansión que hace construir.mjs con <img data-foto>, con rutas relativas a pruebas/
function expandir(html, usadas) {
  const FOTOS = fotosWeb();
  return html.replace(/<img\b([^>]*\bdata-foto="([^"]+)"[^>]*)>/g, (m, atrs, nombre) => {
    const sizes = (/\bsizes="([^"]+)"/.exec(atrs) || [, '100vw'])[1];
    let resto = atrs.replace(/\s*data-foto="[^"]+"/, '').replace(/\s*\bsizes="[^"]+"/, '');
    if (!/\bloading=/.test(resto)) resto += ' loading="lazy"';
    if (!/\bdecoding=/.test(resto)) resto += ' decoding="async"';
    const f = FOTOS.get(nombre);
    if (f) {
      usadas.push([nombre, 'web']);
      const set = ext => f.anchos.map(w => `../img/fotos/${nombre}-${w}.${ext} ${w}w`).join(', ');
      const base = f.anchos.includes(800) ? 800 : f.anchos[f.anchos.length - 1];
      return `<picture data-foto="${nombre}"><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">`
        + `<img src="../img/fotos/${nombre}-${base}.jpg" srcset="${set('jpg')}" sizes="${sizes}" width="${base}" height="${Math.round(f.alto * base / f.ancho)}"${resto}></picture>`;
    }
    if (!RESERVA[nombre]) throw new Error('Foto sin nombre conocido: ' + nombre);
    usadas.push([nombre, 'tablero']);
    return `<picture data-foto="${nombre}"><img src="/ref-fotos/${RESERVA[nombre]}"${resto}></picture>`;
  });
}

export function montarBanco() {
  const usadas = [];
  const parte = n => expandir(fs.readFileSync(path.join(RAIZ, 'partes', n), 'utf8').trim(), usadas);
  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Banco de Secciones · Caserío da Castiñeira</title>
<link rel="icon" href="data:,">
<!-- GENERADO por pruebas/sec-comun.mjs (montarBanco): no editar a mano.
     Carga las dos partes con los tokens y las letras de la web. ?sobria = html.densidad-sobria -->
<script>
  window.__globalesAntes = Object.getOwnPropertyNames(window);
  if (/[?&]sobria/.test(location.search)) document.documentElement.classList.add('densidad-sobria');
</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=Reenie+Beanie&display=swap" media="print" onload="this.media='all'">
<style>
  /* tokens de la web (ENCARGO.md → Identidad) y base mínima */
  :root { --noche: #080d18; --noche-2: #101a2e; --alba: #f0a36a; --alba-texto: #a2501c; --luz: #f3e8d8; --cal: #f1ebdd; --granito: #1f1e1c;
    --mostaza: #e3a92a; --teja: #c2502d; --verde: #8da02c; --puerta: #a3281b; --papel: #f1e9d6; --tinta: #1c1b19; --musgo: #5aa646; }
  *, *::before, *::after { box-sizing: border-box; }
  html { -webkit-text-size-adjust: 100%; overflow-x: clip; }
  body { margin: 0; background: var(--cal); color: var(--granito); font: 400 17px/1.6 "Geist", system-ui, sans-serif; overflow-x: clip; }
  img { max-width: 100%; height: auto; display: block; }
  picture { display: block; }
  h1, h2, h3, p, figure, blockquote, dl, dd { margin: 0; }
  button { font: inherit; color: inherit; }
  [hidden] { display: none !important; }
  :focus { outline: none; }
  :focus-visible { outline: 2px solid var(--alba-texto); outline-offset: 3px; }
  .relleno { min-height: 260vh; padding: 64px 6vw; background: var(--noche); color: var(--luz); font: 400 clamp(32px, 5vw, 60px)/1.1 "Instrument Serif", serif; }
  .relleno.fin { min-height: 60vh; background: var(--cal); color: var(--granito); }
</style>
<link rel="stylesheet" href="../css/mapa.css">
<link rel="stylesheet" href="../css/anio.css">
</head>
<body>
<div class="relleno"><p>Banco de Secciones. Más abajo: «Dibuja mi mapa» y «Un año en la casa».</p></div>
${parte('mapa.html')}
${parte('anio.html')}
<div class="relleno fin"><p>Fin del banco.</p></div>
<script src="../js/mapa.js" defer></script>
<script src="../js/anio.js" defer></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(RAIZ, 'pruebas', 'sec-banco.html'), html);
  return usadas;
}

const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

export function servir(puerto = PUERTO) {
  const srv = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let base = RAIZ;
      if (p.startsWith('/ref-fotos/')) { base = REF_FOTOS; p = p.slice('/ref-fotos'.length); }
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(base, p);
      if (!f.startsWith(base)) { res.writeHead(403).end(); return; }
      await stat(f);
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(await readFile(f));
    } catch (e) { res.writeHead(404).end('no'); }
  });
  return new Promise((ok, mal) => { srv.once('error', mal); srv.listen(puerto, '127.0.0.1', () => ok(srv)); });
}

export const lanzar = () => chromium.launch();
