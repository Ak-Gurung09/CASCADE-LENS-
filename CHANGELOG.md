# Changelog

What changed, and when. Scientific corrections are listed first in each entry, because they change what the app is allowed to say.

## 14 November 2026: field-check list and "what to try next"

No scientific figure changed in this entry.

- **Baseline recorded** in `docs/TRANSFORMATION_BASELINE.md`: 173 Python tests pass and 35 skip for missing raw data; 103 unit tests, the type check, the build and 33 browser tests pass.
- **Field-check list** (new *Field checks* tab, and *Add to field-check list* under a road stretch's evidence). A record is made from a real shipped stretch and keeps a frozen copy of its satellite evidence: why it was flagged, what the evidence says, what remains unknown, and what to check. People add dated field reports with a source. Verified and Not confirmed can only come from such a report, and a report never changes the satellite copy. Records are kept in this browser only, and export as a printable brief, CSV, GeoJSON (the stretch's real line) or JSON, which can be imported again. The project has received no field reports; none is shipped.
- **What to try next** under each viewing direction in *Can the radar see here?*. A fixed rule table (`services/nextEvidence.ts`) turns each reason into a next step and labels it *Already in CascadeLens*, *Listed in the catalogue, not downloaded*, *Not found in the data here* or *Needs a person to collect it*. Each step names its rule. A usable spot gets only the reminder that a pair spanning the event cannot date the change or establish its cause.

## 13 November 2026: the first model run on real data (P2, L2)

- **Result.** A rainfall event-duration threshold missed its criterion, which was stated before scoring. It was fitted on 2016–2022, calibrated on 2023–2024 and scored on held-out 2025–2026 data with the rainfall's real publication delay. In the corridor it scored CSI 0.20 against a chance 95th percentile of 0.21 (p = 0.12); POD 0.35, FAR 0.67. Daily IMERG Late rainfall, used this way, adds little to knowing which months are wet. No landslide warning is offered, and claim C30 guards that wording.
- **Rule change.** A validation record that missed its own criterion (`"criterionMet": false`) is now shown but does not count, so a capability cannot reach *Experimental* on a failed test. The app lists recorded model work under each capability.
- **Rainfall (B1, C5).** GPM IMERG Late V07 daily rainfall over the Trishuli area for every day from 1 June 2016 to 31 October 2026 is committed as yearly GeoTIFFs. Each day's publication time is recorded, about 14 hours after the UTC day ends (`fetch_imerg.py`, `prepare_rainfall.py`).
- **Landslide reports (C1).** BIPAD incident records from NDRRMA: 6,672 reports, 2011 to 2026 (`fetch_bipad.py`, `prepare_bipad_inventory.py`). BIPAD states no licence, so the records are not committed and the readiness engine marks the licence as not established. That holds L2 at *data available, processing required* until NDRRMA confirms terms.
- **Blocked, with reasons recorded.** L1: the only open geological map (USGS) is meant for 1:5,000,000 and coarser. F2, F3 and F5: DHM's observation API needs a key. L3: no archived rainfall forecasts. See [docs/MODELS.md](docs/MODELS.md) and [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

## 13 November 2026: the later frame 75 pairs

- Downloaded the three later Track 48 frame 75 pairs (28 Aug to 3 Oct, 12 days, mode 2000), so coherence through time now reaches the lower mudflow and the Trishuli corridor. The frame 75 24-day pair (9 Sep to 3 Oct) overlaps them and is not used.
- `prepare_timeline.py` takes several frames: each pair becomes one time step holding one raster per frame, as Pair A's layers do. The Track 48 layer is now "Coherence through time (Track 48, frames 74 and 75)".
- Rebuilding from all ten raw files reproduced the 360 shipped frame 74 files byte for byte.
- Cross-check, in SCIENTIFIC_VALIDATION only: the frame 75 before/after series shows the same pattern as frame 74, with the gap opening across the event (0.14 before, 0.37 across) and then narrowing. The lower mudflow was already less coherent than its surroundings before the event.

## 13 November 2026: explanations from both viewing directions

