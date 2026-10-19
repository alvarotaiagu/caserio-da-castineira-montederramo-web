# El 3D del claro · Caserío da Castiñeira

Dos piezas con una sola escena: el **vuelo de la portada** (desde la sierra de A Pena da Cruz hasta el tejado de la casa, con la luz de ahora) y **«El claro en 3D»** (vista libre, hora del día, «Bajar a la casa», «Aerogeneradores», rótulos, En 3D / En plano). Relieve MDT05 y ortofoto PNOA del IGN (CC BY 4.0), altura ×1,8; la finca en foto aérea fina; 56 aerogeneradores de OpenStreetMap con las palas girando. Puntos de partida: el 3D de la hermana (`../caserio-de-fontes-nogueira-web/js/3d/`, arquitectura, rendimiento y pruebas) y la escena del tablero (`../caserio-da-castineira-montederramo-bocetos/partes/tres.html`).

## Ficheros

| Fichero | Qué hace |
|---|---|
| `arranque.js` | Lo único que carga la web. Espera a `load` + tiempo libre; mira WebGL2 y el ahorro de datos; escribe el chip; monta el vuelo al acercarse a `#vuelo` (y tras la cortina) y el claro al acercarse a `#claro` (700 px antes). Si algo falla: `sin-3d`. Lleva `VERSION`. Expone `window.CASTINEIRA_3D` (estado, motor, vuelo, claro). |
| `sol.js` | Sol con las fórmulas de SunCalc para 42,31216 N 7,44980 O, hora de Madrid, salida y puesta de hoy, textos del chip y de la lectura, `metros()` («1.289 m»: `Intl` en español no separa los miles de cuatro cifras). Sin Three.js. `?ahora3d=2026-10-19T16:30` fija «ahora» (pruebas y póster). |
| `escena.js` | La escena compartida: carga los datos, crea **un solo** renderer y muda su `<canvas>` a la vista que se ve. Relieve con la **finca mezclada en el propio sombreador** (un muestreo más, bordes difuminados), cantos de maqueta, aguja de la casa (se funde al acercarse), luz y brillo de la ventana de noche, **aerogeneradores en dos mallas instanciadas** con balizas rojas de noche, sol con sombras, cielo, bruma, estrellas, calidad automática, bucle «al ralentí» para las palas, proyección de rótulos con la cuenta de `object-fit: cover`. |
| `vuelo.js` | Portada: curva `CatmullRomCurve3` (puntos de `terreno.json`), nunca a menos de 70 m del suelo ni entre las palas, altímetro, rótulos «A Pena da Cruz» y la casa, encuadre final con la casa arriba a la derecha (apaisado) o arriba (vertical), pausa (para también las palas), gesto de arrastre, movimiento reducido. |
| `claro.js` | El claro: OrbitControls sobre `#claro-lienzo`, «Mover el mapa» en táctil, teclado, «Bajar a la casa» / «Volver a la sierra» (viaje de 2,6 s por un arco), «Aerogeneradores» (`aria-pressed`, solo en esta vista), barra de hora y momentos, lectura (`aria-live`, se escribe al parar la barra), En 3D / En plano con rótulos sobre la imagen. |
| `vendor/` | Three.js r160 (`three.module.min.js`) y `OrbitControls.js` con el import reescrito a `./three.module.min.js`, copiados de Fontes (que los bajó de `cdn.jsdelivr.net/npm/three@0.160.0/`). Sin CDN en tiempo de ejecución. |
| `../../css/3d.css` | El canvas, el fundido póster → canvas, el cursor del arrastre, el foco del lienzo y los rótulos `.rotulo3d`. |
| `../../scripts/terreno.py` | Datos → `img/terreno/`. |
| `../../pruebas/3d-*` | Banco, pruebas, póster, LCP y capturas (ver «Cómo se mide»). |

## Cómo se regeneran los datos

```
python -I scripts/terreno.py      # alturas, ortofotos, finca, plano, terreno.json (lugares, molinos y vuelo)
node pruebas/3d-poster.mjs        # pósteres: primer fotograma del vuelo, pintado con la propia escena
node construir.mjs                # (de la web) mete el <picture> del póster y el plano con sus medidas
```
y después **subir `VERSION` en `arranque.js`** (todo lo que pide el 3D lleva `?v=VERSION`; el `versionar.mjs` de la web ve el cambio de huella de `arranque.js`).

