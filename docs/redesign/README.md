# SPECTRE concept-board implementation

All captures show the running local application. Case content is the parsed public synthetic investigation. The concept image supplied by the user is the art-direction reference; these artifacts are implemented software.

Gap analysis: [VISUAL_REINVENTION_PLAN.md](../../VISUAL_REINVENTION_PLAN.md). Stages and preservation details: [REDESIGN_PROGRESS.md](../../REDESIGN_PROGRESS.md).

| Concept | Desktop | Mobile |
| --- | --- | --- |
| 01 Living evidence hero | [Capture](after/landing.png) | [Capture](after/landing-mobile.png) |
| 02 The Fragments | [Capture](after/chapter-1.png) | [Capture](after/chapter-1-mobile.png) |
| 03 The Timeline | [Capture](after/chapter-2.png) | [Capture](after/chapter-2-mobile.png) |
| 04 The Connections | [Capture](after/chapter-3.png) | [Capture](after/chapter-3-mobile.png) |
| 05 The Investigation | [Capture](after/chapter-4.png) | [Capture](after/chapter-4-mobile.png) |
| 06 The Evidence | [Capture](after/chapter-5.png) | [Capture](after/chapter-5-mobile.png) |
| 07 Enter SPECTRE | [Capture](after/chapter-6.png) | [Capture](after/chapter-6-mobile.png) |
| 08 Authentication | [Capture](after/auth.png) | [Capture](after/auth-mobile.png) |
| 09 Overview | [Capture](after/overview.png) | [Capture](after/overview-mobile.png) |
| 10 Timeline Explorer | [Capture](after/timeline.png) | [Capture](after/timeline-mobile.png) |
| 11 Process Explorer | [Capture](after/processes.png) | [Capture](after/processes-mobile.png) |
| 12 Relationship Graph | [Capture](after/graph.png) | [Capture](after/graph-mobile.png) |
| 13 Evidence Vault | [Capture](after/evidence.png) | [Capture](after/evidence-mobile.png) |
| 14 Findings | [Capture](after/findings.png) | [Capture](after/findings-mobile.png) |
| 15 Reports and dossier | [Capture](after/reports.png) | [Capture](after/reports-mobile.png) |

Before images are in [before/](before/). Stage 2 images in this folder record the earlier hero checkpoint.

The final public captures follow the user's Reconstruct the Unseen composition and subsequent bold-sans/italic-serif typography reference. Closing artwork is shown at its full original ratio with bounded motion. Generated artwork, saved asset path, exact final prompt and built-in generation mode: [ASSETS.md](ASSETS.md).

The dashboard shares the ivory/graphite typography and silver ambient lighting. Additional captures show its default motion presentation on [desktop](after/dashboard-silver.png) and [mobile](after/dashboard-silver-mobile.png), plus the [silver public environment](after/landing-silver.png). The nine browser tests include dashboard pause persistence, reduced-motion behavior and source inspection.

The newest dashboard refinement uses true black and silver with translucent liquid glass, reflective rims, layered shadows and pointer-driven metric depth: [desktop](after/dashboard-glass.png) and [mobile](after/dashboard-glass-mobile.png). The motion test also checks actual metric tilt, pause and reduced-motion suppression.

[Glass verification](after/glass-audit.json) records actual black surface colors, backdrop blur, pointer tilt, pause, reduced-motion and touch suppression, narrow-screen overflow and the white print layout. The final graph captures also verify the underlying React Flow canvas is black.

## Verification artifacts

[audit.json](after/audit.json) records desktop/mobile axe results, document overflow, runtime/hydration errors and unexpected failed responses for the nine primary screens. A signed-out `/auth/me` 401 is the expected authentication check and is excluded from unexpected failures. Automated scans do not establish complete WCAG conformance.

[performance.json](after/performance.json) contains a single local production Chromium measurement: buffered LCP/CLS, DOM load time, resource transfer, evidence selection measured across two animation frames, actual rendered canvas frame counts and pause behavior. This is unthrottled local laboratory data with a warm API. The selection timing is not INP, and these measurements are not field Core Web Vitals. Frame counts cover one second and are approximate.

The browser suite verifies the actual API/database workflow with a disposable database and separate local ports. It checks stored report content, timeline brush/pan/reset, keyboard graph/source inspection, branch focus, inspector resizing, mobile command navigation and public/private separation. No production credentials are used in tests.

The final component run used a single threads worker after the default Windows forks worker timed out during startup; all three assertions passed. This did not require an application change.

## Reproduce on native Windows

Keep the local API running on 8100. From `frontend`, run:

```powershell
npm run typecheck
npm run lint
npm test -- --pool=threads --maxWorkers=1
npm run test:e2e
npm run build
npm run start -- --port 3200
```

From another PowerShell terminal in `frontend`:

```powershell
node tests/capture-redesign.mjs http://127.0.0.1:3200
```

Backend regression suite, from the repository root:

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q
```

The capture probe reads public/signed-out pages and writes only these local artifacts. It never signs in, imports evidence or changes case data. No Docker or cloud infrastructure is required.
