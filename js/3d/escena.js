// Escena compartida: un solo renderer WebGL (un solo contexto, una sola copia de las texturas en la GPU)
// cuyo <canvas> se muda a la vista que está en pantalla (el vuelo de la portada o el claro).
// Relieve MDT05 + ortofoto PNOA del IGN (CC BY 4.0), altura ×1,8, la finca en foto aérea fina (mezclada en el
// propio sombreador del relieve: sin geometría aparte ni z-fighting), 56 aerogeneradores de OpenStreetMap
// (dos mallas instanciadas: torres y rotores), sol real, estrellas y, de noche, la luz de la casa.
import * as THREE from './vendor/three.module.min.js';

export { THREE };
const BASE = new URL('../../img/terreno/', import.meta.url);
const rad = Math.PI / 180;

// Móvil: malla 256, ortofoto 2048 y finca 1536; escritorio: 384, 3072 y 2048
export const MOVIL = matchMedia('(pointer: coarse)').matches || Math.min(screen.width, screen.height) < 700;

// ---------- Datos ----------
let promesaDatos = null;
/** v: «?v=…» que pone arranque.js, para que la caché no sirva datos viejos */
export function cargarDatos(v = '') {
  return promesaDatos ||= (async () => {
    const n = MOVIL ? 256 : 384, lado = MOVIL ? 2048 : 3072, ladoF = MOVIL ? 1536 : 2048;
    const pedir = (f, op) => fetch(new URL(f + v, BASE), { priority: 'low', ...op }).then(r => { if (!r.ok) throw new Error(f + ' ' + r.status); return r; });
    const imagen = async base => {
      let ultimo;
      for (const ext of ['webp', 'jpg']) {
        try {
          const b = await (await pedir(`${base}.${ext}`)).blob();
          if ('createImageBitmap' in window) return await createImageBitmap(b);   // se decodifica fuera del hilo principal
          const img = new Image(); img.src = URL.createObjectURL(b); await img.decode(); return img;
        } catch (e) { ultimo = e; }
      }
      throw ultimo;
    };
    const [T, buf, orto, finca] = await Promise.all([pedir('terreno.json').then(r => r.json()), pedir(`alturas-${n}.bin`).then(r => r.arrayBuffer()),
      imagen(`orto-${lado}`), imagen(`finca-${ladoF}`)]);
    const ALT = new Uint16Array(buf);
    if (ALT.length !== n * n) throw new Error('alturas: tamaño inesperado');
    const W = T.ancho, H = T.alto, EX = T.exageracion;
    const cota = (r, c) => ALT[r * n + c] / 10;
    const suelo = (x, z) => {   // metros reales bajo un punto del mundo (bilineal)
      const c = Math.min(n - 1.001, Math.max(0, (x / W + .5) * (n - 1))), r = Math.min(n - 1.001, Math.max(0, (z / H + .5) * (n - 1)));
      const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0;
      return (cota(r0, c0) * (1 - fc) + cota(r0, c0 + 1) * fc) * (1 - fr) + (cota(r0 + 1, c0) * (1 - fc) + cota(r0 + 1, c0 + 1) * fc) * fr;
    };
    return { T, n, W, H, EX, cota, suelo, imagen: orto, finca, lado, L: T.lugares };
  })();
}

// Luz según la altura del sol: [altura, cielo arriba, horizonte y bruma, color del sol, intensidad del sol, intensidad del cielo]
const TABLA = [[-18, '#050912', '#0b1325', '#8fa6d8', .3, .2], [-6, '#0f1a35', '#2b2f52', '#9fb0e0', .36, .26], [-1, '#37446f', '#c47a58', '#ff8f55', .8, .32],
  [5, '#6683b0', '#eba774', '#ffad66', 2.0, .6], [18, '#86aad0', '#d7dfe0', '#ffeedb', 2.7, .85], [60, '#7ea6d2', '#cfdce4', '#ffffff', 3.0, .95]];
