# Obsidian Forensic Intelligence

The supplied 15-screen concept board defines composition, hierarchy, material depth and atmosphere. A full-screen living evidence environment leads through six connected chapters into a precise investigative workspace. Every meaningful marker resolves to a real stored source record; procedural geometry is explicitly illustrative.

## Foundations

- Near-black environments `#05070B` / `#060A10`, blue-black rails and translucent layered surfaces, one-pixel registration/separators, restrained 1–4px corner radii. Public spatial compositions have generous depth; analytical views use compact technical rows.
- The user's final typography reference pairs oversized Geist Variable at weight 630–650, tight tracking and sentence case with Instrument Serif 400 italic on emphasized words. This pairing applies to the public hero, chapter headings and closing title; Sora remains the spaced brand wordmark. Geist remains the workspace interface face; Geist Mono handles timestamps, hashes, IDs and technical metadata. All fonts are self-hosted through Fontsource; no runtime font service.
- Icy cyan `#8FE8E5` marks selection and navigation. Restrained red/rose denotes stored rule matches or failures, amber priority/context, green successful processing. Color accompanies text labels and focus states; a rule match is not presented as proof of malicious intent.
- Secondary text was raised in contrast after axe checks. Do not lower key metadata contrast to achieve a muted appearance. Tiny editorial labels are supplemental; primary investigation actions and text remain independently navigable.
- Responsive spacing: 24–32px desktop workspace gutters, 17–18px mobile, strict table alignment, a compact collapsible desktop sidebar and an explicit mobile drawer. Narrative margins scale with viewport width. Dense timelines/graphs retain zoom and source inspection; rails stack on narrow screens.

## Owned primitives

`components/ui/button.tsx` follows the shadcn CVA + Radix Slot composition pattern. Dialog wraps Radix focus trapping, escape handling, modal semantics and focus restoration with SPECTRE styling. `components.json` declares a consistent shadcn setup. These are customized owned source components, not a claim that the whole shadcn library is installed. Upstream shadcn source is MIT: https://github.com/shadcn-ui/ui/blob/main/LICENSE.md. Icons come from Lucide.

## Analytical views

| Screen | Primary task | Information hierarchy and interaction |
| --- | --- | --- |
| Landing | Understand the workflow | Living hero → fragments → waveform → connections → interactive workspace → evidence layers → closing vortex; shared source selection |
| Authentication | Enter the local workspace | Centered minimal local form over procedural terrain; validation and first-run help retained |
| Overview | Orient within a case | Case metadata/status → stored metrics → expansive event horizon and tracks → persistent findings/evidence/notes rail |
| Investigations | Open or create a case | Dense case table, stable IDs, status, stored counts, creation form and repeatable demo import |
| Evidence Vault | Inspect original evidence | File identity → hash and processing outcome → source/acquisition metadata → custody → verified download |
| Timeline | Find and inspect activity | Filters → large multi-track working canvas → density/brush window → virtualized records → resizable provenance inspector; drag pan and keyboard traversal |
| Process Explorer | Follow explicit ancestry | Custom hierarchy, process GUID identity, PID/start/host, missing-parent labels, branch collapse/focus, fit controls and integrated source details |
| Relationship Graph | Inspect evidence-backed links | Stable radial constellation, entity/relationship filters, semantic edges, persistent evidence context and keyboard source activation |
| Findings | Review a documented lead | High-density rule/review ledger → persistent rationale/limitations/supporting evidence → analyst decision and notes |
| Reports | Freeze an investigation snapshot | Dark saved-report manager → actual live/stored white dossier → section navigation/print → preserved JSON/PDF downloads and hash |
| Settings | Understand release capabilities | Local identity, UTC/local preference and explicit supported/planned feature boundaries |

All data views have empty/error/loading states. Public synthetic mode is visibly labeled, disables mutations and makes no private-case requests. The workspace layout persists during navigation, retaining selected evidence and filters. The inspector resizes by pointer or keyboard and becomes an overlay on smaller screens. Arbitrary persistent multi-pane arrangements are outside this redesign.

## Motion and keyboard

The second public reference refines the palette to warm ivory and selective red over obsidian. The subsequent dashboard refinement carries that palette into the persistent workspace shell, case metrics and waveform, with large Geist case titles and Instrument Serif italic emphasis. Source categories retain distinct colors for investigation. Public motion includes masked type, pointer camera response, floating evidence planes, process-link pulses, scroll-assembled source documents, living terrain and the closing portal. Native scrolling remains intact. Motion owns DOM transforms; lazy Three.js owns evidence geometry, and Canvas 2D owns terrain/fallback. Three.js uses instancing with at most 4×1,100 illustrative shards (4×220 on coarse-pointer/low-power devices), plus actual source records. Terrain uses bounded 28×130 samples, reduced to 15×48 on low-power devices. DPR is capped at 1.5 and rendering at about 30 fps, or 15 fps on low-power devices. Scenes initialize near the viewport; offscreen/hidden scenes suspend RAF. GPU resources, observers, listeners and subscriptions clean up on unmount.

Shared silver light shafts, soft haze and a horizon glint use composited CSS transform/opacity animation. They sit behind the page content and never intercept input. The public page adds slight spring-based pointer parallax; workspace light stays at lower intensity with no pointer tracking. Its pause control remains available on mobile and preserves its state across workspace navigation. Reduced motion freezes all silver layers. No new canvas loop, network calls or synthetic case telemetry are involved.

The latest workspace material direction is true black and silver. Neutral surfaces replace the earlier green-tinted graphite. The liquid glass treatment combines translucent fills, backdrop blur, reflective rims, specular highlights and layered cast/inset shadows. Four separate metric panes use spring-based pointer tilt bounded to 2.5 degrees, with a small foreground offset and a moving reflection. Leaving the pane restores its resting position; pause, reduced motion and coarse pointers suppress tilt. Timelines and graph hit targets remain stable. Inspector, evidence, finding and report surfaces share the glass material, while the printable dossier stays white. A solid gradient fallback covers browsers without backdrop blur. No extra WebGL renderer or dependency was added.

Pause/resume and skip controls are visible. Repeat visits in the same session settle the entrance. MotionConfig and CSS honor reduced motion; geometry renders statically. If WebGL is unavailable, the projected Canvas 2D field and HTML evidence controls remain usable; without any canvas context the HTML remains. The generated portal image is narrative artwork with moving light/field/camera layers, never case evidence. Its saved path, generation mode and exact prompt are recorded in `docs/redesign/ASSETS.md`. Analytical graphs do not move autonomously; camera movement follows explicit user actions.

Ctrl/Cmd K opens navigation, Tab moves through controls, Enter activates, Escape closes dialogs/inspectors. Arrow keys traverse timeline source records and adjust the focused inspector separator. Range inputs offer a keyboard alternative to brushing. React Flow nodes and edges explicitly open their source record with Enter/Space, in addition to its built-in focus and camera affordances.

Automated axe checks cover all nine primary screens, with a separate production desktop/mobile capture probe. Browser tests exercise keyboard graph inspection, timeline traversal, pane resize, command navigation and mobile drawer use. Exact artifacts/results are in `docs/redesign/after/` and `REDESIGN_PROGRESS.md`. These checks are not a complete WCAG certification or screen-reader audit; large-volume investigations, assistive technologies and other browser engines need separate evaluation.
