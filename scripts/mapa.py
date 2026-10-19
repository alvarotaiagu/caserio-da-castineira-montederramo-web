# «Dibuja mi mapa»: el papel de la comarca y los datos de las rutas.
#  - Papel: relieve sombreado + agua del Sil + curvas de nivel cada 50 m (más marcadas cada 250 m),
#    del MDT25 © IGN (CC BY 4.0). Caja lat 42,20–42,50 · lon −7,80 – −7,25.
#    Sale en dos anchos (1800 para la vista general y 3600 para acercarse y para el PNG que se descarga),
#    cada uno en AVIF, WebP y JPG: img/mapa/papel-<ancho>.<ext>
#  - Datos: img/mapa/rutas.json — el sistema de coordenadas es siempre 1800 × 1324 «unidades de mapa»
#    (las posiciones van en % de la caja); los trazados de los 7 PR-G (OpenStreetMap, aproximados),
#    su perfil de altura (MDT), los minutos en coche (OSRM) y los lugares.
#    Las cifras que se enseñan (km y desnivel de Manolo) NO salen de aquí: están en partes/mapa.html.
# Fuentes en ../caserio-da-castineira-montederramo-bocetos/ref/ (rutas_proc.json, coche.json, lugares.json,
# terreno/mdt25-ribeira.tif); se regeneran con ref/rutas_proc.py, ref/coche.py y ref/lugares.py de allí.
# Uso (desde la carpeta de la web):  python -I scripts/mapa.py
# Necesita numpy, opencv-python y Pillow; para AVIF/WebP llama a node con sharp
# (createRequire de C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/).
import json, math, pathlib, subprocess, tempfile
import numpy as np, cv2
from PIL import Image
Image.MAX_IMAGE_PIXELS = None

WEB = pathlib.Path(__file__).resolve().parent.parent
REF = WEB.parent / 'caserio-da-castineira-montederramo-bocetos' / 'ref'
SAL = WEB / 'img' / 'mapa'
SAL.mkdir(parents=True, exist_ok=True)
S, N, O, E = 42.20, 42.50, -7.80, -7.25
LAT0 = math.radians((S + N) / 2)
UW = 1800                                             # unidades de mapa (ancho lógico)
UH = round(UW * (N - S) * 110950 / ((E - O) * 111320 * math.cos(LAT0)))   # 1324
ANCHOS = [1800, 3600]
CALIDAD = {1800: (50, 74), 3600: (42, 64)}   # (AVIF, WebP): el grande se ve a 2–4 aumentos, aguanta más compresión

d0 = np.array(Image.open(REF / 'terreno' / 'mdt25-ribeira.tif'), dtype=np.float32)   # 2442 × 1332, ~18 m/px


def papel(W):
    """Pinta el papel a W px de ancho. Los grosores van en proporción a 1800 para que se vea igual."""
    k = W / UW
    H = round(UH * k)
    d = cv2.resize(d0, (W, H), interpolation=cv2.INTER_CUBIC)
    d = cv2.GaussianBlur(d, (0, 0), 1.2 * k)
    m = (E - O) * 111320 * math.cos(LAT0) / W     # metros por píxel
    gy, gx = np.gradient(d, m)
    az, al = math.radians(315), math.radians(40)
    sl = np.arctan(np.hypot(gx, gy) * 1.7)
    asp = np.arctan2(-gx, gy)
    hs = np.clip(math.sin(al) * np.cos(sl) + math.cos(al) * np.sin(sl) * np.cos(az - asp), 0, 1)
    fondo = np.array([243, 236, 220], np.float32) / 255
    img = np.ones((H, W, 3), np.float32) * fondo
    sombra = (1 - hs) ** 1.3
    img = img * (1 - .34 * sombra[..., None])
    # agua: los fondos del Sil (muy bajos) en un azul de bolígrafo desvaído
    agua = np.clip((235 - d) / 70, 0, 1) ** .8
    img = img * (1 - .55 * agua[..., None]) + np.array([96, 165, 190], np.float32) / 255 * .55 * agua[..., None]
    out = (np.clip(img, 0, 1) * 255).astype(np.uint8)
    # curvas cada 50 m; con margen para que el borde no salga como un marco
    M = round(6 * k)
    dp = np.pad(d, M, mode='edge')
    lienzo = np.pad(out, ((M, M), (M, M), (0, 0)), mode='edge').copy()
    for nivel in range(100, 1800, 50):
        mask = (dp >= nivel).astype(np.uint8) * 255
        cs, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
        cs = [c for c in cs if len(c) > 60 * k]
        fuerte = nivel % 250 == 0
        col = (116, 84, 58) if fuerte else (150, 128, 108)   # sepia
        grosor = max(1, round((2 if fuerte else 1) * k))
        cv2.polylines(lienzo, cs, False, col, grosor, cv2.LINE_AA)
    return lienzo[M:-M, M:-M]


