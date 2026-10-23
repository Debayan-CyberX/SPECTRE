# Visual reinvention progress

Checkpoint: 2026-10-23, native Windows. The supplied 15-screen concept board is the primary composition reference. Full route comparison and implementation decisions: [VISUAL_REINVENTION_PLAN.md](VISUAL_REINVENTION_PLAN.md).

## Latest reference refinement — Reconstruct the Unseen

The user's second hero image and seven-chapter board refine the public experience after the initial 15-target redesign. The landing page now uses Sora, warm ivory typography/controls, selective red source signals, the requested two-line headline and navigation/chapter rail. The first board continues to guide the authenticated workspace.

The hero contains an actual Three.js scene: four translucent evidence planes, instanced fragments, real event tiles, raycast source selection, explicit process-link pulses, pointer camera response and a separate living terrain. Fragments become source-document planes and assemble on scroll; category controls illuminate matching records. Timeline gains a spatial depth field. The investigation preview has six functional views, recorded vertical process ancestry and a synchronized source inspector. The evidence preview has working raw-data/metadata tabs. The closing chapter uses generated portal artwork with animated light, procedural motion and camera drift. Asset and final prompt: [ASSETS.md](docs/redesign/ASSETS.md).

Three.js, its TypeScript declarations and self-hosted Sora were added for this refinement. Scenes initialize near the viewport, suspend when offscreen/hidden, dispose resources, and retain pause, reduced-motion, low-power and Canvas 2D fallback paths. Backend source, stored data, credentials and APIs remain unchanged.

Further user refinements: the closing artwork now preserves its complete 2:3 aspect ratio within desktop/mobile section bounds; its camera drift stays within that frame and image edges blend into the environment. The latest typography reference replaces thin public display type with oversized, tightly tracked Geist bold and contrasting Instrument Serif italic emphasis. Sora remains the spaced brand wordmark. The dark palette, source-linked interactions and live geometry are retained.

The latest ambient refinement adds flowing silver light shafts, soft drifting haze and a fine horizon glint behind the public narrative. The dashboard now shares that atmosphere at lower intensity, with ivory/graphite surfaces, large bold case typography, serif emphasis, silver event-density bars and selective red selection. The persistent shell carries this direction through the analytical routes. A keyboard-accessible pause/resume control is available on desktop and mobile, retains its state across workspace navigation and respects reduced motion. Analytical data geometry stays stable and source-backed.

The subsequent black-and-silver refinement replaces all tinted workspace surface colors with neutral black, charcoal and silver. Translucent glass panels, backdrop blur, reflective rims and layered shadows give the dashboard and analytical rails physical depth. Individual metric panes add bounded pointer tilt and a moving specular reflection; pause, reduced motion and touch suppress that effect. Source data, control behavior and printable dossier content are preserved. Final glass captures are in `docs/redesign/after/dashboard-glass.png` and `dashboard-glass-mobile.png`.

## Stage 1 — Audit and creative foundation — complete

- Compared every route with its corresponding concept before editing. Recorded baseline: backend **24**, component **3**, browser **4** tests passed; TypeScript passed.
- Captured nine before screens in `docs/redesign/before/`. Original frontend source/tests are preserved in ignored `.local-backups/visual-reinvention/`.
- Kept all routes, query parameters, authentication, APIs, parsers, evidence preservation, data models and report endpoints. No backend source changes were needed.

## Stage 2 — Living hero — complete

- Replaced the original public markup with a full-screen evidence environment, monumental masked typography, cyan/red source-linked entity controls and a contextual source inspector.
- Projected filament geometry responds to the pointer and has autonomous bounded motion. Pause/resume, skip introduction, session repeat-visit settling, reduced-motion and low-power paths are implemented.
- Both primary actions navigate into the actual application. Public data still comes from the parsed synthetic API; decorative geometry is labeled as illustrative.

## Stage 3 — Six connected chapters — complete

