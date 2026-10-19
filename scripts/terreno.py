# Datos del 3D del claro (portada «el vuelo» y sección «El claro en 3D»), adaptado del tablero.
# Fuentes (descargadas para el tablero):
#   ../caserio-da-castineira-montederramo-bocetos/ref/terreno/mdt5.tif       MDT05 del IGN por WCS (CC BY 4.0)
#   ../caserio-da-castineira-montederramo-bocetos/ref/terreno/pnoa-4096.jpg  ortofoto PNOA del IGN por WMS, 4096 px
#   ../caserio-da-castineira-montederramo-bocetos/ref/terreno/finca-pnoa.jpg la finca de cerca (PNOA, ~0,3 m/px)
#   ../caserio-da-castineira-montederramo-bocetos/ref/osm.json               aerogeneradores (power=generator) y la cumbre (© OpenStreetMap)
# Caja: lat 42,262–42,362, lon −7,530 – −7,370 (unos 13,2 × 11,1 km: la casa, la sierra con sus molinos y Montederramo)
# Finca: lat 42,3095–42,3150, lon −7,4540 – −7,4455 (unos 700 × 610 m alrededor de la casa)
#
# Salida en img/terreno/:
#   alturas-256.bin, alturas-384.bin   Uint16 little-endian, decímetros, fila 0 = norte (móvil / escritorio)
#   orto-2048.{webp,jpg}, orto-3072.{webp,jpg}   ortofoto con gradación suave (móvil / escritorio)
#   finca-1536.{webp,jpg}, finca-2048.{webp,jpg} la finca de cerca, con el color igualado a la ortofoto (móvil / escritorio)
#   plano.{webp,jpg}   relieve sombreado sobre la ortofoto, con la finca fina encima («En plano» y plan B sin 3D)
#   terreno.json       caja, tamaños, finca, lugares, aerogeneradores y el vuelo (puntos en metros reales)
# El póster (primer fotograma del vuelo) lo hace pruebas/3d-poster.mjs con la propia escena.
#
# Uso (desde la carpeta de la web): python -I scripts/terreno.py
import json, math, pathlib, random
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
Image.MAX_IMAGE_PIXELS = None

R = pathlib.Path(__file__).resolve().parent.parent
TAB = R.parent / 'caserio-da-castineira-montederramo-bocetos'
REF = TAB / 'ref' / 'terreno'
OUT = R / 'img' / 'terreno'
OUT.mkdir(parents=True, exist_ok=True)

S, N, O, E = 42.262, 42.362, -7.530, -7.370
FS, FN, FO, FE = 42.3095, 42.3150, -7.4540, -7.4455
EX = 1.8                                      # altura del relieve ×1,8 (lo dice el pie de fuente)
lat0 = (S + N) / 2
ancho = (E - O) * 111320 * math.cos(math.radians(lat0)); alto = (N - S) * 110950
dem = np.array(Image.open(REF / 'mdt5.tif'), dtype=np.float32)   # 2220 filas × 3552 columnas
DH, DW = dem.shape

# ---------- alturas: dos mallas ----------
for n in (256, 384):
    a = np.array(Image.fromarray(dem).resize((n, n), Image.BILINEAR), dtype=np.float32)
    (OUT / f'alturas-{n}.bin').write_bytes(np.round(a * 10).astype('<u2').tobytes())

# ---------- ortofoto: gradación suave (algo más de contraste y calidez, sin saturar los verdes) ----------
def gradar(im): return ImageEnhance.Color(ImageEnhance.Contrast(im).enhance(1.12)).enhance(0.92)
orto = gradar(Image.open(REF / 'pnoa-4096.jpg').convert('RGB'))
OW, OH = orto.size
# Medidas que se dividen por 2 muchas veces (3072 × 2560, 2048 × 1792): con 4096 × 3498 a escala, los niveles pequeños
# de mipmap salen impares y la GPU dibuja una cruz clara justo en el centro del mapa, que es donde está la casa.
for lado, alto_t, qj, qw in ((2048, 1792, 62, 46), (3072, 2560, 64, 50)):
    o = orto.resize((lado, alto_t), Image.LANCZOS)
    o.save(OUT / f'orto-{lado}.jpg', quality=qj, optimize=True, progressive=True)
    o.save(OUT / f'orto-{lado}.webp', quality=qw, method=6)

