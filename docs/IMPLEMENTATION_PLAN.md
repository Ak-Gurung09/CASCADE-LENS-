# Implementation plan

Progress is reported in [IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md).

## Done

1. Verified candidate products in the ASF catalogue.
2. Built the processing pipeline, and validated it on real-format samples.
3. Prepared terrain, UNOSAT, Sentinel-1, OSM and boundary layers.
4. Built the application, with a manifest generated from files on disk.
5. Downloaded and processed Pair A GUNW and GOFF, and Pair B GOFF.
6. Analysed them against independent UNOSAT polygons.
7. Added LANDMET as a second case study (retired from the app on 6 Nov 2026).
8. Built and acceptance-tested a one-click package.
9. Added the Tsho Rolpa glacial lake case: GCOV lake area on four dates, compare, 3D terrain and a what-if dam-break scenario (5 Nov).
10. Added evidence classes, radar observability, "What could explain this?", evidence reports, hazard screens and the status registry (6 to 10 Nov).
11. Restyled the app (11 Nov).
12. Stage 0 audit and the P0.1 scientific corrections (12 Nov); the documentation reconciliation, P0.2 (13 Nov).
13. Road-segment evidence (P0.3), road access to health care (P0.4), the readiness engine (P1) and first model code tested on synthetic data (P2), 13 Nov.
14. Rebuilt both cases from the raw files with the corrected code (13 Nov): observability over frames 74 and 75, the control series with intervals, coherence through time over five frame 74 pairs. The raw mask settled the source: no valid subswath in the 28 Aug acquisition. A mask decoding error (S13) was found and fixed.

## Next, in priority order

| Step | Action | Why | Suggested owner |
|---|---|---|---|
| 1 | Add the Track 98 GUNW, 19→31 Aug (open pull request) | Coherence at the source from the other side; Pair A has no valid subswath there | Neilhancy Dev |
| 2 | Find a like-for-like pre-event pair: 12 days and the same radar mode as the event pair | The current control comparison is indicative only | Abhiyan Bajracharya |
| 3 | Add the three later frame 75 pairs, 28 Aug→3 Oct, Track 48 | Coherence through time for the lower mudflow and the Trishuli corridor | Neilhancy Dev |
| 4 | Send ASF the sign question | Needed before any displacement layer | Abhiyan Bajracharya |
| 5 | Download Rasuwa GCOV | Needs 31 GB | Neilhancy Dev |
| 6 | Rehearse the demonstration | The script is in DEMONSTRATION.md | Sugam Ghimire, Samyak Timalsena |
| 7 | Test on another computer, a physical phone and the Windows `.bat` | Only tested in one place so far | Akash Gurung |

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
