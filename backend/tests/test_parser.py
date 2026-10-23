import json

import pytest

from spectre.config import ROOT
from spectre.parser import normalize, parse, timestamp
from spectre.rules import detect


def test_timezone_normalization_and_original_precision():
    assert timestamp("2026-09-14T15:15:08.638+05:30")[0] == "2026-09-14T09:45:08.638000Z"
    value, precision = timestamp("2026-09-14 09:45:08.6381234", True)
    assert value == "2026-09-14T09:45:08.638123Z"
    assert "truncated" in precision


@pytest.mark.parametrize("value", ["2026-09-14T12:00:00", "not-a-date", "2026-02-30T00:00:00Z", None])
def test_invalid_timestamps_are_not_guessed(value):
    with pytest.raises((ValueError, TypeError)):
        timestamp(value)


def fixture_events():
    events = list(parse(ROOT / "datasets/synthetic/glasshouse.jsonl", ".jsonl"))
    for event in events:
        event["id"] = event["record_ref"]
    return events


def test_synthetic_ground_truth_independent_of_frontend():
    ground = json.loads((ROOT / "datasets/synthetic/ground_truth.json").read_text())
    events = fixture_events()
    assert len(events) == ground["event_count"]
    assert sum(e["category"] == "process" for e in events) == ground["process_count"]
    matches = detect(events)
    assert {m["rule_id"]: [int(e) for e in m["event_ids"]] for m in matches} == ground["expected_rules"]
    first, second = [
        next(e for e in events if int(e["record_ref"]) == record) for record in ground["pid_reuse_records"]
    ]
    assert first["fields"]["pid"] == second["fields"]["pid"]
    assert first["process_key"] != second["process_key"]


def test_process_name_alone_does_not_match():
    event = normalize(
        {
            "timestamp": "2026-01-01T00:00:00Z",
            "host": "host-a",
            "category": "process",
            "action": "created",
            "image": "powershell.exe",
            "command_line": "powershell.exe Get-Date",
        },
        "1",
        "jsonl",
    )
    event["id"] = "benign"
    assert detect([event]) == []


def test_correlation_requires_matching_guid_and_forward_time():
    events = fixture_events()
    for event in events:
        if event["category"] == "network":
            event["process_key"] = "same-pid-different-guid"
    assert not any(m["rule_id"] == "SP-003" for m in detect(events))
    events = fixture_events()
    events[8]["timestamp"] = "2026-09-14T09:00:00.000000Z"
    assert not any(m["rule_id"] == "SP-003" for m in detect(events))


def test_pid_only_network_is_unresolved():
    event = normalize(
        {
            "timestamp": "2026-01-01T00:00:00Z",
            "host": "h",
            "EventID": 3,
            "ProcessId": 123,
            "DestinationIp": "203.0.113.1",
        },
        "1",
        "jsonl",
    )
    assert event["process_key"] is None
    assert event["parent_key"] is None


@pytest.mark.parametrize(
    "suffix,content",
    [
        (".json", '[{"timestamp":"2026-01-01T00:00:00Z","host":"a","category":"file","action":"created"}]'),
        (".csv", "timestamp,host,category,action\n2026-01-01T00:00:00Z,a,file,created\n"),
    ],
)
def test_json_and_csv_paths(tmp_path, suffix, content):
    path = tmp_path / f"fixture{suffix}"
    path.write_text(content, encoding="utf-8")
    assert list(parse(path, suffix))[0]["category"] == "file"


def test_record_error_is_precise_and_unknown_ids_rejected(tmp_path):
    path = tmp_path / "invalid.jsonl"
    path.write_text('{"EventID":9999,"timestamp":"2026-01-01T00:00:00Z","host":"a"}')
    with pytest.raises(ValueError, match="record 1: unsupported EventID"):
        list(parse(path, ".jsonl"))


def test_fingerprint_deduplicates_equivalent_source_formats():
    record = {
        "timestamp": "2026-01-01T00:00:00Z",
        "host": "a",
        "category": "process",
        "action": "created",
        "pid": 12,
    }
    a = normalize(record, "1", "jsonl")
    b = normalize({**record, "timestamp": "2026-01-01T05:30:00+05:30"}, "2", "csv")
    assert a["fingerprint"] == b["fingerprint"]


def test_csv_numeric_metadata_matches_json_numbers():
    record = {
        "timestamp": "2026-01-01T00:00:00Z",
        "host": "a",
        "category": "process",
        "action": "created",
        "pid": 12,
    }
    a = normalize(record, "1", "jsonl")
    b = normalize({**record, "pid": "12", "parent_pid": "", "port": ""}, "2", "csv")
    assert a["fingerprint"] == b["fingerprint"]