`terreno.py` lee las fuentes del tablero (`../caserio-da-castineira-montederramo-bocetos/ref/terreno/mdt5.tif`, `pnoa-4096.jpg`, `finca-pnoa.jpg` y `ref/osm.json`), caja lat 42,262–42,362 · lon −7,530 – −7,370 (13,2 × 11,1 km).

- **Lugares**: la casa, A Pena da Cruz (la cumbre de OSM, `ele` 1.289), Sas do Monte y el Mosteiro de Montederramo. **La casa se marca en sus tejados tal como salen en la foto aérea fina (42,31236 N, 7,44984 O)**: la coordenada de Escapada Rural (42,31216; −7,44980) cae unos 22 m al sur, en el prado, y al acercarse el rótulo quedaba fuera de los tejados. El sol sigue calculándose con la de Escapada Rural (la diferencia no se nota).
- **Aerogeneradores**: los 56 `power=generator` de OSM dentro de la caja, con la cota del MDT05 en su pie. OSM no da altura ni rotor: se dibujan con las medidas del tablero (torre de 144 unidades del mundo, palas de 40; el buje queda a unos 80 m en metros del altímetro) y mirando al suroeste ±12° (orientación de dibujo, no un dato).
- **El vuelo**: siete puntos. Empieza sobre la ladera norte de A Pena da Cruz a 1.730 m mirando al suroeste (cielo arriba, la fila de molinos a la izquierda, la meseta a la derecha); baja por la ladera noroeste en paralelo a los molinos (el más cercano a 409 unidades) y llega desde el estenordeste a 140 m de la casa y 88 m por encima del tejado (1.000 m en el altímetro). Ningún punto a menos de 90 m del suelo en 200 m a la redonda; en el navegador, nunca a menos de 70 m y, a menos de 260 unidades de un molino, por encima de la punta de sus palas.
- **Texturas con medidas que se dividen por 2 muchas veces** (ortofoto 3072 × 2560 y 2048 × 1792, finca 2048 × 1280 y 1536 × 960): ver trampas.
- **La finca**: misma gradación que la ortofoto y su color igualado (media y contraste por canal, al 70 %) al trozo de ortofoto que tapa, para que el borde difuminado no se note.

El póster se pinta con luz fija (19 de octubre, 16:30, sol a 29° por el suroeste) y con la calidad fija (`?calidad3d=fija`: con sombras aunque SwiftShader vaya lento). La escena viva pone la luz de ahora y entra fundida encima.

## Cómo funciona

