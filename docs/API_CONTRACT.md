# API v1

FastAPI publishes the executable schema at `/api/openapi.json` and a self-contained, read-only API reference at `/api/docs`, through the frontend proxy. All application endpoints use `/api/v1`. No credentials are needed for `/health` or the reserved `/demo` synthetic projection. Every private route depends on the authenticated session and checks the requested case owner. Unknown and unauthorized object IDs return 404.

Mutations require `X-Spectre-Request: 1`. Browser requests must have exactly the configured allowed origin. Session cookies are HttpOnly, SameSite=Strict, expire after eight hours and use Secure when configured. Core functions do not require external credentials.

| Method | Path under `/api/v1` | Contract |
| --- | --- | --- |
| POST | `/auth/login` | `{username,password}` → user identity, opaque session cookie |
| GET / POST | `/auth/me`, `/auth/logout` | Session identity / invalidate session |
| GET / POST | `/cases` | Owner's list / `{name,description}` → new case |
| PATCH | `/cases/{case}` | Optional name, description, status (`open`, `in_review`, `closed`) |
| GET | `/cases/{case}/workspace` | Case counts, artifacts, findings, notes, jobs, hosts, categories, time bounds |
| POST | `/cases/{case}/evidence` | Raw streaming body; headers below → persisted evidence result |
| GET | `/cases/{case}/evidence/{id}` | Artifact metadata and append-only application custody history |
| GET | `/cases/{case}/evidence/{id}/original` | Rehash original; 409 on mismatch; audited attachment download |
| GET | `/cases/{case}/events` | Filtered, chronologically ordered cursor page; raw fields excluded |
| GET | `/cases/{case}/events/{id}` | Normalized event, raw record and all artifact references |
| GET | `/cases/{case}/density?bins=48` | SQL time bucket counts; 8–128 bins |
| GET | `/cases/{case}/graph?kind=process` | Typed entities and provenance edges; 150/500 cap plus `truncated` flag |
| POST | `/cases/{case}/annotations` | `{event_id?,text,bookmarked}`; event must belong to case |
| PATCH | `/cases/{case}/findings/{id}` | `{status,notes}`; status unreviewed/confirmed/rejected |
| GET / POST | `/cases/{case}/reports` | List snapshots / persist a new complete snapshot |
| GET | `/cases/{case}/reports/{id}?format=json` | Saved JSON or PDF; unchanged snapshots reproduce JSON bytes |
| POST | `/demo/import` | New owner-private synthetic case through the genuine ingestion pipeline |
| GET | `/demo` | Reserved, read-only public synthetic case; cannot select private cases |

Upload headers: `Content-Type: application/octet-stream`, `X-Filename` (percent-encoded basename), optional `X-Evidence-Source` (percent-encoded) and `X-Acquired-At` (ISO 8601 with offset). Both Content-Length and actual streamed bytes are limited. No archive extraction exists. Processing is synchronous and bounded; a successful HTTP import response can contain `status: failed` when the original was preserved but parsing failed. The frontend explicitly displays this condition.

Event query parameters: `limit` (1–500, default 250), opaque `cursor`, `category`, `host`, `user`, `q` (title/host), `start`, `end` (ISO 8601 with UTC offset). Cursor ordering is `(normalized timestamp, stable UUID)` to handle equal timestamps without skipping records. Filters run on the backend. The browser can explicitly load additional pages; timeline points describe the loaded page, while density covers the case.

Schema interfaces in `frontend/src/lib/types.ts` mirror these response shapes. Case, evidence and mutation request schemas also have Pydantic validation. Broader generated response contracts and automatic TypeScript code generation remain future work.