# ---------- la finca de cerca: misma gradación y el color igualado (media y contraste por canal) al trozo de ortofoto ----------
finca = gradar(Image.open(REF / 'finca-pnoa.jpg').convert('RGB'))
caja_o = ((FO - O) / (E - O) * OW, (N - FN) / (N - S) * OH, (FE - O) / (E - O) * OW, (N - FS) / (N - S) * OH)
trozo = np.array(orto.crop(tuple(round(v) for v in caja_o)), dtype=np.float32)
f = np.array(finca, dtype=np.float32)
fb = np.array(finca.filter(ImageFilter.GaussianBlur(6)), dtype=np.float32)   # el detalle fino no cuenta para la media
for c in range(3):
    m0, s0, m1, s1 = fb[..., c].mean(), fb[..., c].std(), trozo[..., c].mean(), trozo[..., c].std()
    k = .7   # se acerca un 70 %: el borde difuminado ya hace el resto
    f[..., c] = (f[..., c] - m0) * (1 + k * (s1 / s0 - 1)) + m0 + k * (m1 - m0)
finca = Image.fromarray(np.clip(f, 0, 255).astype('uint8'))
for lado, alto_t, qj, qw in ((1536, 960, 72, 56), (2048, 1280, 74, 60)):   # medidas que se dividen por 2 muchas veces
    o = finca.resize((lado, alto_t), Image.LANCZOS)
    o.save(OUT / f'finca-{lado}.jpg', quality=qj, optimize=True, progressive=True)
    o.save(OUT / f'finca-{lado}.webp', quality=qw, method=6)

# ---------- plano: sombreado del relieve sobre la ortofoto (luz del noroeste), con la finca fina encima ----------
PW = 1400; PH = round(PW * alto / ancho)
d = np.array(Image.fromarray(dem).resize((PW, PH), Image.BILINEAR), dtype=np.float32)
celda = ancho / PW
gy, gx = np.gradient(d * EX, celda)            # con la misma exageración que el 3D
az, al = math.radians(315), math.radians(40)
sl = np.arctan(np.hypot(gx, gy)); asp = np.arctan2(-gx, gy)
hs = np.clip(math.sin(al) * np.cos(sl) + math.cos(al) * np.sin(sl) * np.cos(az - asp), 0, 1)
o = np.array(orto.resize((PW, PH), Image.LANCZOS), dtype=np.float32) / 255
img = np.clip(o * (0.38 + 0.82 * hs[..., None]), 0, 1)
plano = Image.fromarray((img * 255).astype('uint8'))
(plano.save(OUT / 'plano.jpg', quality=74, optimize=True, progressive=True), plano.save(OUT / 'plano.webp', quality=72, method=6))

# ---------- lugares ----------
def local(lat, lon): return [round((lon - (O + E) / 2) / (E - O) * ancho, 1), round(((S + N) / 2 - lat) / (N - S) * alto, 1)]
def cota(lat, lon):   # bilineal sobre el MDT05
    r = (N - lat) / (N - S) * (DH - 1); c = (lon - O) / (E - O) * (DW - 1); r0, c0 = int(r), int(c); fr, fc = r - r0, c - c0
    return float(dem[r0, c0] * (1 - fr) * (1 - fc) + dem[r0, c0 + 1] * (1 - fr) * fc + dem[r0 + 1, c0] * fr * (1 - fc) + dem[r0 + 1, c0 + 1] * fr * fc)
def uv(lat, lon): return [round((lon - O) / (E - O), 5), round((N - lat) / (N - S), 5)]
osm = json.load(open(TAB / 'ref' / 'osm.json', encoding='utf-8'))
cumbre = next(e for e in osm['elements'] if e.get('tags', {}).get('natural') == 'peak' and e['tags'].get('name') == 'A Pena da Cruz')
# t: rótulo; ele: altitud que se escribe (la de OSM para la cumbre; el resto, la del MDT05)
# La casa se marca en sus tejados tal como salen en la foto aérea fina (42,31236 N, 7,44984 O): la coordenada de
# Escapada Rural (42,31216; −7,44980; la que usa el sol) cae unos 22 m al sur, en el prado.
L = {'casa': ('Caserío da Castiñeira', 42.31236, -7.44984, 917),
     'cumbre': ('A Pena da Cruz', cumbre['lat'], cumbre['lon'], float(cumbre['tags']['ele'])),
     'sas': ('Sas do Monte', 42.3086975, -7.4456128, None),
     'montederramo': ('Mosteiro de Montederramo', 42.27444, -7.50259, None)}
lugares = {}
for k, (t, la, lo, ele) in L.items():
    h = cota(la, lo)
    lugares[k] = {'t': t, 'xz': local(la, lo), 'h': round(h, 1), 'ele': round(ele if ele else h), 'uv': uv(la, lo)}

