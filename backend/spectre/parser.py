"""Bounded structured-event parser. No executable content, templates or binary formats."""

import csv
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

PARSER_VERSION = "spectre-structured/1.0.0"
MAX_RECORDS = 10_000
MAX_LINE = 256 * 1024
EVENT_TYPES = {
    1: ("process", "created"),
    3: ("network", "connected"),
    11: ("file", "created"),
    13: ("registry", "value_set"),
    22: ("dns", "queried"),
    4624: ("authentication", "logon_success"),
    4625: ("authentication", "logon_failure"),
}


def timestamp(value: str, sysmon_utc: bool = False) -> tuple[str, str]:
    if not isinstance(value, str) or len(value) > 80:
        raise ValueError("timestamp must be an ISO 8601 string with a timezone")
    text = value.strip()
    if sysmon_utc and not re.search(r"(Z|[+-]\d\d:\d\d)$", text):
        text += "Z"  # Only Sysmon's documented UtcTime field implies UTC.
    dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        raise ValueError("timestamp is timezone-naive; supply Z or an explicit UTC offset")
    fraction = re.search(r"\.(\d+)", text)
    digits = len(fraction.group(1)) if fraction else 0
    precision = f"{digits} fractional digits" if digits else "seconds"
    if digits > 6:
        precision += "; UTC truncated to microseconds"
    return dt.astimezone(timezone.utc).isoformat(timespec="microseconds").replace("+00:00", "Z"), precision


def basename(value: str) -> str:
    return value.replace("\\", "/").rsplit("/", 1)[-1]


