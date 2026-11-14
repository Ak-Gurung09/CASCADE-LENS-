# Showing the working: scenarios you can check by hand

CascadeLens has two speculated situations: the Tsho Rolpa dam-breach **Scenario**, and the Rasuwa What-if flood and Flow replay, which are **Scenario** illustrations too. Neither is a forecast or a warning. This page gives every formula with its source and units, every input with where it comes from, and worked examples you can follow on a calculator. The same numbers are in a spreadsheet with live formulas, [scenario-check.xlsx](scenario-check.xlsx), and in two tables:

- [data/qa/tsho-rolpa-2026-scenario-sections.csv](../data/qa/tsho-rolpa-2026-scenario-sections.csv): every cross-section of the dam-breach route, for every breach depth.
- [data/qa/rasuwa-2026-simulation-features.csv](../data/qa/rasuwa-2026-simulation-features.csv): every building, road piece and place the What-if flood can count.

A section at the end tests a mentor's account of a "cliff ricochet" in Rasuwa. It is a **Hypothesis**.

## 1. Tsho Rolpa: what if the moraine dam breached?

Code: `processing/src/cascade_lens/scenario.py`, run by `processing/scripts/prepare_scenario.py processing/configs/lake/tsho-rolpa.json data/raw/dem`. Shown in the app's What if panel.

### Inputs

| Input | Value | Unit | Where it comes from |
|---|---|---|---|
| Lake area, mean A | 1.606 | km² | Mean of the four NISAR GCOV dates: 1.610 (16 Aug), 1.621 (28 Aug), 1.593 (9 Sep), 1.599 (21 Sep 2026). `prepare_lake.py` |
| Lake area, low A_low | 1.495 | km² | The lowest "low" of the method range over the four dates (9 Sep) |
| Lake area, high A_high | 1.691 | km² | The highest "high" of the method range over the four dates (16 Aug) |
| Breach depth h | 10, 20, 30 | m | Assumed. Nobody knows how deep a breach would be |
| Unit weight of water γ | 9,800 | N/m³ | ρg = 1,000 kg/m³ × 9.8 m/s², as Costa and Schuster use it |
| Manning roughness n | 0.07 to 0.15 | s/m^(1/3) | Steep boulder channels carrying debris (Chow 1959 gives 0.05 to 0.15 and more) |
| Terrain | Copernicus DEM GLO-30, tile N27 E086, averaged 2 × 2 to about 60 m | m | `Copernicus_DSM_COG_10_N27_00_E086_00_DEM.tif`, from the public Copernicus DEM bucket |
| Section spacing | 500 | m | Along the route |
| Slope floor | 0.002 | m/m | The bed slope is never taken below this |
| Speed floor | 0.3 | m/s | The front is never taken slower than this |

### Formulas

1. **Released volume.** V = A × h, in m³ (A in m², h in m). The lake walls are taken as vertical, so this slightly overestimates.
2. **Peak flow at the dam**, in m³/s, from three published fits to past dam failures:
   - Popov (1991): Qp = 0.0048 · V^0.896
   - Costa and Schuster (1988): Qp = 0.0158 · PE^0.41, where PE = h · V · γ is the potential energy in joules
   - Huggel et al. (2002): Qp = 0.00077 · V^1.017. This is an upper envelope of past floods, shown as the worst case only.
3. **Likely peak range.** The lower of Popov and Costa at A_low, to the higher of the two at A_high.
4. **Manning's equation** at each cross-section: v = R^(2/3) · S^(1/2) / n, in m/s. R = area / (width + 2h) is the hydraulic radius in m, with area the flow area (m²), width the wetted top width (m) and h the depth above the lowest point (m). S is the bed slope over ±1 km of route (m/m, at least 0.002). The depth is found by bisection so that area × v equals the peak flow.
5. **Arrival time.** Each segment takes its length divided by max(v, 0.3 m/s). The times add up from the dam.
   - Fastest: the higher peak (at A_high) with n = 0.07.
   - Slowest: the lower peak (at A_low) with n = 0.15.
   - The peak is the same at every section: nothing reduces it downstream.

