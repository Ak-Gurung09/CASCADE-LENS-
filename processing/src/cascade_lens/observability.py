"""Radar Observability: where can NISAR be trusted, for which task, and why not elsewhere.

Every pixel gets reason flags, never one blended score:

    OUTSIDE   (1)  outside the frame's footprint: not acquired
    NODATA    (2)  inside the footprint but the product has no value: not processed or masked
    LAYOVER   (4)  terrain faces the radar more steeply than the incidence angle
    SHADOW    (8)  terrain faces away more steeply than 90 deg minus the incidence angle (active shadow)
    LOWCOH   (16)  coherence of the pair below COH_MIN
    NOCC     (32)  no unwrapped phase: connected component 0, or phase exactly 0 (the product's fill in unwrapping gaps)
    LOWBASE  (64)  coherence of the pre-event (baseline) pair below COH_MIN

Classes are then decided per task, because what spoils one task does not spoil another:

    disturbance  "Did the surface change between these dates?"  Low coherence is the signal here, so it does not
                 count against the pixel. A drop can only be seen where the ground was coherent before, so the
                 baseline pair must be coherent.
    movement     "Did the ground move, and how far?"  Needs coherent phase and an unwrapped connected component.

Geometry comes from the product itself (radarGrid losUnitVector and incidenceAngle cubes) and the Copernicus DEM.
Only active layover and shadow are computed; shadow cast by distant ridges (passive shadow) is not, see LIMITS.
"""
from __future__ import annotations

import json
import pathlib
import re

import h5py
import numpy as np
import rasterio
from pyproj import Transformer
from rasterio.features import rasterize
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject
from shapely import wkt
from shapely.geometry import mapping
from shapely.ops import transform as stransform

GRID = "/science/LSAR/GUNW/grids/frequencyA"
RADAR = "/science/LSAR/GUNW/metadata/radarGrid"

OUTSIDE, NODATA, LAYOVER, SHADOW, LOWCOH, NOCC, LOWBASE = 1, 2, 4, 8, 16, 32, 64
COH_MIN = 0.3
COH_SENSITIVITY = (0.2, 0.3, 0.4)
THRESHOLDS = {
    "coherenceMin": {"value": COH_MIN, "provenance": "Project choice. 0.3 is a common lower bound for usable L-band phase; results at 0.2 and 0.4 are reported alongside so the choice can be checked."},
    "layover": {"value": "range slope toward the radar > incidence angle", "provenance": "Standard SAR geometry (layover occurs when the terrain slope facing the sensor exceeds the incidence angle)."},
    "shadow": {"value": "range slope away from the radar > 90 deg - incidence angle", "provenance": "Standard SAR geometry (active radar shadow)."},
}
LIMITS = [
    "Only active layover and shadow from the local slope. Passive shadow cast by a distant ridge is not modelled, so some shadowed valleys may be marked visible.",
    "The DEM is Copernicus GLO-30 resampled to the analysis grid; small features below the grid size are smoothed.",
    "Coherence also falls for reasons that are not surface change (wet snow, vegetation, a long time gap). The disturbance task only says whether a change could be seen, not whether one happened.",
    "Products are Provisional.",
]

# task -> ordered classes: (code, label, colour, meaning)
CLASSES = {
    "disturbance": [
        (1, "Usable", "#5FE0C9", "The radar saw this ground clearly before and across the event, so a change here would show."),
        (2, "Seen, but not reliable", "#F2C46B", "The ground was already incoherent in the baseline pair, so a drop across the event cannot be told apart from normal noise."),
        (3, "Hidden by terrain", "#B07CFF", "Layover or radar shadow: the slope's geometry hides it from this viewing angle."),
        (4, "No data in the product", "#6B7682", "Inside the frame, but the product holds no value here."),
        (5, "Not acquired", "#2A3138", "Outside this frame. No observation means no conclusion, not no change."),
    ],
    "movement": [
        (1, "Usable", "#5FE0C9", "Phase is coherent and unwrapped, so ground movement could be measured here."),
        (2, "Seen, but not reliable", "#F2C46B", "Phase is too noisy (low coherence) or was not unwrapped here, so no movement value can be trusted."),
        (3, "Hidden by terrain", "#B07CFF", "Layover or radar shadow: the slope's geometry hides it from this viewing angle."),
        (4, "No data in the product", "#6B7682", "Inside the frame, but the product holds no value here."),
        (5, "Not acquired", "#2A3138", "Outside this frame. No observation means no conclusion, not no movement."),
    ],
}


def dates(name: str) -> tuple[str, str]:
    d = re.findall(r"_(\d{8})T\d{6}_\d{8}T\d{6}", name)
    iso = lambda s: f"{s[:4]}-{s[4:6]}-{s[6:]}"  # noqa: E731
    return iso(d[0]), iso(d[1])


