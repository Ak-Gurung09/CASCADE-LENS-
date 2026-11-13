# Skeptical review, acceptance checks and scorecard

Written 2026-11-10, after the master-prompt build. Revised 2026-11-13, after the scientific corrections of 12 November (P0.1) found errors this review had missed. The goal is to find the weaknesses before judges do. Scores are evidence-backed, not hopeful.

## 1. Red-team findings

| # | Question a skeptic asks | What we found | Severity | Status |
|---|---|---|---|---|
| 1 | Are the measurements genuine? | Yes. Every NISAR layer is read from a real GUNW or GOFF granule; the inspector shows the native pixel and granule name, and browser tests compare known values. | n/a | Holds |
| 2 | Does "outside the frame" mean the radar never saw it? | **No, and the app implied it did.** 52% of the mapped mudflow lies in frame 75, which Pair A also covers. We only assessed frame 74. The class was called "Not acquired". | High: it misstates coverage | **Fixed**: renamed "Outside the frame checked" everywhere (map legend, inspector, story, report, docs), and the text says a neighbouring frame may cover it |
| 3 | Is the coherence drop just the season or a longer pair? | Ground nearby went from 0.42 to 0.52 while the mudflow went from 0.41 to 0.28, so the drop is confined to the mapped area. But the pairs are not like for like: the pre-event pair spans 24 days and the event pair 12, and they were acquired in different radar modes (4000 and 2000). The medians came from a script that is not in the repository, and its intervals treated neighbouring pixels as independent. The 10 Nov wording ("not a general seasonal effect", "points at the slide") went further than this allows. | Medium | **Revised (12 Nov)**: the wording is now "consistent with surface change; does not establish the cause", and the app states why the pairs differ. A reproducible generator with block-bootstrap intervals replaces the medians at the rebuild |
| 4 | Did an earlier version over-claim? | Yes, twice. First it said the source fell in a "swath gap", which had not been checked. The 6 Nov correction then said a change was visible on 66% of the source. In fact the product's own mask flags every frame-74 pixel there, as water or an invalid subswath, and the observability check ignored that mask. | High | **Fixed in code (12 Nov)**: the mask is applied, version 1 figures are withheld until the rebuild, and regression tests cover it |
| 5 | Is the landslide screen a prediction? | No. It is terrain only, uncalibrated, and validated on one event (AUC 0.66, a weak-to-moderate signal). | High if mislabelled | Labelled Experimental in the panel, inspector, legend, report and status list; rainfall triggering marked blocked by data |
| 6 | Can a road be "safe" because nothing is flagged? | A "Low exposure" stretch is only low on the factors we have. 109 of 153 km of screened road lie mostly beyond the frame checked, so the radar could not watch them for this event. | Medium | Each stretch states whether the radar could watch it; limitations listed |
| 7 | Does "Usable" for movement mean movement was measured? | No: it means a measurement *could* be made. No displacement is calculated anywhere. | Medium | Holds; displacement listed as future research |
| 8 | Are the threshold choices arbitrary? | Coherence 0.3 and the slope bands are project choices. Sensitivity at 0.2 and 0.4 is reported. The 10 Nov figures (95%, 82%, 67% for Rasuwa) ignored the unwrapping rule and are withdrawn. | Low | Documented with provenance; recomputed with the movement-class rule at the rebuild |
| 9 | Do the "explanations" pretend to be AI or probability? | They are fixed rules that count agreeing checks. Tests assert no percentages or probability words appear. But "Best supported" could be reached without any radar value at the spot, from slope, height and area-wide figures. | Medium | **Fixed (12 Nov)**: only radar values at the spot and independent mapping count; the rest is listed as context. Labels are now Fits the checks, Partly fits and Little support, and without a radar value the panel says "Cannot judge here" |
| 10 | Does the app work without the developer? | Yes, from `Start CascadeLens.bat`, offline. The opening card leads a first-time user to the story. | n/a | Holds; not tested on a second PC or a hosted server |
| 11 | Is the 40 m grid implying more precision than the data has? | Coherence is block-averaged to 40 m, the DEM is 30 m resampled. Tiles are drawn with nearest-neighbour and no smoothing. | Low | Holds |
| 12 | Is everything traceable? | Each layer names its granule, pairs, thresholds and method; reports carry the source file per value. The control series was the exception: its generator was not in the repository. | Medium | **Fixed in code (12 Nov)**: `prepare_control_series.py` added; the shipped medians are labelled as from the earlier script until the rebuild |
| 13 | Does a missing input ever count as "usable"? | Yes, before 12 Nov: a missing elevation, incidence angle or look direction let a spot pass the terrain check, and the component fill value counted as a label. | High | **Fixed in code (12 Nov)**: "Not assessed" class, fill read from the file, no data always wins over masked |
| 14 | Does Tsho Rolpa claim movement it cannot support? | Yes, before 12 Nov: the dam "moved less than about 2 cm" with "no sign that it is slumping", and the glacier limit was extrapolated to "roughly 6 m a year", from 12-day pairs. | High | **Fixed (12 Nov)**: movement bounds are research output only; the app shows coherence and says it does not measure movement |