- "What could explain this?" now gathers its clues once per viewing direction (Track 48 and Track 98), each from its own observability flags, event pair, pixel offsets, pre-event pair and control series. Each radar check is labelled with its track. Mapping, slope and height are counted or listed once.
- A direction that cannot see the spot adds nothing, and the panel says why. At the source, where Track 48's mask flags every pixel, the panel now reads Track 98 instead of refusing. It refuses only when no direction can see the spot.
- **Rule correction.** A coherence drop on a side that terrain hides (layover or shadow) is no longer counted for "surface disturbed": the observability check cannot judge change there. It is listed under what would settle it. This applies to the single-direction case too. Where only one side is hidden, the other side counts against a viewing artefact.
- The inspector lists each direction's coherence and offset, and the report carries the per-direction summary (`explanationViews`).

## 13 November 2026: the second viewing direction (Track 98)

- **Pair B GUNW** (Track 98 ascending, frame 16, 19 to 31 August) is downloaded, passes the QA gates and is in the app: phase, coherence, components, ionosphere and the ionosphere-removed phase. Frame 15 covers 4% of the case area, so `pipeline.json` limits Pair B's GUNW to frame 16 (`framesByProduct`); a missing frame no longer holds back a whole layer.
- **At the source,** where Track 48 has no valid subswath, Track 98 holds valid data: coherence 0.09 against 0.46 nearby. A change could be judged on 35% of the detachment zone from that side (28% is hidden by layover, 37% was already incoherent before the event), and movement on none of it.
- **Observability as a second view** (`prepare_observability.py --view t98 --compare`), beside the Track 48 block and never merged into it: each zone also gives the share usable from either direction (whole area 78.8% for change, 85.5% for movement). The inspector and the report answer for each direction from its own flags. Before this, the app would have read every observability layer through the first layer's flags; that never shipped.
- **Before and after from Track 98,** all five pairs in the same radar mode (4000): the mudflow 0.31 against 0.40 before, 0.13 against 0.49 across the event. A change of mode does not explain the drop. Valid inside is 77% in every pair, because only the river is masked.
- **Coherence through time** for Track 98 (26 July to 6 October); Time replay can switch series.
- **Road exposure** records each stretch's share watched from Track 98 and from either direction (`prepare_hazards.py --other-view`). Road the radar could not watch, counting either direction: 4.8 km (2.7 km High), against 28.2 km (13.1 km High) from Track 48 alone. The Track 48 rating is unchanged.
- `process_nisar.py --only GROUP:PRODUCT` and `generate_manifest.py --keep-merged`, so one pair can be added without rerunning every analysis. The manifest keeps its line endings.
- The readiness record C7 now covers both series (23 July to 6 October); L4 is still "data available, processing required".
- PR #4 (Track 98 observability with the withdrawn first method) is superseded by this work; its design for separate views was kept.

## 13 November 2026: rebuilt from the raw NISAR files

- **Scientific correction (S13).** The Provisional (P05023) mask is a 32-bit field: the low byte holds the water and subswath digits, bits 8 to 23 flag image anomalies, and bit 24 marks an interpolated ionosphere screen (set on 37 to 39% of pixels). The decoder read the digits from the whole number. It now reads the low byte and also masks flagged anomalies. On the event pair, 0.14 to 0.15% of pixels had been wrongly kept; no headline figure moves.
- **The source, settled.** All 307 detachment-zone pixels of the frame-74 event GUNW have mask value 10: no valid subswath in the 28 August acquisition, a gap in that acquisition's coverage, not water. Claim C26 records it; C03 stays withdrawn, because it was stated before the mask was read.
- **Observability, method 2, rebuilt** over frames 74 and 75 (`prepare_observability.py --also`, `combine_frames`). Detachment zone: 0% usable for both tasks (version 1 said 66% for a change). Trishuli corridor outside the frames: 95% before, 18% now. Movement usable at thresholds 0.2, 0.3 and 0.4: 61.2%, 57.1% and 49.3% in frame 74 (version 1: 95%, 82%, 67%).
- **Control series, rebuilt** with `prepare_control_series.py`, with block-bootstrap 95% intervals: the mapped mudflow 0.38 to 0.19 across the event against nearby ground 0.40 to 0.50. The earlier script's medians (0.41 to 0.28, 0.42 to 0.52) are gone.
- **Coherence through time (P0.5).** All five frame 74 pairs, 23 July to 3 October, as one layer (`prepare_timeline.py`); the inspector chart shows a clicked spot pair by pair. The chart once labelled every Tsho Rolpa date "20"; it now shows dates or pair dates.
- **Road exposure** re-run on the new flags: High-exposure road the radar could not watch fell from 34.7 to 13.1 km.
- **Tsho Rolpa.** The coherence layer is rebuilt from the event pair (`prepare_lake.py --coherence-only`). The product marks 95% of the lake as water, so the story no longer quotes a lake median. The old movement block and the zones layer are gone.
- Downloads resume with a range request and must answer 206; all six original granules matched their recorded SHA-256.
- The NISAR GUNW series is registered for the readiness engine as dataset C7 (`prepare_readiness.py` writes its SOURCE.json from the shipped layer). L4 moves from not available to data available, processing required: the series ends on 3 October, a week before its window closes.
- Docs, the status list and the claim register now state the rebuilt figures. `status.json`: observability, frame 75, the control comparison and coherence through time are complete and tested.

