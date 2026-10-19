/* Favicons y og:image. El logo de la casa (192 × 75 px) NO se redibuja ni se amplía: el icono es
   el motivo de la web, la ventana de cuatro cristales encendida en la noche.
   Uso: node scripts/marca.mjs */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/');
const sharp = require('sharp');
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const M = path.join(RAIZ, 'img/marca');
fs.mkdirSync(M, { recursive: true });

const icono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="12" fill="#080d18"/>
<rect x="15" y="9" width="34" height="46" rx="1.5" fill="#2a1a12"/>
<rect x="19" y="13" width="12" height="17" fill="#ffb765"/><rect x="33" y="13" width="12" height="17" fill="#ffb765"/>
<rect x="19" y="34" width="12" height="17" fill="#f0a36a"/><rect x="33" y="34" width="12" height="17" fill="#f0a36a"/>
</svg>`;
fs.writeFileSync(path.join(M, 'favicon.svg'), icono);
await sharp(Buffer.from(icono)).resize(32, 32).png().toFile(path.join(M, 'favicon-32.png'));
await sharp(Buffer.from(icono)).resize(180, 180).png().toFile(path.join(M, 'apple-touch-icon.png'));
await sharp(Buffer.from(icono)).resize(512, 512).png().toFile(path.join(M, 'icono-512.png'));

// og:image: la casa de noche con la ventana encendida, recortada a 1200 × 630
const og = await sharp(path.join(RAIZ, '../caserio-da-castineira-montederramo-bocetos/ref/fotos/booking/12016899.jpg'))
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .modulate({ saturation: 0.85 })
  .jpeg({ quality: 80, mozjpeg: true }).toBuffer();
fs.writeFileSync(path.join(RAIZ, 'img/og.jpg'), og);
console.log('img/marca/* e img/og.jpg');
