# Implementation status

**Status: the minimum scientific MVP threshold is met.** The product runs real NISAR measurements of the Rasuwa event, offline, from a one-click package. It is a first prototype on Provisional data, and its limits below are real.

Report date: 2026-11-10, updated 2026-11-13 for the scientific corrections of 12 November (P0.1). Two main cases now ship: Rasuwa (flagship, opens first) and Tsho Rolpa glacial lake.

> **Awaiting a rebuild.** The P0.1 corrections are in the code, but the shipped data was built before them. The app withholds the version 1 observability figures and labels the control medians as coming from an earlier script. Rebuilding needs the raw GUNW files, which are not in the repository. The steps are in [docs/RADAR_OBSERVABILITY.md](docs/RADAR_OBSERVABILITY.md) and in the P0.1 pull request.

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

- **The rebuild after P0.1** has not been run. Until it is, the observability figures are withheld, the control medians are from an earlier script, the valid-phase shares count zero-filled phase, and each road stretch's radar-watch rating rests on the version 1 flags.
- **Rasuwa GCOV snapshots** are not downloaded. They need 31 GB, and the tab says so. The Tsho Rolpa case does use GCOV.
- **GSLC** is deferred: no justified use yet.
- **Displacement** is deliberately absent, because the phase sign convention is undocumented.
- **Frame 75 is not assessed for observability**: it has no pre-event baseline pair yet, so about half the mapped mudflow and the Trishuli corridor are shown as "outside the frame checked". Frame 75 does cover them (Pair A was processed for both frames) but is not assessed yet.
- **Not built from the November master prompt** (need data or are out of scope): timeline across many pairs, rainfall and river-flow context (IMERG, GloFAS), live processing, hosting. Slope screening and road exposure were built on 10 November as experimental screens. Machine-learning landslide prediction and calibrated flood probabilities are deliberately not attempted.
- **No field validation** exists, and the data is Provisional.
- **Not tested** on another computer, a physical phone, or a hosted server. Browser tests ran in Microsoft Edge and Brave up to 2 November, and in Chromium from 10 November. They have not run in Chrome, Firefox or Safari. The code has been reviewed for Firefox and Safari problems, but never run in them.
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
| GCOV extraction | Implemented and tested | NASA sample file, Tsho Rolpa files | Real for Tsho Rolpa | Rasuwa GCOV (31 GB) not downloaded |
| Ionosphere-removed phase | Implemented and tested | Real files | Real, derived | Labelled as calculated here |
| Analysis against UNOSAT polygons | Implemented and tested | Real files | Real | Descriptive only |
| Browse-preview fallback | Implemented and tested | Real PNG and KML | Not needed now | Section 24 emergency mode |
| GSLC integration | Deferred | None | Catalogued only | |
| LOS displacement | Deliberately not implemented | Test asserts no such layer | n/a | |
| QA gates | Implemented and tested | Real files, pass and fail cases | Real | |
| Provenance records | Implemented and tested | Automated | Real | |
| COG and tile export | Implemented and tested | Real files | Real | |
| Manifest from disk state | Implemented and tested | Integration checks | Real | |
| Application shell, map | Implemented and tested | 29 browser tests | Real | An error boundary keeps a failing panel from blanking the app |
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
| Time slider, day chart | Implemented and tested | Browser | Real, Tsho Rolpa GCOV dates | Any layer with saved time steps |
| Terrain, UNOSAT, OSM, boundaries | Implemented and tested | Browser | Real | |
| Sentinel-1 proxy and screening | Implemented and tested | Browser | Real, preliminary | |
| LANDMET test case | Retired from the app (team decision, 6 Nov) | Pipeline tests only, with the file present | Real, test only | Not in the case selector |
| Offline operation | Implemented and tested | CSP-enforced browser test | Real | |
| One-click package | Implemented and tested | Fresh unzip, via the `.bat` | Real | Needs Python 3 |
| Accessibility | Implemented and tested | axe, keyboard | n/a | No serious findings |
| Responsive layout | Implemented and tested | 375 px emulation | n/a | Not on a physical phone |
| Evidence classes on every layer | Implemented and tested | Unit, browser | Real | Observed, Derived, Forecast, Hypothesis, Reference, Scenario, Unknown |
| Radar Observability ("Can the radar see it?") | Method version 2 implemented and tested; awaiting rebuild | Python, frontend, browser | Real, derived; version 1 figures withheld | Applies the product's own mask. Both cases, frame 74 only; see [RADAR_OBSERVABILITY.md](docs/RADAR_OBSERVABILITY.md) |
| Pre-event control comparison | Generator implemented and tested (12 Nov); awaiting rebuild | Python | Real, derived; shipped medians from an earlier script, labelled so | Rasuwa story step 2 chart. Wording: consistent with surface change, not proof of cause |
| "What could explain this?" | Implemented and tested | Unit, browser | Real inputs, rule-based | Counts only radar values at the spot and independent mapping. Labels: Fits the checks, Partly fits, Little support; never probabilities |
| Evidence report (PDF, CSV, GeoJSON, JSON) | Implemented and tested | Unit, browser downloads | Real | Built in the browser |
| Tsho Rolpa dam and glacier movement | Research output only (12 Nov) | Python | Not shown in the app | `prepare_lake.py --research-motion` writes to `data/qa` |
| Landslide-prone terrain screen (Model A) | Experimental | 5 Python, 2 unit, browser | Real DEM, derived | Rasuwa only; a one-event consistency check (AUC 0.66), not a validation |
| Road exposure screen | Experimental | Unit, browser | Real OSM + DEM + NISAR, derived | Says whether the radar could watch each stretch; that rating rests on the version 1 flags until the rebuild |
| Rainfall-triggered landslide risk (Model B) | Blocked by data | None | Needs IMERG, soil moisture | |
| First-minute finding card | Implemented and tested | Unit, browser | Real, figures read from the manifest | |
| Status registry (`frontend/public/data/status.json`) | Implemented and tested | Unit test checks every "complete" claim names a test that calls its computation | n/a | Shown in the app as "What is real?" |
| Claim register (`frontend/public/data/claims.json`) | Implemented and tested | Unit test keeps the wording of RED claims off every live surface | n/a | 25 claims from the Stage 0 audit, with basis and status |
| Image swipe comparison | Implemented | No automated test | Real, Tsho Rolpa GCOV dates | Tsho Rolpa compare mode |
| Public repository, deployment | Not implemented | None | n/a | Team decision |

