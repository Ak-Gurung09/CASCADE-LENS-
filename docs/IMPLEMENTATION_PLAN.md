# Implementation plan

Progress is reported in [IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md).

## Done

1. Verified candidate products in the ASF catalogue.
2. Built the processing pipeline, and validated it on real-format samples.
3. Prepared terrain, UNOSAT, Sentinel-1, OSM and boundary layers.
4. Built the application, with a manifest generated from files on disk.
5. Downloaded and processed Pair A GUNW and GOFF, and Pair B GOFF (Pair B GUNW followed on 13 Nov).
6. Analysed them against independent UNOSAT polygons.
7. Added LANDMET as a second case study (retired from the app on 6 Nov 2026).
8. Built and acceptance-tested a one-click package.
9. Added the Tsho Rolpa glacial lake case: GCOV lake area on four dates, compare, 3D terrain and a what-if dam-break scenario (5 Nov).
10. Added evidence classes, radar observability, "What could explain this?", evidence reports, hazard screens and the status registry (6 to 10 Nov).
11. Restyled the app (11 Nov).
12. Stage 0 audit and the P0.1 scientific corrections (12 Nov); the documentation reconciliation, P0.2 (13 Nov).
13. Road-segment evidence (P0.3), road access to health care (P0.4), the readiness engine (P1) and first model code tested on synthetic data (P2), 13 Nov.
14. Rebuilt both cases from the raw files with the corrected code (13 Nov): observability over frames 74 and 75, the control series with intervals, coherence through time over five frame 74 pairs. The raw mask settled the source: no valid subswath in the 28 Aug acquisition. A mask decoding error (S13) was found and fixed.
15. Added the second viewing direction (13 Nov): Track 98 frame 16 GUNW for Pair B and four more pairs, observability as its own view, the before/after series in one radar mode, coherence through time, and road stretches watched from either direction. The same day: explanations from both directions, and the three later frame 75 pairs, so the Track 48 series covers frames 74 and 75.

## Next, in priority order

| Step | Action | Why | Suggested owner |
|---|---|---|---|
| 1 | Find a like-for-like pre-event pair: 12 days and the same radar mode as the event pair | Track 98 now matches the mode, but both pairs before the event are 24 days long | Abhiyan Bajracharya |
| 2 | Send ASF the sign question | Needed before any displacement layer | Abhiyan Bajracharya |
| 3 | Download Rasuwa GCOV | Needs 31 GB | Neilhancy Dev |
| 4 | Rehearse the demonstration | The script is in DEMONSTRATION.md | Sugam Ghimire, Samyak Timalsena |
| 5 | Test on another computer, a physical phone and the Windows `.bat` | Only tested in one place so far | Akash Gurung |
| 6 | Ask NDRRMA for written terms of reuse for BIPAD incident records | BIPAD states no licence, so the readiness engine holds the landslide-trigger capability (L2) at "data available, processing required" whatever its scores. See [MODELS.md](MODELS.md) | To assign |
| 7 | Request a DHM API key (hydrology.gov.np) for Trishuli discharge and daily gauges | F2, F3 and F5 cannot start without discharge; the API refuses requests without a key | To assign |
| 8 | Obtain the DMG Nepal geological map (1:1 M or finer) | L1 susceptibility needs geology; the only open map (USGS) is meant for 1:5 M and coarser | To assign |

## Team decisions

| Decision | Status |
|---|---|
| Licence | MIT added as a default for code. Change it freely before publishing |
| LANDMET data licence | Not stated in the file. Check before publishing that case |
| Repository | On GitHub (`Ak-Gurung09/cascade-lens`), with history since 2 Nov and work through pull requests. Who can see it is a team decision |
| Hosting | Not chosen. Needs HTTP Range support |
| Sign question to ASF | Drafted in [SCIENTIFIC_VALIDATION.md](SCIENTIFIC_VALIDATION.md#open-questions), not sent |

Owners follow the suggested responsibilities in the brief. Adjust as needed.

## Fallbacks

- **A product fails QA:** show only what remains usable and explain the rest.
- **Full files cannot be downloaded:** run `--qa-only`, then `prepare_previews.py`, for clearly labelled browse pictures.