## 13 November 2026: first model code and verification (P2)

- `cascade_lens/verify.py`: POD, FAR, CSI and bias, event matching, chronological splits, the `available_at` leakage guard, spatial-block folds, AUC and NSE.
- `cascade_lens/models`: rainfall intensity-duration thresholds (L2/L3), logistic-regression susceptibility with spatial block cross-validation (L1), and GR4J with a snow routine (F3). All are tested on synthetic data only; none has been run on real data, because the inputs are not available.
- The Nepal subset of NASA's Global Landslide Catalog (481 events, 2007 to October 2016) is registered as dataset C1. The readiness engine finds it present but not fit: it ends before the 2016-2024 window, most locations are coarse, and its licence is not stated. An unstated licence now fails the licence check.
- Context downloads are written to a temporary file and renamed when complete, so a dropped connection cannot leave a file that looks cached.
- See [docs/MODELS.md](docs/MODELS.md).

## 13 November 2026: readiness engine (P1)

- `processing/src/cascade_lens/readiness.py` works out, from the files on disk, the state each flood and landslide capability (F0 to F5, L0 to L5) has earned. It checks presence, variables, units, space, time, resolution, CRS, missing values, quality flags, freshness, maturity and licence, and needs model, calibration and validation records before going further. Today two capabilities are context only and ten are not available, each with its next requirement.
- Every dataset gets a `SOURCE.json` with time fields; `available_at` keeps future backtests free of leakage. `register_source.py` writes one, reading extent, CRS, resolution and dates from the files.
- What is real? now lists flood and landslide outlooks at their earned state. See [docs/READINESS.md](docs/READINESS.md).

## 13 November 2026: road access screen (P0.4)

- New screen, Hazard screens → Road access to health care: which named places keep a road path to a health facility once reported damage is closed (roads OSM maps as destroyed, bridges volunteers report washed out), the detour or loss for each, and the closures on each old route with their sources. Results say "no road path in this network", never "isolated", and state that the network stops at the study area. Method and limits in [docs/ACCESS_SCREEN.md](docs/ACCESS_SCREEN.md).
- Road and bridge states (closed, uncertain, open; unknown by default) and health facilities and helipads can be shown on the map.
- The shipped roads keep OSM's status tag, and a road stretch's evidence says when OSM maps it as destroyed.

## 13 November 2026: road-segment evidence inspector (P0.3)

- Clicking near a screened road opens "Evidence for this stretch": its stable ID and OSM way, the rating and its reasons, the radar pair, the before pair, the source file, the observability method version, the share of the stretch in each observability class, the context, and what to verify next.
- The printable report, CSV, GeoJSON and JSON carry the same record. A unit test checks the exports against the panel's values, and a browser test checks that the ID on screen matches the downloaded report.
- Each stretch now records the share in every observability class (usable, not reliable, hidden by terrain, no valid data, outside the frame, not assessed), and they add up to the whole stretch.

## 13 November 2026: illustrations out of the primary demonstration (Category D)

- What if (dam-break scenario) and Simulate (flow replay, what-if flood, radar explainer) sit in their own "Illustrations" group in the top bar, apart from the evidence modes.
- The Tsho Rolpa guided story no longer includes the dam-break arrival times; its last step points to What if as a labelled scenario.
- The retired LANDMET case's data (about 28 MB of tiles, rasters and its manifest) no longer ships; `prepare_landmet.py` can rebuild it.

