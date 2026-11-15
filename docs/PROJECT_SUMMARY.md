# GAIA CascadeLens: project summary

**Following change on Earth's surface, one radar observation at a time.**
A Team GAIA project for NASA Space Apps Challenge 2026, *Dancing with the SARs*.

## What it is

On 26 August 2026 a disaster ran through Rasuwa, Bhote Koshi and the Trishuli valley in Nepal. CascadeLens is an open, offline-capable evidence explorer that puts real **NISAR** radar measurements of that event on a map, with their quality, provenance and limits always in view. A second case covers the Tsho Rolpa glacial lake.

It is not a warning system. It is built to be honest about what the radar can and cannot tell us.

## Why it is special

1. **It tells you what it cannot see.** Most tools hide gaps. CascadeLens has a "Can the radar see it?" view that says, for every spot, whether a surface change could be judged, whether movement could be measured, and why not.
2. **Real data, not mock-ups.** Real NISAR GUNW, GOFF and GCOV products, from two viewing directions (Track 48 descending, Track 98 ascending), rebuilt from the raw files and reproducible.
3. **It corrects itself in public.** The first method, which ignored the product's quality mask, was withdrawn and rebuilt on 13 November 2026. Withdrawn claims are tracked and a test keeps them out of the app.
4. **Every number has a label.** Each layer, panel and report is tagged Observed, Derived, Forecast, Hypothesis, Reference, Scenario or Unknown.
5. **No invented displacement.** The phase sign convention is undocumented, so no displacement is calculated anywhere.
6. **Works with no internet.** A one-click package runs fully offline, tested with outside requests blocked.
7. **No backend.** Processing happens in Python before the browser. The app is static, so it can be hosted anywhere.

## Every feature

**Map and data**
- Interactive map with Copernicus DEM terrain, UNOSAT event layers, Sentinel-1 damage evidence, OSM geography and district boundaries.
- Two cases: Rasuwa (opens first) and Tsho Rolpa.
- Geographic bookmarks and a guided story per case. Every figure in the story is read from the shipped data.
- A 3D terrain view for Tsho Rolpa and a 3D model of the Rasuwa corridor.
- Snapshot view and a before/after swipe.

**Real NISAR evidence**
- Phase, coherence, connected components, ionosphere screen and pixel offsets.
- Ionosphere-removed phase, labelled as calculated here.
- Observation-pair selector with dates, tracks and frames verified from the files.
- Coherence through time: five pairs per viewing direction (23 July to 6 October 2026), with a time slider and a day chart.
- Measurement inspector that reads stored raster values with quality beside them.
- Quality overlays that show masked pixels.

**Interpretation**
- "Can the radar see it?" radar observability from both viewing directions.
- "What could explain this?", a rule-based panel that lists checks for and against each explanation and never gives a probability.
- "What to try next" for any spot the radar cannot use.
- Evidence report as a printable page, CSV, GeoJSON or JSON.
- "What is real?" panel, plus a claims register with the basis and status of each headline claim.

**Hazard and access screens (experimental)**
- Landslide-prone terrain screen and road-exposure screen on 250 m road stretches with stable IDs.
- Road access screen showing which places keep a road path to a health facility once destroyed roads and washed-out bridges are closed.
- Field-check list: dated field reports with sources, and only those can mark a record Verified or Not confirmed.
- Readiness engine that records how far each flood and landslide capability can honestly go.

**Simulate mode (illustrations, not forecasts)**
- Flow replay along the rivers, a what-if flood, a radar explainer, and a labelled Tsho Rolpa dam-break scenario with its working shown (`SCENARIO_WORKING.md`, `scenario-check.xlsx`).
- A cliff-impact hypothesis tab with its physics.

**Engineering**
- Python pipeline for GUNW, GOFF and GCOV with QA gates, provenance, SHA-256 checks and resumable downloads.
- Pre-download QA check and a browse-preview fallback.
- Model code (rainfall thresholds, logistic susceptibility, GR4J river model) and a verification harness (POD, FAR, CSI, chronological splits, leakage guard).
- Tests at every level, including real-browser, offline and accessibility (axe) tests, run in CI. Published to GitHub Pages.

## The problem it solves

After a mountain disaster, people need to know what changed, where, and how far to trust the picture. Optical satellites fail under cloud and monsoon. Radar sees through them, but radar products are hard to read, and a gap or a low-quality pixel is easily mistaken for "nothing happened". CascadeLens turns raw NISAR products into something a responder or researcher can inspect, and it shows quality and limits next to every value.

What the data shows so far:
- Coherence is much lower along the UNOSAT-mapped channel than beside it: 0.19 against 0.46 (frame 74) and 0.16 against 0.52 (frame 75).
- Before the event the mapped area and its surroundings were similar (0.38 against 0.40). Across the event the gap opened (0.19 against 0.50), and the 95% intervals do not overlap. From the opposite side it also opens: 0.13 against 0.49.
- That is consistent with surface change, but it does not prove the cause.
- At the detachment zone, Track 48 holds no valid data, and Track 98 sees very low coherence. Movement cannot be measured there from either side.

## Problems that still need fixing

- **No displacement** until the phase sign convention is documented.
- **Rasuwa GCOV snapshots** are not downloaded (31 GB).
- **Coverage gaps:** Track 48 misses 14% of the mapped mudflow, 18% of the Trishuli corridor and 19% of the case area.
- **No landslide or flood warning.** The rainfall threshold, the one model run on real data, did not beat chance in held-out years (corridor CSI 0.20 against a chance level of 0.21).
- **Susceptibility and river models** wait for a geological map and DHM discharge data.
- **No field validation,** and all NISAR products are Provisional.
- **The BIPAD landslide report licence** is not established.
- **Browser coverage:** never run in Chrome, Firefox or Safari, on a physical phone, or on another computer.
- **Space Apps rules not yet checked.** The site was unreachable on 13 November.
- **Pairs are not like for like.** The before pair spans 24 days and the event pair 12, in different radar modes (Track 48 only).

## The main flaw: not enough data

Your instinct is right, with one refinement. The core weakness is that there is **too little usable data for the question being asked**, and in a few places too much data to move around.

**Too little**
- **One event.** A single disaster cannot support statistical claims or a trained model.
- **A short time series.** Five pairs per viewing direction over about ten weeks gives almost no baseline for what normal coherence looks like.
- **Little ground truth.** There are no field measurements, and the landslide reports are sparse and of unclear licence. That is why the rainfall threshold could not beat chance.
- **Radar gaps** at the most important place. Over the source area Track 48 has no valid data, and Track 98 coherence is too low to measure movement.
- **Provisional products** that may change.

**Too much**
- Rasuwa GCOV needs 31 GB.
- The online site is about 365 MB, and the nine raw granules were 9.2 GB.

The project's honest response has been to refuse to claim more than the data supports. Landslide prediction and calibrated flood probabilities are deliberately left out. More acquisitions over time, more events and field verification are the way past this flaw.

## Try it

- Online: https://ak-gurung09.github.io/CASCADE-LENS-/ (desktop browser, fast connection)
- Offline: unzip `CascadeLens.zip` and run **Start CascadeLens.bat** (or `sh start.sh`)
- Source: `cd frontend && npm install && npm run dev`