def geometry_flags(dem: np.ndarray, posting: float, los_e: np.ndarray, los_n: np.ndarray, incidence_deg: np.ndarray) -> np.ndarray:
    """Layover and shadow from the local slope measured along the radar's horizontal look direction.

    los_e, los_n: east and north components of the unit vector from the ground to the sensor.
    dem rows run north to south (row 0 is the northern edge)."""
    dzdy_south, dzdx = np.gradient(dem.astype(np.float64), posting)
    dzdn = -dzdy_south
    h = np.hypot(los_e, los_n)
    with np.errstate(invalid="ignore", divide="ignore"):
        ue, un = los_e / h, los_n / h
    rise_toward_sensor = dzdx * ue + dzdn * un
    slope = np.degrees(np.arctan(rise_toward_sensor))
    flags = np.zeros(dem.shape, np.uint8)
    flags[slope > incidence_deg] |= LAYOVER
    flags[-slope > 90 - incidence_deg] |= SHADOW
    flags[~np.isfinite(dem) | ~np.isfinite(incidence_deg)] = 0
    return flags


def classify(flags: np.ndarray, task: str) -> np.ndarray:
    """Reason flags -> class code for one task. 0 = not assessed."""
    out = np.ones(flags.shape, np.uint8)
    poor = (flags & LOWBASE) > 0 if task == "disturbance" else (flags & (LOWCOH | NOCC)) > 0
    out[poor] = 2
    out[(flags & (LAYOVER | SHADOW)) > 0] = 3
    out[(flags & NODATA) > 0] = 4
    out[(flags & OUTSIDE) > 0] = 5
    return out


def summary(classes: np.ndarray, mask: np.ndarray, task: str) -> dict:
    n = int(mask.sum())
    if not n:
        return {"pixels": 0}
    pct = {lbl: round(100 * float((classes[mask] == code).mean()), 1) for code, lbl, *_ in CLASSES[task]}
    usable = pct["Usable"]
    verdict = "Enough evidence" if usable >= 50 else "Partial evidence" if usable >= 20 else "Insufficient evidence"
    return {"pixels": n, "percent": pct, "verdict": verdict, "verdictRule": "Usable share: 50% or more = enough, 20 to 50% = partial, under 20% = insufficient."}


def _read_window(ds, x, y, x0, y1, x1, y0):
    c = np.where((x >= x0) & (x <= x1))[0]
    r = np.where((y >= y0) & (y <= y1))[0]
    if not c.size or not r.size:
        return None, None, None
    return ds[r[0]:r[-1] + 1, c[0]:c[-1] + 1], x[c[0]:c[-1] + 1], y[r[0]:r[-1] + 1]