# ---------- aerogeneradores (OSM power=generator dentro de la caja): x, z, cota del pie, giro (rumbo al que mira el rotor) ----------
azar = random.Random(17)
aeros = []
for e in osm['elements']:
    if e.get('tags', {}).get('power') == 'generator':
        c = e.get('center', e); la, lo = c['lat'], c['lon']
        if S < la < N and O < lo < E:
            # el rotor mira al suroeste (±12°): orientación de dibujo, no un dato
            aeros.append([*local(la, lo), round(cota(la, lo), 1), round(225 + azar.uniform(-12, 12), 1)])
# medidas de dibujo (mundo): torre 144 de alto, palas de 40 (las del tablero); en metros del altímetro, el buje a 80 m
TORRE, PALA = 144, 40

# ---------- el vuelo: de la sierra (nordeste) al tejado ----------
def xz_de_uv(u, v): return [(u - .5) * ancho, (v - .5) * alto]
def suelo_m(x, z):
    c = (x / ancho + .5) * (DW - 1); r = (z / alto + .5) * (DH - 1)
    return float(dem[int(min(DH - 1, max(0, round(r)))), int(min(DW - 1, max(0, round(c))))])
def techo(x, z, radio):   # lo más alto del suelo en un círculo
    c = (x / ancho + .5) * (DW - 1); r = (z / alto + .5) * (DH - 1); rc = radio / ancho * DW; rr = radio / alto * DH
    v = dem[int(max(0, r - rr)):int(min(DH, r + rr + 1)), int(max(0, c - rc)):int(min(DW, c + rc + 1))]
    return float(v.max())
casa = lugares['casa']
# Por la ladera noroeste de la sierra, en paralelo a la fila de molinos (a más de 400 m de ellos), bajando hasta la casa.
# Llega desde el estenordeste y se queda a ~140 m de la casa y ~88 m por encima del tejado: se ven los tejados y el claro.
P = [xz_de_uv(u, v) + [h] for u, v, h in ((.905, .158, 1730), (.835, .228, 1610), (.755, .292, 1480), (.665, .362, 1320), (.592, .425, 1175), (.543, .465, 1075))]
rumbo = math.radians(62)   # desde dónde se mira la casa al final (estenordeste)
fin = [casa['xz'][0] + math.sin(rumbo) * 140, casa['xz'][1] - math.cos(rumbo) * 140, casa['h'] + 88]
P.append(fin)
for p in P[:-1]:   # nada a menos de 90 m del suelo en 200 m a la redonda
    p[2] = max(p[2], techo(p[0], p[1], 200) + 90)
vuelo = [[round(x, 1), round(h, 1), round(z, 1)] for x, z, h in P]

# comprobación: distancia del vuelo (líneas entre puntos, cada 20 m) a los molinos; el pie de los molinos va en el mundo a cota·EX
def dist_aeros():
    peor = (1e9, None)
    for (x0, h0, z0), (x1, h1, z1) in zip(vuelo, vuelo[1:]):
        pasos = max(1, int(math.hypot(x1 - x0, z1 - z0) / 20))
        for i in range(pasos + 1):
            k = i / pasos; x, z, y = x0 + (x1 - x0) * k, z0 + (z1 - z0) * k, (h0 + (h1 - h0) * k) * EX
            for ax, az_, ah, _ in aeros:
                top = ah * EX + TORRE + PALA
                dh = math.hypot(x - ax, z - az_); dv = max(0, y - top)
                dd = math.hypot(dh, dv) if y > top else dh
                if dd < peor[0]: peor = (dd, (round(x), round(z), round(y / EX)))
    return peor

meta = {'caja': {'s': S, 'n': N, 'o': O, 'e': E}, 'ancho': round(ancho, 1), 'alto': round(alto, 1), 'mallas': [256, 384],
        'min': float(dem.min()), 'max': float(dem.max()), 'exageracion': EX,
        'plano': {'w': PW, 'h': PH},
        'finca': {'s': FS, 'n': FN, 'o': FO, 'e': FE, 'uv0': uv(FN, FO), 'uv1': uv(FS, FE)},
        'lugares': lugares,
        'aeros': aeros, 'aero': {'torre': TORRE, 'pala': PALA},
        'vuelo': vuelo,
        'fuente': 'MDT05 y ortofoto PNOA © Instituto Geográfico Nacional (CC BY 4.0). Aerogeneradores: © OpenStreetMap'}
(OUT / 'terreno.json').write_text(json.dumps(meta, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('caja km', round(ancho / 1000, 2), round(alto / 1000, 2), '· molinos', len(aeros), '· casa', casa)
print('vuelo (m, suelo):', [(round(p[1]), round(suelo_m(p[0], p[2]))) for p in vuelo])
print('molino más cercano al vuelo (mundo):', dist_aeros())
for p in sorted(OUT.iterdir()): print(f'{p.name:30} {p.stat().st_size // 1024:6} KB')