### Worked example, 10 m breach (mean area)

- V = 1,606,000 × 10 = 16,060,000 m³
- Popov: 16,060,000^0.896 = 2,859,880, × 0.0048 = **13,727 m³/s**
- Costa: PE = 10 × 16,060,000 × 9,800 = 1.5739 × 10¹² J. PE^0.41 = 100,175, × 0.0158 = **1,583 m³/s**
- Huggel: 16,060,000^1.017 = 21,293,300, × 0.00077 = **16,396 m³/s**

### Worked example, 20 m breach (mean area)

- V = 1,606,000 × 20 = 32,120,000 m³
- Popov: 0.0048 × 32,120,000^0.896 = 0.0048 × 5,321,950 = **25,545 m³/s**
- Costa: PE = 20 × 32,120,000 × 9,800 = 6.296 × 10¹² J. 0.0158 × PE^0.41 = 0.0158 × 176,849 = **2,794 m³/s**
- Huggel: 0.00077 × 32,120,000^1.017 = 0.00077 × 43,091,400 = **33,180 m³/s**

### Worked example, 30 m breach (mean area)

- V = 1,606,000 × 30 = 48,180,000 m³
- Popov: 48,180,000^0.896 = 7,653,300, × 0.0048 = **36,736 m³/s**
- Costa: PE = 30 × 48,180,000 × 9,800 = 1.4165 × 10¹³ J. PE^0.41 = 246,603, × 0.0158 = **3,896 m³/s**
- Huggel: 48,180,000^1.017 = 65,084,200, × 0.00077 = **50,115 m³/s**

### The lake-area range, carried through

| Breach | Area | V (million m³) | Popov | Costa | Huggel |
|---|---|---|---|---|---|
| 10 m | low 1.495 km² | 14.95 | 12,874 | 1,537 | 15,244 |
| 10 m | mean 1.606 km² | 16.06 | 13,727 | 1,583 | 16,396 |
| 10 m | high 1.691 km² | 16.91 | 14,377 | 1,617 | 17,279 |
| 20 m | low | 29.90 | 23,958 | 2,713 | 30,850 |
| 20 m | mean | 32.12 | 25,545 | 2,794 | 33,180 |
| 20 m | high | 33.82 | 26,754 | 2,854 | 34,967 |
| 30 m | low | 44.85 | 34,452 | 3,784 | 46,594 |
| 30 m | mean | 48.18 | 36,736 | 3,896 | 50,115 |
| 30 m | high | 50.73 | 38,473 | 3,980 | 52,814 |

So the likely peak range is 1,537 to 14,377 m³/s for 10 m, 2,713 to 26,754 m³/s for 20 m and 3,784 to 38,473 m³/s for 30 m. The worst case is Huggel at A_high.

### One cross-section by hand (20 m breach, km 0.5, fastest bound)

From the first 20 m row of the sections table:

- Bed height 4,407.88 m. Slope S = 0.161652, the fall of the route bed from the dam to km 1.5 divided by that distance (±1 km, cut short at the dam). No floor applied.
- Q = 26,753.5 m³/s (Popov at A_high), n = 0.07.
- The solved depth is h = 13.104 m. The water spans 4 samples 30 m apart, so the wetted width is 120 m, and the flow area (the depth summed across those samples × 30 m) is 1,166.5 m².
- R = 1,166.5 / (120 + 2 × 13.104) = 1,166.5 / 146.208 = **7.979 m**
- R^(2/3) = 7.979^0.6667 = 3.993. S^(1/2) = 0.161652^0.5 = 0.40206.
- v = 3.993 × 0.40206 / 0.07 = **22.93 m/s**
- Check: area × v = 1,166.5 × 22.934 = 26,752 m³/s, the flow asked for.
- Segment time = 500 m / 22.934 m/s = **21.8 s**.

The same section at the slowest bound (Q = 2,713.4 m³/s at A_low, n = 0.15): h = 5.906 m, width 90 m, area 403.9 m², R = 403.9 / (90 + 11.81) = 3.967 m, v = 3.967^0.6667 × 0.40206 / 0.15 = 2.505 × 0.40206 / 0.15 = 6.717 m/s, segment time 500 / 6.717 = 74.4 s.

