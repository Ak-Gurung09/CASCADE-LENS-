# Radar Observability, explanations and evidence reports

Added November 2026. These three tools answer, for any spot on the map: *could NISAR judge this place*, *what could explain what it shows*, and *what exactly was measured there*.

## 1. Radar Observability ("Can the radar see it?")

**Question.** For each spot, could a NISAR pair (a) see a surface change between its dates, and (b) measure ground movement? The two tasks are judged separately, because what spoils one does not spoil the other: low coherence *is* the disturbance signal, but it ruins a movement measurement.

**Inputs.** One GUNW pair (the event pair) and, when available, a pre-event baseline GUNW of the same track and frame; the Copernicus DEM GLO-30. Nothing is downloaded by the code.

| Case | Event pair | Baseline pair | Track / frame | Incidence (5th to 95th pct) |
|---|---|---|---|---|
| Rasuwa | 16 to 28 Aug 2026 | 23 Jul to 16 Aug 2026 | 48 descending / 74 | 32.3 to 38.2° |
| Tsho Rolpa | 16 to 28 Aug 2026 | 23 Jul to 16 Aug 2026 | 48 descending / 74 | 43.3 to 43.9° |

**Method, version 2** (`processing/src/cascade_lens/observability.py`, run by `processing/scripts/prepare_observability.py`). The analysis grid is 40 m in UTM zone 45N. Each cell keeps separate reason flags (16-bit), never one blended score:

