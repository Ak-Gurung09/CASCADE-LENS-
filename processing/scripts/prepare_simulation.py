"""Prepare the Simulate mode's data: the flow path along the rivers, and how far and how high each mapped feature sits from it.

usage: python prepare_simulation.py   (needs the prepared vectors and DEM in frontend/public/data)
Writes frontend/public/data/vectors/simulation.json. No hydrology here: the path is geometry and the heights are terrain.
"""
import heapq
import json
import math
import pathlib

import numpy as np
import rasterio

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / "frontend/public/data"
OUT = DATA / "vectors/simulation.json"

KM_LNG = 111.32 * math.cos(math.radians(28))  # Good to about 1% across this corridor
KM_LAT = 110.9
MAIN = {"Lende Khola", "Bhote Koshi", "Trishuli River", "Trisuli Khola", "Trishuli Ganga River", "Trisuli", "त्रिशुली नदी"}
SIDE_COST = 5  # Unnamed reaches only bridge gaps in the mapped main stem
JOIN_KM = 0.4  # OSM reaches often stop short of each other
NEAR_KM = 2  # Features further than this from the path are in another valley
RIVER_WINDOW = 4  # Pixels either side: OSM lines sit off the true channel, so take the lowest ground nearby


def vectors(name):
    return json.loads((DATA / f"vectors/{name}.geojson").read_text(encoding="utf8"))["features"]


def km(a, b):
    return math.hypot((a[0] - b[0]) * KM_LNG, (a[1] - b[1]) * KM_LAT)


def centre(rings):
    pts = [p for r in rings for p in r]
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def route(start, end):
    """Cheapest walk along the OSM rivers, staying on the named main stem wherever it can."""
    edges = {}

    def link(a, b, cost):
        edges.setdefault(a, []).append((b, cost))
        edges.setdefault(b, []).append((a, cost))

    ends = []
    for f in vectors("osm_rivers"):
        line = [tuple(p[:2]) for p in f["geometry"]["coordinates"]]
        factor = 1 if f["properties"].get("label") in MAIN else SIDE_COST
        for a, b in zip(line, line[1:]):
            link(a, b, km(a, b) * factor)
        ends += [line[0], line[-1]]
    nodes = np.array(list(edges))
    for a in ends:
        near = np.hypot((nodes[:, 0] - a[0]) * KM_LNG, (nodes[:, 1] - a[1]) * KM_LAT)
        for i in np.nonzero(near < JOIN_KM)[0]:
            b = tuple(nodes[i])
            if b != a:
                link(a, b, km(a, b) * SIDE_COST)
    best, before, heap = {start: 0.0}, {}, [(0.0, start)]
    while heap:
        cost, here = heapq.heappop(heap)
        if here == end:
            break
        if cost > best[here]:
            continue
        for there, step in edges[here]:
            if cost + step < best.get(there, math.inf):
                best[there], before[there] = cost + step, here
                heapq.heappush(heap, (cost + step, there))
    if end not in before:
        raise SystemExit("The rivers do not connect from the source to the end of the path")
    line = [end]
    while line[-1] != start:
        line.append(before[line[-1]])
    return line[::-1]


def resample(line, step=1.0):
    """A point every kilometre along the line, so a list index is a distance."""
    out, done, target = [line[0]], 0.0, step
    for a, b in zip(line, line[1:]):
        size = km(a, b)
        while done + size >= target and size:
            t = (target - done) / size
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            target += step
        done += size
    return out


def main():
    with rasterio.open(DATA / "sampling/context/copdem_glo30.tif") as src:
        dem = src.read(1, masked=True).filled(np.nan)
        transform = ~src.transform

    def cell(p):
        col, row = transform * p
        return int(min(max(row, 0), dem.shape[0] - 1)), int(min(max(col, 0), dem.shape[1] - 1))

    def height(p):
        return float(dem[cell(p)])

    def river(p):
        r, c = cell(p)
        return float(np.nanmin(dem[max(r - RIVER_WINDOW, 0):r + RIVER_WINDOW + 1, max(c - RIVER_WINDOW, 0):c + RIVER_WINDOW + 1]))

    source = centre(vectors("unosat_detachment_zone")[0]["geometry"]["coordinates"][0])
    lakes = sorted((centre(f["geometry"]["coordinates"]) for f in vectors("unosat_barrier_lakes")), key=lambda p: km(p, source))
    rivers = [tuple(p[:2]) for f in vectors("osm_rivers") for p in f["geometry"]["coordinates"]]
    main_stem = [tuple(p[:2]) for f in vectors("osm_rivers") if f["properties"].get("label") in MAIN for p in f["geometry"]["coordinates"]]
    top = min(main_stem, key=lambda p: km(p, lakes[-1]))  # The mapped river stops below the lakes
    bottom = min(rivers, key=lambda p: p[0])
    # ponytail: straight lines from source to lakes to river top, because OSM maps no channel there. A DEM flow route would replace it.
    points = resample([source, *lakes] + route(top, bottom))
    levels = np.minimum.accumulate([river(p) for p in points])  # Water does not run uphill

    pts = np.array(points)
    features = []

    def add(kind, p, **extra):
        near = np.hypot((pts[:, 0] - p[0]) * KM_LNG, (pts[:, 1] - p[1]) * KM_LAT)
        i = int(near.argmin())
        if near[i] > NEAR_KM or math.isnan(height(p)):
            return None
        return {"k": kind, "km": i, "h": max(round(height(p) - float(levels[i])), 0), **extra}

    def emit(kind, geometry, p, **extra):
        props = add(kind, p, **extra)
        if props:
            features.append({"type": "Feature", "properties": props, "geometry": geometry})
        return props

    rounded = lambda p: [round(p[0], 5), round(p[1], 5)]
    for i, (a, b) in enumerate(zip(points, points[1:])):
        features.append({"type": "Feature", "properties": {"k": "c", "km": i, "h": 0}, "geometry": {"type": "LineString", "coordinates": [rounded(a), rounded(b)]}})
    for f in vectors("unosat_affected_buildings"):
        p = f["geometry"]["coordinates"]
        emit("b", {"type": "Point", "coordinates": rounded(p)}, p)
    places = []
    for f in vectors("osm_places"):
        p = f["geometry"]["coordinates"]
        props = emit("p", {"type": "Point", "coordinates": rounded(p)}, p, name=f["properties"]["label"])
        if props:
            places.append({"name": props["name"], "km": props["km"], "h": props["h"]})

    def split(kind, lines):
        total = 0.0
        for line in lines:
            for a, b in zip(line, line[1:]):
                size = km(a, b)
                mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
                if emit(kind, {"type": "LineString", "coordinates": [rounded(a), rounded(b)]}, mid, len=round(size, 3)):
                    total += size
        return round(total, 1)

    mapped = split("a", [l for f in vectors("unosat_affected_roads") for l in f["geometry"]["coordinates"]])
    roads = split("r", [f["geometry"]["coordinates"] for f in vectors("osm_roads") if f["geometry"]["type"] == "LineString"])
    out = {
        "path": [[*rounded(p), round(float(z))] for p, z in zip(points, levels)],
        "places": sorted(places, key=lambda x: x["km"]),
        "features": {"type": "FeatureCollection", "features": features},
        "totals": {"buildings": sum(f["properties"]["k"] == "b" for f in features), "buildingsAll": len(vectors("unosat_affected_buildings")), "mappedRoadKm": mapped, "roadKm": roads},
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf8")
    print(f"{len(points) - 1} km path, {out['path'][0][2]} m to {out['path'][-1][2]} m, {len(features)} features, {OUT.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