## 13 November 2026: engineering fixes (E3, E4, E6) and S10 to S12

- Map errors stay visible while the failing layer is on the map. Before, any other layer loading or the map going idle cleared the warning within a moment, which also made a browser test flaky (E4).
- Browser tests write screenshots to the gitignored `frontend/test-results/screenshots`; `CL_SCREENSHOTS_DIR` refreshes the documentation pictures on purpose (E3).
- UNOSAT layers keep their source attributes (sensor date, field validation, damage class, confidence), without staff IDs. OSM roads keep their way ID, name, bridge, layer and surface tags; rivers and places keep their IDs. Geometries are unchanged (E6).
- Road-exposure stretches have stable IDs such as `way/345313941:1`, and carry their OSM way, name and bridge tag.
- The terrain screen's AUC is labelled a one-event consistency check, not a validation; road steep shares leave out ground with no valid elevation (S10). The river rule reads "within 100 m of a mapped river" (S11). The lake case reads its product maturity from the file, with no hard-coded fallback (S12), which also removes a crash the P0.1 change had left in the Tsho Rolpa rebuild.

## 13 November 2026: documentation reconciliation (P0.2)

- The docs, the product readme and the status registry now match the P0.1 corrections. No document calls the Rasuwa source a swath gap or says a change was visible on 66% of it, and none presents the before/after control comparison as proof of cause. LANDMET is described as retired.
- New claim register, `frontend/public/data/claims.json`, which records every headline claim with its basis and status. A unit test fails if the wording of a withdrawn claim comes back into the app, the README, the demonstration script or the product readme.
- Every "complete and tested" entry in `status.json` now names the function its test exercises, and the test checks that the test file calls it.
- Tsho Rolpa: the lake area is compared with cited published figures (2008 survey, Peppa et al. 2020, the 2022 DHM survey), and the ±0.09 km² is called a method range, not a formal error. The promised "forecast of the lake's size in 2030 and 2040" is removed: no method or data supports it.
- Rasuwa story: the coherence medians now state the share of valid pixels behind them, and the pixel-offset text names the small search window.
- The tagline no longer says the app follows movement, since no movement is measured.

## 12 November 2026: scientific corrections (P0.1)

- Observability method version 2 applies the product's own quality mask, marks missing geometry as not assessed, treats component fill and exact-zero phase correctly, and uses one coherence product throughout. Version 1 figures are withheld in the app until the rebuild.
- Zero-filled phase is masked in the pipeline; no data always wins over masked.
- Tsho Rolpa dam and glacier movement bounds are research output only. No per-year extrapolation.
- The control comparison gets a reproducible generator (`prepare_control_series.py`) with spatial block-bootstrap intervals, and its wording no longer claims a cause.
- "What could explain this?" counts only radar values at the spot and independent mapping. New labels: Fits the checks, Partly fits, Little support.
- Simulate replay crash fixed; an app-level error boundary added. `scipy` pinned.

## 12 November 2026: Stage 0 audit

A read-only audit of the repository found the issues fixed in P0.1 and P0.2, and set out the roadmap (P0.3 road-segment evidence, P0.4 access analysis, P0.5 temporal change, then data integration and models).

## 11 November 2026

- Restyle: violet scene, opening screen, animated story headlines.

## 10 November 2026

- Experimental hazard screens: landslide-prone terrain and road exposure.
- First-minute finding card and the "What is real?" status registry.
- Skeptical review and scorecard; "Not acquired" renamed "Outside the frame checked".

## 6 November 2026

- Evidence classes on every layer. Rasuwa opens first.
- Radar observability, "What could explain this?" and the evidence report.
- Rasuwa simulations brought back; LANDMET retired from the app.

## 5 November 2026

- Tsho Rolpa glacial lake case, 3D terrain, compare mode and the dam-break scenario.
- Rasuwa back as a main case, with the before/after control check.

## 2 to 3 November 2026

- First commit; redesign with a full-screen map; Simulate mode (flow replay, what-if flood, radar explainer) and Time replay; the app starts from the project folder.
