# Skeptical review, acceptance checks and scorecard

Written 2026-11-10, after the master-prompt build. The goal is to find the weaknesses before judges do. Scores are evidence-backed, not hopeful.

## 1. Red-team findings

| # | Question a skeptic asks | What we found | Severity | Status |
|---|---|---|---|---|
| 1 | Are the measurements genuine? | Yes. Every NISAR layer is read from a real GUNW or GOFF granule; the inspector shows the native pixel and granule name, and browser tests compare known values. | n/a | Holds |
| 2 | Does "outside the frame" mean the radar never saw it? | **No, and the app implied it did.** 52% of the mapped mudflow lies in frame 75, which Pair A also covers. We only assessed frame 74. The class was called "Not acquired". | High: it misstates coverage | **Fixed**: renamed "Outside the frame checked" everywhere (map legend, inspector, story, report, docs), and the text says a neighbouring frame may cover it |
| 3 | Is the coherence drop just the season or a longer pair? | The pre-event pair spans 24 days, the event pair 12. A longer pair normally has *lower* coherence, so the comparison is conservative. Untouched ground nearby rose from 0.42 to 0.52 over the same pairs, so the mudflow-specific drop (0.41 to 0.28) is not a general seasonal effect. | Medium | Holds, now stated here and in the story |
| 4 | Did an earlier version over-claim? | Yes: it said the source fell in a "swath gap". The file shows wrapped coherence there; only the unwrapped phase is missing. | High | Fixed (6 Nov), with a regression test |
| 5 | Is the landslide screen a prediction? | No. It is terrain only, uncalibrated, and validated on one event (AUC 0.66, a weak-to-moderate signal). | High if mislabelled | Labelled Experimental in the panel, inspector, legend, report and status list; rainfall triggering marked blocked by data |
| 6 | Can a road be "safe" because nothing is flagged? | A "Low exposure" stretch is only low on the factors we have. 109 of 153 km of screened road lie mostly beyond the frame checked, so the radar could not watch them for this event. | Medium | Each stretch states whether the radar could watch it; limitations listed |
| 7 | Does "Usable" for movement mean movement was measured? | No: it means a measurement *could* be made. No displacement is calculated anywhere. | Medium | Holds; displacement listed as future research |
| 8 | Are the threshold choices arbitrary? | Coherence 0.3 and the slope bands are project choices. Sensitivity at 0.2 and 0.4 is reported (usable movement: 95%, 82%, 67% for Rasuwa). | Low | Documented with provenance |
| 9 | Do the "explanations" pretend to be AI or probability? | They are fixed rules that count agreeing checks. Tests assert no percentages or probability words appear. | Low | Holds |
| 10 | Does the app work without the developer? | Yes, from `Start CascadeLens.bat`, offline. The opening card leads a first-time user to the story. | n/a | Holds; not tested on a second PC or a hosted server |
| 11 | Is the 40 m grid implying more precision than the data has? | Coherence is block-averaged to 40 m, the DEM is 30 m resampled. Tiles are drawn with nearest-neighbour and no smoothing. | Low | Holds |
| 12 | Is everything traceable? | Each layer names its granule, pairs, thresholds and method; reports carry the source file per value. | n/a | Holds |

**Still open:** frame 75 (movement could be assessed now, with no new download; change visibility needs its pre-event pair); a second viewing direction (Track 98 frame 16 pairs); rainfall and river-flow context (GPM IMERG, GloFAS); field validation (none exists).

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

Test totals on 2026-11-10: Python 72 passed, 35 skipped (need raw files); unit 52 passed; browser 29 passed in Chromium.

## 3. Scorecard

| Dimension | Score | Evidence | Weakness | Best next step |
|---|---|---|---|---|
| NASA relevance | 8 | Real NISAR L-band products answer a real disaster question | One event | Add a second event or region |
| Scientific validity | 7 | Control comparison, reasons kept separate, over-claims corrected | Provisional data, no field truth | Field or optical cross-check |
| NISAR integration | 8 | GUNW, GOFF, GCOV read from HDF5 with metadata and QA gates | GCOV not loaded for Rasuwa | Rasuwa GCOV snapshots |
| Originality | 7 | Task-specific observability (change vs movement) with reasons, tied to roads | Layover/shadow maps exist elsewhere; novelty is the per-task, per-reason framing | Show a case where it changes a decision |
| Observability intelligence | 8 | Per pixel, per task, inspectable, tested, both cases | Frame 75 not assessed; passive shadow not modelled | Assess frame 75 |
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