1. La web carga `arranque.js` (módulo, al final del `<body>`). Nada pesado se pide antes de `load`: Three.js, texturas y alturas van después, en tiempo libre y con `priority: 'low'`.
2. Móvil (`pointer: coarse` o pantalla < 700 px): malla 256, ortofoto 2048 y finca 1536. Escritorio: malla 384, ortofoto 3072 y finca 2048. WebP y, si falla, JPG; decodificadas con `createImageBitmap` (fuera del hilo principal). Shaders con `compileAsync` y texturas subidas antes del primer fotograma, una por tiempo libre.
3. **Vuelo**: se monta cuando `#vuelo` está cerca **y** la cortina se ha ido (clase `cortina-fuera` o evento `castineira:cortina-fuera`; red de seguridad a los 6 s). Empieza en t = 0, que es exactamente el póster. 26 s de vuelo; al final, una deriva muy lenta alrededor de la casa (±4°). Al primer fotograma: `con-3d` en `#vuelo` y `castineira:3d-listo` (`detail.vista = 'vuelo'`).
4. **Claro**: al primer fotograma, `con-3d` en `#claro`, `#claro-carga` oculto y `castineira:3d-listo` (`detail.vista = 'claro'`).
5. **Una sola escena viva**: un `IntersectionObserver` decide qué vista se ve; el canvas se muda allí y se rehace el tamaño. Si no se ve ninguna o la pestaña está oculta, no hay bucle.
6. **Bucle a tres ritmos**: cada vista dice si se mueve la cámara (a toda velocidad, cuenta para la calidad), si solo giran las palas (**al ralentí, ~15 fps**, no cuenta para la calidad) o si no se mueve nada (se para). Las palas giran solo con movimiento, con los molinos a la vista y sin pausa; en plano, con los molinos quitados o con el vuelo en pausa, el bucle se para.
7. **La finca**: `onBeforeCompile` del material del relieve mezcla `finca-*.webp` donde caen sus coordenadas, con un fundido del 2 % al 22 % de cada borde (esquinas redondeadas). Sin malla aparte: ni z-fighting ni otra llamada de dibujo.
8. **Aerogeneradores**: `InstancedMesh` de torres (torre + góndola juntas) y otra de rotores (tres palas + buje juntos): dos llamadas de dibujo para los 56. Las palas giran rehaciendo 56 matrices por fotograma; solo las torres dan sombra (la de las palas no se rehace a cada vuelta). De noche, una baliza roja en cada buje que parpadea (fija con movimiento reducido). «Aerogeneradores» los quita **solo en el claro**: en la portada siguen (es la sierra de verdad).
9. **Luz**: posición real del sol en A Castiñeira, tabla de luz por altura del sol, estrellas de noche y luna aproximada (sur, 38°). De noche la casa enciende su luz: un foco cálido sobre el claro (`PointLight`, 520 de alcance) y el brillo de la ventana (sprite aditivo que de lejos queda en unos 8 px, visible desde la sierra). La sombra se rehace solo al cambiar el minuto (`shadowMap.autoUpdate = false`) o al quitar/poner los molinos.
10. **Aguja de la casa**: se funde entre 1.400 y 700 unidades de distancia; de cerca se ven los tejados, no un poste.
11. **Gesto de la portada (§5 bis)**: arrastrar de lado sobre la portada (ratón o dedo) mueve el vuelo; hacia la izquierda, adelante; el ancho de la portada son 3/5 del vuelo, con algo de inercia al soltar. Se decide en los primeros 8–10 px: si el dedo va en vertical, es scroll (`touch-action: pan-y` en la sección de la portada). Los botones, enlaces y el formulario no arrastran.
12. **Movimiento reducido**: sin vuelo, deriva, palas ni botón de pausa; el fotograma final quieto (los tejados). «Bajar a la casa» salta sin viaje. El altímetro (1.000 m) y el chip dicen la verdad igual. El arrastre sigue (lo mueve la persona).
13. **Sin 3D** (sin WebGL2, ahorro de datos, error, contexto perdido): `sin-3d` en `#vuelo` y `#claro`, se quita el canvas, se queda el póster, `#claro-carga` dice el motivo y el chip sigue con la hora y el sol.
14. **Altímetro**: `#altimetro-valor` = metros reales de la cámara con punto de miles (1.730 → 1.000 m); `#altimetro-aguja` con `style.top`: 1.289 m → 13 %, 488 m → 86 %, tope 0–100 % (al principio, por encima de la cumbre, topa arriba).
15. **Encuadre final**: en apaisado se mira a un punto desplazado para que la casa quede a ~63 % del ancho y ~42 % del alto (el titular ocupa la izquierda); en vertical lo hace el desplazamiento de la vista de Fontes (la casa queda en el tercio de arriba).
16. **Rótulos**: en el vuelo, «A Pena da Cruz · 1.289 m» mientras se vuela por la sierra y la casa al final, **justo encima de los tejados** (el alto del rótulo baja con la distancia); en el claro, casa, A Pena da Cruz, Sas do Monte y el Mosteiro de Montederramo («899 m · a 11 min»). Si dos chocan gana el primero de esa lista. En plano se colocan con la cuenta de `object-fit` de la imagen (contain o cover).

### Rendimiento

