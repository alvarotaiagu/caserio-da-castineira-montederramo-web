/* Prepara las fotos de la web desde las guardadas en la carpeta de bocetos
   (../caserio-da-castineira-montederramo-bocetos/ref/fotos/: Booking hasta 1280 px y el blog de la casa).
   Uso: node scripts/fotos.mjs
   - Gradación común y suave: un punto de contraste y MENOS saturación. Las de dentro
     de Booking son de ojo de pez y muy saturadas: ×0,78–0,82 (la aérea, ×0,72).
   - NUNCA amplía: los anchos se cortan en el ancho original.
   - Escribe img/fotos/<nombre>-<ancho>.{avif,webp,jpg} e img/fotos/fotos.json
     (la lista la usan construir.mjs, main.js —las fotos dentro de las letras— y las partes). */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const sharp = require('sharp');

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REF = path.join(RAIZ, '../caserio-da-castineira-montederramo-bocetos/ref/fotos');
const SALIDA = path.join(RAIZ, 'img/fotos');
fs.mkdirSync(SALIDA, { recursive: true });

const FOTOS = JSON.parse(fs.readFileSync(path.join(RAIZ, 'scripts/fotos-lista.json'), 'utf8'));
const ANCHOS = [480, 800, 1200, 1600];
const solo = process.argv.slice(2);

const previo = fs.existsSync(path.join(SALIDA, 'fotos.json')) ? JSON.parse(fs.readFileSync(path.join(SALIDA, 'fotos.json'), 'utf8')) : [];
const salida = [];
for (const f of FOTOS) {
  if (solo.length && !solo.includes(f.nombre)) { const p = previo.find((x) => x.nombre === f.nombre); if (p) { salida.push(p); continue; } }
  const fuente = path.join(REF, f.ruta);
  if (!fs.existsSync(fuente)) throw new Error(`Falta ${fuente} (${f.nombre})`);
  const buf = await sharp(fuente).rotate().toBuffer();
  const meta = await sharp(buf).metadata();
  const anchos = ANCHOS.filter((w) => w < meta.width - 40);
  if (meta.width <= 1600) anchos.push(meta.width);
  const unicos = [...new Set(anchos)];
  for (const w of unicos) {
    let p = sharp(buf).resize({ width: w, withoutEnlargement: true, kernel: 'lanczos3' });
    p = p.modulate({ saturation: f.sat ?? 0.9, brightness: f.claro ?? 1.0 }).linear(1.04, -4);
    if (meta.width <= 700) p = p.sharpen({ sigma: 0.5, m1: 0.6, m2: 1.2 });
    const dst = path.join(SALIDA, `${f.nombre}-${w}`);
    await p.clone().avif({ quality: 50, effort: 4 }).toFile(dst + '.avif');
    await p.clone().webp({ quality: 72 }).toFile(dst + '.webp');
    await p.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(dst + '.jpg');
  }
  const ancho = unicos[unicos.length - 1];
  salida.push({ nombre: f.nombre, anchos: unicos, ancho, alto: Math.round(meta.height * (ancho / meta.width)), origen: f.ruta, ancho_origen: meta.width, alto_origen: meta.height });
  console.log(f.nombre.padEnd(16), unicos.join(','), `${meta.width}x${meta.height}`);
}
fs.writeFileSync(path.join(SALIDA, 'fotos.json'), JSON.stringify(salida, null, 1));
console.log(salida.length + ' fotos');
