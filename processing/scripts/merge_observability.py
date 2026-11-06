"""Fold observability-<case>.json fragments (from prepare_observability.py) into the case manifests.

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
    manifest["observability"] = fragment["observability"]
    return manifest


def main(frag_dir: str, man_dir: str) -> None:
    for f in sorted(pathlib.Path(frag_dir).glob("observability-*.json")):
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
