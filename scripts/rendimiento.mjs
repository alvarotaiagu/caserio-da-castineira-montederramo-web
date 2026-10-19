/* LCP real y peso en un móvil de gama media: Pixel 7 emulado (412 × 915, DPR 2,625),
   4G lento (1,6 Mbps, 150 ms) y CPU ×4. Puerto 8799. 3 pasadas.
   Siempre cierra el navegador (finally).
   Uso: node scripts/rendimiento.mjs [--sin3d]
   Google Fonts se sirve vacío (las letras no bloquean: van con media="print" → all).
   HTML, CSS, JS y JSON van con gzip, como los sirve GitHub Pages. */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const { chromium } = require('playwright');
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.bin': 'application/octet-stream' };
const SIN3D = process.argv.includes('--sin3d');
const BLOQUEA = (process.argv.find((a) => a.startsWith('--bloquea=')) || '').slice(10);   // p. ej. --bloquea=js/main.js (para buscar tareas largas)
const PASADAS = +((process.argv.find((a) => a.startsWith('--pasadas=')) || '--pasadas=3').slice(10));
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
  const f = path.join(RAIZ, p);
  if (!f.startsWith(RAIZ) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('no'); return; }
  const tipo = TIPOS[path.extname(f)] || 'application/octet-stream';
  if (/text|javascript|json|svg/.test(tipo) && /gzip/.test(req.headers['accept-encoding'] || '')) {
    res.writeHead(200, { 'Content-Type': tipo, 'Content-Encoding': 'gzip' });
    res.end(zlib.gzipSync(fs.readFileSync(f)));
    return;
  }
  res.writeHead(200, { 'Content-Type': tipo });
  fs.createReadStream(f).pipe(res);
});
srv.on('error', (e) => { console.error('Puerto 8799 ocupado: ' + e.message); process.exit(2); });
await new Promise((r) => srv.listen(8799, r));
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const filas = [];
try {
  for (let n = 1; n <= PASADAS; n++) {
    const ctx = await b.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    if (SIN3D) await ctx.route(/\/js\/3d\//, (r) => r.abort());
    if (BLOQUEA) await ctx.route((u) => BLOQUEA.split(',').some((x) => u.pathname.endsWith(x)), (r) => r.abort());
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      try { localStorage.setItem('castineira-cookies', 'si'); } catch (e) {}
      window.__lcp = null; window.__long = [];
      const mira = () => { if (window.__cortina && !window.__cortinaT) window.__cortinaT = Math.round(performance.now()); else if (!window.__cortinaT) requestAnimationFrame(mira); };
      requestAnimationFrame(mira);
      new PerformanceObserver((l) => { const e = l.getEntries().pop(); window.__lcp = { t: e.startTime, url: e.url || (e.element ? e.element.tagName + (e.element.id ? '#' + e.element.id : '') : '?') }; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true });
    });
    let bytes = 0, reqs = 0;
    cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; reqs++; });
    const t0 = Date.now();
    await page.goto('http://localhost:8799/index.html');
    await page.waitForFunction(() => document.documentElement.classList.contains('cortina-fuera'), null, { timeout: 30000 });
    const cruce = Date.now() - t0;
    await page.waitForTimeout(6000);
    const r = await page.evaluate(() => ({ lcp: window.__lcp, long: window.__long, vuelo: document.getElementById('vuelo').className, load: Math.round(performance.getEntriesByType('navigation')[0].loadEventStart), fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0), cortina: window.__cortinaT }));
    const fila = `pasada ${n}: LCP ${Math.round(r.lcp.t)} ms (${String(r.lcp.url).split('/').pop()}) · FCP ${r.fcp} ms · la cortina empieza a moverse ${r.cortina} ms · load ${r.load} ms · la ventana crece ${cruce} ms · ${reqs} peticiones, ${(bytes / 1024).toFixed(0)} KB · vuelo: ${r.vuelo} · tareas largas ${JSON.stringify(r.long.filter((x) => x[1] > 100))}`;
    console.log(fila); filas.push(r.lcp.t);
    await ctx.close();
  }
} finally { await b.close(); srv.close(); }
filas.sort((x, y) => x - y);
console.log(`mediana LCP ${Math.round(filas[Math.floor(filas.length / 2)])} ms${SIN3D ? ' (sin 3D)' : ''}`);
