// Capturas del 3D en la página real (o en el banco): portada al principio, a mitad y al final del vuelo,
// y el claro de lejos, en la casa, de noche y en plano, a 1280 y a 390.
// Uso: node pruebas/3d-capturas.mjs [ruta=index.html] [ahora3d=2026-10-19T16:30]
import { servir, lanzar, devices, PUERTO, espera, RAIZ } from './3d-comun.mjs';
import path from 'node:path';

const [ruta = 'index.html', hora = '2026-10-19T16:30'] = process.argv.slice(2);
const sep = ruta.includes('?') ? '&' : '?';
const URL_P = `http://127.0.0.1:${PUERTO}/${ruta.replace(/^\//, '')}${sep}ahora3d=${hora}`;
const srv = await servir(); const nav = await lanzar();
const sale = n => path.join(RAIZ, 'pruebas', `3d-final-${n}.png`);

try {
  for (const [nombre, op] of [['1280', { viewport: { width: 1280, height: 720 }, screen: { width: 1440, height: 900 } }], ['390', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, defaultBrowserType: undefined }]]) {
    const ctx = await nav.newContext(op);
    try {
      const pag = await ctx.newPage();
      pag.on('pageerror', e => console.log(nombre, 'error:', e.message));
      pag.on('console', m => { if (m.type() === 'error') console.log(nombre, 'consola:', m.text()); });
      await pag.goto(URL_P);
      console.log(nombre, await pag.title());
      await pag.waitForFunction(() => document.getElementById('vuelo').classList.contains('con-3d'), null, { timeout: 120000 });
      await pag.evaluate(() => { const b = document.getElementById('vuelo-pausa'); if (b.dataset.pausa !== 'true') b.click(); });
      for (const [k, f] of [['inicio', 0], ['mitad', .5], ['final', 1]]) {
        await pag.evaluate(f => { const v = window.CASTINEIRA_3D.vuelo; v.t = v.DUR * f; }, f);
        await espera(1300);
        await pag.screenshot({ path: sale(`portada-${nombre}-${k}`), timeout: 120000 });
      }
      await pag.evaluate(() => document.getElementById('claro-marco').scrollIntoView({ block: 'center' }));
      await pag.waitForFunction(() => document.getElementById('claro').classList.contains('con-3d'), null, { timeout: 120000 });
      await espera(1800);
      await pag.screenshot({ path: sale(`claro-${nombre}-3d`), timeout: 120000 });
      await pag.evaluate(() => document.getElementById('claro-bajar').click());
      await pag.waitForFunction(() => window.CASTINEIRA_3D.claro.abajo && !window.CASTINEIRA_3D.claro.viajando, null, { timeout: 30000 });
      await espera(900);
      await pag.screenshot({ path: sale(`claro-${nombre}-casa`), timeout: 120000 });
      await pag.evaluate(() => document.querySelector('#claro [data-momento="noche"]').click());
      await espera(1200);
      await pag.screenshot({ path: sale(`claro-${nombre}-noche`), timeout: 120000 });
      await pag.evaluate(() => document.getElementById('claro-bajar').click());
      await pag.waitForFunction(() => !window.CASTINEIRA_3D.claro.abajo && !window.CASTINEIRA_3D.claro.viajando, null, { timeout: 30000 });
      await espera(900);
      await pag.screenshot({ path: sale(`claro-${nombre}-noche-sierra`), timeout: 120000 });
      await pag.evaluate(() => document.getElementById('claro-modo-plano').click());
      await espera(900);
      await pag.screenshot({ path: sale(`claro-${nombre}-plano`), timeout: 120000 });
    } finally { await ctx.close(); }
  }
} finally { await nav.close(); srv.close(); }
console.log('capturas en pruebas/3d-final-*.png');