def assess(gunw: pathlib.Path, baseline: pathlib.Path | None, dem_path: pathlib.Path, bounds_lonlat, posting: float = 40.0) -> dict:
    """Run the assessment on one GUNW pair over a lon/lat box. Returns arrays and metadata (no files written)."""
    with h5py.File(gunw, "r") as h:
        epsg = int(np.asarray(h[f"{GRID}/wrappedInterferogram/projection"][()]).item())
        footprint = wkt.loads(h["/science/LSAR/identification/boundingPolygon"][()].decode())
        meta = {k: h[f"/science/LSAR/identification/{k}"][()] for k in ("trackNumber", "frameNumber", "orbitPassDirection", "lookDirection", "granuleId", "compositeReleaseId", "productVersion")}
    meta = {k: (v.decode() if isinstance(v, bytes) else int(v)) for k, v in meta.items()}
    to_utm = Transformer.from_crs(4326, epsg, always_xy=True).transform
    w, s, e, n = bounds_lonlat
    xs, ys = to_utm([w, e, w, e], [s, s, n, n])
    gx0, gx1 = np.floor(min(xs) / posting) * posting, np.ceil(max(xs) / posting) * posting
    gy0, gy1 = np.floor(min(ys) / posting) * posting, np.ceil(max(ys) / posting) * posting
    cols, rows = int((gx1 - gx0) / posting), int((gy1 - gy0) / posting)
    transform = from_origin(gx0, gy1, posting, posting)
    gxc = gx0 + (np.arange(cols) + 0.5) * posting
    gyc = gy1 - (np.arange(rows) + 0.5) * posting

    def resample(path, group, name, how):
        """Product grid -> analysis grid. 'mean' block-averages finer pixels, 'nearest' samples coarser ones."""
        with h5py.File(path, "r") as h:
            g = h[f"{GRID}/{group}"]
            x, y = g["xCoordinates"][()], g["yCoordinates"][()]
            a, xw, yw = _read_window(g[f"HH/{name}"], x, y, gx0, gy1, gx1, gy0)
        out = np.full((rows, cols), np.nan, np.float32)
        if a is None:
            return out
        a = a.astype(np.float32)
        if name == "coherenceMagnitude":
            a[(a <= 0) | ~np.isfinite(a)] = np.nan
        ci = np.floor((xw - gx0) / posting).astype(int)
        ri = np.floor((gy1 - yw) / posting).astype(int)
        okc, okr = (ci >= 0) & (ci < cols), (ri >= 0) & (ri < rows)
        if how == "mean":
            s_ = np.zeros((rows, cols)); k = np.zeros((rows, cols))
            sub = a[np.ix_(okr, okc)]
            rr, cc = np.meshgrid(ri[okr], ci[okc], indexing="ij")
            good = np.isfinite(sub)
            np.add.at(s_, (rr[good], cc[good]), sub[good])
            np.add.at(k, (rr[good], cc[good]), 1)
            with np.errstate(invalid="ignore"):
                out = np.where(k > 0, s_ / k, np.nan).astype(np.float32)
        else:
            xi = np.clip(np.searchsorted(xw, gxc) , 0, xw.size - 1)
            yi = np.clip(np.searchsorted(-yw, -gyc), 0, yw.size - 1)
            inside = (gxc[None, :] >= xw[0]) & (gxc[None, :] <= xw[-1]) & (gyc[:, None] <= yw[0]) & (gyc[:, None] >= yw[-1])
            out = np.where(inside, a[np.ix_(yi, xi)], np.nan).astype(np.float32)
        return out

    coh = resample(gunw, "wrappedInterferogram", "coherenceMagnitude", "mean")
    cc = resample(gunw, "unwrappedInterferogram", "connectedComponents", "nearest")
    phase = resample(gunw, "unwrappedInterferogram", "unwrappedPhase", "nearest")
    base = resample(baseline, "wrappedInterferogram", "coherenceMagnitude", "mean") if baseline else None

    dem = np.full((rows, cols), np.nan, np.float32)
    with rasterio.open(dem_path) as d:
        reproject(rasterio.band(d, 1), dem, dst_transform=transform, dst_crs=f"EPSG:{epsg}", dst_nodata=np.nan, resampling=Resampling.bilinear)

    with h5py.File(gunw, "r") as h:
        r = h[RADAR]
        rx, ry, hz = r["xCoordinates"][()], r["yCoordinates"][()], r["heightAboveEllipsoid"][()]
        k = int(np.argmin(np.abs(hz - np.nanmedian(dem)))) if np.isfinite(dem).any() else 0
        lx, ly, inc = r["losUnitVectorX"][k], r["losUnitVectorY"][k], r["incidenceAngle"][k]
    xi = np.clip(np.searchsorted(rx, gxc), 0, rx.size - 1)
    yi = np.clip(np.searchsorted(-ry, -gyc), 0, ry.size - 1)
    los_e, los_n, incd = (a[np.ix_(yi, xi)].astype(np.float64) for a in (lx, ly, inc))

    flags = geometry_flags(dem, posting, los_e, los_n, incd)
    fp = rasterize([mapping(stransform(to_utm, footprint))], out_shape=(rows, cols), transform=transform).astype(bool)
    flags[~fp] = OUTSIDE
    inside = fp
    flags[inside & ~np.isfinite(coh)] |= NODATA
    flags[inside & np.isfinite(coh) & (coh < COH_MIN)] |= LOWCOH
    flags[inside & ~(np.isfinite(cc) & (cc > 0) & np.isfinite(phase) & (phase != 0))] |= NOCC
    if base is not None:
        flags[inside & (~np.isfinite(base) | (base < COH_MIN))] |= LOWBASE
    flags[~fp] = OUTSIDE

    sens = {}
    for t in COH_SENSITIVITY:
        ok = inside & np.isfinite(coh) & ((flags & (LAYOVER | SHADOW)) == 0)
        sens[str(t)] = round(100 * float((coh[ok] >= t).mean()), 1) if ok.any() else None

    return {"flags": flags, "coherence": coh, "baseline": base, "dem": dem, "transform": transform, "epsg": epsg, "meta": meta,
            "pair": dates(gunw.name), "baselinePair": dates(baseline.name) if baseline else None,
            "losEast": float(np.nanmedian(los_e)), "losNorth": float(np.nanmedian(los_n)), "incidenceDeg": [round(float(np.nanpercentile(incd, 5)), 1), round(float(np.nanpercentile(incd, 95)), 1)],
            "geometryHeightM": float(hz[k]), "sensitivityUsableMovementPct": sens}


def zone_mask(geom_lonlat, epsg: int, transform, shape) -> np.ndarray:
    to_utm = Transformer.from_crs(4326, epsg, always_xy=True).transform
    return rasterize([mapping(stransform(to_utm, geom_lonlat))], out_shape=shape, transform=transform).astype(bool)


def to_json(obj) -> str:
    return json.dumps(obj, indent=1)
