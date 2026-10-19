# Caserío da Castiñeira · Montederramo · «A 917 metros, una casa en su claro»

Web nueva para Caserío da Castiñeira (A Castiñeira, 1 · Sas do Monte · 32751 Montederramo, Ourense), la casa rural de Manolo Rolán. Es una **propuesta**: hoy su web es un blog de Blogger (`turismoruralvegano.com`) y `acastineira.com` no responde. Solo castellano. **En local, sin publicar.** `noindex, nofollow` en todas las páginas.

- **Encargo aprobado:** `ENCARGO.md` (B de portada, la voz «Somos…» de A, C y D como secciones).
- **Datos y fuentes:** `../caserio-da-castineira-montederramo-bocetos/DATOS-CASERIO-DA-CASTINEIRA.md`. Lo que no está ahí no se afirma: va a `PENDIENTES.md`.
- **Tablero:** https://claude.ai/artifact/LRNXPoDgT3KPFbKwUnsgup
- **Tres agentes:** la web (esto: HTML, CSS, `js/main.js`, motor, fotos, legales, pruebas); el **3D** (`js/3d/`, `css/3d.css`, `img/terreno/`, `scripts/terreno.py`, `pruebas/3d-*`; ver `js/3d/LEEME.md`); y **Secciones** («Dibuja mi mapa» y «Un año en la casa»: `partes/`, `js/mapa.js`, `js/anio.js`, `css/mapa.css`, `css/anio.css`, `img/mapa/`, `scripts/mapa.py`, `pruebas/sec-*`; ver `partes/LEEME.md`).

## Concepto

La foto nocturna de la casa: una ventana encendida en la noche de la sierra. El logo de la casa (192 × 75 px) **no se redibuja**: en la cabecera va el nombre en Instrument Serif; el motivo es la ventana de cuatro cristales.

1. **Cortina:** noche (`--noche`). Una ventana de cuatro cristales se enciende poco a poco, con parpadeo de bombilla vieja (3 → 1 → 4 → 2); a 1,75 s el cristal de arriba a la derecha se vuelve hueco y la ventana crece ×34 desde él: **entramos por ese cristal** a la portada. Muro SVG con `evenodd` y capa sin fondo propio. Al empezar a crecer: `cortina-fuera` en `<html>` y `castineira:cortina-fuera` (el 3D arranca con eso). Web Animations, sin librerías. Se retira siempre: sin JS, con movimiento reducido (ni un fotograma) y con red de seguridad inline a los 7 s.
2. **Portada:** el vuelo 3D de la sierra al tejado (del 3D) sobre el póster; «A 917 metros, *una casa en su claro*», altímetro (Pena da Cruz 1.289 m · Casa 917 m · Valle 488 m), chip de la luz de ahora, pausa, pista del gesto y la **reserva rápida** (llegada, salida, personas → motor).
3. **Capítulos «Somos hogar», «Somos fuego», «Somos lo que comemos»:** la voz de su blog. Cada palabra en Anybody de ancho variable, **con la foto dentro de las letras** (puerta roja, fuego, desayuno: cada letra lleva su trozo, recolocado al cambiar de ancho) y las letras que **se ensanchan hacia el puntero o el dedo**. **El fondo de la página toma el color de la pared** del capítulo que se lee (mostaza → teja → verde, y el texto pasa a blanco en la teja). Detox «próximamente», con los precios marcados como de su blog.
4. **Cinco alojamientos:** fichas de casasrurales.net (plazas y «desde» por persona, marcado «de un portal, sin fecha»), galería de 15 fotos **sin asignar**, «Lo que hay que saber» y «Ver fechas» de cada uno → motor con ese alojamiento y su primer fin de semana libre.
5. **«Dibuja mi mapa»** y 6. **«Un año en la casa»** (Secciones; se incluyen con `<!--parte:…-->`).
7. **Manolo:** su mapa a mano (sin foto de su cara), su frase de Booking, «80 cm» de TVE, idiomas.
8. **El claro en 3D** (`#claro`, del 3D) y **«A cuántos minutos»** (10 lugares de OSRM, «por confirmar»; sin el «cañón a 10 minutos»).
9. **Opiniones:** Booking 9,2 (130) con el desglose y cuatro frases literales sin nombre (Booking y Escapada Rural). Sin Google ni Tripadvisor.
10. **Reserva** (motor de demostración, abajo). 11. **Cómo llegar:** dirección, dos teléfonos y el correo como texto seleccionable, mapa de Google (en las coordenadas) solo al pedirlo.
12. **Pie: la ventana se completa.** En la cabecera, la ventana pequeña enciende un cristal por cada cuarto de lectura; en el pie, la ventana entera se enciende cristal a cristal sobre el muro de noche, con sus contraventanas rojas.

### Nivel §5 bis

