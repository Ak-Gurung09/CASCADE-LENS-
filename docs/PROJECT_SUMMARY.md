# GAIA CascadeLens: project summary

**Following change on Earth's surface, one radar observation at a time.**
A Team GAIA project for NASA Space Apps Challenge 2026, *Dancing with the SARs*.

## What it is

CascadeLens is an open, offline-capable evidence explorer for the 26 August 2026 Rasuwa–Bhote Koshi–Trishuli disaster in Nepal, with a second case on the Tsho Rolpa glacial lake. It puts real **NISAR** radar measurements on a map, with their quality and limits always in view. It is not a warning system.

## Why it is special

- **It tells you what it cannot see.** A "Can the radar see it?" view says, for every spot, whether change could be judged, whether movement could be measured, and why not.
- **Real data from two viewing directions** (Track 48 and Track 98), rebuilt from raw files and reproducible.
- **It corrects itself in public.** Its first method was withdrawn and rebuilt, and a test keeps withdrawn claims out of the app.
- **Every layer is labelled** Observed, Derived, Forecast, Hypothesis, Reference, Scenario or Unknown.
- **No invented displacement.** The phase sign convention is undocumented, so none is calculated.
- **Works fully offline,** with no backend.

## Features

- **Map:** DEM terrain, UNOSAT event layers, Sentinel-1 damage evidence, OSM geography, 3D views, before/after swipe, bookmarks and a guided story.
- **NISAR evidence:** phase, coherence, ionosphere screen, pixel offsets, pair selector, coherence through time, and a measurement inspector that shows quality beside each value.
- **Interpretation:** radar observability, a rule-based "What could explain this?" panel (no probabilities), "What to try next", and reports as a printable page, CSV, GeoJSON or JSON.
- **Experimental screens:** landslide terrain, road exposure, road access to health facilities, a field-check list, and a readiness engine.
- **Simulate mode:** flow replay, what-if flood, Tsho Rolpa dam-break scenario and a cliff-impact hypothesis, all labelled illustrations.
- **Engineering:** Python pipeline with QA gates and provenance, model code with a verification harness, and tests at every level, including browser, offline and accessibility tests.

## The problem it solves

Radar sees through cloud, but its products are hard to read, and a gap or low-quality pixel is easily mistaken for "nothing happened". CascadeLens makes the data inspectable and shows its limits.

So far: coherence is much lower along the mapped mudflow channel (0.19) than beside it (0.46). Before the event the two were similar. That is consistent with surface change but does not prove the cause.

## Still to fix

- No displacement, no landslide or flood warning (the rainfall model did not beat chance), no field validation, and all data is Provisional.
- Rasuwa GCOV (31 GB) is not downloaded, and Track 48 misses 19% of the case area.
- Not yet tested in Chrome, Firefox, Safari or on a physical phone.

## The main flaw: not enough data

You are right that data is the weak point, mostly because there is **too little**, with a little too much to move around.

- **One event,** so no statistics or trained model.
- **A short time series:** five pairs per direction over about ten weeks.
- **Almost no ground truth** to check against.
- **No usable radar data over the source area.**
- **Too much** in places: 31 GB for Rasuwa GCOV and a 365 MB site.

More acquisitions, more events and field checks are the way past it.

## Try it

- Online: https://ak-gurung09.github.io/CASCADE-LENS-/
- Offline: unzip `CascadeLens.zip` and run **Start CascadeLens.bat** (or `sh start.sh`)
