# Secciones · «Dibuja mi mapa» y «Un año en la casa»

Lo hace el agente de Secciones (ver `ENCARGO.md` → «Contrato web ↔ Secciones»). Parten de las piezas C y D del tablero (`../caserio-da-castineira-montederramo-bocetos/partes/c.*`, `d.*`), pasadas a las letras y los tokens de la web.

## Qué hay

| Fichero | Qué es |
|---|---|
| `partes/mapa.html` | `<section id="mapa" class="mapa" aria-labelledby="t-mapa">` completa. Lleva en texto las siete rutas y los dos días sin mochila (`<details>` «en texto»): **de ahí lee el guion las cifras de Manolo** (`data-km`, `data-desnivel`, `data-salida`, `data-gustos`). |
| `partes/anio.html` | `<section id="anio" class="anio" aria-labelledby="t-anio">` completa. Los doce meses están en la lista `#anio-meses` (textos revisados de `d.js` del tablero, tal cual); el guion los lee de ahí y, sin guion, se ven como lista. Fichas «Fiestas y feria» y «Vales regalo» (cita del blog). |
| `css/mapa.css`, `css/anio.css` | Todo bajo `#mapa` / `#anio`. Usan los tokens de la web (`--papel`, `--tinta`, `--cal`, `--alba-texto`, `--puerta`, `--noche-2`, `--luz`, `--alba`…) con su valor de reserva, y las letras por nombre: Instrument Serif, Geist, Geist Mono; Reenie Beanie **solo dentro del mapa**. Botones propios (`.mapa-opcion`, `.mapa-accion`, `.anio-boton`), no dependen de `.btn`. |
| `js/mapa.js`, `js/anio.js` | IIFE, sin globales, con `defer`. Se localizan con `document.currentScript` (la ruta a `img/mapa/` sale de ahí, sirve igual en la raíz que en `pruebas/`). |
| `img/mapa/` | `papel-1800` y `papel-3600` en AVIF/WebP/JPG (el relieve en papel con curvas de nivel) y `rutas.json` (trazados, perfiles, minutos y lugares). |
| `scripts/mapa.py` | Genera todo `img/mapa/`. |
| `pruebas/sec-*` | Banco, pruebas y capturas (puerto **8796**). |

## Cómo funciona

**Dibuja mi mapa.** Días (1–3), «cuánto te apetece andar» (tope de desnivel: suave 420 m, normal 780 m, con ganas 1.100 m) y gustos → plan día a día (si no hay rutas que encajen, días sin mochila: pueblos y monasterios con sus pines en el mapa, o termas). Las rutas se dibujan a mano (temblor, flechas rojas, número en la salida, leyenda, «aquí dormimos»), el mapa viaja hasta lo elegido y pulsar una tarjeta (botón de verdad: ratón, Enter o Espacio) acerca su ruta y apaga las demás. El perfil de altura es un `role="slider"`: con el ratón, el dedo o las flechas mueve un punto rojo por el mapa. «Descargar mi mapa (PNG)» baja un PNG de 1.800 px con `<a download>` (título, leyenda, créditos de OSM e IGN, «ejemplo: el de verdad lo dibuja Manolo»); «Verlo en grande» lo enseña en un `<dialog>` con su enlace de descarga. El plan se anuncia entero en un `aria-live` (visible solo el total: «2 días · 36,3 km · +1.269 m andando»).
- **Carga perezosa:** `rutas.json` y el papel se piden cuando la sección está a 900 px; se dibuja al verse. El formato del papel lo elige el navegador con un `<picture>` en memoria (AVIF → WebP → JPG) y la misma URL pasa al `<image>` del SVG desde la caché. Primero el de 1.800; el de 3.600 solo cuando el acercamiento lo pide (móviles con pantalla densa, casi siempre) y siempre para el PNG.
- **Cifras:** km y desnivel, los de Manolo (blog, 21-06-2021), sacados del HTML; trazados de OpenStreetMap (aproximados); perfil y alturas, del MDT25 sobre el trazado de OSM (el km del perfil se dice «aprox.»); minutos en coche, OSRM, «por confirmar».

**Un año en la casa.** Reloj de doce meses (un solo tabulador; dentro, flechas, Inicio y Fin), empieza en el mes de hoy (marcado «hoy»). Al cambiar de estación funde entre las cuatro fotos de la casa (nieve, prado, puerta, atardecer: sin mezclas fijas). Lo que cae del cielo según la estación: nieve, pétalos, polvo dorado, hojas (canvas, se para fuera de pantalla y con la pestaña oculta). «Pasar el año» (calla el `aria-live` mientras pasa) e «Ir a hoy».

