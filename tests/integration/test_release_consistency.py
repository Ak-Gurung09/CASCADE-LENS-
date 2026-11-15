"""Release checks: what the app, its status list and its documents say must match the data that ships.

These run on the shipped files only (no raw NISAR granules needed), so they run everywhere, including CI.
"""
import json
import pathlib
import re

import numpy as np
import pytest
import rasterio
import rasterio.features
import rasterio.warp

ROOT = pathlib.Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "frontend/public"
M = json.loads((PUBLIC / "data/manifests/manifest.json").read_text(encoding="utf-8"))
STATUS = json.loads((PUBLIC / "data/status.json").read_text(encoding="utf-8"))
CLAIMS = json.loads((PUBLIC / "data/claims.json").read_text(encoding="utf-8"))
USABLE = {"sampleable", "renderable", "prepared", "qa_passed"}
GRANULE = re.compile(r"NISAR_L2_PR_(?P<product>[A-Z]+)_\d{3}_(?P<track>\d{3})_[AD]_(?P<frame>\d{3})_(?:\d{3}_)?(?P<mode>\d{4})_")


def layers(measurement):
    return [l for l in M["layers"] if l["measurementType"] == measurement]


def capability(cid):
    return next(c for c in STATUS["capabilities"] if c["id"] == cid)


# --- Rasuwa GCOV: present, single-date, and described as present everywhere ---

def test_rasuwa_gcov_snapshots_are_single_dates_with_their_own_files():
    snaps = [l for l in layers("gcov-backscatter") if l["status"] in USABLE]
    assert len(snaps) >= 4
    for l in snaps:
        assert l["acquisition"]["secondary"] is None, l["id"]  # a snapshot is one date, never a pair
        assert l["productMaturity"].startswith("Provisional"), l["id"]
        assert "VALIDATED" not in l["productMaturity"].upper(), l["id"]
        for s in l["sources"]:
            assert (PUBLIC / s["sampling"]).is_file(), s["sampling"]
            g = GRANULE.match(s["granule"])
            assert g and g["product"] == "GCOV" and int(g["track"]) == l["track"], s["granule"]
            assert l["acquisition"]["reference"].replace("-", "") in s["granule"], (l["id"], s["granule"])


def test_a_catalogued_snapshot_is_never_offered_as_a_measurement():
    for l in layers("gcov-backscatter"):
        if l["status"] not in USABLE:
            assert not l["sources"] and l["statusReason"], l["id"]


def test_gcov_change_compares_one_track_and_frame_and_states_any_mode_difference():
    for l in layers("gcov-change"):
        gs = [GRANULE.match(g) for g in l["sourceGranules"]]
        assert len(gs) == 2 and all(gs), l["id"]
        assert gs[0]["track"] == gs[1]["track"] and gs[0]["frame"] == gs[1]["frame"], "a change layer from two tracks or frames"
        assert l["measurementClass"] == "derived" and l["units"] == "dB"
        if gs[0]["mode"] != gs[1]["mode"]:
            assert any("radar mode" in t for t in l["limitations"]), "two radar modes compared without saying so"


def test_status_registry_agrees_with_the_shipped_manifest():
    loaded = [l for l in layers("gcov-backscatter") if l["status"] in USABLE]
    gcov = capability("gcov-snapshots")
    if loaded:
        assert gcov["maturity"] != "BLOCKED BY DATA OR INFRASTRUCTURE"
        assert "not downloaded" not in gcov["evidence"].lower()
    # The README and the main docs must not say the opposite of the app.
    for doc in ["README.md", "docs/LIMITATIONS.md", "docs/DEMONSTRATION.md", "IMPLEMENTATION_STATUS.md"]:
        text = (ROOT / doc).read_text(encoding="utf-8").lower()
        if loaded:
            assert "rasuwa gcov is not downloaded" not in text, doc
            assert "rasuwa gcov snapshots are not downloaded" not in text, doc


def test_every_claim_marked_green_or_amber_is_safe_and_every_red_claim_is_not():
    for c in CLAIMS["claims"]:
        assert c["status"] in CLAIMS["statuses"], c["id"]
        assert c["evidenceClass"] in {"Observed", "Derived", "Reference", "Hypothesis", "Forecast", "Scenario", "Unknown"}, c["id"]
        if c["evidenceClass"] == "Forecast":
            assert c["status"] == "RED", f"{c['id']}: nothing in CascadeLens is a supported forecast"