| Obligatoria | Cómo se cumple |
|---|---|
| Romper la fórmula | **Fuera:** cursor propio, pila sticky, Lenis y GSAP. **Propias:** la cortina por el cristal, las palabras con la foto dentro que se estiran hacia el dedo, la página que cambia de pared, la ventana de lectura. |
| Gesto táctil del hero | Lo da el 3D: arrastrar de lado mueve el vuelo; el dedo vertical hace scroll. Pista «Desliza de lado para volar» solo con 3D. (Y en los capítulos, las letras siguen al dedo.) |
| El objeto se completa en el pie | La ventana de la cabecera se enciende al leer; en el pie, entera y encendida. |
| Foco con la forma del motivo | `:focus-visible` con **doble línea** de 4 px y esquinas rectas: un marco de ventana. |
| Rendimiento medido | Ver «Rendimiento». |

**Menú opcional elegido: dato en vivo real** (la luz y el sol de ahora en A Castiñeira, del 3D). Solo se guarda en el navegador la marca del aviso de cookies.

### Paleta y letras

`--noche #080d18` (cortina, portada, claro, pie) · `--noche-2 #101a2e` (opiniones) · `--alba #f0a36a` (acento sobre oscuro) y `--alba-texto #964514` (sobre claro: 5,6:1 en cal, 5:1 en cal-2) · `--luz #f3e8d8` · `--cal #f1ebdd` / `--cal-2 #e7dfcd` · `--granito #1f1e1c` · paredes `--mostaza #e3a92a`, `--teja #c2502d`, `--verde #8da02c` (y sus versiones oscuras para la «Sobria») · `--puerta #a3281b` (botón principal: la puerta roja) · `--papel` y `--tinta` (el mapa) · `--musgo #5aa646`. `verificar.mjs` mide 18 parejas de texto (≥ 4,5:1) y 3 de las palabras gigantes (≥ 3:1). **Letras** (Google Fonts, sin bloquear el pintado): Instrument Serif, Anybody (ancho variable), Geist, Geist Mono y Reenie Beanie (solo en el mapa).

## Cómo se trabaja

- **Edita siempre los `*.src.html`.** `node construir.mjs` genera los `.html`: incluye las partes (`<!--parte:partes/mapa.html-->`), pone el póster y el plano del 3D con lo que haya en `img/terreno/` (`<picture>` y precarga si hay AVIF), expande `<img data-foto>` a `<picture>` AVIF/WebP/JPG, enlaza el CSS y el JS de los otros agentes **solo si existen** (`<!--css:…-->`, `<!--js:…-->`, `<!--modulo:…-->`) y pone `?v=<huella>` (`versionar.mjs`). **Vuelve a construir cuando el 3D o Secciones cambien algo** (`verificar.mjs` avisa si `index.html` se ha quedado viejo).
- **Fotos:** `scripts/fotos-lista.json` + `node scripts/fotos.mjs` (de Booking y del blog, en la carpeta de bocetos; saturación ×0,72–0,95, la de dentro más baja; **nunca amplía**). Fuera: el logo, los carteles, las miniaturas y la foto de la familia en la escalera.
- **Legales y 404:** `node scripts/legales.mjs` y después `node construir.mjs`. **Marca:** `node scripts/marca.mjs` (favicons con la ventana y `img/og.jpg` con la foto nocturna).
- **`node verificar.mjs [--capturas]`** (puerto **8797**): archivos, noindex, ids, contratos con el 3D y con Secciones, textos (sin recuentos, sin notas inventadas, sin «10 minutos»), fotos (origen, nunca ampliadas), cortina (muestras, tres fotogramas congelados: encendiéndose, encendida y el cruce; la señal al empezar a crecer; movimiento reducido, sin JS, sin `main.js`), portada sin y con 3D (ventana pequeña), reserva rápida → motor, capítulos (letras, foto dentro, estirarse hacia el puntero, la pared de cada capítulo), alojamientos, las partes y **la web sin ellas** (`__sin-partes.html`), Manolo, minutos, opiniones, motor completo, cookies en 4 pasos, cabecera y pie, mapa, móvil a 360/375/390/768, menú y barra fija, barra del navegador (0 rehechos), densidades y **receta de borrado del mando**, foco, contraste y legales. El 3D va bloqueado en casi todas las pruebas y el navegador se cierra siempre.
- **`node scripts/rendimiento.mjs [--sin3d] [--pasadas=N] [--bloquea=js/main.js]`** (puerto **8799**) y **`node scripts/capturas.mjs [esc|mov|360] [--reducido] [--sinjs] [--sobria] [--sin3d]`** (puerto 8797, capturas en `pruebas/`).

## Mando de densidades (solo con `?revision`)

- **«Somos»** (cargada): foto dentro de las letras, letras que se estiran, la página que cambia de pared por capítulo, partículas del año.
- **«Sobria»:** palabras lisas en su color (mostaza y verde oscurecidos para leerse sobre cal), fondo fijo, sin fotos en las letras ni estiramiento, el año sin partículas. **Añade** la tabla «La casa, de un vistazo».
- Sin `?revision` no se ve el mando ni se aplica ninguna densidad. No guarda nada en el navegador (va en la URL).

