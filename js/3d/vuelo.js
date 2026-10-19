// Portada: el vuelo desde la sierra hasta el tejado de la casa, con la luz de ahora.
// Empieza sobre la ladera norte de A Pena da Cruz, con la fila de molinos a la izquierda; baja por la ladera noroeste,
// en paralelo a los molinos y lejos de ellos, y termina a unos 190 m de la casa, mirando sus tejados desde el estenordeste.
// Arrastrar de lado (ratón o dedo) mueve el vuelo adelante y atrás.

const DUR = 26000;             // ms de vuelo
const suave = t => t * t * (3 - 2 * t);

export function montarVuelo(motor, { movimiento }) {
  const { THREE, D, CASA } = motor, { EX, suelo, T, L } = D, { ahora, textoChip, metros } = motor.S;
  const caja = document.getElementById('vuelo');
  const camara = new THREE.PerspectiveCamera(42, 16 / 9, 20, 70000);
  const curva = new THREE.CatmullRomCurve3(T.vuelo.map(([x, h, z]) => new THREE.Vector3(x, h * EX, z)), false, 'centripetal');
  const altEl = document.getElementById('altimetro-valor'), agujaEl = document.getElementById('altimetro-aguja');
  const bPausa = document.getElementById('vuelo-pausa');
  const aeros = T.aeros.map(([x, z, h]) => [x, z, h * EX + T.aero.torre + T.aero.pala]);   // pie y punta de pala más alta (mundo)

  // rótulos: la cumbre al principio, la casa al final
  const capa = document.createElement('div'); capa.className = 'rotulos3d'; capa.setAttribute('aria-hidden', 'true');
  const rCumbre = document.createElement('div'); rCumbre.className = 'rotulo3d';
  rCumbre.innerHTML = `${L.cumbre.t}<small>${metros(L.cumbre.ele)}</small>`;
  const rCasa = document.createElement('div'); rCasa.className = 'rotulo3d casa';
  rCasa.innerHTML = `${L.casa.t}<small>${metros(L.casa.ele)}</small>`;
  capa.append(rCumbre, rCasa); caja.appendChild(capa);
  const pCumbre = new THREE.Vector3(L.cumbre.xz[0], L.cumbre.h * EX + 260, L.cumbre.xz[1]), pCasa = CASA.clone(), pant = {};

  // estado
  let t = movimiento ? 0 : DUR;   // con movimiento reducido: el fotograma final, quieto
  let volando = false;            // pasa a true con la señal de la cortina
  let pausa = false, arrastre = null, inercia = 0, deriva = 0, alt = -1;
  const pos = new THREE.Vector3(), adelante = new THREE.Vector3(), mirar = new THREE.Vector3(), casaVista = new THREE.Vector3(), der = new THREE.Vector3(), arr = new THREE.Vector3();
  const ENCUADRE = [.26, .16];   // dónde queda la casa al final, en apaisado (fracción de media pantalla: derecha, arriba)

  function pose(tt) {
    const e = suave(Math.min(1, Math.max(0, tt / DUR)));
    curva.getPointAt(e, pos);
    // tras el final, una deriva muy lenta alrededor de la casa (nunca con movimiento reducido)
    if (deriva) { const a = Math.sin(deriva / 14000 * Math.PI) * .07, dx = pos.x - CASA.x, dz = pos.z - CASA.z; pos.x = CASA.x + dx * Math.cos(a) - dz * Math.sin(a); pos.z = CASA.z + dx * Math.sin(a) + dz * Math.cos(a); }
    // nunca a menos de 70 m del suelo, y nunca entre las palas: cerca de un molino, por encima de sus puntas
    let minY = (suelo(pos.x, pos.z) + 70) * EX;
    for (const [x, z, top] of aeros) if (Math.hypot(pos.x - x, pos.z - z) < 260) minY = Math.max(minY, top + 90);
    if (pos.y < minY) pos.y = minY;
    camara.position.copy(pos);
    // mira lejos por delante y algo hacia el suelo (se ve la sierra y el horizonte); en la segunda mitad, a la casa
    curva.getPointAt(Math.min(1, e + .2), adelante);
    adelante.y += ((suelo(adelante.x, adelante.z) + 40) * EX - adelante.y) * (.12 + .4 * Math.min(1, e / .45));
    const b = suave(Math.min(1, Math.max(0, (e - .42) / .42)));
    // en apaisado la casa no va al centro sino arriba a la derecha (el titular ocupa la izquierda): se mira a un punto
    // desplazado; en vertical ya lo hace el desplazamiento de la vista (ajustarCamara)
    casaVista.copy(CASA);
    if (camara.aspect >= 1 && b > 0) {
      camara.lookAt(CASA); camara.updateMatrixWorld();
      const d = pos.distanceTo(CASA), tv = Math.tan(camara.fov / 2 * Math.PI / 180), th = tv * camara.aspect;
      der.setFromMatrixColumn(camara.matrixWorld, 0); arr.setFromMatrixColumn(camara.matrixWorld, 1);
      casaVista.addScaledVector(der, -d * th * ENCUADRE[0]).addScaledVector(arr, -d * tv * ENCUADRE[1]);
    }
    mirar.copy(adelante).lerp(casaVista, b); camara.lookAt(mirar); camara.updateMatrixWorld();
    // altímetro: metros reales de la cámara; aguja 1.289 m → 13 %, 488 m → 86 % (con tope 0–100 %)
    const m = Math.round(pos.y / EX);
    if (m !== alt) {
      alt = m;
      if (altEl) altEl.textContent = metros(m);
      if (agujaEl) agujaEl.style.top = Math.max(0, Math.min(100, 13 + (1289 - m) / (1289 - 488) * 73)).toFixed(1) + '%';
    }
    // rótulos: la cumbre mientras se vuela por la sierra; la casa al final, justo encima de los tejados
    const opCumbre = Math.min(1, Math.max(0, (e - .02) / .06), (.4 - e) / .08);
    const dCasa = pos.distanceTo(CASA);
    pCasa.copy(CASA); pCasa.y += Math.min(300, Math.max(18, dCasa * .09));
    const opCasa = Math.min(1, Math.max(0, (e - .62) / .12));
    colocar(rCumbre, pCumbre, opCumbre); colocar(rCasa, pCasa, opCasa);
    return e;
  }
  function colocar(el, p, op) {
    if (op <= 0 || motor.activa !== vista) { if (el.style.opacity !== '0') el.style.opacity = '0'; return; }
    motor.aPantalla(p, pant);
    el.style.opacity = pant.visible ? op.toFixed(2) : '0';
    if (pant.visible) el.style.transform = `translate(${pant.x.toFixed(1)}px, ${pant.y.toFixed(1)}px) translate(-50%, -100%)`;
  }

  const vista = motor.registrar({
    caja, camara, aeros: true, palasLibres: true,
    ajustarCamara: a => {
      if (a >= 1) { camara.clearViewOffset(); camara.fov = motor.fovPara(a); return; }
      // En vertical el texto de la portada tapa la mitad de abajo: el punto al que se mira sube C × ancho
      // por encima del centro. Al ser proporcional al ancho (y el ángulo horizontal fijo), el póster móvil
      // sigue encajando con object-fit: cover en cualquier teléfono.
      const C = .42, alto = 1 + 2 * C * a;
      camara.aspect = a / alto;
      camara.fov = 2 * Math.atan(Math.tan(17 * Math.PI / 180) / camara.aspect) * 180 / Math.PI;
      camara.setViewOffset(a, alto, 0, 2 * C * a, a, 1);
    },
    alEntrar: () => motor.ponerHora(ahora()),
    cuadro(_, dt) {
      if (arrastre) { pose(t); return false; }
      if (inercia) { t = Math.min(DUR, Math.max(0, t + inercia * dt)); inercia *= Math.pow(.9, dt / 16); if (Math.abs(inercia) < .02) inercia = 0; }
      else if (volando && !pausa && movimiento) {
        if (t < DUR) t = Math.min(DUR, t + dt);
        else deriva += dt;
      }
      pose(t);
      return !!inercia || (volando && !pausa && movimiento);
    },
    alPrimerFotograma() {
      caja.classList.add('con-3d');
      document.dispatchEvent(new CustomEvent('castineira:3d-listo', { detail: { vista: 'vuelo' } }));
    },
  });
  // la luz de ahora, cada minuto
  setInterval(() => { if (motor.activa === vista) { motor.ponerHora(ahora()); motor.pedir(); } }, 60000);

  // ---------- empezar con la cortina ----------
  const empezar = () => { if (volando) return; volando = true; motor.pedir(); };
  if (document.documentElement.classList.contains('cortina-fuera')) empezar();
  else {
    document.addEventListener('castineira:cortina-fuera', empezar, { once: true });
    setTimeout(empezar, 10000);   // red de seguridad si la señal no llega
  }

  // ---------- pausa: para el vuelo y las palas (todo lo que se mueve) ----------
  if (bPausa && movimiento) {
    bPausa.hidden = false; bPausa.removeAttribute('aria-pressed'); bPausa.dataset.pausa = 'false';
    bPausa.addEventListener('click', () => {
      // la etiqueta dice lo que hará el botón; aria-pressed se quita (con etiqueta cambiante sobra y confunde)
      pausa = !pausa; bPausa.textContent = pausa ? 'Seguir el vuelo' : 'Pausar el vuelo';
      bPausa.dataset.pausa = String(pausa); vista.palasLibres = !pausa;
      inercia = 0; motor.pedir();
    });
  }

  // ---------- gesto propio: arrastrar de lado mueve el vuelo; el dedo vertical sigue haciendo scroll ----------
  const zona = caja.closest('section, header, [data-portada]') || caja.parentElement || caja;
  zona.style.touchAction = 'pan-y';
  zona.classList.add('vuelo-arrastrable');
  const interactivo = el => el.closest('a, button, input, select, textarea, label, summary, [contenteditable], form, [role="button"], [role="slider"]');
  zona.addEventListener('pointerdown', e => {
    if (e.button !== 0 || interactivo(e.target)) return;
    arrastre = { id: e.pointerId, x: e.clientX, y: e.clientY, t0: t, decidido: false, ultX: e.clientX, ultT: e.timeStamp, v: 0 };
  });
  zona.addEventListener('pointermove', e => {
    const a = arrastre; if (!a || e.pointerId !== a.id) return;
    const dx = e.clientX - a.x, dy = e.clientY - a.y;
    if (!a.decidido) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { arrastre = null; return; }   // es scroll
      if (Math.abs(dx) < 8) return;
      a.decidido = true; inercia = 0; deriva = 0;
      try { zona.setPointerCapture(e.pointerId); } catch (_) { /* nada */ }
      zona.classList.add('arrastrando-vuelo'); getSelection()?.removeAllRanges();
    }
    e.preventDefault();
    // hacia la izquierda, adelante: el ancho de la portada son 3/5 del vuelo
    const ms = DUR * .6 / Math.max(320, zona.clientWidth);
    t = Math.min(DUR, Math.max(0, a.t0 - dx * ms));
    const dtp = e.timeStamp - a.ultT; if (dtp > 0) { a.v = .7 * a.v + .3 * (-(e.clientX - a.ultX) * ms / dtp); a.ultX = e.clientX; a.ultT = e.timeStamp; }
    motor.pedir();
  });
  const soltar = e => {
    const a = arrastre; if (!a || e.pointerId !== a.id) return;
    arrastre = null; zona.classList.remove('arrastrando-vuelo');
    if (a.decidido) { inercia = Math.max(-6, Math.min(6, a.v)); if (e.timeStamp - a.ultT > 80) inercia = 0; volando = true; motor.pedir(); }
  };
  // Ojo: no escuchar lostpointercapture. Con el dedo, el navegador captura el puntero en el elemento tocado;
  // al pasar la captura a la zona, esa captura implícita se pierde y el evento sube hasta aquí: cortaría el arrastre.
  zona.addEventListener('pointerup', soltar); zona.addEventListener('pointercancel', soltar);

  pose(t);
  motor.pedir();
  // para las pruebas y el póster
  return {
    vista, curva, DUR, camara,
    get t() { return t; }, set t(v) { t = v; deriva = 0; pose(t); motor.pedir(); },
    get pausa() { return pausa; }, get volando() { return volando; },
    chip: textoChip,
  };
}
