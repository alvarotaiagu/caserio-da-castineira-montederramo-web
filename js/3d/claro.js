// «El claro en 3D»: vista libre del relieve con la luz de cualquier hora de hoy, rótulos, lectura en texto,
// «Bajar a la casa» / «Volver a la sierra», los aerogeneradores que se pueden quitar y el cambio En 3D / En plano.
// El dedo solo mueve el mapa tras pulsar «Mover el mapa».
import { OrbitControls } from './vendor/OrbitControls.js';

const $ = id => document.getElementById(id);
const TACTIL = matchMedia('(pointer: coarse)').matches;
const ORDEN = ['casa', 'cumbre', 'sas', 'montederramo'];   // si dos rótulos chocan, gana el primero

export function montarClaro(motor, { movimiento }) {
  const { THREE, D, CASA } = motor, { EX, W, H, L } = D, { fechaDe, minutoAhora, hhmm, DIA, lectura, metros } = motor.S;
  const seccion = $('claro'), marco = $('claro-marco'), caja = $('claro-lienzo'), capa = $('claro-rotulos');
  const plano = $('claro-plano'), bMover = $('claro-mover'), carga = $('claro-carga');
  const rango = $('claro-hora'), horaTxt = $('claro-hora-txt'), lect = $('claro-lectura');
  const b3 = $('claro-modo-3d'), bP = $('claro-modo-plano'), bBajar = $('claro-bajar'), bAeros = $('claro-aeros');
  const camara = new THREE.PerspectiveCamera(42, 16 / 10, 20, 70000);

  // ---------- rótulos ----------
  const rot = ORDEN.map(k => {
    const l = L[k], d = document.createElement('div');
    d.className = 'rotulo3d' + (k === 'casa' ? ' casa' : '');
    d.dataset.lugar = k;
    d.innerHTML = `${l.t}<small>${metros(l.ele)}${k === 'montederramo' ? ' · a 11 min' : ''}</small>`;
    capa.appendChild(d);
    return { k, d, p: new THREE.Vector3(l.xz[0], l.h * EX + (k === 'cumbre' ? 240 : 120), l.xz[1]), uv: l.uv, w: 0, h: 0 };
  });
  const rCasa = rot[0];
  const pant = {};
  function repartir(pos) {   // pos: [{x, y, visible}] en el orden de rot → coloca y quita los que chocan
    const puestos = [];
    rot.forEach((r, i) => {
      const p = pos[i];
      if (!r.w) { r.w = r.d.offsetWidth || 90; r.h = r.d.offsetHeight || 30; }
      const caj = { x0: p.x - r.w / 2, x1: p.x + r.w / 2, y0: p.y - r.h - 12, y1: p.y };
      const choca = puestos.some(o => caj.x0 < o.x1 && caj.x1 > o.x0 && caj.y0 < o.y1 && caj.y1 > o.y0);
      const vis = p.visible && !choca;
      r.d.style.display = vis ? '' : 'none';
      if (vis) { puestos.push(caj); r.d.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%)`; }
    });
  }
  const colocar3d = () => {
    // el rótulo de la casa, justo encima de los tejados: más bajo cuanto más cerca está la cámara
    rCasa.p.copy(CASA); rCasa.p.y += Math.min(300, Math.max(18, camara.position.distanceTo(CASA) * .09));
    repartir(rot.map(r => ({ ...motor.aPantalla(r.p, pant) })));
  };
  // En plano: la imagen va con object-fit (contain o cover, según el CSS de la web): se repite la cuenta
  function colocarPlano() {
    const cw = marco.clientWidth, ch = marco.clientHeight;
    const nw = plano.naturalWidth || D.T.plano.w, nh = plano.naturalHeight || D.T.plano.h;
    const ajuste = getComputedStyle(plano).objectFit;
    const r = plano.getBoundingClientRect(), m = marco.getBoundingClientRect();
    const iw = r.width, ih = r.height, s = ajuste === 'cover' ? Math.max(iw / nw, ih / nh) : ajuste === 'fill' ? 0 : Math.min(iw / nw, ih / nh);
    const dw = s ? nw * s : iw, dh = s ? nh * s : ih;
    const ox = r.left - m.left + (iw - dw) / 2, oy = r.top - m.top + (ih - dh) / 2;
    repartir(rot.map(x => { const px = ox + x.uv[0] * dw, py = oy + x.uv[1] * dh - 6; return { x: px, y: py, visible: px > -20 && px < cw + 20 && py > 0 && py < ch + 20 }; }));
  }

  // ---------- cámara y control ----------
  // De lejos: desde el suroeste, con la casa delante y la sierra de los molinos detrás. De cerca: el claro desde el sur.
  const objetivo = new THREE.Vector3((.56 - .5) * W, 1000 * EX, (.44 - .5) * H);
  const lejosPara = aspecto => {
    const vertical = aspecto < 1;
    const dir = (vertical ? new THREE.Vector3(-.42, .62, .66) : new THREE.Vector3(-.4, .5, .77)).normalize();
    return { p: objetivo.clone().add(dir.multiplyScalar(vertical ? 10500 : 8600)), o: objetivo.clone() };
  };
  const cerca = { p: new THREE.Vector3(CASA.x - 90, CASA.y + 300, CASA.z + 170), o: new THREE.Vector3(CASA.x, CASA.y + 10, CASA.z) };
  const ini = lejosPara(caja.clientWidth / Math.max(1, caja.clientHeight));
  camara.position.copy(ini.p); camara.lookAt(ini.o);
  const ctl = new OrbitControls(camara, caja);
  ctl.target.copy(ini.o);
  Object.assign(ctl, { enableDamping: true, dampingFactor: .08, minDistance: 220, maxDistance: 17000, maxPolarAngle: 1.45, screenSpacePanning: false, rotateSpeed: .6, enableZoom: false });
  ctl.addEventListener('change', () => {
    ctl.target.x = Math.max(-W / 2, Math.min(W / 2, ctl.target.x)); ctl.target.z = Math.max(-H / 2, Math.min(H / 2, ctl.target.z));
    motor.pedir();
  });
  let moviendo = false;
  ctl.addEventListener('start', () => { moviendo = true; viaje = null; motor.pedir(); });
  ctl.addEventListener('end', () => { moviendo = false; });
  ctl.update();
  // la rueda solo acerca después de pinchar en el mapa (así la página sigue bajando con la rueda)
  caja.addEventListener('pointerdown', () => { ctl.enableZoom = true; });
  caja.addEventListener('pointerleave', () => { ctl.enableZoom = false; });
  // en táctil, el dedo hace scroll hasta que se pulsa «Mover el mapa»; OrbitControls pone touch-action: none al crearse
  const ponerMover = activo => {
    ctl.enabled = activo; caja.style.touchAction = activo ? 'none' : 'pan-y';
    bMover.setAttribute('aria-pressed', String(activo)); bMover.textContent = activo ? 'Soltar el mapa' : 'Mover el mapa';
    marco.classList.toggle('mapa-suelto', activo);
  };
  if (TACTIL) { bMover.hidden = false; ponerMover(false); bMover.addEventListener('click', () => ponerMover(!ctl.enabled)); }
  else caja.style.touchAction = 'pan-y';
  // teclado: flechas giran e inclinan, + y − acercan
  caja.tabIndex = 0;
  caja.setAttribute('role', 'application');
  caja.setAttribute('aria-roledescription', 'relieve en 3D');
  caja.setAttribute('aria-label', 'Relieve de A Castiñeira y la sierra en 3D. Flechas: girar e inclinar. Más y menos: acercar y alejar.');
  const esf = new THREE.Spherical(), off = new THREE.Vector3();
  caja.addEventListener('keydown', e => {
    const k = e.key; let dTh = 0, dPh = 0, f = 1;
    if (k === 'ArrowLeft') dTh = -.12; else if (k === 'ArrowRight') dTh = .12;
    else if (k === 'ArrowUp') dPh = -.08; else if (k === 'ArrowDown') dPh = .08;
    else if (k === '+' || k === '=') f = .85; else if (k === '-' || k === '_') f = 1 / .85;
    else return;
    e.preventDefault(); viaje = null;
    off.copy(camara.position).sub(ctl.target); esf.setFromVector3(off);
    esf.theta += dTh; esf.phi = Math.max(.15, Math.min(ctl.maxPolarAngle, esf.phi + dPh));
    esf.radius = Math.max(ctl.minDistance, Math.min(ctl.maxDistance, esf.radius * f));
    camara.position.copy(ctl.target).add(off.setFromSpherical(esf)); ctl.update(); motor.pedir();
  });

  // ---------- «Bajar a la casa» / «Volver a la sierra»: un viaje de 2,6 s (al momento con movimiento reducido) ----------
  let viaje = null, abajo = false;
  const ponerBajar = () => { bBajar.textContent = abajo ? 'Volver a la sierra' : 'Bajar a la casa'; bBajar.dataset.abajo = String(abajo); bBajar.removeAttribute('aria-pressed'); };
  bBajar.addEventListener('click', () => {
    abajo = !abajo; ponerBajar();
    const dest = abajo ? cerca : lejosPara(caja.clientWidth / Math.max(1, caja.clientHeight));
    if (!movimiento) { viaje = null; camara.position.copy(dest.p); ctl.target.copy(dest.o); ctl.update(); motor.pedir(); return; }
    viaje = { t0: null, p0: camara.position.clone(), p1: dest.p.clone(), o0: ctl.target.clone(), o1: dest.o.clone() };
    motor.pedir();
  });
  ponerBajar();
  function avanzarViaje(t) {
    if (!viaje) return false;
    if (viaje.t0 == null) viaje.t0 = t;
    const k = Math.min(1, (t - viaje.t0) / 2600), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    // por un arco: a mitad del viaje sube un poco, para no rozar el relieve
    camara.position.lerpVectors(viaje.p0, viaje.p1, e); camara.position.y += Math.sin(Math.PI * e) * viaje.p0.distanceTo(viaje.p1) * .12;
    ctl.target.lerpVectors(viaje.o0, viaje.o1, e);
    if (k >= 1) viaje = null;
    return true;
  }

  // ---------- aerogeneradores: se pueden quitar (solo en esta vista; en la portada se quedan) ----------
  let aerosOn = true;
  bAeros.setAttribute('aria-pressed', 'true');
  bAeros.addEventListener('click', () => { aerosOn = !aerosOn; vista.aeros = aerosOn; bAeros.setAttribute('aria-pressed', String(aerosOn)); motor.pedir(); });

  // ---------- hora ----------
  let minuto = minutoAhora(), tLect = 0;
  const pintarHora = (inmediato) => {
    minuto = +rango.value; horaTxt.textContent = hhmm(minuto);
    rango.setAttribute('aria-valuetext', hhmm(minuto));
    if (motor.activa === vista) { motor.ponerHora(fechaDe(minuto)); motor.pedir(); }
    clearTimeout(tLect);   // la lectura (aria-live) se escribe al parar, no a cada paso de la barra
    if (inmediato) lect.textContent = lectura(minuto); else tLect = setTimeout(() => { lect.textContent = lectura(minuto); }, 350);
  };
  rango.addEventListener('input', () => pintarHora(false));
  const ir = m => { rango.value = String(Math.round(((m % 1440) + 1440) % 1440)); pintarHora(true); };
  document.querySelectorAll('#claro [data-momento]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.momento;
    ir(k === 'ahora' ? minutoAhora() : k === 'sale' ? (DIA.sale ?? 480) + 20 : k === 'pone' ? (DIA.pone ?? 1140) - 25 : k === 'mediodia' ? DIA.mediodia : (DIA.pone ?? 1140) + 150);
  }));

  // ---------- 3D o plano ----------
  let enPlano = false;
  const modo = p => {
    enPlano = p; marco.classList.toggle('plano', p);
    b3.setAttribute('aria-pressed', String(!p)); bP.setAttribute('aria-pressed', String(p));
    bBajar.disabled = p; bAeros.disabled = p;
    if (TACTIL) { bMover.hidden = p; if (p) ponerMover(false); }
    rot.forEach(r => { r.w = 0; });
    vista.palasLibres = !p;
    if (p) colocarPlano(); else motor.pedir();
  };
  b3.addEventListener('click', () => modo(false)); bP.addEventListener('click', () => modo(true));
  new ResizeObserver(() => { if (enPlano) colocarPlano(); }).observe(marco);
  plano.addEventListener('load', () => { if (enPlano) colocarPlano(); });

  const vista = motor.registrar({
    caja, camara, aeros: true, palasLibres: true,
    ajustarCamara: a => { camara.fov = motor.fovPara(a); },
    alEntrar: () => { motor.ponerHora(fechaDe(minuto)); },
    cuadro: t => {
      if (enPlano) return false;
      const v = avanzarViaje(t);
      return ctl.update() || moviendo || v;
    },
    trasPintar: () => { if (!enPlano) colocar3d(); },
    alPrimerFotograma() {
      seccion.classList.add('con-3d');
      carga.hidden = true;
      document.dispatchEvent(new CustomEvent('castineira:3d-listo', { detail: { vista: 'claro' } }));
    },
  });
  ir(minutoAhora());
  return { vista, ctl, modo, ir, get enPlano() { return enPlano; }, get abajo() { return abajo; }, get aeros() { return aerosOn; }, get viajando() { return !!viaje; } };
}
