# Supported artifact contract · parser 1.0.0

Accepts UTF-8 (optional BOM) `.jsonl` objects per nonempty line, `.json` arrays of objects, or header-based `.csv`. No nested Windows XML/JSON export, binary EVTX, archives, disk images or arbitrary forensic artifact support is claimed. JSON is bounded to a 20 MiB file; JSONL and CSV iterate records. One artifact is capped at 10,000 records and 256 KiB per normalized record. A case is capped at 20,000 distinct normalized events.

Flat exported Windows-style records accept the following field names:

| Field | Meaning |
| --- | --- |
| `timestamp` or `UtcTime` | ISO 8601 timestamp; offset mandatory for timestamp. Only Sysmon UtcTime can imply UTC. |
| `host` or `Computer` | Required endpoint name, at most 255 characters |
| `EventID` or `event_id` | Supported mappings below |
| `user`, `User`, `TargetUserName` | Account label, otherwise Unknown |
| `ProcessGuid`, `ParentProcessGuid` | Host-scoped process and parent identities |
| `Image`, `ProcessId`, `ParentImage`, `ParentProcessId`, `CommandLine` | Process metadata |
| `DestinationIp`, `DestinationPort`, `QueryName` | Network/DNS metadata |
| `TargetFilename`, `TargetObject`, `Details` | File/registry metadata |
| `EventRecordID` | Source identifier; otherwise line number / array index / CSV row |

| Event ID | Documented interpretation |
| --- | --- |
| Sysmon 1 | Process creation |
| Sysmon 3 | Network connection |
| Sysmon 11 | File creation |
| Sysmon 13 | Registry value set |
| Sysmon 22 | DNS query |
| Security 4624 / 4625 | Successful / failed logon observation; no logon anomaly detector yet |

Alternatively use normalized keys: `timestamp`, `host`, `user`, `category`, `action`, `process_guid`, `parent_guid`, `image`, `pid`, `parent_pid`, `command_line`, `destination`, `port`, `target`, `details`. Allowed categories: process, network, dns, file, registry, authentication. Extra raw fields are retained. Scalar metadata is required; nested object values in normalized metadata are rejected.

```json
{"timestamp":"2026-09-14T15:15:08.638+05:30","host":"workstation-01","category":"process","action":"created","image":"powershell.exe","pid":6148,"process_guid":"{example-instance}","command_line":"powershell.exe -NoProfile -Command Get-Date"}
```

Unknown EventIDs, timezone-naive timestamps, oversized records and malformed records fail the complete artifact transaction with a record reference. The original file remains preserved and the job records the failure. There is no partial-success state in this release.

Normalization stores original timestamp text and declared fractional precision separately from fixed-width UTC microseconds. More precise source values are explicitly marked as truncated; no extra precision is invented. Source clock skew is not corrected. Parent edges require parent creation time at or before child creation time. Other clock inconsistencies require analyst review.

Canonical fingerprints cover normalized time, host, identity, category, action and parsed metadata. Equal canonical events are deduplicated per case, even in different artifacts; every distinct artifact/record reference is retained in `event_sources`. Unknown raw fields do not participate in this fingerprint, so they must be inspected through the originals when canonical events coincide.

Host + ProcessGuid is the preferred identity. A process creation with no GUID uses host + PID + start time. Network activity with only a PID is deliberately left uncorrelated. Missing parent records produce unresolved ancestry. This release does not reconstruct process lifetime from terminate events.