### Receta de borrado del mando

1. En `index.src.html`: el bloque `<!-- MANDO DE MAQUETA: solo con ?revision` … `<!-- fin del MANDO DE MAQUETA -->`, el bloque `<!-- MANDO DE MAQUETA: la tabla` … `<!-- fin de la tabla del MANDO DE MAQUETA -->` y, en el script del `<head>`, las líneas entre `// MANDO DE MAQUETA` y `// fin del MANDO DE MAQUETA`.
2. Opcional: `12. MANDO DE MAQUETA` en `js/main.js` y `.mando`, `.vistazo` y el apartado 17 de `css/estilos.css`.
3. `node construir.mjs`. `verificar.mjs` comprueba que sin esos bloques la web va igual.

## Motor de reservas (demostración)

Calendario de 2 meses (1 en móvil) con días **libres, con pocos y completos por alojamiento**: cada uno tiene su ocupación inventada (determinista por fecha); con uno elegido, el calendario enseña sus días. Elegir alojamiento y personas (**tope = capacidad** de lo elegido); si el grupo no cabe, **propuesta** con lo que está libre esas noches (uno que baste o varios) y «Usar esta propuesta». **La casa entera:** hasta 16 personas, solo noches sin nadie, «precio a consultar». Casillas «Viajo con perro (gratis)» y «Cenas veganas (se reservan con un día de antelación; precio por confirmar)». Pasos fechas → datos (llegada 15:00–22:00) → confirmación con localizador `CAS-AAMMDD-NNN`. **No envía, guarda ni cobra nada, y lo dice.**

**Supuestos (marcados junto al motor):** los «desde» por persona y noche de casasrurales.net (sin fecha: 18, 22, 20, 17 y 18 €) para todas las noches; la ocupación, inventada; el total reparte el grupo empezando por el alojamiento más grande; «pago en la casa» (Booking: solo efectivo; un motor real pediría tarjeta o Bizum); el precio de las cenas y de la casa entera, por confirmar.

## Rendimiento (2026-10-19)

`node scripts/rendimiento.mjs --pasadas=5`: Pixel 7 emulado (412 × 915, DPR 2,625), 4G lento (1,6 Mbps, 150 ms), CPU ×4, sin caché, gzip como GitHub Pages, **con el 3D cargando detrás**:

| Pasada | LCP | La cortina arranca | La ventana crece | Peticiones / peso |
|---|---|---|---|---|
| 1 | 1,60 s | 2,43 s | 4,20 s | 24 · 1.491 KB |
| 2 | 1,37 s | 1,88 s | 3,65 s | 24 · 1.491 KB |
| 3 | 1,46 s | 1,88 s | 3,66 s | 24 · 1.491 KB |
| 4 | 1,41 s | 1,93 s | 3,71 s | 24 · 1.491 KB |
| 5 | 1,37 s | 1,80 s | 3,57 s | 24 · 1.491 KB |

**LCP mediana 1,41 s** (objetivo ≤ 2,5 s). El elemento LCP es el párrafo de la portada, pintado debajo de la cortina. El peso incluye el 3D (Three.js autoalojado, relieve y ortofoto), que se pide después de `load`. Las fotos de las letras se piden al acercarse (700 px antes).

**Lo que queda:** una tarea larga de ~0,8 s antes de la primera pintura (con CPU ×4) que existe también sin `main.js` y sin el JS de las secciones: es el análisis, el estilo y el primer layout de la página entera (las dos partes van en línea). Si hiciera falta, `content-visibility` en las secciones de abajo, con cuidado (el 3D y las partes miden al acercarse). Con el equipo cargado (otros agentes con WebGL a la vez) las medidas suben a 4 s: medir con la máquina libre. Probar en un móvil real antes de enseñarla.

## Pendientes

Las preguntas para Manolo, en `PENDIENTES.md` (fuera del repo). Las que bloquean publicar: titular y NIF, el dominio y el correo, los teléfonos, el registro y el logo en vectorial. Después: qué foto es de qué alojamiento, plazas (22 en las fichas, 16 en total), precios y temporadas, la casa entera, el pago con tarjeta o Bizum, quién cocina y el precio de las cenas, el detox, si Manolo quiere salir con nombre, las rutas y las fiestas, y una sesión de fotos.

## Para publicar

`noindex` en todas las páginas mientras no venda. Fuera del repo: `pruebas/*` (salvo `pruebas/3d-*.mjs`, `pruebas/3d-banco.html`, `pruebas/sec-*.mjs` y `pruebas/sec-banco.html`), `PENDIENTES.md` y `ENCARGO.md`. El 404 usa rutas absolutas `/caserio-da-castineira-montederramo-web/` (en local da 404 a propósito). Tras publicar, avisar de Ctrl+F5.