| Flag | Bit | Rule |
|---|---|---|
| Outside the frame checked | 1 | Outside the product's `boundingPolygon`. A neighbouring frame may cover it; it is not assessed here |
| No data | 2 | Inside the frame, but the product holds no coherence value, or its mask holds the fill value 255 |
| Layover | 4 | Ground slope facing the radar, measured along the horizontal look direction, is steeper than the incidence angle |
| Shadow | 8 | Slope facing away is steeper than 90° minus the incidence angle (active shadow only) |
| Low coherence | 16 | Event-pair coherence below 0.3 |
| No reliably unwrapped phase | 32 | Component label 0 or the component fill value (read from the file), non-finite phase, or phase exactly 0 (the product's fill in unwrapping gaps) |
| Low baseline coherence | 64 | Baseline-pair coherence below 0.3 |
| Flagged by the product's mask | 128 | The event product's own `unwrappedInterferogram/mask` marks water or an invalid subswath |
| Geometry not assessed | 256 | Elevation, incidence angle or look direction missing or invalid, so layover and shadow cannot be checked |
| Baseline has no valid value | 512 | The baseline product holds no value, or its mask marks fill, water or an invalid subswath |

Every flag uses one coherence product: `unwrappedInterferogram/{pol}/coherenceMagnitude`. It shares a grid with the unwrapped phase, the components and the mask, and it is the layer the app shows as "Coherence magnitude". Its 80 m pixels are sampled nearest-neighbour onto the 40 m grid, so each product pixel covers 2 × 2 cells; the finer grid exists for the terrain geometry. A product without its mask is refused.

The look direction and incidence come from the product's own `radarGrid` cubes (`losUnitVectorX/Y`, `incidenceAngle`), at the cube height nearest the median terrain height. NISAR looks left; for frame 74 the unit vector toward the sensor is about 0.55 west and 0.17 north.

**Classes per task.** In order of precedence: outside the frame checked (class 5); no valid data in the product, meaning no value or flagged by the product's mask (class 4); hidden by terrain (class 3); not assessed, when the geometry or, for *disturbance*, the baseline is missing (class 6). Otherwise, for *disturbance*, "seen but not reliable" if the baseline was incoherent; for *movement*, if coherence is low or the phase was not reliably unwrapped (class 2). Everything else is usable (class 1). Disturbance is not assessed at all without a baseline pair. Zone verdicts: 50% usable or more is "enough evidence", 20 to 50% "partial", under 20% "insufficient".

**Sensitivity.** The usable share for movement is recomputed at coherence thresholds of 0.2, 0.3 and 0.4 with the same rule as the movement class, over every cell inside the frame footprint. The threshold is a project choice, so all three are reported.

**Version 1, withdrawn.** The first version read the wrapped-grid coherence, ignored the product's mask, let a missing elevation or viewing angle count as visible, and accepted the component fill value. In the Rasuwa detachment zone, every frame-74 pixel is flagged by the product's own mask (coherence, phase, components and the GOFF mask alike), yet version 1 reported a surface change as visible on 66% of it. The app withholds version 1 figures and says so until the case is rebuilt.

**Rebuild** (needs the raw GUNW files; nothing is downloaded). Replace the paths with yours, then run the hazards step on the new flags and merge:

```bash
python processing/scripts/prepare_observability.py frontend/public/data/manifests/manifest.json <event GUNW f074 .h5> <baseline GUNW f074 .h5> frontend/public/data/sampling/context/copdem_glo30.tif frontend/public/data/vectors data/interim/observability unosat_detachment_zone.geojson unosat_mudflow_extent.geojson
```

**Results, version 1 (withdrawn: computed without the product's mask; see above).** Kept for comparison until the rebuild replaces them.

| Zone | Change visible: usable | Movement: usable | Outside the frame checked |
|---|---|---|---|
| Rasuwa detachment zone (UNOSAT) | 66% | 0% | 0% |
| Rasuwa mapped mudflow (UNOSAT) | 34% | 9% | 52% |
| Bhote Koshi corridor | 70% | 76% | 0% |
| Trishuli corridor | 3% | 4% | 95% |
| Tsho Rolpa lake bookmark | 70% | 65% | 0% |
| Tsho Rolpa dam and glacier zones | 73% | 56% | 0% |

The detachment-zone row is the clearest error in version 1. It says a surface change could be seen on 66% of the source, but the product's own mask flags every frame-74 pixel there, as water or an invalid subswath. Version 2 classes the whole zone as "No valid data in the product". Two earlier statements went too far: the story first called the area a swath gap without checking, and the 6 November correction then read the coherence values there without the mask. About half the mudflow and nearly all the Trishuli corridor lie in frame 75, which has no baseline pair yet and is not assessed.

**Limits.** Passive shadow (cast by a distant ridge) is not modelled. Features smaller than the 40 m grid are smoothed. Coherence also falls for wet snow, vegetation or a long time gap, so "change visible" means a change *could* be seen, not that one happened. The products are Provisional.

## 2. "What could explain this?"

`frontend/src/services/hypotheses.ts`. When a spot is clicked, the app reads the values there and weighs five explanations:

1. The ground surface was disturbed (debris flow, landslide, erosion or new deposits).
2. Ordinary seasonal change (vegetation, snow, ice or wet soil).
3. Open water (shown only near a mapped lake or where coherence is below 0.15).
4. A radar viewing artefact.
5. Nothing changed.

The checks it uses are event-pair coherence (low below 0.3, stable at 0.6 or more), the observability flags, pixel offsets compared with the scene's usual spread (half the 2nd to 98th percentile range, with the match quality at or above the scene median), the slope from the DEM (steep at 25° or more), elevation (4,800 m or more counts as snow and ice ground), whether the spot lies inside an independently mapped area (UNOSAT, REACH), and the case-wide control comparison.

Each explanation lists the checks for and against it, the context that is not counted, and what would settle it. Only two kinds of check are counted: a radar value at the clicked spot (coherence, pixel offsets, the baseline flags) and independent mapping of that spot (UNOSAT, REACH). Slope, elevation, area-wide figures such as the control comparison, and the absence of mapping are listed as context, because they describe the place without showing that anything happened there. The label counts checks for minus checks against: two or more is "Fits the checks", one is "Partly fits", otherwise "Little support". Without a valid radar value at the spot, the radar-based explanations say "Cannot judge here". **It is never a probability.** Where the radar did not look, or the product's own mask flags the spot, the panel refuses to explain and says what data is missing.

## 3. Evidence report

`frontend/src/services/report.ts`. The Inspector offers a report for the clicked spot as a printable page (print or save as PDF), CSV, GeoJSON or JSON. It holds the observability answers and reasons, the ranked explanations, every sampleable layer's value with its evidence class, observation dates and source file, and the caveats. It is built in the browser from data already shipped with the app; nothing is sent anywhere.

## Evidence classes

Every layer, panel and report carries one class (`frontend/src/services/evidence.ts`): Observed, Derived, Forecast, Hypothesis, Reference, Scenario, Unknown. Missing data is labelled Unknown, never treated as safe.

## 4. Hazard screens (experimental)

`processing/src/cascade_lens/hazard.py`, run by `processing/scripts/prepare_hazards.py` on the same 40 m grid.

**Landslide-prone terrain (Model A, terrain only).** Slope bands (15, 25, 35°), converging hollows (negative plan curvature) and a topographic wetness index (D8 flow accumulation) give Low, Moderate, High or Very high. Each pixel keeps its factor bits for the inspector. Check against the one event we have: 56% of the UNOSAT 2026 detachment zone screens High or Very high, against 32% of the whole area (AUC 0.66). The mudflow runout screens mostly Low (58%), as expected for valley floors where debris settles. No geology, soil, land cover or rainfall, and no calibration: it is a screen, not a susceptibility model or forecast.

**Road exposure.** Trunk, primary, secondary and tertiary OpenStreetMap roads cut into 250 m stretches. High: crosses the 2026 mapped mudflow or UNOSAT affected roads, or 30% of the ground within 150 m screens High or Very high. Moderate: 10% or more, or within 100 m of a river. Each stretch also says whether the event pair could watch it (share of its corridor usable for change). Of 153 km screened, 73 km rate High; 109 km lie mostly beyond the frame checked, so the radar could not watch them for this event.

**Model B (rainfall triggering)** is blocked by data: it needs GPM IMERG rainfall, soil moisture and a Nepal-calibrated threshold.
