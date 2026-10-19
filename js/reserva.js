/* Caserío da Castiñeira · motor de reservas de DEMOSTRACIÓN
   No envía, guarda ni cobra nada. La ocupación es inventada (determinista por fecha y por alojamiento).
   Supuestos (marcados en la web y en el README): precios «desde» por persona y noche de casasrurales.net
   (sin fecha) para todas las noches; la casa entera (16 plazas) solo las noches sin nadie y con precio a
   consultar; el precio de las cenas, por confirmar; pago en la casa.
   API: window.CASTINEIRAmotor.preparar({ ini, fin, personas, modo: 'aloj'|'casa', aloj }) */
(() => {
  'use strict';
  const raiz = document.getElementById('motor');
  if (!raiz) return;

  const ALOJ = {
    deluxe: { n: 'Apartamento Deluxe', d: '2 plantas, 2 habitaciones y chimenea', plazas: 6, precio: 18 },
    buhardilla: { n: 'Apartamento de 1 habitación', d: 'una estancia y la buhardilla', plazas: 3, precio: 22 },
    patio: { n: 'Apartamento de 2 habitaciones', d: 'se entra por el patio común', plazas: 4, precio: 20 },
    dosplantas: { n: 'Apartamento de 2 habitaciones y 2 plantas', d: '2 plantas y chimenea', plazas: 6, precio: 17 },
    doble: { n: 'Habitación doble', d: 'en la antigua casa familiar', plazas: 3, precio: 18 },
  };
  const ORDEN = ['deluxe', 'buhardilla', 'patio', 'dosplantas', 'doble'];
  const CASA = 16;
  const MAX_NOCHES = 14;
  const DIA = 864e5;
  const TEL = '609 31 42 35';

  /* ---------- fechas como claves 'AAAA-MM-DD' en hora local ---------- */
  const clave = (x) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const fecha = (k) => new Date(k + 'T00:00');
  const sumar = (k, n) => { const x = fecha(k); x.setDate(x.getDate() + n); return clave(x); };
  const noches = (a, b) => Math.round((fecha(b) - fecha(a)) / DIA);
  const HOY = clave(new Date());
  const fmtDia = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtLargo = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const fmtMes = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
  const eur = (n) => n.toLocaleString('es-ES') + ' €';
  const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const plural = (n, a, b) => `${n} ${n === 1 ? a : b}`;

  /* ---------- ocupación inventada: cada alojamiento la suya, siempre la misma para cada noche ---------- */
  const azar = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } h ^= h >>> 13; h = Math.imul(h, 2246822507); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const NIVEL_MES = [0.16, 0.2, 0.3, 0.45, 0.42, 0.5, 0.72, 0.88, 0.55, 0.48, 0.32, 0.4];
  const nivel = (k) => {
    const x = fecha(k), dsem = x.getDay();
    let n = NIVEL_MES[x.getMonth()];
    if (dsem === 5 || dsem === 6) n += 0.28;                                   // viernes y sábado
    const md = (x.getMonth() + 1) * 100 + x.getDate();
    if ((md >= 1205 && md <= 1208) || md >= 1230 || md <= 101) n += 0.3;        // puente de diciembre y fin de año
    return Math.min(0.97, n);
  };
  // noche vacía: ningún alojamiento ocupado (es cuando se puede pedir la casa entera)
  const nocheVacia = (k) => k >= HOY && azar(k + '#casa') > nivel(k) * 1.2 + 0.08;
  const libre = (a, k) => {
    if (k < HOY) return false;
    if (nocheVacia(k)) return true;
    return azar(k + '#' + a) > nivel(k) * 0.95;
  };
  const nLibres = (k) => ORDEN.filter((a) => libre(a, k)).length;
  const libreRango = (a, ini, fin) => { for (let k = ini; k < fin; k = sumar(k, 1)) if (!libre(a, k)) return false; return true; };
  const casaRango = (ini, fin) => { for (let k = ini; k < fin; k = sumar(k, 1)) if (!nocheVacia(k)) return false; return true; };

  /* ---------- estado ---------- */
  const primeroMes = (k) => k.slice(0, 7) + '-01';
  const nuevo = () => ({ modo: 'aloj', ini: null, fin: null, personas: 2, perro: false, cenas: false, sel: [], paso: 'fechas', mes: primeroMes(HOY), msg: '', error: false, datos: {}, loc: '' });
  const st = nuevo();
  const nMeses = () => (innerWidth >= 1000 ? 2 : 1);
  const capacidad = () => st.sel.reduce((s, a) => s + ALOJ[a].plazas, 0);
  const topePersonas = () => (st.modo === 'casa' ? CASA : st.sel.length ? Math.max(capacidad(), st.personas) : CASA);

  // estado de una noche en el calendario: por alojamiento (los elegidos) o por la casa
  const estado = (k) => {
    if (k < HOY) return 'pasado';
    if (st.modo === 'casa') return nocheVacia(k) ? 'libre' : 'completo';
    const n = nLibres(k);
    if (st.sel.length) return st.sel.every((a) => libre(a, k)) ? (n <= 2 ? 'pocos' : 'libre') : 'completo';
    return n === 0 ? 'completo' : n <= 2 ? 'pocos' : 'libre';
  };
  const nocheValida = (k) => estado(k) !== 'completo' && estado(k) !== 'pasado';
  const rangoLibre = (a, b) => { for (let k = a; k < b; k = sumar(k, 1)) if (!nocheValida(k)) return false; return true; };

  // reparte el grupo: primero los alojamientos más grandes elegidos
  const reparto = () => {
    let resto = st.personas;
    return [...st.sel].sort((a, b) => ALOJ[b].plazas - ALOJ[a].plazas).map((a) => { const n = Math.min(resto, ALOJ[a].plazas); resto -= n; return [a, n]; }).filter(([, n]) => n > 0);
  };
  const total = () => (st.ini && st.fin && st.modo === 'aloj' ? reparto().reduce((s, [a, n]) => s + n * ALOJ[a].precio, 0) * noches(st.ini, st.fin) : 0);

  // propuesta para el grupo con lo que está libre esas noches: uno que baste (el más justo) o, si no, varios
  const propuesta = (personas = st.personas) => {
    if (!st.ini || !st.fin) return null;
    const libres = ORDEN.filter((a) => libreRango(a, st.ini, st.fin));
    const uno = libres.filter((a) => ALOJ[a].plazas >= personas).sort((a, b) => ALOJ[a].plazas - ALOJ[b].plazas || ALOJ[a].precio - ALOJ[b].precio)[0];
    if (uno) return [uno];
    const varios = [];
    let cab = 0;
    for (const a of [...libres].sort((a, b) => ALOJ[b].plazas - ALOJ[a].plazas)) { if (cab >= personas) break; varios.push(a); cab += ALOJ[a].plazas; }
    return cab >= personas ? varios : null;
  };
  const igual = (x, y) => x && y && x.length === y.length && x.every((a) => y.includes(a));

  /* ---------- elegir fechas ---------- */
  const elegir = (k) => {
    st.msg = ''; st.error = false;
    if (!st.ini || st.fin || k <= st.ini) {
      if (!nocheValida(k)) return;
      st.ini = k; st.fin = null; st.msg = 'Ahora elige el día de salida.';
    } else if (noches(st.ini, k) > MAX_NOCHES) {
      st.msg = `Por la web, hasta ${MAX_NOCHES} noches. Para más, llama a Manolo.`; st.error = true;
    } else if (!rangoLibre(st.ini, k)) {
      if (nocheValida(k)) { st.ini = k; st.fin = null; st.msg = 'Había una noche completa por medio: empezamos desde aquí. Elige la salida.'; }
      else { st.msg = 'Hay una noche completa por medio. Prueba otras fechas.'; st.error = true; }
    } else {
      st.fin = k;
      // si no hay nada elegido o lo elegido no basta, se propone
      if (st.modo === 'aloj' && (!st.sel.length || capacidad() < st.personas)) { const p = propuesta(); if (p) st.sel = p; }
    }
    pintar();
  };

  /* ---------- pintar ---------- */
  const h = (tag, attrs, ...hijos) => {
    const el = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    hijos.flat().forEach((c) => { if (c != null && c !== false) el.append(c.nodeType ? c : String(c)); });
    return el;
  };

  const calendario = () => {
    const n = nMeses();
    const meses = [];
    for (let i = 0; i < n; i++) {
      const p = fecha(st.mes); p.setMonth(p.getMonth() + i);
      const k0 = clave(p), y = p.getFullYear(), m = p.getMonth();
      const desfase = (p.getDay() + 6) % 7, dias = new Date(y, m + 1, 0).getDate();
      const celdas = [];
      for (let j = 0; j < desfase; j++) celdas.push(h('span', { class: 'dia-hueco', 'aria-hidden': 'true' }));
      for (let x = 1; x <= dias; x++) {
        const k = clave(new Date(y, m, x));
        const e = estado(k);
        const salidaPosible = st.ini && !st.fin && k > st.ini && noches(st.ini, k) <= MAX_NOCHES && rangoLibre(st.ini, k);
        const usable = (e !== 'completo' && e !== 'pasado') || salidaPosible;
        let cls = 'dia';
        if (k === st.ini) cls += ' es-ini';
        else if (k === st.fin) cls += ' es-fin';
        else if (st.ini && st.fin && k > st.ini && k < st.fin) cls += ' es-dentro';
        if (salidaPosible && e === 'completo') cls += ' es-salida-posible';
        const txtEstado = e === 'pasado' ? 'pasado' : e === 'completo' ? (salidaPosible ? 'completo, se puede salir ese día' : 'completo') : e === 'pocos' ? 'quedan pocos alojamientos' : 'libre';
        celdas.push(h('button', {
          type: 'button', class: cls, 'data-k': k, 'data-estado': e,
          'aria-disabled': usable ? null : 'true',
          'aria-pressed': k === st.ini || k === st.fin ? 'true' : 'false',
          'aria-label': `${fmtLargo.format(fecha(k))}, ${txtEstado}`,
          onclick: () => { if (usable) elegir(k); },
        }, x));
      }
      meses.push(h('div', { class: 'm-mes' },
        h('h3', { class: 'm-mes-tit' }, mayus(fmtMes.format(fecha(k0)))),
        h('div', { class: 'm-sem', 'aria-hidden': 'true' }, ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'].map((s) => h('span', null, s))),
        h('div', { class: 'm-dias' }, celdas)));
    }
    const limite = clave(new Date(new Date().getFullYear(), new Date().getMonth() + 12, 1));
    const ant = h('button', { type: 'button', class: 'redondo', 'aria-label': 'Mes anterior', onclick: () => { const p = fecha(st.mes); p.setMonth(p.getMonth() - 1); st.mes = clave(p); pintar(); } }, '‹');
    const sig = h('button', { type: 'button', class: 'redondo', 'aria-label': 'Mes siguiente', onclick: () => { const p = fecha(st.mes); p.setMonth(p.getMonth() + 1); st.mes = clave(p); pintar(); } }, '›');
    ant.disabled = st.mes <= primeroMes(HOY);
    sig.disabled = st.mes >= limite;
    const et = st.modo === 'casa' ? 'Días con la casa entera libre' : st.sel.length === 1 ? `Días del ${ALOJ[st.sel[0]].n}` : st.sel.length ? 'Días con los elegidos libres' : 'Elige llegada y salida';
    return h('div', { class: 'm-cal' },
      h('div', { class: 'm-cal-nav' }, ant, h('span', { class: 'm-et', id: 'm-et-cal' }, et), sig),
      h('div', { class: 'm-meses', style: `--n-meses:${n}` }, meses),
      h('div', { class: 'm-leyenda' },
        h('span', null, h('i'), 'Libre'),
        st.modo === 'aloj' ? h('span', null, h('i', { class: 'l-pocos' }), 'Quedan pocos') : null,
        h('span', null, h('i', { class: 'l-completo' }), 'Completo'),
        h('span', null, h('i', { class: 'l-tuya' }), 'Tu estancia')));
  };

  const contador = (valor, min, max, alCambiar, etiqueta) => h('div', { class: 'm-contador' },
    h('button', { type: 'button', 'aria-label': `Quitar ${etiqueta}`, disabled: valor <= min, onclick: () => alCambiar(valor - 1) }, '−'),
    h('output', { 'aria-live': 'polite', 'aria-label': etiqueta, id: 'm-personas' }, valor),
    h('button', { type: 'button', 'aria-label': `Añadir ${etiqueta}`, disabled: valor >= max, onclick: () => alCambiar(valor + 1) }, '+'));

  const conmutar = (a) => {
    st.sel = st.sel.includes(a) ? st.sel.filter((x) => x !== a) : [...st.sel, a];
    st.msg = ''; st.error = false;
    // si con lo elegido ya no son libres las fechas, se vuelven a pedir
    if (st.ini && st.fin && !rangoLibre(st.ini, st.fin)) { st.fin = null; st.msg = 'Con ese alojamiento hay noches ocupadas: elige otra vez la salida.'; }
    pintar();
  };

  const resumen = () => {
    const n = st.ini && st.fin ? noches(st.ini, st.fin) : 0;
    const partes = [];
    partes.push(h('dl', { class: 'm-fechas' },
      h('div', null, h('dt', null, 'Llegada'), h('dd', { id: 'm-llega' }, st.ini ? fmtDia.format(fecha(st.ini)) : 'elige un día')),
      h('div', null, h('dt', null, 'Salida'), h('dd', { id: 'm-sale' }, st.fin ? fmtDia.format(fecha(st.fin)) : '—'))));
    partes.push(h('div', { class: 'm-fila' },
      h('span', null, h('span', { class: 'm-et' }, 'Personas'), h('br'), h('small', null, st.modo === 'casa' ? `la casa entera, hasta ${CASA}` : st.sel.length ? `caben ${capacidad()} en lo elegido` : 'cuna gratis')),
      contador(st.personas, 1, topePersonas(), (v) => { st.personas = v; st.msg = ''; st.error = false; pintar(); }, 'personas')));
    if (st.modo === 'aloj') {
      const lista = h('ul', { class: 'm-alojs', 'aria-label': 'Alojamientos' });
      ORDEN.forEach((a) => {
        const A = ALOJ[a], el = st.sel.includes(a);
        const ok = st.ini && st.fin ? libreRango(a, st.ini, st.fin) : null;
        lista.append(h('li', { class: 'm-aloj' + (el ? ' es-elegido' : ''), 'data-aloj': a },
          h('div', null,
            h('h4', null, A.n),
            h('p', null, `${A.d} · hasta ${A.plazas} · ${A.precio} € por persona y noche`),
            ok === null ? null : h('p', { class: 'm-libre' + (ok ? '' : ' es-ocupado') }, ok ? 'Libre esas noches' : 'Ocupado alguna de esas noches')),
          h('button', { type: 'button', 'aria-pressed': String(el), 'aria-label': `${el ? 'Quitar' : 'Elegir'} ${A.n}`, disabled: !el && ok === false, onclick: () => conmutar(a) }, el ? 'Elegido' : 'Elegir')));
      });
      partes.push(lista);
      // no caben: propuesta con lo que está libre
      if (n && st.sel.length && capacidad() < st.personas) {
        const p = propuesta();
        partes.push(h('div', { class: 'm-propuesta', id: 'm-propuesta' },
          h('p', null, `Sois ${st.personas} y en lo elegido caben ${capacidad()}.` + (p ? ` Esas noches están libres y caben: ${p.map((a) => ALOJ[a].n + ' (' + ALOJ[a].plazas + ')').join(' + ')}.` : ' Esas noches no queda sitio para todos: prueba otras fechas o la casa entera.')),
          p && !igual(p, st.sel) ? h('button', { type: 'button', class: 'btn-sec', id: 'm-usar-propuesta', onclick: () => { st.sel = p; st.msg = ''; pintar(); } }, 'Usar esta propuesta') : null));
      }
    } else {
      partes.push(h('p', { class: 'm-msg' }, `La casa entera: los cinco alojamientos y la zona común, hasta ${CASA} personas, para un grupo o un retiro. Manolo te dice el precio para esas fechas.`));
    }
    partes.push(h('label', { class: 'm-casilla' }, h('input', { type: 'checkbox', id: 'm-perro', checked: st.perro, onchange: (e) => { st.perro = e.target.checked; pintar(); } }), h('b', null, 'Viajo con perro'), ' ', h('span', null, '(gratis)')));
    partes.push(h('label', { class: 'm-casilla' }, h('input', { type: 'checkbox', id: 'm-cenas', checked: st.cenas, onchange: (e) => { st.cenas = e.target.checked; pintar(); } }), h('b', null, 'Cenas veganas'), ' ', h('span', null, '(se reservan con un día de antelación; precio por confirmar)')));
    const filas = [h('dt', null, 'Noches'), h('dd', { id: 'm-noches' }, n || '—')];
    if (st.modo === 'aloj') filas.push(h('dt', null, 'Alojamiento'), h('dd', { id: 'm-elegidos' }, st.sel.length ? reparto().map(([a, k]) => `${ALOJ[a].n} · ${plural(k, 'persona', 'personas')}`).join(' + ') || '—' : '—'));
    if (st.perro) filas.push(h('dt', null, 'Perro'), h('dd', null, 'gratis'));
    if (st.cenas) filas.push(h('dt', null, 'Cenas'), h('dd', { id: 'm-cenas-txt' }, n ? `${st.personas * n} cenas · precio por confirmar` : 'precio por confirmar'));
    filas.push(h('dt', null, 'Total'), h('dd', { class: 'm-suma', id: 'm-total' }, !n ? '—' : st.modo === 'casa' ? 'a consultar' : st.sel.length ? eur(total()) : '—'));
    if (st.modo === 'aloj' && n && st.sel.length) filas.push(h('dt', null, 'Pago'), h('dd', null, 'en la casa, al llegar'));
    partes.push(h('dl', { class: 'm-total' }, filas));
    const listo = n && (st.modo === 'casa' || st.sel.length > 0);
    partes.push(h('button', { type: 'button', class: 'btn', id: 'm-seguir', disabled: !listo, onclick: seguir }, st.modo === 'casa' ? 'Pedir precio' : 'Seguir'));
    partes.push(h('p', { class: 'm-msg' + (st.error ? ' es-error' : ''), id: 'm-msg', 'aria-live': 'polite' }, st.msg));
    return h('div', { class: 'm-res' }, partes);
  };

  // al cambiar de paso el motor cambia de alto: que su principio quede a la vista bajo la cabecera
  const alMotor = () => { if (raiz.getBoundingClientRect().top < 0) raiz.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
  const seguir = () => {
    if (st.modo === 'aloj' && capacidad() < st.personas) {
      st.msg = `En lo elegido caben ${capacidad()} y sois ${st.personas}. Añade otro alojamiento o usa la propuesta.`; st.error = true; pintar(); return;
    }
    st.paso = 'datos'; st.msg = ''; st.error = false; pintar();
    alMotor();
    document.getElementById('m-nombre')?.focus({ preventScroll: true });
  };

  const lineas = () => (st.modo === 'casa' ? 'La casa entera' : reparto().map(([a]) => ALOJ[a].n).join(' + '));
  const formulario = () => {
    const v = st.datos;
    const campo = (id, et, attrs) => h('div', { class: 'm-campo' },
      h('label', { for: id }, et), h('input', Object.assign({ id, name: id, value: v[id] || '' }, attrs)));
    const horas = h('select', { id: 'm-hora', name: 'm-hora' }, h('option', { value: '' }, 'Elige una hora'), ['15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'].map((x) => h('option', { value: x, selected: v['m-hora'] === x }, x)));
    const area = h('textarea', { id: 'm-notas', name: 'm-notas', rows: '3' }); area.value = v['m-notas'] || '';
    const n = noches(st.ini, st.fin);
    return h('form', { class: 'm-datos', novalidate: true, onsubmit: confirmar },
      h('p', { class: 'm-campo ancho' }, h('b', null, `${fmtDia.format(fecha(st.ini))} → ${fmtDia.format(fecha(st.fin))} · ${plural(n, 'noche', 'noches')}`), h('br'),
        `${lineas()} · ${plural(st.personas, 'persona', 'personas')}${st.perro ? ' y un perro' : ''}${st.cenas ? ' · con cenas veganas' : ''}`, st.modo === 'aloj' ? ` · ${eur(total())}` : ' · precio a consultar'),
      campo('m-nombre', 'Nombre y apellidos', { type: 'text', autocomplete: 'name', required: true }),
      campo('m-correo', 'Correo', { type: 'email', autocomplete: 'email', required: true }),
      campo('m-tel', 'Móvil', { type: 'tel', autocomplete: 'tel', required: true }),
      h('div', { class: 'm-campo' }, h('label', { for: 'm-hora' }, 'Hora de llegada (15:00–22:00)'), horas),
      h('div', { class: 'm-campo ancho' }, h('label', { for: 'm-notas' }, st.cenas ? 'Algo que debamos saber (alergias, qué noches queréis cenar…)' : 'Algo que debamos saber (opcional)'), area),
      h('label', { class: 'm-acepto' }, h('input', { type: 'checkbox', id: 'm-ok', checked: !!v['m-ok'] }), h('span', null, 'He leído la ', h('a', { href: 'privacidad.html' }, 'política de privacidad'), '.')),
      h('p', { class: 'm-msg es-error m-campo ancho', id: 'm-error', 'aria-live': 'assertive' }, st.msg),
      h('div', { class: 'm-botones' },
        h('button', { type: 'submit', class: 'btn' }, st.modo === 'casa' ? 'Enviar la petición' : 'Confirmar la reserva'),
        h('button', { type: 'button', class: 'btn-sec', onclick: () => { guardar(); st.paso = 'fechas'; st.msg = ''; pintar(); } }, 'Volver a las fechas')),
      h('p', { class: 'supuestos m-campo ancho' }, 'Demostración: al confirmar no se envía nada. ' + (st.modo === 'casa' ? 'En la web real, Manolo te contestaría con el precio.' : 'En la web real, la casa confirmaría la reserva y se pagaría al llegar.')));
  };
  const guardar = () => {
    ['m-nombre', 'm-correo', 'm-tel', 'm-hora', 'm-notas'].forEach((id) => { const el = document.getElementById(id); if (el) st.datos[id] = el.value; });
    const ok = document.getElementById('m-ok'); if (ok) st.datos['m-ok'] = ok.checked;
  };

  function confirmar(e) {
    e.preventDefault();
    guardar();
    const v = st.datos, faltan = [];
    if (!v['m-nombre'] || v['m-nombre'].trim().length < 2) faltan.push(['m-nombre', 'el nombre']);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v['m-correo'] || '')) faltan.push(['m-correo', 'un correo válido']);
    if ((v['m-tel'] || '').replace(/\D/g, '').length < 9) faltan.push(['m-tel', 'un móvil']);
    if (!v['m-hora']) faltan.push(['m-hora', 'la hora de llegada']);
    if (!v['m-ok']) faltan.push(['m-ok', 'aceptar la privacidad']);
    document.querySelectorAll('#motor [aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
    if (faltan.length) {
      const txt = faltan.map((f) => f[1]);
      document.getElementById('m-error').textContent = 'Falta ' + (txt.length > 1 ? txt.slice(0, -1).join(', ') + ' y ' + txt[txt.length - 1] : txt[0]) + '.';
      faltan.forEach(([id]) => document.getElementById(id).setAttribute('aria-invalid', 'true'));
      document.getElementById(faltan[0][0]).focus();
      return;
    }
    const num = String(Math.floor(azar(v['m-nombre'] + st.ini + st.fin + Date.now()) * 900) + 100);
    st.loc = `CAS-${st.ini.slice(2).replace(/-/g, '')}-${num}`;
    st.paso = 'hecho'; pintar();
    alMotor();
    raiz.querySelector('.m-hecho h3')?.focus({ preventScroll: true });
  }

  const hecho = () => {
    const n = noches(st.ini, st.fin);
    return h('div', { class: 'm-hecho' },
      h('h3', { tabindex: '-1' }, st.modo === 'casa' ? 'Petición de precio anotada' : 'Reserva anotada'),
      h('p', { class: 'm-loc', id: 'm-loc' }, st.loc),
      h('p', null, `${fmtLargo.format(fecha(st.ini))} → ${fmtLargo.format(fecha(st.fin))} · ${plural(n, 'noche', 'noches')}`),
      h('p', null, `${lineas()} · ${plural(st.personas, 'persona', 'personas')}${st.perro ? ' y un perro (gratis)' : ''}`),
      st.cenas ? h('p', null, `Cenas veganas: ${st.personas * n} cenas, con el precio por confirmar. Se cierran con un día de antelación.`) : null,
      h('p', null, st.modo === 'casa' ? 'Manolo te escribiría con el precio de la casa entera para esas fechas.' : `Total del alojamiento: ${eur(total())}. Pago en la casa, al llegar. Llegada entre las ${st.datos['m-hora']} y las 22:00.`),
      h('p', { class: 'demo-aviso' }, h('b', null, 'Es una demostración: '), 'no se ha enviado, guardado ni cobrado nada. Para reservar de verdad, llama o escribe por WhatsApp al ', h('span', { class: 'tel-num' }, TEL), '.'),
      h('button', { type: 'button', class: 'btn-sec', onclick: () => { Object.assign(st, nuevo(), { modo: st.modo }); pintar(); } }, 'Hacer otra prueba'));
  };

  function pintar() {
    const foco = document.activeElement && raiz.contains(document.activeElement) ? document.activeElement.dataset.k : null;
    raiz.textContent = '';
    const modo = h('div', { class: 'm-modo', role: 'group', 'aria-label': 'Qué reservas' },
      h('button', { type: 'button', 'aria-pressed': String(st.modo === 'aloj'), onclick: () => cambiarModo('aloj') }, 'Por alojamiento'),
      h('button', { type: 'button', 'aria-pressed': String(st.modo === 'casa'), onclick: () => cambiarModo('casa') }, 'La casa entera'));
    const pasos = h('ol', { class: 'm-pasos', 'aria-label': 'Pasos' },
      [['fechas', 'Fechas'], ['datos', 'Tus datos'], ['hecho', 'Listo']].map(([k, t], i) => h('li', { 'aria-current': st.paso === k ? 'step' : null }, h('b', null, i + 1), t)));
    raiz.append(h('div', { class: 'm-cab' }, st.paso === 'fechas' ? modo : h('span'), pasos));
    if (st.paso === 'fechas') raiz.append(h('div', { class: 'm-cuerpo' }, calendario(), resumen()));
    else if (st.paso === 'datos') raiz.append(formulario());
    else raiz.append(hecho());
    if (foco) raiz.querySelector(`[data-k="${foco}"]`)?.focus();
  }

  const cambiarModo = (m) => {
    if (st.modo === m) return;
    st.modo = m; st.ini = st.fin = null; st.sel = []; st.error = false;
    st.msg = m === 'casa' ? 'La casa entera solo se puede pedir los días en que está libre del todo.' : '';
    if (m === 'aloj' && st.personas > CASA) st.personas = CASA;
    pintar();
  };

  /* ---------- API para la portada, las fichas y las pruebas ---------- */
  const valido = (ini, fin) => (st.modo === 'casa' ? casaRango(ini, fin) : st.sel.length ? st.sel.every((a) => libreRango(a, ini, fin)) : !!propuestaPara(ini, fin, st.personas));
  const propuestaPara = (ini, fin, personas) => { const g = [st.ini, st.fin]; st.ini = ini; st.fin = fin; const p = propuesta(personas); [st.ini, st.fin] = g; return p; };
  const primeraLibre = (desde, nn) => {
    let k = desde && desde >= HOY ? desde : sumar(HOY, 1);
    for (let i = 0; i < 400; i++, k = sumar(k, 1)) if (valido(k, sumar(k, nn))) return k;
    return null;
  };
  const preparar = (o = {}) => {
    st.paso = 'fechas'; st.msg = ''; st.error = false;
    if (o.modo && o.modo !== st.modo) { st.modo = o.modo; st.sel = []; }
    if (o.personas) st.personas = Math.max(1, Math.min(CASA, o.personas));
    if (o.aloj && ALOJ[o.aloj]) {
      // «Ver fechas» de una ficha: ese alojamiento y su primer fin de semana libre
      st.modo = 'aloj'; st.sel = [o.aloj];
      st.personas = Math.min(ALOJ[o.aloj].plazas, Math.max(2, st.personas > ALOJ[o.aloj].plazas ? 2 : st.personas));
      let k = sumar(HOY, 1);
      for (let i = 0; i < 300; i++, k = sumar(k, 1)) if (fecha(k).getDay() === 5 && libreRango(o.aloj, k, sumar(k, 2))) break;
      st.ini = k; st.fin = sumar(k, 2);
      st.msg = `${ALOJ[o.aloj].n}: te proponemos su primer fin de semana libre. Cambia las fechas si quieres.`;
    } else if (o.ini) {
      if (st.modo === 'aloj') st.sel = [];
      st.ini = o.ini; st.fin = o.fin || sumar(o.ini, 2);
      const nn = noches(st.ini, st.fin);
      if (!valido(st.ini, st.fin)) {
        const otra = primeraLibre(o.ini, nn);
        st.msg = `Del ${fmtDia.format(fecha(st.ini))} al ${fmtDia.format(fecha(st.fin))} no hay sitio para ${plural(st.personas, 'persona', 'personas')}.` + (otra ? ` Te enseñamos la primera fecha libre: ${fmtDia.format(fecha(otra))}.` : '');
        if (otra) { st.ini = otra; st.fin = sumar(otra, nn); } else { st.ini = st.fin = null; }
      }
      if (st.modo === 'aloj' && st.ini && st.fin) { const p = propuesta(); if (p) st.sel = p; }
    }
    if (st.ini) st.mes = primeroMes(st.ini);
    pintar();
  };

  document.addEventListener('castineira:rehacer', () => { if (st.paso === 'datos') guardar(); if (st.paso !== 'hecho') pintar(); });   // solo al cambiar de ancho, nunca por la barra del móvil
  window.CASTINEIRAmotor = { preparar };
  window.__motor = { st, ALOJ, ORDEN, libre, libreRango, nocheVacia, casaRango, estado, rangoLibre, propuesta, preparar, primeraLibre, sumar, HOY, elegir, cambiarModo, capacidad, total };
  pintar();
})();
