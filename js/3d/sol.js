// El sol en A Castiñeira (fórmulas de SunCalc) y la hora de Madrid.
// Sin Three.js: lo usa también arranque.js para escribir el chip aunque no haya WebGL.
//
// Para pruebas y para el póster: ?ahora3d=2026-10-19T17:00 fija «ahora» (hora de Madrid).

const rad = Math.PI / 180;
export const LAT = 42.31216, LON = -7.44980;   // Caserío da Castiñeira

export function sol(d) {
  const dias = d.valueOf() / 864e5 - .5 + 2440588 - 2451545, M = rad * (357.5291 + .98560028 * dias);
  const Lc = M + rad * (1.9148 * Math.sin(M) + .02 * Math.sin(2 * M) + .0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
  const e = rad * 23.4397, dec = Math.asin(Math.sin(e) * Math.sin(Lc)), ra = Math.atan2(Math.sin(Lc) * Math.cos(e), Math.cos(Lc));
  const H = rad * (280.16 + 360.9856235 * dias) - rad * -LON - ra, phi = rad * LAT;
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi));
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  return { az: (az / rad + 180 + 360) % 360, alt: alt / rad };   // azimut desde el norte, en grados
}

const TZ = 'Europe/Madrid';
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const partes = d => Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
// minutos que Madrid va por delante de UTC en ese instante (60 o 120)
const desfase = d => { const t = Math.floor(d.getTime() / 6e4) * 6e4, p = partes(new Date(t)); return Math.round((Date.UTC(+p.year, p.month - 1, +p.day, +p.hour, +p.minute) - t) / 6e4); };

// «ahora» fijado por la URL (pruebas, póster)
let corrimiento = 0;
try {
  const q = new URLSearchParams(location.search).get('ahora3d');
  const m = q && /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)$/.exec(q);
  if (m) { const b = Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]); corrimiento = b - desfase(new Date(b)) * 6e4 - Date.now(); }
} catch (e) { /* sin URL: hora real */ }
export const ahora = () => new Date(Date.now() + corrimiento);

const HOY = partes(ahora());
/** Fecha de hoy (en Madrid) a los m minutos del día */
export const fechaDe = m => { const b = Date.UTC(+HOY.year, HOY.month - 1, +HOY.day, 0, m); return new Date(b - desfase(new Date(b)) * 6e4); };
export const minutoAhora = () => { const p = partes(ahora()); return +p.hour * 60 + +p.minute; };
export const hhmm = m => { m = ((Math.round(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
/** Metros con el punto de los miles, como en el resto de la web («1.289 m», «917 m»). Intl en español no separa los de cuatro cifras. */
export const metros = m => { m = Math.round(m); return (m >= 1000 ? Math.floor(m / 1000) + '.' + String(m % 1000).padStart(3, '0') : String(m)) + ' m'; };

/** Salida, puesta y mediodía solar de hoy (minutos) */
export const DIA = (() => {
  let sale = null, pone = null, ant = sol(fechaDe(0)).alt;
  for (let m = 2; m < 1440; m += 2) { const a = sol(fechaDe(m)).alt; if (ant < -.833 && a >= -.833) sale = m; if (ant >= -.833 && a < -.833) pone = m; ant = a; }
  let alto = -90, mAlto = 720; for (let m = 600; m < 960; m += 2) { const a = sol(fechaDe(m)).alt; if (a > alto) { alto = a; mAlto = m; } }
  return { sale, pone, mediodia: mAlto, alto };
})();

export const RUMBO = az => ['norte', 'nordeste', 'este', 'sudeste', 'sur', 'suroeste', 'oeste', 'noroeste'][Math.round(az / 45) % 8];

/** «sol a 23° por el suroeste» / «crepúsculo» / «de noche» */
export const estadoSol = s => s.alt > 0 ? `sol a ${Math.round(s.alt)}° por el ${RUMBO(s.az)}` : s.alt > -6 ? 'crepúsculo' : 'de noche';

/** Texto del chip de la portada */
export const textoChip = () => { const m = minutoAhora(); return `Ahora en A Castiñeira · ${hhmm(m)} · ${estadoSol(sol(fechaDe(m)))}`; };

/** La lectura de la barra de hora del claro (texto para leer, igual que lo que se ve) */
export function lectura(m) {
  const s = sol(fechaDe(m)), a = Math.round(s.alt), r = RUMBO(s.az);
  const cab = DIA.sale != null ? `Hoy en A Castiñeira el sol sale a las ${hhmm(DIA.sale)} y se pone a las ${hhmm(DIA.pone)}. ` : '';
  return cab + (s.alt < -6 ? `A las ${hhmm(m)} es de noche: se ve la luz de la casa, sola en su claro, y las estrellas sobre la sierra.`
    : s.alt < 0 ? `A las ${hhmm(m)} es el crepúsculo: la sierra ya está en sombra y el claro guarda la última luz.`
    : s.alt < 12 ? `A las ${hhmm(m)} el sol está bajo, a ${a}° por el ${r}: las sombras largas dibujan cada muro y cada loma.`
    : s.alt < 35 ? `A las ${hhmm(m)} el sol está a ${a}° por el ${r}. Las laderas que miran al norte quedan en sombra.`
    : `A las ${hhmm(m)} el sol está alto, a ${a}° por el ${r}, y el claro está entero a la luz.`);
}
