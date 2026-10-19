/* Capturas para revisar a ojo (puerto 8797, el mismo de verificar.mjs: no los lances a la vez).
   Siempre cierra el navegador (finally): un Chromium huérfano con WebGL satura la CPU.
   Uso: node scripts/capturas.mjs [esc|mov|360] [--reducido] [--sinjs] [--sobria] [--sin3d] [sección…]
   Baja con la rueda, sección a sección, y deja los PNG en pruebas/. */
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const { chromium } = require('playwright');
const R = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json', '.bin': 'application/octet-stream' };
const s = http.createServer((q, r) => { let p = decodeURIComponent(q.url.split('?')[0]); if (p === '/') p = '/index.html'; const f = path.join(R, p); if (!f.startsWith(R) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
s.on('error', (e) => { console.error('Puerto 8797 ocupado: ' + e.message); process.exit(2); });
await new Promise((r) => s.listen(8797, r));
const args = process.argv.slice(2);
const modo = ['esc', 'mov', '360'].includes(args[0]) ? args.shift() : 'esc';
const sin3d = args.includes('--sin3d'), reducido = args.includes('--reducido'), sinjs = args.includes('--sinjs'), sobria = args.includes('--sobria');
const lista = args.filter((a) => !a.startsWith('--'));
const secciones = lista.length ? lista : ['arriba', 'hogar', 'fuego', 'comemos', 'alojamientos', 'mapa', 'anio', 'manolo', 'claro', 'minutos', 'opiniones', 'reserva', 'llegar', 'pie'];
const vp = modo === 'mov' ? { width: 390, height: 844 } : modo === '360' ? { width: 360, height: 640 } : { width: 1440, height: 900 };
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: modo !== 'esc', hasTouch: modo !== 'esc', reducedMotion: reducido ? 'reduce' : 'no-preference', javaScriptEnabled: !sinjs });
  if (sin3d) await ctx.route(/\/js\/3d\//, (r) => r.abort());
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.continue().catch(() => {}));
  const p = await ctx.newPage();
  const errores = []; p.on('pageerror', (e) => errores.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
  await p.addInitScript(() => { try { localStorage.setItem('castineira-cookies', 'si'); } catch (e) {} });
  await p.goto('http://localhost:8797/' + (sobria ? '?revision&densidad=sobria' : ''), { waitUntil: 'load' });
  await p.waitForTimeout(sinjs || reducido ? 800 : 3800);
  fs.mkdirSync(path.join(R, 'pruebas'), { recursive: true });
  const sufijo = `${modo}${reducido ? '-reducido' : ''}${sinjs ? '-sinjs' : ''}${sobria ? '-sobria' : ''}`;
  for (const id of secciones) {
    if (!(await p.evaluate((i) => !!document.getElementById(i), id))) { console.log('no existe #' + id); continue; }
    for (let i = 0; i < 60; i++) {
      const falta = await p.evaluate((i) => document.getElementById(i).getBoundingClientRect().top - (i === 'arriba' ? 0 : 64), id);
      if (Math.abs(falta) < 20) break;
      if (modo === 'esc') await p.mouse.wheel(0, Math.sign(falta) * Math.min(Math.abs(falta), 700));
      else await p.evaluate((dd) => scrollBy(0, dd), Math.sign(falta) * Math.min(Math.abs(falta), 600));
      await p.waitForTimeout(90);
      const ya = await p.evaluate(() => innerHeight + scrollY >= document.documentElement.scrollHeight - 2);
      if (ya && falta > 0) break;
    }
    await p.waitForTimeout(sinjs || reducido ? 300 : 2400);
    await p.screenshot({ path: path.join(R, 'pruebas', `${sufijo}-${id}.png`) });
  }
  console.log(sufijo, 'scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth), 'vista', vp.width, 'errores', errores);
} finally {
  await b.close(); s.close();
}
