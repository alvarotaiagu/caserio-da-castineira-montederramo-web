// ¿Empeora el 3D el LCP? Pixel 7 emulado, 4G lento (1,6 Mbps / 750 kbps / 150 ms), CPU ×4, LCP real del navegador
// (PerformanceObserver, con la red y la CPU limitadas por CDP). Cargas intercaladas con el 3D bloqueado y sin bloquear.
// Uso: node pruebas/3d-lcp.mjs [ruta=index.html] [vueltas=4]
import { servir, lanzar, devices, PUERTO, espera } from './3d-comun.mjs';

const [ruta = 'index.html', vueltas = 4] = process.argv.slice(2);   // sin barra delante (Git Bash la convierte en ruta de Windows)
const URL_P = `http://127.0.0.1:${PUERTO}/${ruta.replace(/^\//, '')}`;
const srv = await servir(); const nav = await lanzar();

async function medir(bloquear) {
  const ctx = await nav.newContext({ ...devices['Pixel 7'] });
  try {
  if (bloquear) await ctx.route(/\/js\/3d\/|\/img\/terreno\/(orto|finca|alturas|terreno\.json)/, r => r.abort());
  const pag = await ctx.newPage();
  await pag.addInitScript(() => {
    window.__lcp = [];
    new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp.push({ t: Math.round(e.startTime), url: (e.url || e.element?.tagName || '').split('/').pop(), tam: e.size }); }).observe({ type: 'largest-contentful-paint', buffered: true });
    window.__largas = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__largas += e.duration; }).observe({ type: 'longtask', buffered: true });
  });
  const cdp = await ctx.newCDPSession(pag);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await pag.goto(URL_P, { waitUntil: 'load', timeout: 120000 });
  await espera(14000);   // la cortina, el 3D detrás y lo que tarde en pintar
  const r = await pag.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0], lcp = window.__lcp.at(-1) || {};
    const tres = performance.getEntriesByType('resource').filter(x => /js\/3d\/(?!arranque)|img\/terreno\/(orto|finca|alturas)/.test(x.name));
    return { lcp: lcp.t, url: lcp.url, load: Math.round(nav.loadEventStart), primer3d: tres.length ? Math.round(Math.min(...tres.map(x => x.startTime))) : null,
      con3d: document.getElementById('vuelo')?.classList.contains('con-3d'), largas: Math.round(window.__largas) };
  });
  return r;
  } finally { await ctx.close(); }
}

const filas = { sin: [], con: [] };
try {
for (let i = 0; i < +vueltas; i++) for (const k of i % 2 ? ['con', 'sin'] : ['sin', 'con']) {
  const r = await medir(k === 'sin');
  filas[k].push(r);
  console.log(`${k === 'sin' ? '3D bloqueado' : '3D activo  '}  LCP ${String(r.lcp).padStart(5)} ms (${r.url})  load ${r.load} ms  primer pedido 3D ${r.primer3d ?? '—'} ms  con-3d ${r.con3d}  tareas largas ${r.largas} ms`);
}
} finally { await nav.close(); srv.close(); }
const mediana = a => { const s = a.map(x => x.lcp).sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : Math.round((s[s.length / 2 - 1] + s[s.length / 2]) / 2); };
console.log(`\n${ruta}: LCP mediano con el 3D bloqueado ${mediana(filas.sin)} ms · con el 3D ${mediana(filas.con)} ms (${vueltas} cargas de cada)`);
