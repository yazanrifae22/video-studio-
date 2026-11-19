"""Plan n=4 (deepest trenches): fetch NOAA NCEI ETOPO 2022 15 arc-second relief (public domain) around each trench via OPeNDAP
(stitching 15-degree tiles) and save .npy grids (north up) for scripts/pe-trench-graphics.py. Usage: python scripts/pe-trench-fetch.py <outdir>
Data: NOAA National Centers for Environmental Information (2022). ETOPO 2022 15 Arc-Second Global Relief Model. doi:10.25921/fd45-gt74
Box: 9:16 portrait in ground distance (lat span = lon span * 16/9 * cos(lat)); the trench's deepest area sits 40 % from the top."""
import math, os, sys, urllib.request
import numpy as np

TILE = "https://www.ngdc.noaa.gov/thredds/dodsC/global/ETOPO2022/15s/15s_surface_elev_netcdf/ETOPO_2022_v1_15s_{}_surface.nc"
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
STEP = 1 / 240
# (deep lat, deep lon, lon span) - deep point = ETOPO 2022 deepest cell found per trench (scratch query 2026-10-28)
SITES = {
    'mariana': (11.356, 142.435, 4.0),
    'tonga': (-23.227, -174.731, 4.0),
    'kermadec': (-31.769, -177.185, 4.0),
    'philippine': (9.410, 126.935, 4.0),
    'izu': (29.077, 142.848, 4.0),
}


def get(u):
    with urllib.request.urlopen(u, timeout=300) as r:
        return r.read().decode()


def tile_name(n_edge, w_edge):
    return ("N" if n_edge >= 0 else "S") + f"{abs(n_edge):02d}" + ("E" if w_edge >= 0 else "W") + f"{abs(w_edge):03d}"


def fetch(lat0, lat1, lon0, lon1):
    """rows = lat ascending from lat0, cols = lon ascending from lon0, 15 s cells."""
    lat0, lat1, lon0, lon1 = (round(v / STEP) * STEP for v in (lat0, lat1, lon0, lon1))  # snap to the 15 s grid
    nr = int(round((lat1 - lat0) / STEP)); nc = int(round((lon1 - lon0) / STEP))
    z = np.full((nr, nc), np.nan, np.float32)
    for s_edge in range(int(math.floor(lat0 / 15) * 15), int(math.ceil(lat1 / 15) * 15), 15):
        for w_edge in range(int(math.floor(lon0 / 15) * 15), int(math.ceil(lon1 / 15) * 15), 15):
            a0, a1 = max(lat0, s_edge), min(lat1, s_edge + 15); b0, b1 = max(lon0, w_edge), min(lon1, w_edge + 15)
            if a1 <= a0 or b1 <= b0: continue
            i0 = int(round((a0 - s_edge) / STEP)); i1 = int(round((a1 - s_edge) / STEP)) - 1
            j0 = int(round((b0 - w_edge) / STEP)); j1 = int(round((b1 - w_edge) / STEP)) - 1
            t = get(TILE.format(tile_name(s_edge + 15, w_edge)) + f".ascii?z[{i0}:1:{i1}][{j0}:1:{j1}]")
            body = t.split('---------------------------------------------', 1)[1]
            rows = []
            for line in body.splitlines():
                if line.startswith('['): rows.append([float(v) for v in line.split(',', 1)[1].split(',')])
                elif line.startswith('z.lat'): break
            blk = np.array(rows, np.float32)
            r0 = int(round((a0 - lat0) / STEP)); c0 = int(round((b0 - lon0) / STEP))
            h = min(blk.shape[0], nr - r0); w = min(blk.shape[1], nc - c0)
            z[r0:r0 + h, c0:c0 + w] = blk[:h, :w]
    return z


if __name__ == '__main__':
    only = sys.argv[2:]
    for name, (dlat, dlon, lspan) in SITES.items():
        if only and name not in only: continue
        hspan = lspan * 16 / 9 * math.cos(math.radians(dlat))
        clat = dlat - 0.10 * hspan
        z = fetch(clat - hspan / 2, clat + hspan / 2, dlon - lspan / 2, dlon + lspan / 2)[::-1]  # north up
        assert not np.isnan(z).any(), name
        np.save(os.path.join(OUT, f'{name}.npy'), z)
        print(name, z.shape, 'min', float(z.min()), 'box', (round(clat - hspan / 2, 3), round(clat + hspan / 2, 3), dlon - lspan / 2, dlon + lspan / 2))