def normalize(raw: dict, record_ref: str, source_format: str) -> dict:
    if not isinstance(raw, dict):
        raise ValueError("each record must be a JSON object")
    if len(json.dumps(raw, ensure_ascii=False).encode()) > MAX_LINE:
        raise ValueError("record exceeds 256 KiB")
    event_id = raw.get("EventID", raw.get("event_id"))
    if event_id is not None:
        try:
            kind = EVENT_TYPES[int(event_id)]
        except (ValueError, TypeError, KeyError):
            raise ValueError(
                f"unsupported EventID {str(event_id)[:30]}; supported: {list(EVENT_TYPES)}"
            ) from None
        category, action = kind
    else:
        category, action = raw.get("category"), raw.get("action")
        if category not in {"process", "network", "file", "registry", "dns", "authentication"} or not action:
            raise ValueError(
                "supply a supported EventID or category and action; see docs/ARTIFACT_FORMATS.md"
            )
    original = raw.get("timestamp", raw.get("UtcTime"))
    normalized, precision = timestamp(original, "UtcTime" in raw and "timestamp" not in raw)
    host = str(raw.get("host", raw.get("Computer", ""))).strip()
    if not host or len(host) > 255:
        raise ValueError("host/Computer is required and must contain at most 255 characters")
    user = str(raw.get("user", raw.get("User", raw.get("TargetUserName", "Unknown"))))
    if len(user) > 255 or len(str(action)) > 80:
        raise ValueError("user or action exceeds maximum length")
    fields = {
        "image": raw.get("image", raw.get("Image")),
        "command_line": raw.get("command_line", raw.get("CommandLine")),
        "pid": raw.get("pid", raw.get("ProcessId")),
        "parent_image": raw.get("parent_image", raw.get("ParentImage")),
        "parent_pid": raw.get("parent_pid", raw.get("ParentProcessId")),
        "destination": raw.get("destination", raw.get("DestinationIp")),
        "port": raw.get("port", raw.get("DestinationPort")),
        "target": raw.get("target", raw.get("TargetObject", raw.get("TargetFilename", raw.get("QueryName")))),
        "details": raw.get("details", raw.get("Details")),
        "event_id": int(event_id) if event_id is not None else None,
    }
    for name, value in fields.items():
        if value is not None and not isinstance(value, (str, int, float, bool)):
            raise ValueError(f"{name} must be a scalar")
    # CSV represents scalars as strings; normalize numeric identity fields consistently.
    for name in ("pid", "parent_pid", "port"):
        value = fields[name]
        if value == "":
            fields[name] = None
        elif value is not None:
            if isinstance(value, bool) or not re.fullmatch(r"\d+", str(value)):
                raise ValueError(f"{name} must be a nonnegative integer")
            fields[name] = int(value)
    guid = raw.get("process_guid", raw.get("ProcessGuid"))
    parent_guid = raw.get("parent_guid", raw.get("ParentProcessGuid"))
    # Never associate network events using a bare PID: reuse makes that ambiguous.
    process_key = f"{host.lower()}:{str(guid).lower()}" if guid else None
    if not process_key and category == "process" and fields["pid"] is not None:
        process_key = f"{host.lower()}:pid:{fields['pid']}:{normalized}"
    parent_key = f"{host.lower()}:{str(parent_guid).lower()}" if parent_guid else None
    if any(key and len(key) > 400 for key in [process_key, parent_key]):
        raise ValueError("process identity is too long")
    image = basename(str(fields["image"] or "Unknown process"))
    titles = {
        "process": f"{image} started",
        "network": f"Connection to {fields['destination'] or 'unknown endpoint'}",
        "registry": "Registry value modified",
        "file": f"File created · {basename(str(fields['target'] or 'unknown'))}",
        "dns": f"DNS query · {fields['target'] or 'unknown'}",
        "authentication": "Account logon failed" if action == "logon_failure" else "Account logon succeeded",
    }
    canonical = dict(
        timestamp=normalized,
        host=host.lower(),
        user=user,
        process_key=process_key,
        parent_key=parent_key,
        category=category,
        action=action,
        fields=fields,
    )
    fingerprint = hashlib.sha256(
        json.dumps(canonical, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()
    return dict(
        **canonical,
        fingerprint=fingerprint,
        original_timestamp=original,
        precision=precision,
        title=titles[category][:400],
        raw=raw,
        record_ref=str(raw.get("EventRecordID", record_ref))[:80],
        source_format=source_format,
    )


def parse(path: Path, suffix: str):
    with path.open("r", encoding="utf-8-sig", newline="") as source:
        if suffix == ".json":
            records = json.load(source)
            if not isinstance(records, list):
                raise ValueError("JSON input must be an array; use JSONL for one object per line")
            iterator = enumerate(records, 1)
        elif suffix == ".csv":
            csv.field_size_limit(MAX_LINE)
            iterator = enumerate(csv.DictReader(source), 2)
        elif suffix == ".jsonl":

            def lines():
                for line_number, line in enumerate(source, 1):
                    if len(line.encode()) > MAX_LINE:
                        raise ValueError(f"record {line_number}: line exceeds 256 KiB")
                    if line.strip():
                        try:
                            yield line_number, json.loads(line)
                        except json.JSONDecodeError:
                            raise ValueError(f"record {line_number}: invalid JSON") from None

            iterator = lines()
        else:
            raise ValueError("unsupported format; use .json, .jsonl or .csv")
        count = 0
        for record_ref, raw in iterator:
            count += 1
            if count > MAX_RECORDS:
                raise ValueError("artifact exceeds 10,000 records; split it before importing")
            try:
                yield normalize(raw, str(record_ref), suffix[1:])
            except (ValueError, TypeError, OverflowError) as error:
                raise ValueError(f"record {record_ref}: {error}") from None
        if not count:
            raise ValueError("artifact contains no records")


if __name__ == "__main__":
    # Dedicated child process, fixed module, generated paths, never shell=True.
    try:
        if sys.platform != "win32":
            import resource

            resource.setrlimit(resource.RLIMIT_CPU, (10, 10))
            resource.setrlimit(resource.RLIMIT_AS, (256 * 1024 * 1024, 256 * 1024 * 1024))
        with open(sys.argv[3], "w", encoding="utf-8") as output:
            for event in parse(Path(sys.argv[1]), sys.argv[2]):
                output.write(json.dumps(event, ensure_ascii=False) + "\n")
    except Exception as error:
        # Only controlled errors are returned; no evidence fields or traceback in HTTP responses.
        message = str(error) if isinstance(error, ValueError) else "invalid or unreadable structured artifact"
        sys.stderr.write(message[:600])
        sys.exit(1)