- Tope de densidad: 1,5 en móvil y 1,75 en escritorio. Antialias solo en escritorio.
- **Calidad automática**: media de 45 fotogramas seguidos en movimiento; por encima de 30 ms baja un escalón: densidad −0,25 hasta 1 → sin sombras → densidad 0,75. `CASTINEIRA_3D.motor.calidad` dice dónde está. Los fotogramas al ralentí no cuentan.
- Sombras 1024 en móvil, 2048 en escritorio.
- **Barra del móvil**: si solo cambia el alto menos de 160 px, no se rehace el búfer; el canvas cubre con `object-fit: cover` y los rótulos usan esa cuenta.
- **Campo de visión**: como en Fontes (apaisado, 42° en vertical; en vertical, 34° en horizontal fijos y el punto al que se mira sube 0,42 × ancho). El póster móvil (412 × 915) encaja por el ancho en cualquier teléfono y coincide con el primer fotograma.
- **Lo que añade esta escena y no hunde el móvil**: la finca es un muestreo de textura más en el sombreador (sin geometría); los 56 molinos son 2 llamadas de dibujo y unos 12.500 triángulos; el giro, 56 matrices por fotograma; al ralentí, 15 fps.

## Qué pesa

| | Móvil | Escritorio |
|---|---|---|
| Póster (LCP posible; antes de `load`) | `poster-vuelo-movil-900.avif` 41 KB (600: 25 KB) | `poster-vuelo-1920.avif` 100 KB (1280: 54 KB) |
| JS (gzip; después de `load`) | Three 162 KB + OrbitControls 6 KB + lo nuestro 21 KB = **189 KB** | igual |
| Ortofoto (después de `load`) | `orto-2048.webp` **539 KB** | `orto-3072.webp` **1.135 KB** |
| Finca (después de `load`) | `finca-1536.webp` **250 KB** | `finca-2048.webp` **459 KB** |
| Alturas | `alturas-256.bin` 128 KB | `alturas-384.bin` 288 KB |
| `terreno.json` | 3 KB | 3 KB |
| **Total del 3D tras `load`** | **≈ 1,1 MB** | **≈ 2,1 MB** |
| Plano (lazy, en `#claro`) | `plano.webp` 334 KB (`plano.jpg` 376 KB), 1400 × 1179 | igual |

Respaldos: `poster-vuelo.jpg` 92 KB (1280 × 720), JPG de la ortofoto 672 / 1.445 KB y de la finca 327 / 608 KB. Memoria de GPU: ortofoto + finca ≈ 27 MB en móvil (2048 × 1792 y 1536 × 960 con mipmaps) y ≈ 56 MB en escritorio; una malla de relieve y las dos instanciadas.

## Cómo se mide

Todo en el puerto **8798**, sobre el banco `pruebas/3d-banco.html` (el marcado del contrato con estilos mínimos y una cortina simulada: `?cortina=0` manda la señal al momento, `?cortina=N` a los N ms). Ventanas pequeñas (1024 × 640 en una pantalla de 1440 × 900, y Pixel 7) y el navegador siempre cerrado en un `finally`.

- `node pruebas/3d-probar.mjs` — **66 pruebas**: espera a la cortina, `con-3d` y evento, recursos solo tras `load`, malla, ortofoto y finca según el equipo, los 56 molinos en dos mallas instanciadas, el vuelo avanza, altímetro con punto de miles, chip, palas que giran y que se paran con la pausa, arrastre con ratón (adelante y atrás) y con el dedo, `touch-action`, **el vuelo nunca entre las palas ni a menos de 65 m del suelo** (300 poses reales de la cámara), **al final los tejados en el cuadro** (arriba a la derecha en apaisado, arriba en vertical), aguja oculta y rótulo, **altímetro 1.289 m → 13 %, 488 m → 86 %**, aguja visible y altímetro topado sobre la sierra, parada fuera de pantalla y con la pestaña oculta, calidad automática, el canvas se muda al claro y vuelve, rótulos, lectura, palas al ralentí, «Aerogeneradores» fuera (y sin bucle) y dentro, **«Bajar a la casa» y «Volver a la sierra»**, luz de la casa de noche y apagada de día, barra de hora, teclado, giro con ratón, En plano con el rótulo en su sitio y sin bucle, los molinos siguen en la portada aunque se quiten en el claro, tope de densidad en móvil, barra del móvil, «Mover el mapa», «Bajar» en móvil, movimiento reducido (sin vuelo ni palas; «Bajar» salta), **el póster coincide con el primer fotograma** (diferencia media < 4/255) y sin WebGL (`--disable-webgl`): póster, plano con mensaje, sin Three.js ni texturas, chip vivo, sin errores.
- `node pruebas/3d-poster.mjs` — los pósteres (ver arriba).
- `node pruebas/3d-lcp.mjs [ruta] [vueltas]` — LCP real (PerformanceObserver) con Pixel 7, 4G lento (1,6 Mbps / 750 kbps / 150 ms) y CPU ×4 por CDP, cargas intercaladas con el 3D bloqueado y sin bloquear.
- `node pruebas/3d-capturas.mjs [ruta]` — portada al principio, a mitad y al final, y el claro de lejos, en la casa, de noche (en la casa y en la sierra) y en plano, a 1280 y 390 → `pruebas/3d-final-*.png` (hojas: `3d-hoja-final-1280.jpg`, `3d-hoja-final-390.jpg`).

