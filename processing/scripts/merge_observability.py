"""Fold observability-<case>.json, hazards-<case>.json and control-<case>.json fragments (from prepare_observability.py,
prepare_hazards.py and prepare_control_series.py) into the case manifests.

    python merge_observability.py <fragment dir> <manifests dir>

Replaces earlier observability layers, keeps everything else, and keeps each manifest's line endings."""
from __future__ import annotations

import json
import pathlib
import sys

FILES = {"rasuwa-2026": "manifest.json"}


def merge(fragment: dict, manifest: dict) -> dict:
    ids = {l["id"] for l in fragment["layers"]}
    manifest["layers"] = [l for l in manifest["layers"] if l["id"] not in ids] + fragment["layers"]
    for key in ("observability", "hazards", "controlSeries"):
        if key in fragment:
            manifest[key] = fragment[key]
    return manifest


def main(frag_dir: str, man_dir: str) -> None:
    frags = pathlib.Path(frag_dir)
    for f in sorted([*frags.glob("observability-*.json"), *frags.glob("hazards-*.json"), *frags.glob("control-*.json")]):
        frag = json.loads(f.read_text(encoding="utf-8"))
        path = pathlib.Path(man_dir) / FILES.get(frag["case"], f"{frag['case']}.json")
        raw = path.read_bytes()
        crlf = b"\r\n" in raw
        m = merge(frag, json.loads(raw.decode("utf-8")))
        text = json.dumps(m, indent=1) + "\n"
        path.write_bytes((text.replace("\n", "\r\n") if crlf else text).encode("utf-8"))
        print("merged", f.name, "->", path.name)


if __name__ == "__main__":
    main(*sys.argv[1:3])