## Commands executed and results

Re-run on 2026-11-13 in a cloud copy, with the P0.1 code and the shipped (not yet rebuilt) data, in Chromium:

```text
python -m pytest tests                       92 passed, 35 skipped (skips need raw granules, NASA samples or the LANDMET file)
npx tsc --noEmit                             no errors
npm test                                     62 passed
npm run build                                OK
npx playwright test                          28 passed, 1 failed: the fixture test "a failed raster source reports an error"
                                             passed 3 of 3 when re-run alone, so it is intermittent (likely the flaky fixture test, E4)
```

Passing tests check the code's behaviour. They do not validate a scientific result, and the real-data tests that need raw granules were skipped.

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
- Pair A holds no usable measurement at the detachment zone: the product's own mask flags every frame-74 pixel there, as water or an invalid subswath (not yet told apart). Two earlier statements went too far. The first called it a swath gap. The 6 November correction said a change was visible on 66% of it, which came from an observability check that ignored the mask.
- Against a pre-event pair (23 Jul to 16 Aug), mudflow coherence went from 0.41 to 0.28 while nearby ground went from 0.42 to 0.52, and the gap narrowed over later pairs. That is consistent with surface change in the mapped area, not proof of cause. The pairs differ in length (24 and 12 days) and radar mode, and the medians come from an earlier script that the rebuild will replace.
- Pair B reaches the source, and matching largely fails: correlation peak 0.18 against 0.63.
- Raw phase is dominated by the ionosphere.
- Pixel offsets show no large coherent shift.

These are descriptive evidence, not proof of cause.

## Bugs found by real data, and fixed

GOFF units check, ignored GOFF mask, unreliable phase shown as valid, GCOV mask flag, hardcoded maturity, no-data pixels drawn as valid on the map, and the washed-out phase scale. Browser testing also found a worker failure, a page-blanking race, intermittent first reads, and error messages hidden behind the map. Opening `index.html` directly also gave a silent blank page, and it now explains what to do. All are fixed, and details are in [SCIENTIFIC_VALIDATION.md](docs/SCIENTIFIC_VALIDATION.md).

## Remaining actions

See [IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md). First, rebuild both cases from the raw files with the corrected code, then re-run every test. After that, the most valuable next steps need new downloads: frame 75 baseline pairs (to assess the downstream corridor) and the frame 98/16 pairs (a second viewing direction). The download list is kept with the project files.