WebGL en headless: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` (va a ~10–18 fps: se mide que avanza, no la fluidez; ahí la calidad baja sola a «sin sombras»).

### Resultados (2026-10-19)

- Pruebas: **66/66** (dos pasadas seguidas).
- Póster ↔ primer fotograma: diferencia media 2,2/255 en escritorio y 0,9/255 en Pixel 7.
- LCP, página real (`index.html` construida por la web, 4 + 4 cargas): mediana **2.066 ms con el 3D bloqueado y 2.120 ms con el 3D** (cargas de 2,0 a 2,5 s en los dos lados). El elemento LCP es el párrafo de la portada (`P`), no el póster, y el primer pedido del 3D sale siempre después de `load` (y del LCP). La diferencia es ruido.
- Tareas largas tras `load` con el 3D: 1,6–2,1 s en total con CPU ×4 **y render por software**; no es representativo de un móvil con GPU. Afectan a la interacción de los primeros segundos, no al LCP.

## Trampas encontradas

Las nueve de Fontes siguen valiendo (`lostpointercapture`, `updateMatrixWorld` tras `lookAt`, el campo de visión del póster móvil, `touch-action` de OrbitControls, la rueda, nombres en desestructuraciones, el `IntersectionObserver` tardío, `con-3d` tras un fallo). Nuevas:

1. **Cruz clara en el centro del mapa por los mipmaps.** La ortofoto a escala de 4096 × 3498 (3072 × 2624) tiene niveles pequeños de mipmap impares y la GPU los promedia corridos: una cruz clara justo en el centro de la textura, que aquí es donde está la casa. Texturas con medidas que se dividen por 2 muchas veces (3072 × 2560, 2048 × 1792, 2048 × 1280, 1536 × 960).
2. **La franja recta que cruza el póster no es un fallo**: es el cortafuegos (o el pasillo de una línea eléctrica) que sale en la ortofoto PNOA, de nordeste a suroeste. Se buscó escondiendo objetos de la escena; no lo es.
3. **Esconder un objeto para depurar no sirve si la escena lo vuelve a poner en cada fotograma** (la aguja: `ajustarAguja` cambia su `visible`). Escalarlo a 0 sí.
4. **La coordenada publicada de la casa no cae en los tejados** (22 m al sur, en el prado). Visto de lejos da igual; a 200 m el rótulo y el encuadre final quedaban fuera de la casa. Los tejados se miden en la foto aérea fina.
5. **Un bucle que solo mueve palas no debe bajar la calidad.** Al ralentí se pinta a 15 fps; si esos fotogramas contaran para la media, la calidad automática creería que el equipo va a 15 fps y quitaría las sombras sin motivo. Y un gesto (arrastre, barra de hora) pide fotograma «urgente»: si no, el ralentí lo retrasaba hasta 62 ms.
6. **La pausa tiene que parar también las palas** (WCAG 2.2.2: pausar es pausar todo lo que se mueve solo). El vuelo marca `palasLibres = false` en pausa.
7. **El campo `aeros` es de la vista, no de la escena.** Con una sola escena para dos vistas, quitar los molinos en el claro los quitaba también en la portada. Cada vista dice si los quiere y el motor lo aplica antes de pintar (y rehace la sombra).
8. **`const q` repetido en la misma función** (el `URLSearchParams` y un `Quaternion`): `SyntaxError` y nada carga. Nombres distintos (`qs`).
9. **Con otras pruebas WebGL en marcha a la vez, SwiftShader cae a 2–4 fps** y la calidad automática tarda más de 40 s en completar una media de 45 fotogramas (una pasada falló por eso). La prueba espera hasta 90 s.

## Pide a la web

Cambios de marcado o de CSS que necesita el 3D (no los he tocado):

1. **Texto alternativo del póster** (`ALT_POSTER` en `construir.mjs`): el primer fotograma ya no es la meseta con la casa, sino la sierra con sus molinos. Propuesta: «La sierra de A Pena da Cruz y sus aerogeneradores vistos desde el aire; a la derecha, la meseta donde está la casa». El del plano vale.
2. **`.claro:not(.con-3d) .claro-marco { aspect-ratio: 1200 / 1024 }`** → `1400 / 1179` (el plano nuevo; `construir.mjs` ya pone `width="1400" height="1179"`).
3. **`#claro-bajar`**: el 3D le quita `aria-pressed` (su etiqueta cambia: «Bajar a la casa» / «Volver a la sierra»; con etiqueta cambiante, `aria-pressed` sobra y confunde) y pone `data-abajo="true|false"`. Para pintar el estado: `#claro-bajar[data-abajo="true"]`. En plano, «Bajar» y «Aerogeneradores» quedan `disabled` (darles un estilo apagado). Sugerencia: quitar el `aria-pressed="false"` del marcado de `#claro-bajar`.
4. **El zoom del póster** (`scale(1.12) → 1` en 2,3 s tras el cruce, en `main.js`): el 3D coincide con el póster a `scale(1)`. Como el 3D llega después de `load` + datos + sombreadores, casi siempre llega tarde; si llegara durante el zoom (caché caliente, equipo rápido), habría un salto de escala al entrar el canvas. Si se quiere blindar: no animar el póster si `#vuelo` ya tiene `con-3d`, o acortar el zoom a ~1,2 s.
5. **Lo que el 3D pone en vuestro marcado** (para que no os sorprenda): `touch-action: pan-y` y la clase `vuelo-arrastrable` en la sección de la portada (`#arriba`); `tabindex="0"`, `role="application"` y `aria-label` en `#claro-lienzo`; la clase `plano` en `#claro-marco` y `mapa-suelto` mientras el mapa está suelto en táctil; `data-pausa` en `#vuelo-pausa` (y le quita `aria-pressed`); una capa `.rotulos3d` dentro de `#vuelo`.
6. **`#vuelo` y `#claro-lienzo` deben estar posicionados y con tamaño** (ya lo están): el canvas va `position: absolute; inset: 0`.
7. **La pista del gesto** (`.vuelo-pista`) ya está y sale solo con `con-3d` y movimiento: bien.
8. **El rótulo de Montederramo en plano** cae cerca del borde izquierdo y en móvil se corta un poco (el plano va `contain` en un marco casi cuadrado). Si molesta: `#claro-marco.plano { aspect-ratio: 1400 / 1179 }` en móvil, y el plano entero cabe.

## Lo que no se ha podido probar

- La **fluidez en un móvil real** (todo se ha medido con SwiftShader) ni la calidad automática con una GPU de verdad: probar en un Android de gama media y en un iPhone antes de enseñarlo. Sobre todo el claro al ralentí (15 fps con las palas) y el gasto de batería si se deja abierto.
- Safari/iOS: `createImageBitmap`, `compileAsync` (KHR_parallel_shader_compile), `fetch(priority)` y `onBeforeCompile` con `vMapUv` (r160) tienen respaldo o son estándar, pero no se ha abierto en un iPhone.
- La pérdida de contexto WebGL en un móvil con poca memoria (está tratada: `sin-3d`).
- La luz de noche y del crepúsculo es aproximada (luna fija al sur, sin fase); la luz de la casa es un dibujo (no sabemos qué ventanas se encienden). Las balizas rojas de los molinos se dibujan porque los aerogeneradores llevan balizamiento, pero su ritmo real no se ha comprobado.
- La orientación de los rotores (al suroeste) es de dibujo: OSM no la da y varía con el viento.
