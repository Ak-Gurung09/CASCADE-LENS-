# Radar Observability, explanations and evidence reports

Added November 2026. These three tools answer, for any spot on the map: *could NISAR judge this place*, *what could explain what it shows*, and *what exactly was measured there*.

## 1. Radar Observability ("Can the radar see it?")

**Question.** For each spot, could a NISAR pair (a) see a surface change between its dates, and (b) measure ground movement? The two tasks are judged separately, because what spoils one does not spoil the other: low coherence *is* the disturbance signal, but it ruins a movement measurement.

**Inputs.** One GUNW pair (the event pair) and, when available, a pre-event baseline GUNW of the same track and frame; the Copernicus DEM GLO-30. Nothing is downloaded by the code.

| Case | Event pair | Baseline pair | Track / frame | Incidence (5th to 95th pct) |
|---|---|---|---|---|
| Rasuwa | 16 to 28 Aug 2026 | 23 Jul to 16 Aug 2026 | 48 descending / 74 | 32.3 to 38.2° |
| Tsho Rolpa | 16 to 28 Aug 2026 | 23 Jul to 16 Aug 2026 | 48 descending / 74 | 43.3 to 43.9° |

**Method** (`processing/src/cascade_lens/observability.py`, run by `processing/scripts/prepare_observability.py`). The analysis grid is 40 m in UTM zone 45N. Each pixel keeps separate reason flags, never one blended score:

| Flag | Bit | Rule |
|---|---|---|
| Outside the frame | 1 | Outside the product's `boundingPolygon`: not acquired |
| No data | 2 | Inside the frame, but wrapped coherence has no value |
| Layover | 4 | Ground slope facing the radar, measured along the horizontal look direction, is steeper than the incidence angle |
| Shadow | 8 | Slope facing away is steeper than 90° minus the incidence angle (active shadow only) |
| Low coherence | 16 | Event-pair coherence below 0.3 |
| No unwrapped phase | 32 | Connected component 0, or unwrapped phase exactly 0 (the product's fill in unwrapping gaps) |
| Low baseline coherence | 64 | Baseline-pair coherence below 0.3 |

The look direction and incidence come from the product's own `radarGrid` cubes (`losUnitVectorX/Y`, `incidenceAngle`). NISAR looks left; for frame 74 the unit vector toward the sensor is about 0.55 west and 0.17 north.

**Classes per task.** Not acquired (bit 1), then no data (bit 2), then hidden by terrain (bits 4 or 8). Otherwise, for *disturbance*, "seen but not reliable" if the baseline was incoherent (bit 64); for *movement*, if coherence is low or phase was not unwrapped (bits 16 or 32). Everything else is usable. Zone verdicts: 50% usable or more is "enough evidence", 20 to 50% "partial", under 20% "insufficient".

**Sensitivity.** Usable share for movement over the whole Rasuwa area is 95% at a 0.2 coherence threshold, 82% at 0.3 and 67% at 0.4 (Tsho Rolpa: 95, 77, 62%). The threshold is a project choice, so the app reports all three.

**Results.**

| Zone | Change visible: usable | Movement: usable | Not acquired |
|---|---|---|---|
| Rasuwa detachment zone (UNOSAT) | 66% | 0% | 0% |
| Rasuwa mapped mudflow (UNOSAT) | 34% | 9% | 52% |
| Bhote Koshi corridor | 70% | 76% | 0% |
| Trishuli corridor | 3% | 4% | 95% |
| Tsho Rolpa lake bookmark | 70% | 65% | 0% |
| Tsho Rolpa dam and glacier zones | 73% | 56% | 0% |

So at the Rasuwa source a surface change could be seen, but movement could not be measured: the unwrapped phase is zero-filled in strips there. An earlier version of the story said the source fell in a swath gap. That was wrong: wrapped coherence is present, only the unwrapped phase is missing, and the text now says so. About half the mudflow and nearly all the Trishuli corridor lie in frame 75, which has no baseline pair yet and is not assessed.

**Limits.** Passive shadow (cast by a distant ridge) is not modelled. Features smaller than the 40 m grid are smoothed. Coherence also falls for wet snow, vegetation or a long time gap, so "change visible" means a change *could* be seen, not that one happened. The products are Provisional.

## 2. "What could explain this?"

`frontend/src/services/hypotheses.ts`. When a spot is clicked, the app reads the values there and weighs five explanations:

1. The ground surface was disturbed (debris flow, landslide, erosion or new deposits).
2. Ordinary seasonal change (vegetation, snow, ice or wet soil).
3. Open water (shown only near a mapped lake or where coherence is below 0.15).
4. A radar viewing artefact.
5. Nothing changed.

The checks it uses are event-pair coherence (low below 0.3, stable at 0.6 or more), the observability flags, pixel offsets compared with the scene's usual spread (half the 2nd to 98th percentile range, with the match quality at or above the scene median), the slope from the DEM (steep at 25° or more), elevation (4,800 m or more counts as snow and ice ground), whether the spot lies inside an independently mapped area (UNOSAT, REACH), and the case-wide control comparison.

Each explanation lists the evidence for and against it, and what would settle it. Ranking counts agreeing checks minus disagreeing ones: two or more is "best supported", one "possible", otherwise "weak". **It is never a probability.** Where the radar did not look (outside the frame or no data), the panel refuses to explain and says what data is missing.

## 3. Evidence report

`frontend/src/services/report.ts`. The Inspector offers a report for the clicked spot as a printable page (print or save as PDF), CSV, GeoJSON or JSON. It holds the observability answers and reasons, the ranked explanations, every sampleable layer's value with its evidence class, observation dates and source file, and the caveats. It is built in the browser from data already shipped with the app; nothing is sent anywhere.

## Evidence classes

Every layer, panel and report carries one class (`frontend/src/services/evidence.ts`): Observed, Derived, Forecast, Hypothesis, Reference, Scenario, Unknown. Missing data is labelled Unknown, never treated as safe.