### The first 10 km by hand (20 m breach)

Segment times in seconds, from the sections table (`fast_seg_s` and `slow_seg_s`, km 0.5 to 10.0):

- Fastest: 21.8 + 23.0 + 32.81 + 35.35 + 40.28 + 48.27 + 46.33 + 46.06 + 41.25 + 34.66 + 30.98 + 27.24 + 28.65 + 26.97 + 26.48 + 30.0 + 29.64 + 31.44 + 31.32 + 32.39 = **664.9 s = 11.1 min**, shown as 11 min.
- Slowest: 74.43 + 78.7 + 97.92 + 122.87 + 139.92 + 154.41 + 153.92 + 143.38 + 128.61 + 114.48 + 108.97 + 82.22 + 91.37 + 80.08 + 78.73 + 95.62 + 101.07 + 100.16 + 106.61 + 110.52 = **2,164.0 s = 36.1 min**, shown as 36 min.

### Floors

Over the 214 sections of each breach depth, the 0.002 slope floor applies at 7 sections (km 58.5, 59.0, 59.5, 62.5, 63.5, 68.5 and 69.0, where the 60 m terrain is nearly flat over 2 km). The 0.3 m/s speed floor never applies. Each is flagged in the table (`slope_floor_applied`, `fast_speed_floor_applied`, `slow_speed_floor_applied`).

### Two errors that pull the times in opposite directions

The method moves the front at the water speed v, and it never reduces the peak downstream.

- **The front is too slow.** A flood wave in a wide channel moves at the kinematic wave speed c = (5/3) · v, faster than the water itself. Using v makes every time later than it should be.
- **The peak is too high far from the dam.** A real peak shrinks and slows as it spreads into the valley. Holding it constant makes far times earlier, and far depths deeper, than they should be.

Neither is corrected, and they partly cancel. As a sensitivity line only (not a new default), the panel and the manifest give the times at c = (5/3) · v, which shortens every time by 40%: for the 20 m breach, 10 km in 7 to 22 min instead of 11 to 36 min, and 107 km in 131 to 432 min instead of 219 to 720 min.

### What changed in this recalculation (14 November 2026)

The rerun on the same DEM first reproduced every shipped number exactly. Then only the changes listed in the brief were made:

| Value | Before | After | Why |
|---|---|---|---|
| Volume (all depths) | 16.06, 32.12, 48.18 million m³ | the same, plus a range: 14.95 to 16.91, 29.90 to 33.82, 44.85 to 50.73 | The lake-area range is carried through |
| Peaks at the mean area | as shipped | unchanged | Same formulas, same mean area |
| Likely peak range, 10 m | 1,583 to 13,727 m³/s | 1,537 to 14,377 m³/s | Low end at A_low, high end at A_high |
| Likely peak range, 20 m | 2,794 to 25,545 | 2,713 to 26,754 | As above |
| Likely peak range, 30 m | 3,896 to 36,736 | 3,784 to 38,473 | As above |
| Worst case (Huggel) | 16,396; 33,180; 50,115 | 17,279; 34,967; 52,814 | Huggel at A_high |
| Arrival, 10 m breach, km 50 | 75 to 231 min | 74 to 234 min | Wider peak range: up to 4 min earlier (fast) or 9 min later (slow) anywhere on the route |
| Arrival, 20 m breach, km 50 | 63 to 201 min | 62 to 202 min | As above: at most 3 min (fast) and 4 min (slow) |
| Arrival, 30 m breach, km 50 | 58 to 182 min | 57 to 184 min | As above: at most 3 and 5 min |
| Arrival at km 107 | 265–839, 222–716, 201–654 min | 261–848, 219–720, 198–659 min | As above |
| Water depths | as shipped | deep end up to 1.8, 3.6 and 3.1 m deeper; shallow end up to 1.2, 1.3 and 1.0 m shallower | The same peaks feed the depth range |
| Flooded area on the map (20 m) | from the mean-area peak | from the A_high peak, slightly wider | The widest case uses the highest flow |
| Kinematic-wave times | not given | given beside the main times | Sensitivity line |
| Slope and speed floors | not counted | counted and flagged: 7 slope, 0 speed per depth | Checkability |

