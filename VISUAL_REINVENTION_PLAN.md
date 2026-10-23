# SPECTRE — Signals from the Dark

Primary art direction: the supplied 15-screen SPECTRE Cyber Forensics UI Concept Board. The image is a composition reference, not evidence of implemented features or a source of case data. The separate pasted brief guides this redesign within the user's explicit native-Windows, no-Docker scope.

Subsequent user steering adds the Reconstruct the Unseen hero and a seven-chapter board. These become the primary public-page reference: ivory Sora typography, red signals, layered spatial evidence, fine dark terrain and a cinematic portal. The first board remains the workspace composition reference. Exact refinements are recorded in `REDESIGN_PROGRESS.md`.

The user's final typography reference supersedes the thin display face: public headings pair tightly tracked Geist bold with Instrument Serif italic emphasis, while Sora remains the spaced wordmark. The closing artwork preserves its full intrinsic ratio within responsive bounds and uses bounded motion rather than enlarging beyond the section.

## Working baseline and preservation boundary

The application has one public route `/`, a persistent `/workspace/[[...view]]` layout, authentication at `/workspace` when signed out, and overview/investigations/evidence/timeline/processes/graph/findings/reports/settings views. Public synthetic mode uses `?demo=1`; private case selection uses `?case=<id>`. All route names and API behavior stay intact.

Recorded baseline before source changes: backend 24 tests, frontend 3 component tests and 4 browser tests passed; strict TypeScript passed. Before screenshots are in `docs/redesign/before/`; original frontend source/tests are retained in ignored `.local-backups/visual-reinvention/`. Visual artifacts use only the public synthetic case and never include credentials.

## Page-by-page concept gap analysis

| Board | Existing route / section | Current gap | Replacement composition and functional link |
| --- | --- | --- | --- |
| 01 Hero | `/` opening | Conventional two-column headline and bordered miniature | Full-viewport layered evidence environment, oversized masked uppercase typography, data-linked floating nodes/inspector, pointer parallax, brief skippable entrance; Enter SPECTRE and Explore a Case keep real navigation |
| 02 Fragments | Workflow tab 1 | Small checksum example; no spatial narrative | Scroll-assembled evidence strata, source-category controls and actual artifact metadata; visual particles explicitly illustrative, records from the public parsed synthetic case |
| 03 Timeline | Workflow tab 2 | Small static sequence | Expansive timestamped density waveform and source-backed incident markers; selecting a marker updates the shared narrative event |
| 04 Connections | Workflow tab 3 | Text-only rule list | Stable spatial constellation of recorded entities/edges, selective red lead emphasis, visible relationship provenance and synchronized event selection |
| 05 Investigation | Compact hero preview | No dedicated immersive workspace chapter | Interactive miniature using the real timeline and actual process/entity projection, shared selection and evidence detail, link into the existing demo workspace |
| 06 Evidence | Integrity specimen / principles | Flat metadata card | Perspective document stack, preserved-original hash/size/parser inspector and structured dossier; explain storage guarantees accurately |
| 07 Enter | Closing CTA | Short centered paragraph | Full-viewport vortex returning to the opening's evidence field, monumental SPECTRE typography, functional workspace/demo exits |
| 08 Authentication | Signed-out `/workspace` | Split branding panel and typical form | Centered minimal form over procedural terrain, sparse institutional branding; preserve credentials, validation, errors and first-run help; no fake OAuth/register/reset actions |
| 09 Overview | `/workspace` | Equal-width counts, boxed timeline, activity below fold | Selected case command center, expansive density + multi-track visualization, asymmetric contextual findings/evidence rail, real counts and status controls |
| 10 Timeline | `/workspace/timeline` | Small chart above a table | Nearly full-height multi-track working canvas, horizontal precision axis, timeline brush and drag pan, density context, compact record drawer, inspector and all existing filters/bookmarks/pagination |
| 11 Processes | `/workspace/processes` | Modest boxed graph, weak metadata | Full-height custom process canvas, hierarchy with spatial branching, camera focus, ancestry/descendant illumination, meaningful unresolved labels and integrated details |
| 12 Relationships | `/workspace/graph` | Grid layout tangles entity types | Stable radial/hierarchical constellation, semantic node/edge colors, relationship-kind filter and fit-to-selection, persistent entity/evidence rail, source-linked selection |
| 13 Vault | `/workspace/evidence` | Sparse file/short-hash table | Fine technical inventory with full metadata hierarchy, hashes, source/size/record count/outcome, refined import area and preserved custody/download inspector |
| 14 Findings | `/workspace/findings` | Accordions dominate the screen | Dense investigative ledger paired with a persistent contextual detail panel; retain rule rationale, limitations, review/notes and event cross-navigation; no invented confidence scores |
| 15 Reports | `/workspace/reports` | Dark summary card and download list | Dark report manager alongside a white print-ready dossier, section navigation, full technical appendix, actual snapshot selection/exports and print styles |
| Additional | Investigations / Settings | Supporting views use old tokens | Bring case list, create/edit state, settings and command palette into the same system while preserving every operation |

