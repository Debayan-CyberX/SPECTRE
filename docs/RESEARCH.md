# Reference and dependency review · 2026-10-22

External reference pages were retrieved using browser web access before major UI implementation. This access exposed rendered page text/documentation, not full interactive product sessions. Gotham exposed almost no readable application content, so no claim of inspecting its internal workflows is made. Screenshots in this repository are of SPECTRE itself.

## Design references consulted

- [Linear](https://linear.app/) and [its design refresh article](https://linear.app/now/behind-the-latest-design-refresh): calm navigation hierarchy and distinction between contextual location and analytical controls informed separate top bar/filter rows.
- [Grafana](https://grafana.com/): explicit time-context exploration informed the case density overview and time-window controls.
- [Vercel](https://vercel.com/): restrained technical hierarchy and typography informed the editorial product presentation.
- [Gotham](https://www.palantir.com/platforms/gotham/): supplied inspiration; page retrieval was limited. No proprietary feature implementation or copied interface is claimed.
- [shadcn](https://ui.shadcn.com/docs/installation/next), [Motion](https://motion.dev/docs/react), [React Flow](https://reactflow.dev/), [TanStack Table](https://tanstack.com/table/latest), [Virtual](https://tanstack.com/virtual/latest), [Aceternity](https://ui.aceternity.com/): component and interaction references. No Aceternity assets/components were copied or installed.

## Engineering references

Reviewed repository descriptions and documentation for [Timesketch](https://github.com/google/timesketch), [Plaso](https://github.com/log2timeline/plaso), [Velociraptor](https://github.com/Velocidex/velociraptor), [shadcn/ui](https://github.com/shadcn-ui/ui), [xyflow](https://github.com/xyflow/xyflow), [TanStack Table](https://github.com/TanStack/table), [Virtual](https://github.com/TanStack/virtual). Their processing engines are not embedded here. The [python-evtx project](https://pypi.org/project/python-evtx/) was researched as a future genuine EVTX path; it was not installed or advertised as supported.

Installation and streaming guidance came from [Next.js](https://nextjs.org/docs/app/getting-started/installation) and [FastAPI](https://fastapi.tiangolo.com/tutorial/request-files/). Next.js 16.4.2's local bundled documentation was additionally read for layouts, client boundaries and rewrites, following its generated AGENTS.md. [Docker's health dependency guidance](https://docs.docker.com/compose/how-tos/startup-order/) and [PostgreSQL support policy](https://www.postgresql.org/support/versioning/) informed the supplied Compose setup.

## Compatibility decisions

Registry metadata was queried for current package versions and compatibility. The resulting exact installed frontend versions are pinned in package.json/package-lock.json. Important decisions:

- Next.js 16.4.2 / React 19.3.1 / TypeScript 6.0.3 / Tailwind 4.3.3 compile together on Node 24.20.0.
- Motion 14.6.0, React Flow 12.12.0 and TanStack Query 5.104.5 declare React 19-compatible peer ranges.
- TanStack Table **8.21.3** and Virtual **3.14.22** are explicitly pinned to the APIs used here. Newer Table major APIs are incompatible with `useReactTable/getCoreRowModel`; no force installation is used.
- React Hook Form 7.90.0, resolver **5.2.2** and Zod 4.6.7 are compatible. The newest resolver 6 had conflicting optional Effect peer requirements during resolution and was not retained.
- ESLint **9.39.5** is pinned because current Next preset plugins still declare ESLint 9 peers. It reports an upstream support/deprecation notice. Migration to an ecosystem-compatible supported release is a maintenance task; ESLint 10 was not left with incompatible peers.
- Python 3.12.10 with FastAPI 0.160.0, SQLAlchemy 2.1.6 and Alembic 1.20.1 was installed and exercised. `requirements-dev.lock` records this Windows environment; platform-specific Linux uvicorn dependencies may resolve separately. Starlette currently warns about legacy httpx TestClient support; tests pass, and migration to its successor is pending.
- Direct dependency license identifiers were inspected from installed package manifests and documented in [THIRD_PARTY.md](THIRD_PARTY.md). Fonts use OFL-1.1. Test-only axe uses MPL-2.0. Most UI dependencies use MIT. Python package license metadata and upstream notices should accompany redistribution.

## Rule mapping references

- [T1059.001 / PowerShell](https://attack.mitre.org/techniques/T1059/001/): contextual mapping for observed encoded PowerShell and its process-linked network activity. Neither encoding nor a connection proves malicious scripting.
- [T1204.002 / Malicious File](https://attack.mitre.org/techniques/T1204/002/): hypothesis context for Office-to-interpreter ancestry. The rule does not establish document contents or user execution; this limitation is shown with the finding.
- [T1547.001 / Registry Run Keys](https://attack.mitre.org/techniques/T1547/001/): Run/RunOnce value-set observations map to potential startup persistence. Legitimate software uses these keys too.