The arrival times at km 10 did not change for any depth.

## 2. Rasuwa: the What-if flood and the Flow replay

Code: `processing/scripts/prepare_simulation.py` builds `frontend/public/data/vectors/simulation.json`. The app's rule is `count()` in `frontend/src/services/simulation.ts`. `processing/scripts/export_simulation_features.py` writes the table.

### How km and h are made

1. **The path.** It starts at the centre of the UNOSAT detachment zone and joins the UNOSAT barrier lakes, nearest first, with straight lines, because no channel is mapped there. From there it takes the cheapest route along the OSM rivers to the lowest river ground it can reach, preferring the named main stem (Lende Khola, Bhote Koshi, Trishuli) and paying five times as much to use any other river. The whole line is then resampled to **one point per kilometre**, so the position of a point in the list is its distance along the path in km. The path is 198 km.
2. **River level.** At each path point, the lowest Copernicus DEM GLO-30 height within 4 pixels (about 120 m), because mapped river lines sit off the true channel. Going downstream the level is never allowed to rise (a running minimum), since water does not run uphill.
3. **km of a feature.** For each UNOSAT affected building, UNOSAT affected road piece, OSM road piece and OSM named place, the nearest of the path points by straight-line distance. Its km is that point's index. Features more than 2 km from every path point are left out as being in another valley.
4. **h of a feature.** The DEM height at the feature (its centre, or the middle of a road piece) minus the river level at its nearest path point, rounded to whole metres and never below 0.

The DEM is the Copernicus GLO-30 clip `frontend/public/data/sampling/context/copdem_glo30.tif`, 30 m cells, from before the event.

### The rule

- **What-if flood**, rise r and reach k: a row counts when km ≤ k **and** h ≤ r. Buildings are counted, OSM road pieces (kind `r`) add their length, and places are listed.
- **Flow replay**, reach k: a row counts when km ≤ k. Buildings are counted, UNOSAT road pieces (kind `a`) add their length, and places are listed.

In a spreadsheet: filter `kind = b`, `km ≤ k`, `h ≤ r` and count the rows. In Excel, `=COUNTIFS(A:A,"b",C:C,"<="&k,D:D,"<="&r)`. The Rasuwa sheet of [scenario-check.xlsx](scenario-check.xlsx) does this live.

### Three settings, recounted

| Setting | Buildings | OSM road | Places |
|---|---|---|---|
| Rise 25 m, full reach (198 km) | 3,274 | 119.339 km | 8: Rasuwa Gadhi, MaheshDovan, Purano Malekhu, Dhussa, Devighat, Phishling, Naubisephat, Bhainse |
| Rise 10 m, reach 74 km (Trishuli) | 489 | 11.305 km | 1: Rasuwa Gadhi |
| Rise 50 m, reach 35 km (Shyaphru Bensi) | 553 | 25.265 km | 2: Shyaphru Bensi, Rasuwa Gadhi |

A test checks that the table reproduces `count()` exactly for all three (`frontend/src/services/simulation.test.ts`, `tests/processing/test_simulation_export.py`).

### One worked count

Take the first building in the table: kind `b`, km 24, h 45 m.

- Rise 50 m, reach 35 km: 24 ≤ 35 and 45 ≤ 50, so it counts. It is one of the 553.
- Rise 25 m, full reach: 24 ≤ 198 but 45 > 25, so it does not count.
- Rise 10 m, reach 74 km: 45 > 10, so it does not count.

Of the 5,017 buildings in the table, 489 have km ≤ 74 and h ≤ 10.

### What this does not include

Water volume, speed, valley shape, sediment and the fall of a flood downstream are all ignored. Only buildings UNOSAT mapped as affected are counted. The 30 m DEM smooths narrow gorges, and its vertical error is several metres. See [LIMITATIONS.md](LIMITATIONS.md).