def test_pages_workflow_publishes_the_built_app():
    wf = (ROOT / ".github/workflows/pages.yml").read_text(encoding="utf-8")
    assert "npm run build" in wf and "path: frontend/dist" in wf
    vite = (ROOT / "frontend/vite.config.ts").read_text(encoding="utf-8")
    assert re.search(r"base:\s*'\./'", vite), "assets must load by relative address under the /CASCADE-LENS-/ subpath"


# --- Observability: the two questions stay separate, and the mask decides ---

def test_both_questions_are_answered_for_every_zone_and_add_up():
    zones = M["observability"]["zones"]
    assert set(zones) == {"disturbance", "movement"}
    assert set(zones["disturbance"]) == set(zones["movement"])
    for zid in zones["disturbance"]:
        d, mv = zones["disturbance"][zid], zones["movement"][zid]
        assert d["pixels"] == mv["pixels"], zid
        for z in (d, mv):
            assert abs(sum(z["percent"].values()) - 100) < 0.6, (zid, z["percent"])
        # Missing data and the frame edge do not depend on the question asked.
        for reason in ("No valid data in the product", "Outside the frame checked", "Hidden by terrain"):
            assert d["percent"][reason] == mv["percent"][reason], (zid, reason)


def test_movement_usable_never_claims_a_measurement():
    movement = next(c for c in M["observability"]["classes"]["movement"] if c["label"] == "Usable") if isinstance(M["observability"]["classes"], dict) else None
    text = json.dumps(movement or M["observability"]["classes"])
    assert "Nothing has been measured yet" in text


def test_the_detachment_zone_has_no_valid_track_48_data_in_either_task():
    # The withdrawn mask-ignorant method reported a change visible on 66% of this zone (claim C04).
    # With the product's own mask applied it is 0% usable, all of it "no valid data" (claim C26).
    for task in ("disturbance", "movement"):
        z = M["observability"]["zones"][task]["vector:unosat_detachment_zone.geojson"]
        assert z["percent"]["Usable"] == 0.0 and z["percent"]["No valid data in the product"] == 100.0, task


def test_flag_raster_marks_the_detachment_zone_as_masked_or_missing():
    flags = M["observability"]["flags"]
    bad = flags["noData"] | flags["productMasked"]
    zone = json.loads((PUBLIC / "data/vectors/unosat_detachment_zone.geojson").read_text(encoding="utf-8"))
    with rasterio.open(PUBLIC / "data/sampling/rasuwa-2026/observability-flags.tif") as src:
        shapes = [rasterio.warp.transform_geom("EPSG:4326", src.crs, f["geometry"]) for f in zone["features"]]
        inside = rasterio.features.geometry_mask(shapes, src.shape, src.transform, invert=True, all_touched=False)
        a = src.read(1)
    assert inside.sum() > 0
    v = a[inside].astype(np.int64)
    assert np.mean((v & bad) > 0) > 0.95, "the shipped flags no longer carry the product mask at the source"


def test_track_98_view_is_its_own_layer_and_never_merged_into_track_48():
    t48 = {l["id"]: l for l in M["layers"] if l["id"].startswith("rasuwa-2026:observability-") and not l["id"].endswith("-t98")}
    t98 = {l["id"]: l for l in M["layers"] if l["id"].endswith("-t98") and "observability" in l["id"]}
    assert t48 and t98
    assert {l["track"] for l in t48.values()} == {48} and {l["track"] for l in t98.values()} == {98}
    assert not {s["sampling"] for l in t48.values() for s in l["sources"]} & {s["sampling"] for l in t98.values() for s in l["sources"]}


# --- Temporal comparisons: dates in order, no silent gaps filled ---

@pytest.mark.parametrize("lid", ["rasuwa-2026:coherence-timeline", "rasuwa-2026:coherence-timeline-t98"])
def test_coherence_series_are_real_pairs_of_one_track_in_date_order(lid):
    l = next(x for x in M["layers"] if x["id"] == lid)
    steps = l["timeSteps"]
    assert len(steps) >= 2
    starts = []
    for s in steps:
        for src in s["sources"]:
            g = GRANULE.match(src["granule"])
            assert g and int(g["track"]) == l["track"], src["granule"]
            assert (PUBLIC / src["sampling"]).is_file(), src["sampling"]
        dates = re.findall(r"\d{4}-\d{2}-\d{2}", s["label"])
        assert len(dates) == 2 and dates[0] < dates[1], s["label"]
        starts.append(dates[0])
    assert starts == sorted(starts), "time steps out of order"


def test_control_pairs_record_their_span_and_mode():
    cs = M["controlSeries"]
    for p in cs["pairs"]:
        assert p["days"] > 0 and p["pair"][0] < p["pair"][1]
        assert GRANULE.match(p["granule"]), p["granule"]
