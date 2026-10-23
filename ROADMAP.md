# Implementation roadmap

## Completed initial checkpoint

- Architecture, documented data model/trust boundaries, API v1 and explicit Alembic schema.
- Custom dark design system, interactive evidence-driven product site and persistent application shell.
- Native local execution, SQL persistence, local authentication, case listing/creation/status editing.
- Streamed imports, SHA-256, original preservation, custody/job metadata and failure retention.
- Real JSON/JSONL/CSV parsing, original/UTC timestamp handling and source-level traceability.
- Repeatable synthetic case, track timeline, virtual event table, selected-event inspector.
- Bounded process and entity graph, four deterministic rules, notes/bookmarks and finding review.
- JSON snapshot/PDF summary, unit/API/component/browser tests, local benchmark and CI configuration.

## Next: strengthen supported forensic sources

1. Add binary EVTX using an evaluated maintained parser, isolated workers and genuine EVTX fixtures. Preserve XML/source offsets, provider/channel identity and unsupported event records. Do not broaden format advertising first.
2. Test PostgreSQL and Compose locally/CI, strengthen check constraints and typed/generated API responses, add PostgreSQL-specific density aggregation.
3. Introduce Redis-backed queued workers with leases, progress, retries and crash-safe recovery. Remove the single-process restriction only after concurrency/idempotency tests.
4. Add process terminate/lifetime handling, confidence-aware ancestry, clock inconsistency observations and account-logon anomaly rules with sufficient source fields.

## Then: deepen investigation UX

- Server-driven time-window graph filtering and scoped graph expansion for truncated cases.
- Resizable split panes, drag-to-pan timeline, range brushing, synchronized graph/time focus and saved filters.
- Candidate-sequence comparison and explicit alternative-hypothesis/reconstruction workflow.
- Accessible larger-text settings, screen-reader walkthroughs, graph keyboard audit, wider touch targets and reduced-motion visual regression coverage.
- Raw inspection with lazy Monaco only if real inspection requirements justify its cost.

## Before an external release

- Owner selects project license and establishes private vulnerability disclosure.
- Separate least-privilege worker identities, no-network parser boundary, Windows Job Objects and stronger session/role management.
- PostgreSQL, Linux, WSL2 and Compose validation; large, malformed and adversarial dataset benchmarks.
- Authenticated collaboration, retention/export policy, signed custody/audit snapshots, backup and restore verification.
- Nonce-based CSP and deployment review. No public deployment is authorized or performed in this checkpoint.

## Optional research phase

Plaso interoperability, additional genuine artifact parsers and an opt-in evidence-citing AI advisor. No AI work should replace deterministic ingestion, traceability or analyst decisions. Graph/search infrastructure should grow only in response to measured requirements.