const TABLA_C = TABLA.map(([a, ...r]) => [a, new THREE.Color(r[0]), new THREE.Color(r[1]), new THREE.Color(r[2]), r[3], r[4]]);
function mezcla(a) {
  let i = 0; while (i < TABLA_C.length - 2 && a > TABLA_C[i + 1][0]) i++;
  const p = TABLA_C[i], q = TABLA_C[i + 1], k = Math.min(1, Math.max(0, (a - p[0]) / (q[0] - p[0])));
  const col = j => p[j].clone().lerp(q[j], k);
  return { cielo: col(1), bruma: col(2), sol: col(3), i: p[4] + (q[4] - p[4]) * k, h: p[5] + (q[5] - p[5]) * k, noche: Math.min(1, Math.max(0, (-a - 2) / 10)) };
}

/** Campo de visión vertical para un aspecto. En apaisado, 42° en vertical. En vertical, 34° en horizontal fijos:
 *  el póster móvil se pinta al aspecto más estrecho (412 × 915) y con object-fit: cover encaja por el ancho
 *  en cualquier teléfono más ancho, así que el póster y el 3D coinciden píxel a píxel. */
export function fovPara(aspecto, vBase = 42, hFijo = 34) {
  if (aspecto >= 1) return vBase;
  return Math.max(vBase, 2 * Math.atan(Math.tan(hFijo / 2 * rad) / aspecto) / rad);
}

/** Junta geometrías (sin índice) en una sola: posición y normal. Sustituye a BufferGeometryUtils, que no viaja en vendor/. */
function juntar(geos) {
  const partes = geos.map(g => (g.index ? g.toNonIndexed() : g));
  const total = partes.reduce((s, g) => s + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3);
  let k = 0;
  for (const g of partes) { pos.set(g.attributes.position.array, k * 3); nor.set(g.attributes.normal.array, k * 3); k += g.attributes.position.count; }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.BufferAttribute(pos, 3)); r.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  r.computeBoundingSphere();
  return r;
}

