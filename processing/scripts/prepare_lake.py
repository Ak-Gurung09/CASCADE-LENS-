"""Turn NISAR GCOV files over a glacial lake into a case study with a lake-size time series.

usage: python prepare_lake.py processing/configs/lake/tsho-rolpa.json FOLDER_WITH_GCOV_H5_FILES [MORE_FOLDERS...] [--research-motion]
A Copernicus DEM tile (Copernicus_DSM_*.tif) in the same folder adds the 3D model.
A GUNW pair of the same track and frame in any of the folders (data/raw/nisar is always searched) adds a coherence layer.
--research-motion also writes the dam and glacier movement bounds to data/qa/<id>-motion-research.json. They are research
only: the phase sign convention and referencing are not established, so they never go into the app's manifest.
Writes frontend/public/data/manifests/<id>.json, plus COGs, tiles, compare images and the lake edge. Refuses to write a broken manifest.
"""
import json
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "processing/src"))
from cascade_lens import lake, manifest  # noqa: E402

from cascade_lens import motion  # noqa: E402

RESEARCH = "--research-motion" in sys.argv
sys.argv = [a for a in sys.argv if a != "--research-motion"]
cfg = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
files = sorted(p for p in pathlib.Path(sys.argv[2]).glob("NISAR_L2_*GCOV*.h5") if f"_{cfg['track']:03d}_" in p.name and f"_{cfg['frame']:03d}_" in p.name)
if len(files) < 2:
    sys.exit(f"Need at least 2 GCOV files for track {cfg['track']} frame {cfg['frame']} in {sys.argv[2]}, found {len(files)}")
public = ROOT / "frontend/public/data"
case = cfg["id"]
for rel in (f"tiles/{case}", f"sampling/{case}", f"compare/{case}", f"terrain/{case}"):
    shutil.rmtree(public / rel, ignore_errors=True)
dems = sorted(pathlib.Path(sys.argv[2]).glob("Copernicus_DSM*.tif"))
pairs = [pathlib.Path(f) for f in sys.argv[2:]] + [ROOT / "data/raw/nisar"]
m = lake.prepare(cfg, files, public, ROOT / "data/processed" / case, ROOT / "data/qa", dems[0] if dems else None, pairs)
print("3D model:", f"heights from {dems[0].name}" if dems else "no Copernicus DEM tile in the folder, so no 3D model")
errors = manifest.validate(m, ROOT / "frontend/public")
if errors:
    sys.exit("Manifest not written:\n" + "\n".join(errors))
(public / f"manifests/{case}.json").write_text(json.dumps(m, indent=1), encoding="utf-8")
if RESEARCH:
    grid, lake_mask = lake.research_inputs(cfg, public)
    research = motion.motion_research(cfg, pairs, grid, lake_mask, m["lake"].get("terrain"))
    out = ROOT / "data/qa" / f"{case}-motion-research.json"
    if research is None:
        print("Research motion: needs the 3D route (a Copernicus DEM tile) to place the dam; skipped")
    else:
        out.write_text(json.dumps(research, indent=1), encoding="utf-8")
        print("Research motion (not in the app):", out)
print(f"{len(files)} dates. Change first to last: {m['lake']['changeKm2']:+.3f} km2, method range about ±{m['lake']['methodHalfRangeKm2']:.3f} km2")