## Implementation architecture

- Preserve backend, schemas, parsers, migrations, evidence handling, authorization and report endpoints. This is a frontend redesign.
- Retain Geist variable/Geist Mono, Radix/shadcn-owned primitives, Motion, TanStack Query/Table/Virtual and lazy React Flow. The subsequent public reference adds self-hosted Sora and Three.js 0.186.1 with matching TypeScript declarations.
- Use lazy Three.js evidence planes, instanced fragments, actual source tiles, process-link pulses and source-document textures. Canvas 2D supplies the living terrain and fallback. Generated portal art is layered with autonomous light, field motion and camera drift. Accessible HTML controls remain outside the canvas; the application is never a bitmap screenshot.
- Retain native scrolling. Motion owns entrance/scroll/UI transforms; the renderer owns only canvas geometry. No competing libraries animate the same property.
- Add reusable narrative waveform, spatial evidence projection and dossier components. All meaningful event/entity markers come from the existing synthetic API or private case data. Decorative point samples do not claim to be ingested records.
- Keep the current API orchestration in the persistent workspace. Redesign presentation components and add local view interactions, not replacement mock APIs.
- Introduce an explicit visual-reinvention stylesheet after existing CSS, with route/scene-specific structure. Retire old public landing markup entirely. Keep shared existing states until replacement is verified.

## Motion and accessibility budget

Bounded canvas samples, DPR cap 1.5, maximum 30fps, visibility/intersection gating, cleanup of observers/listeners/RAF, no autonomous motion inside analytical graphs. Reduced motion and the visible Pause motion control stop ambient animation. Low-power mode reduces point count/frame rate. Static procedural rendering and HTML remain usable with no canvas context. Intro does not block navigation, is skippable, and avoids a long repeat-visit sequence.

Use semantic headings, explicit node/button names, keyboard event inspection, visible focus, accessible resize handles, mobile alternate layouts, normal scroll and contrast checks. Threat color represents stored investigative priority, never a confirmed attack solely from a rule match.

## Stages and verification gates

1. Audit, compare all routes, record tests/screenshots, establish tokens/motion utilities.
2. Complete immersive hero with live selection, kinetic type, fallback/pause/skip controls and working CTAs.
3. Build all six connected narrative chapters with unique compositions and source-backed interactions.
4. Rework shell, authentication, responsive/collapsible navigation, inspectors and pane sizing.
5. Rebuild timeline/graphs/vault/findings/reports as the board's analytical centerpieces.
6. Validate preserved end-to-end behavior, typecheck/lint/build, component tests, keyboard/mobile/axe, visual review and measured browser performance. Document exact results and remaining limits in `REDESIGN_PROGRESS.md`.

## Regression risks

Maintain case/query state across route changes; preserve public/private separation; avoid hiding functions behind hover-only UI; keep graph caps and cursor pages; distinguish record density from illustrative geometry; preserve source inspection and original downloads; do not fake job percentages, report dates or OAuth. Graph focus and pane dragging must not steal input from text fields. Stored PDF export remains authoritative; live HTML dossier is labeled as a live preview until a snapshot is selected.

## Research notes

Reviewed accessible pages for Lando Norris, Lusion, Bruno Simon, Rickcreates, Motion scroll, GSAP ScrollTrigger, React Bits and Lenis. Active Theory only exposed a JavaScript fallback; Awwwards timed out; R3F/Drei returned no usable body through text browsing. No claim of interacting with unavailable reference experiences is made. The supplied board and actual SPECTRE browser captures are the primary visual evidence. Motion's current installed API and Next's bundled layouts/client-boundary documentation were checked. No external proprietary code or assets are copied.
