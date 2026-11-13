# Changelog

What changed, and when. Scientific corrections are listed first in each entry, because they change what the app is allowed to say.

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