// ---------- El motor ----------
/** S: el módulo sol.js (lo pasa arranque.js con su versión, para que haya una sola copia) */
export function crearMotor(D, { S, alFallar, movimiento = true } = {}) {
  const { n, W, H, EX, cota, T } = D;
  const renderer = new THREE.WebGLRenderer({ antialias: !MOVIL, powerPreference: 'high-performance' });   // lanza si no hay WebGL2
  const lienzo = renderer.domElement;
  lienzo.className = 'lienzo3d'; lienzo.setAttribute('aria-hidden', 'true');
  // tope de densidad: 1,5 en móvil y 1,75 en escritorio (?dpr3d=2 lo cambia, solo para el póster)
  const qs = new URLSearchParams(location.search), dprPedido = +qs.get('dpr3d'), calidadFija = qs.get('calidad3d') === 'fija';   // solo para el póster
  const dprMax = dprPedido > 0 ? Math.min(devicePixelRatio || 1, dprPedido) : Math.min(devicePixelRatio || 1, MOVIL ? 1.5 : 1.75);
  let dpr = dprMax;
  renderer.setPixelRatio(dpr); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;           // el sol no se mueve dentro de un minuto: la sombra se rehace al cambiar la hora
  lienzo.addEventListener('webglcontextlost', e => { e.preventDefault(); detener(); alFallar?.('contexto perdido'); });
  const aniso = Math.min(MOVIL ? 4 : 8, renderer.capabilities.getMaxAnisotropy());

  const escena = new THREE.Scene();
  // ---------- relieve ----------
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2), idx = new Uint32Array((n - 1) * (n - 1) * 6);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const i = r * n + c;
    pos[i * 3] = (c / (n - 1) - .5) * W; pos[i * 3 + 1] = cota(r, c) * EX; pos[i * 3 + 2] = (r / (n - 1) - .5) * H;
    uv[i * 2] = c / (n - 1); uv[i * 2 + 1] = r / (n - 1);      // textura sin voltear (ImageBitmap): fila 0 = norte
  }
  let k = 0; for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) { const a = r * n + c, b = a + 1, d = a + n, e = d + 1; idx.set([a, d, b, b, d, e], k); k += 6; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeVertexNormals();
  const textura = img => { const t = new THREE.Texture(img); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; t.needsUpdate = true; return t; };
  const tex = textura(D.imagen), texF = textura(D.finca);
  const matTierra = new THREE.MeshStandardMaterial({ map: tex, roughness: .96, metalness: 0 });
  // La finca: la foto aérea fina se mezcla en el sombreador del relieve con los bordes difuminados (un muestreo más).
  const F = T.finca;
  const uFinca = { value: texF }, uCaja = { value: new THREE.Vector4(F.uv0[0], F.uv0[1], F.uv1[0] - F.uv0[0], F.uv1[1] - F.uv0[1]) };
  matTierra.onBeforeCompile = sh => {
    sh.uniforms.uFinca = uFinca; sh.uniforms.uFincaCaja = uCaja;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D uFinca;\nuniform vec4 uFincaCaja;')
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec2 fu = (vMapUv - uFincaCaja.xy) / uFincaCaja.zw;
        vec2 db = min(fu, 1.0 - fu);
        float af = smoothstep(.02, .22, db.x) * smoothstep(.02, .22, db.y);
        vec4 fc = texture2D(uFinca, clamp(fu, 0.0, 1.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, fc.rgb, af);
      }`);
  };
  matTierra.customProgramCacheKey = () => 'tierra-finca';
  const tierra = new THREE.Mesh(geo, matTierra);
  tierra.receiveShadow = tierra.castShadow = true; escena.add(tierra);
  // los cuatro cantos de la maqueta, como un bloque de tierra cortado
  {
    const base = (T.min - 140) * EX, p = [], borde = [];
    for (let c = 0; c < n; c++) borde.push([0, c]); for (let r = 1; r < n; r++) borde.push([r, n - 1]);
    for (let c = n - 2; c >= 0; c--) borde.push([n - 1, c]); for (let r = n - 2; r > 0; r--) borde.push([r, 0]); borde.push([0, 0]);
    for (let i = 0; i < borde.length - 1; i++) {
      const [r0, c0] = borde[i], [r1, c1] = borde[i + 1];
      const x0 = (c0 / (n - 1) - .5) * W, z0 = (r0 / (n - 1) - .5) * H, x1 = (c1 / (n - 1) - .5) * W, z1 = (r1 / (n - 1) - .5) * H, y0 = cota(r0, c0) * EX, y1 = cota(r1, c1) * EX;
      p.push(x0, y0, z0, x0, base, z0, x1, y1, z1, x1, y1, z1, x0, base, z0, x1, base, z1);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
    escena.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#2f2a24', roughness: 1, side: THREE.DoubleSide })));
  }

  // ---------- la casa: aguja de luz cálida (se oculta al acercarse), y de noche su luz y el brillo de la ventana ----------
  const CASA = new THREE.Vector3(D.L.casa.xz[0], D.L.casa.h * EX, D.L.casa.xz[1]);
  const aguja = new THREE.Group();
  const matPalo = new THREE.MeshBasicMaterial({ color: '#ffb27a', transparent: true, opacity: .9 }), matBola = new THREE.MeshBasicMaterial({ color: '#ff9a5c', transparent: true });
  const palo = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 200, 8), matPalo);
  const bola = new THREE.Mesh(new THREE.SphereGeometry(14, 20, 14), matBola); bola.position.y = 105;
  aguja.add(palo, bola); aguja.position.set(CASA.x, CASA.y + 120, CASA.z); escena.add(aguja);
  /** La aguja se funde entre 1.400 y 700 unidades de la casa: de cerca se ven los tejados, no un poste. */
  function ajustarAguja(cam) {
    const d = Math.hypot(cam.x - CASA.x, (cam.y - CASA.y) * .5, cam.z - CASA.z), op = Math.min(1, Math.max(0, (d - 700) / 700));
    aguja.visible = op > 0.01; matPalo.opacity = .9 * op; matBola.opacity = op;
    // el brillo de la ventana: de cerca, del tamaño de la casa; de lejos, un punto cálido de unos 8 px que se ve desde la sierra
    if (brillo.visible) { const b = Math.max(48, cam.distanceTo(brillo.position) * .011); brillo.scale.set(b, b, 1); }
  }
  const luzCasa = new THREE.PointLight('#ffa95c', 0, 520, 1.8); luzCasa.position.set(CASA.x, CASA.y + 16, CASA.z); escena.add(luzCasa);
  const lienzoBrillo = document.createElement('canvas'); lienzoBrillo.width = lienzoBrillo.height = 64;
  { const x = lienzoBrillo.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,196,120,1)'); g.addColorStop(.18, 'rgba(255,160,80,.6)'); g.addColorStop(.5, 'rgba(240,120,50,.16)'); g.addColorStop(1, 'rgba(240,110,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
  const brillo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lienzoBrillo), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }));
  brillo.position.set(CASA.x, CASA.y + 10, CASA.z); brillo.scale.set(48, 48, 1); brillo.visible = false; escena.add(brillo);

  // ---------- los aerogeneradores (OSM): dos mallas instanciadas, 56 torres y 56 rotores; las palas giran moviendo 56 matrices ----------
  const { torre: TORRE, pala: PALA } = T.aero, NA = T.aeros.length;
  const matAero = new THREE.MeshStandardMaterial({ color: '#eceff1', roughness: .5, metalness: 0 });
  const gTorre = juntar([
    new THREE.CylinderGeometry(1.5, 2.8, TORRE, 8, 1, true).translate(0, TORRE / 2, 0),
    new THREE.BoxGeometry(4, 4.2, 11).translate(0, TORRE + 1, -1.5),
  ]);
  const gRotor = juntar([
    ...[0, 1, 2].map(i => new THREE.BoxGeometry(2.6, PALA, .9).translate(0, PALA / 2 + 2, 0).rotateZ(i * 2 * Math.PI / 3)),
    new THREE.SphereGeometry(2.6, 10, 8).scale(1, 1, 1.4),
  ]);
  const torres = new THREE.InstancedMesh(gTorre, matAero, NA), rotores = new THREE.InstancedMesh(gRotor, matAero, NA);
  torres.castShadow = true; rotores.castShadow = false;   // la sombra no se rehace a cada vuelta de las palas
  const bases = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qz = new THREE.Quaternion(), eje = new THREE.Vector3(0, 0, 1), arriba = new THREE.Vector3(0, 1, 0), uno = new THREE.Vector3(1, 1, 1), p3 = new THREE.Vector3();
  T.aeros.forEach(([x, z, h, rumbo], i) => {
    const giro = Math.PI - rumbo * rad;          // el rotor (eje +z local) mira al rumbo dado (desde el norte, en el sentido del reloj)
    const qy = new THREE.Quaternion().setFromAxisAngle(arriba, giro);
    torres.setMatrixAt(i, m4.compose(p3.set(x, h * EX, z), qy, uno));
    const delante = new THREE.Vector3(0, 0, 5).applyQuaternion(qy);
    bases.push({ p: new THREE.Vector3(x, h * EX + TORRE + 1, z).add(delante), qy, fase: i * 1.7 });
  });
  torres.instanceMatrix.needsUpdate = true;
  let anguloPalas = -1;
  function girarPalas(a) {
    if (a === anguloPalas) return; anguloPalas = a;
    for (let i = 0; i < NA; i++) { const b = bases[i]; qz.setFromAxisAngle(eje, a + b.fase); q.copy(b.qy).multiply(qz); rotores.setMatrixAt(i, m4.compose(b.p, q, uno)); }
    rotores.instanceMatrix.needsUpdate = true;
  }
  girarPalas(0);
  // de noche, la luz roja de balizamiento en lo alto de cada molino (parpadea con movimiento; fija sin él)
  const geoBal = new THREE.BufferGeometry(); geoBal.setAttribute('position', new THREE.Float32BufferAttribute(bases.flatMap(b => [b.p.x, b.p.y + 4, b.p.z]), 3));
  const balizas = new THREE.Points(geoBal, new THREE.PointsMaterial({ color: '#ff3b2a', size: 3, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false }));
  balizas.visible = false;
  const viento = new THREE.Group(); viento.add(torres, rotores, balizas); escena.add(viento);
  for (const m of [torres, rotores]) { m.computeBoundingSphere(); m.frustumCulled = false; }   // el conjunto ocupa la sierra entera: sin recorte por instancia

  // ---------- luces ----------
  const sl = new THREE.DirectionalLight('#fff', 3); sl.castShadow = true;
  const tamSombra = MOVIL ? 1024 : 2048; sl.shadow.mapSize.set(tamSombra, tamSombra);
  Object.assign(sl.shadow.camera, { left: -8800, right: 8800, top: 8800, bottom: -8800, near: 100, far: 44000 }); sl.shadow.bias = -.0004; sl.shadow.normalBias = 18;
  escena.add(sl, sl.target);
  const hemi = new THREE.HemisphereLight('#cfe0ee', '#3b3427', .6); escena.add(hemi);
  // estrellas
  const ep = []; for (let i = 0; i < 1600; i++) { const t = Math.random() * Math.PI * 2, f = Math.acos(Math.random() * .92); ep.push(Math.sin(f) * Math.cos(t) * 32000, Math.cos(f) * 32000, Math.sin(f) * Math.sin(t) * 32000); }
  const geoE = new THREE.BufferGeometry(); geoE.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3));
  const estrellas = new THREE.Points(geoE, new THREE.PointsMaterial({ color: '#dfe8ff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  estrellas.visible = false; escena.add(estrellas);
  // cielo: degradado de pantalla que acaba en el color de la bruma (el borde de la maqueta se funde en el horizonte)
  const lienzoCielo = document.createElement('canvas'); lienzoCielo.width = 2; lienzoCielo.height = 256;
  const texCielo = new THREE.CanvasTexture(lienzoCielo); texCielo.colorSpace = THREE.SRGBColorSpace; escena.background = texCielo;
  escena.fog = new THREE.Fog('#cfdce4', 9500, 36000);

  let claveHora = '', noche = 0;
  const blanco = new THREE.Color('#ffffff');
  /** Pone la luz de una fecha; devuelve { s: sol, m: mezcla } */
  function ponerHora(fecha) {
    const s = S.sol(fecha), m = mezcla(s.alt), clave = Math.floor(fecha / 6e4) + '';
    if (clave === claveHora) return { s, m };
    claveHora = clave;
    const deNoche = s.alt < -3, az = deNoche ? 205 : s.az, al = deNoche ? 38 : Math.max(s.alt, 1.5);
    const dir = new THREE.Vector3(Math.sin(az * rad) * Math.cos(al * rad), Math.sin(al * rad), -Math.cos(az * rad) * Math.cos(al * rad));
    sl.target.position.set(0, 1000, 0); sl.position.copy(dir.multiplyScalar(18000)).add(sl.target.position); sl.target.updateMatrixWorld();
    sl.color.copy(m.sol); sl.intensity = m.i; hemi.intensity = m.h;
    hemi.color.copy(m.cielo).lerp(blanco, .35); hemi.groundColor.set(deNoche ? '#0e121b' : '#3b3427');
    escena.fog.color.copy(m.bruma);
    const cx = lienzoCielo.getContext('2d'), gr = cx.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#' + m.cielo.getHexString()); gr.addColorStop(.62, '#' + m.cielo.clone().lerp(m.bruma, .55).getHexString()); gr.addColorStop(1, '#' + m.bruma.getHexString());
    cx.fillStyle = gr; cx.fillRect(0, 0, 2, 256); texCielo.needsUpdate = true;
    noche = m.noche;
    estrellas.material.opacity = m.noche * .95; estrellas.visible = m.noche > 0;
    renderer.toneMappingExposure = 1.15 + m.noche * .5;
    // de noche la casa enciende su luz: un foco cálido sobre el claro y el brillo de la ventana, visible desde la sierra
    const luz = Math.min(1, Math.max(0, (-s.alt - .5) / 6));
    luzCasa.intensity = luz * 320; brillo.material.opacity = luz * .85; brillo.visible = luz > 0;
    balizas.material.opacity = luz; balizas.visible = luz > 0;
    matBola.color.set(deNoche ? '#ffd29a' : '#ff9a5c');
    renderer.shadowMap.needsUpdate = true;
    return { s, m };
  }

  // ---------- Vistas: el canvas se muda a la que se ve ----------
  const vistas = [];
  let activa = null, bw = 0, bh = 0;
  const vistaDe = caja => vistas.find(v => v.caja === caja);
  function medir(forzar) {
    if (!activa) return;
    const w = activa.caja.clientWidth, h = activa.caja.clientHeight;
    if (!w || !h) return;
    // La barra del móvil cambia solo el alto unos 50–120 px: no se rehace nada (el canvas cubre con object-fit)
    if (!forzar && w === bw && Math.abs(h - bh) < 160) return;
    bw = w; bh = h; renderer.setSize(w, h, false);
    activa.camara.aspect = w / h; activa.ajustarCamara?.(w / h); activa.camara.updateProjectionMatrix();
    pedir();
  }
  function activar(v) {
    if (activa === v) return;
    activa?.alSalir?.();
    activa = v; v.caja.appendChild(lienzo);
    medir(true); v.alEntrar?.(); calentar = 20; pedir();
  }
  const io = new IntersectionObserver(es => {
    for (const e of es) { const v = vistaDe(e.target); if (v) { v.visible = e.isIntersecting; v.ratio = e.intersectionRatio; } }
    const candidata = vistas.filter(v => v.visible).sort((a, b) => b.ratio - a.ratio)[0];
    if (candidata) activar(candidata);
    ultimo = 0;
    if (!activa?.visible) { cancelAnimationFrame(raf); raf = 0; } else pedir();
  }, { rootMargin: '120px 0px', threshold: [0, .25, .5, .75, 1] });
  const ro = new ResizeObserver(es => { for (const e of es) if (activa && e.target === activa.caja) medir(); });
  document.addEventListener('visibilitychange', () => { ultimo = 0; if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else pedir(); });

  // ---------- Bucle: solo cuando se ve y cuando hay algo que mover ----------
  // cuadro() de cada vista devuelve false (nada se mueve: parar), 'lento' (solo giran las palas: ~15 fps y no cuenta
  // para la calidad) o true (se mueve la cámara: a toda velocidad).
  let raf = 0, ultimo = 0, suma = 0, cuenta = 0, calentar = 20, parado = false, lento = false, urgente = false;
  const calidad = { nivel: 0, dpr, sombras: true, fpsMedio: 0 };
  function bajarCalidad() {
    calidad.nivel++;
    if (dpr > 1) dpr = Math.max(1, dpr - .25);
    else if (renderer.shadowMap.enabled) { renderer.shadowMap.enabled = false; sl.castShadow = false; matTierra.needsUpdate = true; calidad.sombras = false; }
    else if (dpr > .75) dpr = .75;
    else return;
    calidad.dpr = dpr; renderer.setPixelRatio(dpr); renderer.setSize(bw, bh, false);
  }
  function programar() { if (!raf && !parado && activa && activa.visible && !document.hidden) raf = requestAnimationFrame(cuadro); }
  /** Desde fuera (un gesto, la hora, un botón): el siguiente fotograma se pinta aunque se esté al ralentí */
  function pedir() { urgente = true; programar(); }
  /** Lo que se mueve solo (palas y balizas): con movimiento, si los molinos se ven */
  const vientoVivo = () => movimiento && viento.visible;
  function cuadro(t) {
    raf = 0;
    if (parado || !activa?.visible || document.hidden) { ultimo = 0; return; }
    if (lento && !urgente && ultimo && t - ultimo < 62) { programar(); return; }   // al ralentí: ~15 fps
    urgente = false;
    const dt = ultimo ? Math.min(120, t - ultimo) : 16;
    const quiere = activa.aeros !== false;
    if (viento.visible !== quiere) { viento.visible = quiere; renderer.shadowMap.needsUpdate = true; }
    const r = activa.cuadro(t, dt);
    let sigue = r !== false;
    if (!sigue && activa.palasLibres !== false && vientoVivo()) sigue = 'lento';
    if (vientoVivo() && activa.palasLibres !== false) {
      girarPalas((t * .0012) % (Math.PI * 2));
      if (balizas.visible) balizas.material.size = (t % 2000) < 1000 ? 3 : 1.4;
    }
    ajustarAguja(activa.camara.position);
    renderer.render(escena, activa.camara);
    activa.trasPintar?.();
    if (!activa.pintada) { const v = activa; v.pintada = true; requestAnimationFrame(() => { if (!parado) v.alPrimerFotograma?.(); }); }
    // calidad automática: media de 45 fotogramas seguidos en movimiento; por encima de 30 ms (menos de 33 fps), un escalón abajo
    lento = sigue === 'lento' || r === 'lento';
    if (ultimo && sigue && !lento && !calidadFija) {
      if (calentar > 0) calentar--;
      else { suma += dt; if (++cuenta === 45) { calidad.fpsMedio = Math.round(1000 / (suma / cuenta)); if (suma / cuenta > 30) { bajarCalidad(); calentar = 20; } suma = cuenta = 0; } }
    }
    ultimo = sigue ? t : 0;
    if (sigue) programar();
  }
  function detener() { parado = true; cancelAnimationFrame(raf); raf = 0; }

  // ---------- Pantalla: proyección con la cuenta de object-fit: cover ----------
  const v3 = new THREE.Vector3();
  function aPantalla(p, out = {}) {
    out.visible = false;
    if (!activa || !bw || !bh) return out;
    const caja = activa.caja, cw = caja.clientWidth, ch = caja.clientHeight;
    v3.copy(p).project(activa.camara);
    const s = Math.max(cw / bw, ch / bh), ox = (cw - bw * s) / 2, oy = (ch - bh * s) / 2;
    out.x = ox + (v3.x + 1) / 2 * bw * s; out.y = oy + (1 - v3.y) / 2 * bh * s;
    out.visible = v3.z < 1 && out.x > -40 && out.x < cw + 40 && out.y > -40 && out.y < ch + 40;
    return out;
  }

  // Shaders compilados en paralelo (KHR_parallel_shader_compile) y texturas subidas antes del primer fotograma:
  // así el primer render no se queda medio segundo con el hilo principal ocupado.
  const listo = (async () => {
    try { await renderer.compileAsync(escena, new THREE.PerspectiveCamera(42, 1.6, 30, 70000)); } catch (e) { /* se compila al pintar */ }
    await new Promise(r => ('requestIdleCallback' in window ? requestIdleCallback(r, { timeout: 500 }) : setTimeout(r, 0)));
    renderer.initTexture(tex);
    await new Promise(r => ('requestIdleCallback' in window ? requestIdleCallback(r, { timeout: 300 }) : setTimeout(r, 0)));
    renderer.initTexture(texF);
  })();

  return {
    THREE, D, S, escena, renderer, listo, lienzo, CASA, calidad, ponerHora, pedir, aPantalla, detener, viento, aguja,
    get activa() { return activa; }, get noche() { return noche; },
    /** v: { caja, camara, cuadro(t, dt) → false | 'lento' | true, aeros, palasLibres, alEntrar, alSalir, trasPintar, ajustarCamara, alPrimerFotograma } */
    registrar(v) { vistas.push(v); io.observe(v.caja); ro.observe(v.caja); return v; },
    fovPara,
  };
}
