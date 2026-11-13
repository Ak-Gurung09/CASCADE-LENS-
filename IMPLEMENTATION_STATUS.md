# Implementation status

**Status: the minimum scientific MVP threshold is met.** The product runs real NISAR measurements of the Rasuwa event, offline, from a one-click package. It is a first prototype on Provisional data, and its limits below are real.

Report date: 2026-11-13. Two main cases now ship: Rasuwa (flagship, opens first) and Tsho Rolpa glacial lake.

## Minimum completion threshold (brief, section 25.4)

| # | Requirement | Met? | Evidence |
|---|---|---|---|
| 1 | One real NISAR-derived analytical layer works | Yes | GUNW phase and coherence, from real granules |
| 2 | A second complementary layer works | Yes | GOFF offsets, SNR and correlation peak, in two pairs |
| 3 | Geographic navigation works | Yes | Browser tests |
| 4 | Acquisition metadata is correct | Yes | Read from the files, and matched to the catalogue and brief |
| 5 | Users can inspect actual valid measurements | Yes | Inspector values match source arrays |
| 6 | The product explains what information means | Yes | Per-layer explanations |
| 7 | Scientific limitations are visible | Yes | Shown for every layer |
| 8 | Processing is reproducible from source data | Yes | Rerun from raw files; determinism tested |
| 9 | Main experience can be demonstrated locally | Yes | Tested from a fresh unzip, with outside requests blocked |

## What is not done

- **GCOV snapshots** are not downloaded. They need 31 GB, and the tab says so.
- **GSLC** is deferred: no justified use yet.
- **Displacement** is deliberately absent, because the phase sign convention is undocumented.
- **Frame 75 is not assessed for observability**: it has no pre-event baseline pair yet, so about half the mapped mudflow and the Trishuli corridor are shown as "outside the frame checked". Frame 75 does cover them (Pair A was processed for both frames) but is not assessed yet.
- **Not built from the November master prompt** (need data or are out of scope): timeline across many pairs, rainfall and river-flow context (IMERG, GloFAS), slope screening, road impact, live processing, hosting. Machine-learning landslide prediction and calibrated flood probabilities are deliberately not attempted.
- **No field validation** exists, and the data is Provisional.
- **Not tested** on another computer, a physical phone, or a hosted server. Browser tests ran in Microsoft Edge and Brave, not Chrome, Firefox or Safari. The code has been reviewed for Firefox and Safari problems, but never run in them.
- **The app cannot run from `index.html` directly.** Browsers block that, and the page now explains what to do.
- **Not created:** a public repository, submission links or a hosted deployment.

## Feature status

