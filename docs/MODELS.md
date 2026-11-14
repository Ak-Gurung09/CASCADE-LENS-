# First models (audit P2): code ready, not run on real data

Added 13 November 2026. The audit asks for the simplest defensible model for each capability, with out-of-sample skill reported before anything is called a forecast. This repository now contains the model code and the yardstick. **No model has been run on real data**, because the inputs are not available. The [readiness engine](READINESS.md) records exactly which inputs are missing.

## What exists

| Capability | Code | Method | Tested on |
|---|---|---|---|
| L2/L3 rainfall-trigger thresholds | `cascade_lens/models/thresholds.py` | Event rainfall E against duration D, E = α·D^β, fitted in log space, then lowered so 5% of triggering events lie below (frequentist method, Brunetti et al. 2010). Plus an antecedent precipitation index | Synthetic events: the slope and the 5% level are recovered |
| L1 susceptibility | `cascade_lens/models/susceptibility.py` | Ridge logistic regression on standardised features, validated only by spatial block cross-validation | Synthetic terrain: known effects are recovered, and shuffled labels score an AUC of 0.5 |
| F3 threshold forecast (river) | `cascade_lens/models/gr4j.py` | GR4J (Perrin et al. 2003) with a one-band degree-day snow routine, calibrated by seeded differential evolution on NSE | Synthetic catchment: unit hydrographs sum to one, snow conserves water, calibration recovers the catchment (NSE > 0.98) |
| Verification for all of them | `cascade_lens/verify.py` | POD, FAR, CSI and bias; event matching (a warning never counts after its event); chronological splits; a leakage guard that admits only records whose `available_at` precedes the issue time; spatial-block folds; AUC; NSE | Hand-worked cases |

Tests: `tests/processing/test_models.py`, `tests/processing/test_verify.py`.

## What blocks a real run

| Model | Needs | Status |
|---|---|---|
| L2/L3 thresholds | Daily or sub-daily rainfall (IMERG, DHM gauges) for 2016 to 2026, and a dated inventory for the same years | Rainfall not on disk: the Earthdata token is not accepted yet. Inventory: see below |
| L1 susceptibility | A multi-event inventory with accurate locations, and a geological map | No geological map. The NASA catalogue's locations are too coarse (below) |
| F3 GR4J | DHM discharge with danger levels, IMERG rainfall, temperature, and archived forecasts for a backtest | DHM discharge needs a formal request; four corridor stations were destroyed in August 2026 |

## The NASA Global Landslide Catalog

`processing/scripts/prepare_inventory.py` takes the Nepal records from NASA's Global Landslide Catalog. That's 481 events, 21 March 2007 to 13 October 2016, and the output is `data/reference/hazard/nasa-glc/glc_nepal.csv` with its `SOURCE.json`. The readiness engine records it as dataset C1, present but not fit:

* It ends in October 2016, so it does not cover the 2016–2024 training window or the 2025–2026 test years.
* It is compiled from media and reports, so places with no record are not confirmed negatives.
* Only 29 of the 481 locations are exact or within 1 km. Most are within 5 to 50 km, which is far too coarse for a 30 m susceptibility model.
* Its licence is not stated on data.nasa.gov, so the engine marks the licence as not established.

No model was fitted to it.

## To run a model once data exists

1. Put the data under `data/raw/...` and register it with `register_source.py` (see [READINESS.md](READINESS.md)).
2. Fit on the training period only, calibrate on the validation period, and score the test period with `cascade_lens.verify`. Inputs must pass the `available_at` guard at each issue time.
3. Write the evidence record (`data/metadata/evidence/<capability>.<rung>.json`) with the scores and the datasets it relied on, then run `prepare_readiness.py`. The app then shows the state that has been earned, and no more.