CONVERTIR = r"""
const sharp = require('module').createRequire('C:/Users/alvar/Desktop/WEBS NEGOCIOS/alvarotaiagu.github.io/')('sharp');
const [png, base, qa, qw] = process.argv.slice(1);
(async () => {
  await sharp(png).avif({ quality: +qa, effort: 6 }).toFile(base + '.avif');
  await sharp(png).webp({ quality: +qw, effort: 6 }).toFile(base + '.webp');
  await sharp(png).jpeg({ quality: 78, progressive: true, mozjpeg: true }).toFile(base + '.jpg');
})().catch(e => { console.error(e); process.exit(1); });
"""

for W in ANCHOS:
    im = papel(W)
    with tempfile.TemporaryDirectory() as t:
        png = pathlib.Path(t) / f'papel-{W}.png'
        Image.fromarray(im).save(png)
        subprocess.run(['node', '-e', CONVERTIR, str(png), str(SAL / f'papel-{W}'), *map(str, CALIDAD[W])], check=True)
    pesos = {ext: (SAL / f'papel-{W}.{ext}').stat().st_size // 1024 for ext in ('avif', 'webp', 'jpg')}
    print('papel', W, 'x', im.shape[0], pesos, 'KB')


def pc(lat, lon):
    return [round((lon - O) / (E - O) * 100, 3), round((N - lat) / (N - S) * 100, 3)]


rutas = json.load(open(REF / 'rutas_proc.json', encoding='utf-8'))
sitios = json.load(open(REF / 'lugares.json', encoding='utf-8'))
coche = json.load(open(REF / 'coche.json', encoding='utf-8'))
sal = {'w': UW, 'h': UH, 'anchos': ANCHOS, 'casa': pc(42.31216, -7.4498), 'rutas': {}, 'lugares': {},
       'fuentes': 'Trazados © OpenStreetMap (ODbL), aproximados; alturas MDT25 © IGN (CC BY 4.0); minutos en coche OSRM, por confirmar'}
for ref, r in rutas.items():
    # submuestreo del trazado a unos 80 m: suficiente para el dibujo a mano y para el perfil
    pts, L = r['pts'], r['L']
    keep = [0]
    for i in range(1, len(pts)):
        if L[i] - L[keep[-1]] >= 80 or i == len(pts) - 1:
            keep.append(i)
    sal['rutas'][ref] = {'osm': r['osm'], 'km_osm': r['km'], 'asc_osm': r['asc'], 'zmin': r['min'], 'zmax': r['max'], 'coche': coche[ref],
                         'p': [pc(*pts[i]) for i in keep], 'perfil': [[round(L[i] / 1000, 2), r['z'][i]] for i in keep]}
for k, v in sitios.items():
    sal['lugares'][k] = {'p': pc(v['lat'], v['lon']), 'min': v.get('min'), 'km': v.get('km')}
(SAL / 'rutas.json').write_text(json.dumps(sal, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('rutas.json', (SAL / 'rutas.json').stat().st_size // 1024, 'KB', {k: len(v['p']) for k, v in sal['rutas'].items()}, 'casa', sal['casa'])