| Feature | Implementation | Test status | Data status | Notes |
|---|---|---|---|---|
| Catalogue discovery | Implemented and tested | Run live against ASF | Real: 140 granules | |
| QA pre-check before download | Implemented and tested | Run on real granules | Real | `--qa-only` |
| NISAR download | Implemented and tested | Real downloads | Real: 6 granules, 9.2 GB | Size check after download |
| HDF5 inspection | Implemented and tested | Real files | Real | |
| GUNW extraction | Implemented and tested | Real files | Real | Pair A |
| GOFF extraction | Implemented and tested | Real files | Real | Pairs A and B |
| GCOV extraction | Implemented and tested | NASA sample file | Unavailable dependency | 31 GB not downloaded |
| Ionosphere-removed phase | Implemented and tested | Real files | Real, derived | Labelled as calculated here |
| Analysis against UNOSAT polygons | Implemented and tested | Real files | Real | Descriptive only |
| Browse-preview fallback | Implemented and tested | Real PNG and KML | Not needed now | Section 24 emergency mode |
| GSLC integration | Deferred | None | Catalogued only | |
| LOS displacement | Deliberately not implemented | Test asserts no such layer | n/a | |
| QA gates | Implemented and tested | Real files, pass and fail cases | Real | |
| Provenance records | Implemented and tested | Automated | Real | |
| COG and tile export | Implemented and tested | Real files | Real | |
| Manifest from disk state | Implemented and tested | Integration checks | Real | |
| Application shell, map | Implemented and tested | 31 browser tests | Real | |
| Case-study selector | Implemented and tested | Browser | Real | Rasuwa and Tsho Rolpa |
| Bookmarks | Implemented and tested | Browser, exact values | Real | Approximate navigation frames |
| Observation-pair selector | Implemented and tested | Browser | Real | |
| Dual-evidence switching | Implemented and tested | Browser | Real | Keeps the selected point |
| Measurement inspector | Implemented and tested | Unit and browser tests | Real | All six result states |
| Quality overlays, masked pixels | Implemented and tested | Browser, fixture | Real | |
| Legends, explanations | Implemented and tested | Browser | Real | |
| Story mode | Implemented and tested | Browser | Real | Figures read from the analysis |
| Snapshot view | Implemented and tested | Browser, fixture | Unavailable dependency | Shows *Download required* for Rasuwa |
| Simulate mode (flow replay, what-if flood, radar explainer) | Implemented and tested | Unit, data and browser tests | Illustrations built on real geography | Not a forecast, see [LIMITATIONS.md](docs/LIMITATIONS.md) |
| Time slider, day chart | Implemented and tested | Browser | Real, LANDMET | |
| Terrain, UNOSAT, OSM, boundaries | Implemented and tested | Browser | Real | |
| Sentinel-1 proxy and screening | Implemented and tested | Browser | Real, preliminary | |
| LANDMET test case | Implemented and tested | Real file, browser | Real, test only | |
| Offline operation | Implemented and tested | CSP-enforced browser test | Real | |
| One-click package | Implemented and tested | Fresh unzip, via the `.bat`; `start.sh` run on Linux only | Real | Needs Python 3 |
| Accessibility | Implemented and tested | axe, keyboard | n/a | No serious findings |
| Responsive layout | Implemented and tested | 375 px emulation, with the story's place checked to be in view | n/a | Not on a physical phone |
| Evidence classes on every layer | Implemented and tested | Unit, browser | Real | Observed, Derived, Forecast, Hypothesis, Reference, Scenario, Unknown |
| Radar Observability ("Can the radar see it?") | Implemented and tested | 7 Python, 4 frontend, browser | Real, derived | Both cases, frame 74 only; see [RADAR_OBSERVABILITY.md](docs/RADAR_OBSERVABILITY.md) |
| Pre-event control comparison | Implemented | Run on real files | Real, derived | Rasuwa story step 2 chart |
| "What could explain this?" | Implemented and tested | 7 unit, browser | Real inputs, rule-based | Hypotheses, never probabilities |
| Evidence report (PDF, CSV, GeoJSON, JSON) | Implemented and tested | 5 unit, browser downloads and print | Real | Built in the browser |
| Landslide-prone terrain screen (Model A) | Experimental | 5 Python, 2 unit, browser | Real DEM, derived | Rasuwa only; AUC 0.66 on one event |
| Road exposure screen | Experimental | Unit, browser | Real OSM + DEM + NISAR, derived | Says whether the radar could watch each stretch |
| Rainfall-triggered landslide risk (Model B) | Blocked by data | None | Needs IMERG, soil moisture | |
| First-minute finding card | Implemented and tested | Unit, browser | Real, figures read from the manifest | |
| Status registry (`frontend/public/data/status.json`) | Implemented and tested | Unit test checks every "complete" claim names an existing test | n/a | Shown in the app as "What is real?" |
| Image swipe comparison | Deferred | None | n/a | Optional |
| Public repository, deployment | Not implemented | None | n/a | Team decision |

## Commands executed and results

Re-run on 2026-11-13 in a cloud copy (Chromium, not Edge or Brave), after the review below:

```text
python -m pytest tests                       72 passed, 35 skipped (skips need the raw NISAR files)
npx tsc --noEmit                             no errors
npm test                                     55 passed
npx playwright test                          30 passed: 20 on the real build, 10 on the synthetic fixture
python processing/scripts/build_product.py   8,116 files, 222 MB
```

These now also run on every pull request, see `.github/workflows/ci.yml`.

### Review of 13 Nov: problems found and fixed

| Problem | Effect | Fix |
|---|---|---|
| The report's "Print or save as PDF" button did nothing in the packaged app | The offline policy blocks a script written into the report window | The app wires the button from outside; browser test added |
| On a phone, the story's sheet covered the place its text describes | The detachment zone sat under the sheet | The map frames each place in the strip above the sheet; the sheet is shorter with one row of buttons; browser test added |
| On a phone, the story's map could be left undrawn | Headless Chromium treated the solid scrolling sheet as hiding the whole map | The sheet's background stops just short of solid. Seen only in headless Chromium, and not checked on a physical phone |
| On a phone, the case menu, "What is real?" and the dam-failure scenario could not be reached | The top bar hides them at that width | The Layers sheet now carries them |
| The chosen tab's label vanished under the pointer | White text on the white pill, straight after the click | Hover rule corrected; browser test added |
| The opening finding card stayed over the map while the reader explored | It hid the map behind the inspector's readings | It steps aside once a place, layer or spot is picked |
| `scipy` was missing from `processing/requirements.txt` | A fresh install failed one hazard test | Added |
| Four documents still said the source fell in a "swath gap" | The claim was withdrawn on 6 Nov | README, limitations, validation and demonstration script corrected |
| The README and package notes described the LANDMET case | It left the app on 6 Nov | They now describe Tsho Rolpa |
| A package built on Linux shipped a Windows launcher with Unix line endings | `.bat` files can misread their labels that way | `.gitattributes` fixes the endings; `start.sh` added for macOS and Linux |