**Still open:** the rebuild from the raw files, which the corrected figures depend on; reading the raw mask values at the source to tell water from an invalid subswath; frame 75 (movement could be assessed now, with no new download; change visibility needs its pre-event pair); a second viewing direction (Track 98 frame 16 pairs); rainfall and river-flow context (GPM IMERG, GloFAS); field validation (none exists).

## 2. Acceptance checks (prompt sections 32.1 and 32.2)

| Check | How it is proven |
|---|---|
| Open the actual study area | `e2e/real.spec.ts`: opens on Rasuwa with real NISAR measurements |
| Inspect an authentic observation, with source and dates | Inspector tests read real values and name the granule |
| Inspect validity and quality | Masked pixels, quality overlays and "refuses the swath gap" tests |
| Compare compatible observations | Before/after control series (5 pairs, same track and frame) in story step 2 |
| Examine the method | Every layer's notes; `docs/RADAR_OBSERVABILITY.md` |
| Understand alternative explanations | "What could explain this?" unit and browser tests |
| Inspect observability limits | Observability unit tests (Python and TypeScript), story step 3 |
| Generate a traceable report | Report unit tests and a browser download test |
| Missing coverage is never "safe" | Hypotheses refuse to explain unseen spots; evidence class "Unknown"; tests for both |
| Every "complete" claim has a test | `finding.test.ts` checks each status entry's test files exist |

Test totals on 2026-11-10: Python 72 passed, 35 skipped (need raw files); unit 52 passed; browser 29 passed in Chromium. On 2026-11-12, with the P0.1 code: Python 92 passed, 35 skipped; unit 62 passed; browser 29 passed. Passing tests check the code's behaviour; they do not validate a scientific result.

## 3. Scorecard

| Dimension | Score | Evidence | Weakness | Best next step |
|---|---|---|---|---|
| NASA relevance | 8 | Real NISAR L-band products answer a real disaster question | One event | Add a second event or region |
| Scientific validity | 6 | Reasons kept separate, product masks honoured, over-claims corrected in code | Corrected figures await a rebuild; the control comparison is not like for like; Provisional data, no field truth | Rebuild, then a like-for-like control pair |
| NISAR integration | 8 | GUNW, GOFF, GCOV read from HDF5 with metadata and QA gates | GCOV not loaded for Rasuwa | Rasuwa GCOV snapshots |
| Originality | 7 | Task-specific observability (change vs movement) with reasons, tied to roads | Layover/shadow maps exist elsewhere; novelty is the per-task, per-reason framing | Show a case where it changes a decision |
| Observability intelligence | 6 | Per pixel, per task, inspectable, tested; version 2 honours the product's mask and marks missing inputs as not assessed | Version 1 figures withdrawn and withheld until the rebuild; frame 75 not assessed; passive shadow not modelled | Rebuild both cases, then assess frame 75 |
| Temporal analysis | 5 | 5-pair zone series with control | No per-pixel timeline in the app | Prepare the 4 extra pairs as layers |
| Hazard intelligence | 5 | Terrain screen and road exposure, honest labels | Terrain only; no rainfall; one-event check | Add IMERG rainfall for Model B |
| Engineering | 7 | One manifest contract, shared services, 150+ tests | Static site; processing runs by hand | Scripted end-to-end rebuild |
| Data infrastructure | 4 | Reproducible scripts and QA gates | Manual downloads, no automation | Scheduled catalogue check |
| Validation | 7 | Unit, integration and browser tests; documented limits | No independent validation data | Compare with UNOSAT damage points |
| UX/UI | 7 | Opening finding, guided story, inspector, reports | Dense panels for a first-time user | Usability test with 3 people |
| Demonstration | 8 | One click, offline, lands on the finding | Not hosted yet | Public hosting |
| Impact | 6 | Road stretches the radar could not watch, a direct planning message | Not tested with responders | Feedback from a Nepal agency |
| Scalability | 5 | Scripts are case-driven (two cases) | Manual steps per case | Package a "new case" recipe |

Implementation quality is ahead of scientific completeness: the software is solid and honest, but the science rests on one event, Provisional data and no field validation. Competition readiness is good for the Rasuwa demonstration; hosting is the largest practical gap.