| Target | Implemented composition and interaction |
| --- | --- |
| Fragments | Scroll-assembled strata, floating source records and real category counts/selection |
| Timeline | Actual density bins, layered incident markers and timestamp axis; marker selection shares the narrative event |
| Connections | Spatial typed entity constellation; only stored relationships are drawn; selective source-linked illumination |
| Investigation | Interactive miniature of the real timeline and relationship projection with synchronized source inspector |
| Evidence | Perspective document layers with actual original hash, size, parser and acquisition metadata |
| Enter SPECTRE | Monumental closing type and procedural vortex; functional workspace/demo navigation |

The chapters use normal scrolling, common registration/alignment and a persistent chapter index. No scroll hijacking or blocking intro was added.

## Stage 4 — Authentication and workspace shell — complete

- Centered local sign-in over a procedural terrain, with all validation, errors and setup help retained.
- Compact persistent navigation, collapsible desktop sidebar, mobile drawer, keyboard command palette and responsive context rails.
- Event inspector resizes by pointer or keyboard, bounded to 290–520 px. Collapsed navigation retains accessible link names.

## Stage 5 — Analytical centerpieces — complete

| View | Implemented |
| --- | --- |
| Overview | Asymmetric command center, real case metrics, expansive density and category tracks, findings/evidence/note context rail |
| Timeline | Large multi-track canvas, direct drag pan, visible range brush and accessible range inputs, keyboard event traversal; existing filters, bookmarks, source inspection and virtualized records retained |
| Process Explorer | Stable hierarchy, custom process cards, explicit ancestry, branch collapse/focus, camera fit, integrated entity details and source inspection |
| Relationship Graph | Stable radial layout, typed entity and relationship filters, persistent context, source-backed edges, keyboard activation of nodes and edges |
| Evidence Vault | Technical inventory, search/sort, original metadata and hash rail, import drop area; original custody/verified download dialog retained |
| Findings | Dense lead ledger with persistent rationale/evidence/review panel and unchanged analyst review behavior |
| Reports | Dark snapshot manager, actual saved-snapshot selection, white forensic dossier, section navigation and print stylesheet; existing JSON/PDF exports retained |

Investigations, settings, dialogs, loading/error/empty states and command navigation use the same visual system. Analytical graphs have no autonomous motion.

## Stage 6 — Verification

- **24 backend tests passed** after the redesign.
- **3 component tests passed**, strict TypeScript, ESLint and production Next.js build passed.
- **9 Playwright tests passed**, including real login → case → raw import → source note → finding review → graph → report snapshot/download. Download contents and the HTML dossier are checked against the stored note/review. Tests also disable WebGL to verify the usable source-selection fallback, and verify silver dashboard motion, pause persistence across navigation and reduced-motion source inspection. Public coverage includes functional preview views and raw evidence tabs.
- Browser interaction checks cover public/private API separation, shared narrative selection, mobile navigation, keyboard command palette, ambient pause/offscreen suspension/repeat visits, brush/pan/reset, keyboard source traversal, process collapse/focus, keyboard graph inspection and inspector resizing.
- Expanded automated accessibility checks pass across all nine primary screens in Chromium. The final production desktop/mobile probe completed 18 scans with zero axe violations, document overflow, runtime/hydration errors or unexpected failed responses. Final artifacts and local laboratory measurements are in `docs/redesign/after/`.
- Fixed issues found during verification: reduced-motion hydration mismatch, a decorative layer intercepting node clicks, a zero-width SVG gradient hiding waveform bars, overlapping incident labels, an invalid brush ARIA label, and graph keyboard selection failing to open source records.

## Deliberate limits

The current public environment uses lazy Three.js plus projected Canvas 2D terrain/fallback, Motion and native CSS. WebGL is optional: accessible HTML controls and procedural fallback remain usable without it. Generated portal artwork is a narrative layer, while application controls and source data remain real DOM/code-rendered UI.

Validation is local Chromium, including desktop and touch emulation. It is not a full screen-reader audit, cross-browser certification, field performance study or production forensic certification. Real evidence volume determines timeline density; the 14-event synthetic case is not padded with invented events. Existing parser/graph/import limits and PDF export limits remain documented in `IMPLEMENTATION_STATUS.md`.

The current frontend preview is at `http://127.0.0.1:3001`, API at 8100; port 3000 was occupied by another local application. No Docker, WSL2, cloud registration, external messaging or public deployment was used for this redesign. Existing runtime data and local credentials were preserved.