**Movimiento reducido:** el mapa sale dibujado y encuadrado al momento, sin viajes ni trazos; el año sin partículas, sin fundidos y sin «Pasar el año». **Densidad sobria** (`html.densidad-sobria`): el año sin partículas (vigila la clase en vivo). **Barra del móvil:** solo se repinta si cambia el **ancho** (el mapa guarda el último ancho; el reloj mide su ancho; el canvas solo rehace partículas si cambia el ancho). **Sin JS:** las rutas en texto, los doce meses en lista y la foto de otoño.

## Datos y cómo regenerar

Fuentes en `../caserio-da-castineira-montederramo-bocetos/ref/`: `rutas_proc.json` (OSM), `coche.json` (OSRM), `lugares.json`, `terreno/mdt25-ribeira.tif` (MDT25 © IGN, CC BY 4.0). Caja lat 42,20–42,50 · lon −7,80 – −7,25.

```
python -I scripts/mapa.py      # desde la carpeta de la web; numpy, opencv-python, Pillow; AVIF/WebP con sharp vía node
```

Pesos: papel 1800 AVIF 337 KB (WebP 390), papel 3600 AVIF 554 KB (WebP 856), `rutas.json` 29 KB. Si cambia una cifra de Manolo o un texto de ruta, se cambia en `partes/mapa.html` (no en el script). Los meses, en `partes/anio.html`.

## Pruebas

```
node pruebas/sec-probar.mjs     # 57/57; monta pruebas/sec-banco.html y sirve en el 8796
node pruebas/sec-capturas.mjs   # capturas 1440 / 390 / 360 en pruebas/sec-*.png
```

El banco (`pruebas/sec-banco.html`, generado: no se edita) carga las dos partes con los tokens de la web y las fotos de `img/fotos/fotos.json` (si faltara alguna, usa la original del tablero). Comprueba: selectores bajo `#mapa`/`#anio`, letras, contrato de las partes, fotos existentes, pesos, carga perezosa, sin globales, AVIF, dibujo (flechas, números, leyenda, casa, Reenie Beanie), cifras de Manolo y minutos OSRM en las tarjetas, días/nivel/gustos, foco por teclado, perfil (ratón y flechas), descarga PNG 1800 px, visor y Escape, contrastes ≥ 4,5:1, el año (mes de hoy con reloj fijado en marzo, fotos, partículas, enero, flechas, fundido, «Pasar el año», «Ir a hoy», fiestas y vales, densidad sobria), móvil 390 y 360 (sin desbordes, reloj sin pisar la carta, botones ≥ 32 px, barra del móvil sin repintar), movimiento reducido, sin JS y, si `index.html` ya lleva las partes de ahora, una pasada en la página de verdad. Cierra siempre el navegador en un `finally`.

## Pide a la web

- **Nada imprescindible.** Las cuatro fotos del año existen ya en `img/fotos/fotos.json` con los nombres que uso: `nieve` (booking/5382945), `prado` (booking/5378491), `puerta` (booking/11815341), `atardecer` (blog/b03). `atardecer` solo llega a 1.080 px: en escritorio ancho se ve algo blanda; si hay otra foto de la casa en otoño más grande, mejor.
- La web ya carga Reenie Beanie y Geist 400/500/600 (no uso 700).
- `--alba-texto` de la web (`#a2501c`) da 4,8:1 sobre `--cal`: vale; mis textos con ese color son pequeños (antetítulo, «Acercar en el mapa»).
- Que `verificar.mjs` no cuente como desborde la cinta adhesiva del mapa (`.mapa-cinta`, rotada, asoma 10–18 px fuera del papel, dentro del margen de la sección).

## Supuestos y pendientes (para `PENDIENTES.md`)

- Trazados de OSM aproximados: antes de publicar, que Manolo los repase con los suyos (Wikiloc).
- PR-G 178 (55 min) y PR-G 180 (48 min) superan los «menos de 45 minutos» del blog según OSRM: por eso no se repite esa frase.
- Fiestas y feria (12 y 28 de cada mes; San Roque y la Asunción, 14–16 ago; los Remedios, 8 sep; magosto en noviembre): calendario de Montederramo, por confirmar con Manolo.
- El PNG pesa unos 4 MB (1.800 px con el relieve): es PNG porque así se pidió; un JPG pesaría un 80 % menos.