Still open from this review: the LANDMET tiles and rasters (about 28 MB) still ship in `frontend/public/data` although the app no longer lists that case. Removing them is a team decision.

Re-run on 2026-11-10 in a cloud copy (Chromium, not Edge or Brave):

```text
python -m pytest tests                       72 passed, 35 skipped (skips need the raw NISAR files)
npx tsc --noEmit                             no errors
npm test                                     52 passed
npx playwright test                          29 passed
python processing/scripts/prepare_hazards.py 689 road segments, 179 tiles, 29 s
```

The skeptical review and the scorecard are in [REVIEW_AND_SCORECARD.md](docs/REVIEW_AND_SCORECARD.md). Capability maturity lives in one place, `frontend/public/data/status.json`.

The Rasuwa Simulate tab, dropped when Tsho Rolpa was added on 3 to 4 Nov, is back. The LANDMET test case stays out of the app (team decision, 6 Nov), so its tests were replaced by a Tsho Rolpa to Rasuwa case-switch test.

Results from 2026-11-01, kept for reference:

```text
python -m pytest tests                       105 passed
npm test                                     29 passed
npx playwright test                          31 passed: 21 on the real build, 10 on the synthetic fixture
python processing/scripts/process_nisar.py   6 granules qa_passed
python processing/scripts/generate_manifest.py   29 layers: 14 sampleable, 12 prepared, 2 catalogued, 1 renderable
python processing/scripts/prepare_landmet.py     19 layers: 12 sampleable, 7 unavailable; peak 12.92 h local solar time
```

On 2026-11-01, 165 automated tests passed. Before the Simulate mode was added, the real-build browser tests also passed against the final package, unzipped fresh and started through `Start CascadeLens.bat`, in both Microsoft Edge and Brave. The Simulate test ran in Edge and Brave against the build.

| Performance, 2026-11-02, packaged app in headless Edge | Before | After |
|---|---|---|
| Map ready | 0.89 s | 0.60 s |
| Map ready, CPU slowed 4× | 3.83 s | 1.69 s |
| Sample after a click | 0.11 s | 0.13 s |
| First script file | 1.9 MB | 0.4 MB |

These are medians of 3 localhost runs, not hosted or low-bandwidth measurements. Headless browsers draw the map in software, so compare the two columns rather than reading them as real-use times.

## Product files

| Group | Product | Frames | Status |
|---|---|---|---|
| Pair A, 16→28 Aug, Track 48 descending | GUNW | 74, 75 | Validated by the QA gates |
| Pair A | GOFF | 74, 75 | Validated by the QA gates |
| Pair B, 19→31 Aug, Track 98 ascending | GOFF | 15, 16 | Validated by the QA gates |
| Snapshots 28 and 31 Aug | GCOV | 74, 75, 15, 16 | Not downloaded |

"Validated" means these gates passed. The products themselves remain NASA Provisional. Pair B frame 15 does not reach the mapped extent.

## Findings

See [SCIENTIFIC_VALIDATION.md](docs/SCIENTIFIC_VALIDATION.md).

- Coherence is much lower along the mapped channel: 0.19 and 0.16 inside, against 0.46 and 0.52 nearby.
- Pair A sees the detachment zone (wrapped coherence present, a change would be visible on 66% of it), but its unwrapped phase is zero-filled there, so movement cannot be measured. An earlier report called this a swath gap; that was wrong.
- Against a pre-event control (23 Jul to 16 Aug), mudflow coherence falls from 0.41 to 0.28 while nearby untouched ground rises from 0.42 to 0.52, then recovers over later pairs.
- Pair B reaches it, and matching largely fails: correlation peak 0.18 against 0.63.
- Raw phase is dominated by the ionosphere.
- Pixel offsets show no large coherent shift.

These are descriptive evidence, not proof of cause.

## Bugs found by real data, and fixed

GOFF units check, ignored GOFF mask, unreliable phase shown as valid, GCOV mask flag, hardcoded maturity, no-data pixels drawn as valid on the map, and the washed-out phase scale. Browser testing also found a worker failure, a page-blanking race, intermittent first reads, and error messages hidden behind the map. Opening `index.html` directly also gave a silent blank page, and it now explains what to do. All are fixed, and details are in [SCIENTIFIC_VALIDATION.md](docs/SCIENTIFIC_VALIDATION.md).

## Remaining actions

See [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md). The most valuable next steps need new downloads: frame 75 baseline pairs (to assess the downstream corridor) and the frame 98/16 pairs (a second viewing direction). The download list is kept with the project files.
