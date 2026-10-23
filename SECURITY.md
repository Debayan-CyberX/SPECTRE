# Security and evidence boundaries

SPECTRE 0.1 is intended for a trusted analyst's local machine. Default servers bind to 127.0.0.1. Compose publishes only its frontend to loopback. This is an application-level integrity and access model, not tamper-proof storage, an independently certified forensic tool, or a court-grade chain of custody.

## Implemented controls

- Argon2 passwords, random opaque session tokens hashed in the database, eight-hour expiry, HttpOnly/SameSite=Strict cookies, explicit logout and optional Secure cookies.
- Every private case route checks owner identity, including event details, graph, annotations, findings, evidence downloads and report exports. No public user registration or shared-case role model.
- Mutation header and exact Origin checks. The same-origin Next.js proxy avoids broad CORS. Login throttling limits each observed client address to ten attempts per minute in one process.
- 128 KiB JSON request cap. Raw uploads are streamed and capped at 20 MiB regardless of declared length. Format allowlist: JSON, JSONL, CSV. No archive extraction. Generated storage names outside frontend/public paths; path separators and control characters are rejected in original names.
- SHA-256 streamed during import; file stored separately from derived events, made read-only to ordinary accidental writes, and reverified before download. Application custody and audits are insert-only; no edit/delete endpoints exist for them.
- Fixed child parser command, generated file paths, no shell, minimal inherited environment, 20-second deadline, 10,000-record/256 KiB-record limits. POSIX child CPU limit 10 seconds and address-space limit 256 MiB. Windows does not yet use a Job Object.
- Normalized events commit atomically per artifact; processing failures retain the original and record the failure. Duplicate case/hash imports do not overwrite originals. Canonical duplicate records retain additional source references.
- React text rendering escapes log fields. Raw JSON is text in a preformatted inspector. PDF text is XML-escaped. Imports, process command lines and report content never trigger execution or external requests.
- Self-hosted fonts, no analytics or external AI calls. Operational logs omit paths, queries, credentials and artifact content. Report/export downloads are authorized and audited.

## Threat model and remaining work

An attacker can control all artifact content, filenames and timestamps. The analyst's OS account, Python environment and database administrator are trusted. An administrator can edit originals, database rows and history; the application will detect file-hash mismatch on download but does not cryptographically seal database/custody history. Read-only file flags are not an access boundary against a privileged user. There is a residual verification-to-download race if another privileged local process modifies a file during download.

The parser subprocess shares the API's OS user. Native local execution has no network namespace restriction; container networking denies API/database external egress. The initial parser uses Python standard-library structured readers, not complex binary plugins. Hardened workers should add least-privilege OS identities, network isolation, Windows Job Objects, bounded worker memory, job leases and resumable recovery before binary parser deployment.

The database transaction lock is local to one API process. Do not configure multiple workers for this release. File-system writes and database commits cannot be one atomic transaction; a crash before the metadata commit may leave an unreferenced generated file. No automatic cleanup deletes potential evidence. `python -m spectre.cli recover` marks interrupted jobs failed after the operator has stopped processing.

The current application has no TLS termination, password reset, MFA, role sharing, retention/deletion policy, signed audit log, session management UI or centralized rate limiter. CSP permits inline scripts/styles for Next.js and React Flow; a nonce-based production policy is future work. Do not expose this developer release publicly. If adapting to HTTPS, set `SPECTRE_COOKIE_SECURE=true` and an exact HTTPS allowed origin.

Native development stores `data/` and secrets under the repository, which is currently inside OneDrive. **For sensitive evidence, use a non-synced, access-controlled encrypted local volume** and set `SPECTRE_STORAGE_DIR` and `SPECTRE_DATABASE_URL` before initialization. SPECTRE makes no cloud uploads, but operating-system backup/sync software may copy those files independently. The generated local evaluation login file is ignored by Git; protect it like any local credential and remove it after saving the password securely.

## Reporting a vulnerability

Do not put private artifacts, credentials or case exports in public issues. No hosted disclosure address is configured yet. Establish a private maintainer disclosure channel before publishing the repository. Dependency manifests and locks are included; automated dependency review and a dedicated security audit are still needed before an external release.
