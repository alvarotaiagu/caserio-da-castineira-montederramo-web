// Póster de la portada = el primer fotograma del vuelo, pintado con la propia escena (así el paso póster → 3D no salta).
// Uso (desde la carpeta de la web, después de python -I scripts/terreno.py): node pruebas/3d-poster.mjs
// Salida en img/terreno/: poster-vuelo-{1920,1280}.{avif,webp,jpg} (16:9, apaisado),
//   poster-vuelo-movil-{900,600}.{avif,webp,jpg} (vertical, 412 × 915: el aspecto más estrecho; ver fovPara en escena.js) y poster-vuelo.jpg (= 1280).
// Luz fija: 19 de octubre a las 16:30 (sol a 29° por el suroeste) y calidad fija (con sombras: ?calidad3d=fija);
// la escena viva pone la luz de ahora y entra fundida encima.
import { servir, lanzar, URL_BANCO, espera, RAIZ } from './3d-comun.mjs';
import { createRequire } from 'node:module';
import path from 'node:path';
const sharp = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/')('sharp');
const HORA = '2026-10-19T16:30';
const OUT = path.join(RAIZ, 'img', 'terreno');
const srv = await servir(); const nav = await lanzar();

async function pintar({ ancho, alto, escala, movil }) {
  const ctx = await nav.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: escala, isMobile: movil, hasTouch: movil });
  try {
    const pag = await ctx.newPage();
    pag.on('pageerror', e => console.log('error:', e.message));
    await pag.goto(`${URL_BANCO}?cortina=0&ahora3d=${HORA}&dpr3d=${escala}&calidad3d=fija`);
    await pag.waitForFunction(() => window.CASTINEIRA_3D?.vuelo && document.getElementById('vuelo').classList.contains('con-3d'), null, { timeout: 120000 });
    await pag.evaluate(() => { const b = document.getElementById('vuelo-pausa'); if (b.dataset.pausa !== 'true') b.click(); window.CASTINEIRA_3D.vuelo.t = 0; });
    await pag.addStyleTag({ content: '.portada > :not(#vuelo), .rotulos3d, .cortina { visibility: hidden !important; } #vuelo-poster { visibility: hidden; }' });
    await espera(2000);
    const cal = await pag.evaluate(() => window.CASTINEIRA_3D.motor.calidad);
    if (cal.nivel) console.log('ojo: la calidad ha bajado', JSON.stringify(cal));
    return await pag.locator('#vuelo').screenshot({ animations: 'disabled' });
  } finally { await ctx.close(); }
}

async function guardar(png, nombre, anchos) {
  for (const w of anchos) {
    const base = sharp(png).resize({ width: w, withoutEnlargement: true });
    await base.clone().avif({ quality: 50, effort: 6 }).toFile(path.join(OUT, `${nombre}-${w}.avif`));
    await base.clone().webp({ quality: 72, effort: 6 }).toFile(path.join(OUT, `${nombre}-${w}.webp`));
    await base.clone().jpeg({ quality: 76, mozjpeg: true, progressive: true }).toFile(path.join(OUT, `${nombre}-${w}.jpg`));
  }
}

try {
  const apaisado = await pintar({ ancho: 1920, alto: 1080, escala: 1, movil: false });
  await guardar(apaisado, 'poster-vuelo', [1920, 1280]);
  await sharp(apaisado).resize({ width: 1280 }).jpeg({ quality: 76, mozjpeg: true, progressive: true }).toFile(path.join(OUT, 'poster-vuelo.jpg'));
  const vertical = await pintar({ ancho: 412, alto: 915, escala: 900 / 412, movil: true });
  await guardar(vertical, 'poster-vuelo-movil', [900, 600]);
} finally { await nav.close(); srv.close(); }
const { readdirSync, statSync } = await import('node:fs');
for (const f of readdirSync(OUT).filter(f => f.startsWith('poster'))) { const m = await sharp(path.join(OUT, f)).metadata(); console.log(f.padEnd(30), `${m.width}×${m.height}`.padEnd(11), Math.round(statSync(path.join(OUT, f)).size / 1024), 'KB'); }
