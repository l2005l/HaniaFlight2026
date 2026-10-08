#!/usr/bin/env python3
"""Build data/israel-dem.bin: real ground heights for the Israel theatre.

Downloads SRTM 1-arc-second tiles (the public "skadi" set on AWS), averages them down to about 240 m,
then samples the game grid: 700 m cells, X east and Z south of Ramat David, in metres.
Output: little-endian int16 heights, row by row from north to south. The Mediterranean and Red Sea are 0;
the Jordan rift and the Dead Sea keep their real heights below sea level.
Keep the constants in step with ISR in src/core.js.
"""
import gzip, io, math, os, sys, urllib.request
import numpy as np

LAT0, LON0 = 32.6653, 35.1797          # Ramat David
LAT_N, LAT_S, LON_W, LON_E = 33.65, 29.45, 34.15, 36.65
CELL = 700
KX = 111320 * math.cos(math.radians(LAT0)); KZ = 110574
X0 = (LON_W - LON0) * KX; Z0 = -(LAT_N - LAT0) * KZ
NX = int(math.ceil((LON_E - LON_W) * KX / CELL)) + 1
NZ = int(math.ceil((LAT_N - LAT_S) * KZ / CELL)) + 1
DS = 8                                   # 3600 / 8 = 450 samples per degree (~240 m)

def tile(lat, lon):
    name = f"N{lat:02d}E{lon:03d}"
    url = f"https://s3.amazonaws.com/elevation-tiles-prod/skadi/N{lat:02d}/{name}.hgt.gz"
    for attempt in range(4):
        try:
            raw = gzip.decompress(urllib.request.urlopen(url, timeout=120).read())
            break
        except Exception as e:
            print("retry", name, e, file=sys.stderr)
    else:
        raise SystemExit("could not download " + name)
    n = int(round(math.sqrt(len(raw) // 2)))
    a = np.frombuffer(raw, dtype=">i2").reshape(n, n).astype(np.float32)
    a[a < -1000] = 0                     # voids
    a = a[:n - 1, :n - 1]                # drop the shared edge row/column
    k = (n - 1) // (3600 // DS)
    return a.reshape(3600 // DS, k, 3600 // DS, k).mean(axis=(1, 3))

lats = list(range(int(math.floor(LAT_S)), int(math.floor(LAT_N)) + 1))
lons = list(range(int(math.floor(LON_W)), int(math.floor(LON_E)) + 1))
S = 3600 // DS
mosaic = np.zeros((len(lats) * S, len(lons) * S), np.float32)
for i, lat in enumerate(reversed(lats)):          # north first
    for j, lon in enumerate(lons):
        print("tile", lat, lon, flush=True)
        mosaic[i * S:(i + 1) * S, j * S:(j + 1) * S] = tile(lat, lon)
top, left = lats[-1] + 1, lons[0]                 # north-west corner of the mosaic

xs = X0 + np.arange(NX) * CELL; zs = Z0 + np.arange(NZ) * CELL
lon = LON0 + xs / KX; lat = LAT0 - zs / KZ
fr = (top - lat) * S - 0.5; fc = (lon - left) * S - 0.5
r0 = np.clip(np.floor(fr).astype(int), 0, mosaic.shape[0] - 2); c0 = np.clip(np.floor(fc).astype(int), 0, mosaic.shape[1] - 2)
tr = np.clip(fr - r0, 0, 1)[:, None]; tc = np.clip(fc - c0, 0, 1)[None, :]
R, C = r0[:, None], c0[None, :]
h = (mosaic[R, C] * (1 - tr) * (1 - tc) + mosaic[R + 1, C] * tr * (1 - tc) + mosaic[R, C + 1] * (1 - tr) * tc + mosaic[R + 1, C + 1] * tr * tc)
out = np.round(h).astype("<i2")
os.makedirs("data", exist_ok=True)
out.tofile("data/israel-dem.bin")
print("grid", NX, "x", NZ, "x0", round(X0), "z0", round(Z0), "min", int(out.min()), "max", int(out.max()))
