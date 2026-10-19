// Capturas de las dos secciones en el banco (1440, 390 y 360). Uso: node pruebas/sec-capturas.mjs
// Salen en pruebas/sec-*.png.
import { montarBanco, servir, lanzar, URL_BANCO, espera, RAIZ } from './sec-comun.mjs';
import path from 'node:path';

montarBanco();
const srv = await servir();
const nav = await lanzar();
try {
  for (const [w, h, dpr] of [[1440, 900, 1], [390, 844, 3], [360, 740, 2]]) {
    const ctx = await nav.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: w < 500, hasTouch: w < 500 });
    const pag = await ctx.newPage();
    pag.on('pageerror', e => console.log('ERROR', e.message));
    pag.on('console', m => { if (m.type() === 'error') console.log('consola', m.text()); });
    await pag.goto(URL_BANCO, { waitUntil: 'domcontentloaded' });
    await pag.evaluate(() => document.fonts.ready);
    await pag.locator('#mapa-pliego').scrollIntoViewIfNeeded();
    await pag.waitForFunction(() => document.querySelector('#mapa').classList.contains('mapa--listo'), null, { timeout: 15000 });
    await espera(3800);
    await pag.locator('#mapa').screenshot({ path: path.join(RAIZ, 'pruebas', `sec-mapa-${w}.png`) });
    await pag.locator('#anio-escena').scrollIntoViewIfNeeded();
    await espera(1800);
    await pag.locator('#anio').screenshot({ path: path.join(RAIZ, 'pruebas', `sec-anio-${w}.png`) });
    await ctx.close();
  }
} finally {
  await nav.close();
  srv.close();
}
console.log('capturas hechas');
