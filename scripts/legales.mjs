/* Genera los *.src.html de las páginas legales y el 404 con una plantilla común.
   Uso: node scripts/legales.mjs  (después, node construir.mjs)
   El titular y el NIF no aparecen en ninguna fuente: van como PENDIENTE visible. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const TITULAR = `<p class="aviso">PENDIENTE: nombre o razón social del titular y NIF/CIF (no aparecen en ninguna fuente pública; el propietario que citan los portales es Manuel Rolán Díaz).</p>
<dl>
  <dt>Nombre comercial</dt><dd>Caserío da Castiñeira</dd>
  <dt>Domicilio</dt><dd>A Castiñeira, 1 · Sas do Monte · 32751 Montederramo (Ourense)</dd>
  <dt>Teléfono</dt><dd><a href="tel:+34609314235">609 31 42 35</a> (móvil y WhatsApp) · <a href="tel:+34988292124">988 29 21 24</a></dd>
  <dt>Correo</dt><dd><a href="mailto:info@acastineira.com">info@acastineira.com</a></dd>
</dl>`;

const paginas = {
  'aviso-legal': {
    titulo: 'Aviso legal',
    cuerpo: `
<p>En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), estos son los datos del titular de esta web:</p>
${TITULAR}
<p>Establecimiento de turismo rural (casa de turismo rural) inscrito en el Registro de Empresas y Actividades Turísticas de Galicia con el número <b class="nw">TR-OR-000017</b>.</p>
<h2>Uso de la web</h2>
<p>Esta web informa sobre Caserío da Castiñeira y enseña cómo sería la reserva directa. Quien la usa se compromete a hacerlo de buena fe y conforme a la ley.</p>
<p>Por ahora, el motor de reservas es una demostración: las fechas ocupadas son de ejemplo, los precios son orientativos (se indica junto al motor) y no se envía, guarda ni cobra nada.</p>
<h2>Propiedad intelectual</h2>
<p>Los textos y las fotografías son del titular (muchas, de su blog) o se usan con su permiso. No se pueden reproducir sin autorización.</p>
<p>El relieve (modelo MDT05) y la ortofoto PNOA son © <a href="https://www.ign.es">Instituto Geográfico Nacional</a>, con licencia CC BY 4.0. Los lugares, las rutas, los aerogeneradores y los tiempos en coche se han calculado con datos de <a href="https://www.openstreetmap.org/copyright">© colaboradores de OpenStreetMap</a> (licencia ODbL) y el servicio OSRM.</p>
<h2>Responsabilidad</h2>
<p>Las distancias, los tiempos de viaje, la altitud y la posición del sol son aproximados. Los enlaces a otras webs (Google Maps, Booking.com) llevan a servicios de terceros con sus propias condiciones.</p>
<h2>Ley aplicable</h2>
<p>Estas condiciones se rigen por la ley española. Para cualquier reclamación, escríbenos o llámanos: buscaremos siempre una solución amistosa.</p>`,
  },
  privacidad: {
    titulo: 'Política de privacidad',
    cuerpo: `
<h2>Responsable</h2>
${TITULAR}
<h2>Qué datos tratamos y para qué</h2>
<p>Solo los que nos das al hacer una consulta o una reserva (por teléfono o correo): nombre, móvil, correo, fechas, número de personas y lo que quieras contarnos. Los usamos para contestarte y, si reservas, para gestionar tu estancia.</p>
<p>El motor de reservas de esta web es, por ahora, una demostración: lo que escribas en él no sale de tu navegador ni se guarda.</p>
<h2>Base legal y plazos</h2>
<p>La base es tu consentimiento al escribirnos y, si reservas, la ejecución del contrato de alojamiento. Conservamos los datos el tiempo necesario para atender la consulta y, en las reservas, los plazos que exige la ley (incluido el registro de viajeros).</p>
<h2>Con quién se comparten</h2>
<p>Con nadie, salvo obligación legal.</p>
<h2>Tus derechos</h2>
<p>Puedes pedir el acceso, la rectificación, la supresión, la oposición, la limitación o la portabilidad de tus datos en <a href="mailto:info@acastineira.com">info@acastineira.com</a>. Si crees que no se han respetado, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es">aepd.es</a>).</p>
<h2>Lo que guarda esta web en tu navegador</h2>
<p>Una sola cosa: <code>castineira-cookies</code> en el almacenamiento local, para recordar que ya has visto el aviso de cookies. Más detalles en <a href="cookies.html">cookies</a>.</p>`,
  },
  cookies: {
    titulo: 'Política de cookies',
    cuerpo: `
<p>Esta web no usa cookies propias de análisis ni de publicidad.</p>
<h2>Lo que se guarda en tu navegador</h2>
<ul>
  <li><b>castineira-cookies</b> (almacenamiento local): recuerda que has visto el aviso, para no enseñártelo en cada visita. Es técnica y no caduca sola; puedes borrarla desde tu navegador.</li>
</ul>
<h2>Servicios de terceros</h2>
<ul>
  <li><b>Google Fonts</b>: las letras de la web (Instrument Serif, Anybody, Geist, Geist Mono y Reenie Beanie) se cargan desde los servidores de Google, que reciben tu dirección IP.</li>
  <li><b>Google Maps</b>: el mapa de «Cómo llegar» solo se carga si pulsas «Ver el mapa». A partir de ese momento, Google puede instalar sus cookies.</li>
</ul>
<p>El relieve en 3D, sus datos del IGN y la librería que lo dibuja (Three.js) van en esta misma web: no llaman a ningún servidor de fuera. El mapa de rutas y su descarga se generan en tu navegador.</p>
<p>Puedes volver a ver el aviso desde «Preferencias de cookies», en el pie de la portada.</p>`,
  },
  accesibilidad: {
    titulo: 'Declaración de accesibilidad',
    cuerpo: `
<p>El titular se compromete a que esta web sea accesible conforme al Real Decreto 1112/2018, de 7 de septiembre, y a la norma UNE-EN 301 549 (nivel AA de las WCAG 2.1).</p>
<h2>Situación de cumplimiento</h2>
<p class="aviso">PENDIENTE: completar tras la revisión de accesibilidad previa a la publicación.</p>
<p>La web se ha construido para poder usarse entera con el teclado y con lector de pantalla: contrastes de al menos 4,5:1, foco visible (con la forma de un marco de ventana), textos alternativos en las fotos, formularios con etiquetas y animaciones que se desactivan si tu sistema pide reducir el movimiento. Si tu equipo no puede con el relieve en 3D, se enseña el mismo sitio en plano.</p>
<h2>Contacto</h2>
<p>Si encuentras una barrera, escribe a <a href="mailto:info@acastineira.com">info@acastineira.com</a> o llama al <a href="tel:+34609314235">609 31 42 35</a>. Te responderemos y te daremos la información en un formato accesible.</p>`,
  },
};

const cabeza = (titulo) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex, nofollow">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo} · Caserío da Castiñeira</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap">
<link rel="stylesheet" href="css/legal.css">
<link rel="icon" href="img/marca/favicon.svg" type="image/svg+xml">
<link rel="icon" href="img/marca/favicon-32.png" sizes="32x32" type="image/png">
</head>`;

const arco = `<svg class="legal-ventana" viewBox="0 0 30 38" aria-hidden="true"><rect class="m" x="1" y="1" width="28" height="36" rx="1"/><rect x="3.5" y="3.5" width="10.5" height="14.5"/><rect x="16" y="3.5" width="10.5" height="14.5"/><rect x="3.5" y="20" width="10.5" height="14.5"/><rect x="16" y="20" width="10.5" height="14.5"/></svg>`;

for (const [nombre, p] of Object.entries(paginas)) {
  const html = `${cabeza(p.titulo)}
<body>
<header class="legal-cab">
  <div class="env">
    <a class="legal-marca" href="index.html">${arco}<span>Caserío <i>da</i> Castiñeira</span></a>
    <a class="volver" href="index.html">Volver a la portada</a>
  </div>
</header>
<main class="legal">
  <div class="env">
    <h1>${p.titulo}</h1>
${p.cuerpo}
  </div>
</main>
<footer class="legal-pie">
  <div class="env">
    <a href="aviso-legal.html">Aviso legal</a>
    <a href="privacidad.html">Privacidad</a>
    <a href="cookies.html">Cookies</a>
    <a href="accesibilidad.html">Accesibilidad</a>
  </div>
</footer>
</body>
</html>
`;
  fs.writeFileSync(path.join(RAIZ, `${nombre}.src.html`), html);
  console.log(`${nombre}.src.html`);
}

// 404: rutas absolutas al repo para que funcione en cualquier ruta de GitHub Pages
const BASE = '/caserio-da-castineira-montederramo-web/';
fs.writeFileSync(path.join(RAIZ, '404.src.html'), `${cabeza('Página no encontrada').replace(/href="(css|img)\//g, `href="${BASE}$1/`)}
<body class="no-hay">
  <main class="no">
    <svg class="no-ventana" viewBox="0 0 30 38" aria-hidden="true"><rect class="m" x="1" y="1" width="28" height="36" rx="1"/><rect x="3.5" y="3.5" width="10.5" height="14.5"/><rect class="apagado" x="16" y="3.5" width="10.5" height="14.5"/><rect x="3.5" y="20" width="10.5" height="14.5"/><rect class="apagado" x="16" y="20" width="10.5" height="14.5"/></svg>
    <h1>Por esta ventana <i>no se entra</i>.</h1>
    <p>La página que buscas no existe o ha cambiado de sitio.</p>
    <a class="btn" href="${BASE}">Volver a la portada</a>
  </main>
</body>
</html>
`);
console.log('404.src.html');
