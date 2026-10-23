"""Deterministic investigative leads; a match never proves a compromise."""

import re
from collections import defaultdict

from .parser import basename

RULES = {
    "SP-001": dict(
        title="Encoded PowerShell execution",
        severity="high",
        mitre="T1059.001",
        rationale="A process creation record contains a PowerShell executable and an encoded-command argument.",
        limitations="Encoded commands are also used by legitimate administration. Payload content is not decoded or executed.",
        required_fields=["category=process", "image", "command_line"],
    ),
    "SP-002": dict(
        title="Office application spawned a script interpreter",
        severity="high",
        mitre="T1204.002",
        rationale="An explicit parent ProcessGuid links an Office process creation to a script interpreter creation.",
        limitations="An Office child process is an investigative lead. This does not establish a malicious document or user intent.",
        required_fields=["ProcessGuid", "ParentProcessGuid", "image", "parent process creation"],
    ),
    "SP-003": dict(
        title="Script execution followed by network activity",
        severity="medium",
        mitre="T1059.001",
        rationale="An encoded PowerShell creation is followed within five minutes by a network record with the same host and ProcessGuid.",
        limitations="A shared process identity supports the relationship. Destination reputation and transferred content are unknown.",
        required_fields=["SP-001 match", "network record", "same ProcessGuid", "time delta 0–300s"],
    ),
    "SP-004": dict(
        title="Possible Run-key persistence",
        severity="medium",
        mitre="T1547.001",
        rationale="A registry value-set record targets a Windows CurrentVersion Run or RunOnce key.",
        limitations="Legitimate software uses these keys. The value data must be reviewed before concluding persistence is malicious.",
        required_fields=["category=registry", "action=value_set", "target"],
    ),
}


def detect(events: list[dict]) -> list[dict]:
    from datetime import datetime

    matches = []
    creations = {e["process_key"]: e for e in events if e["category"] == "process" and e["process_key"]}
    networks = defaultdict(list)
    for event in events:
        if event["category"] == "network" and event["process_key"]:
            networks[event["process_key"]].append(event)

    def add(rule, refs):
        matches.append(
            dict(rule_id=rule, rule_version="1.0.0", **RULES[rule], event_ids=[e["id"] for e in refs])
        )

    for event in events:
        fields = event["fields"]
        image = basename(str(fields.get("image") or "")).lower()
        encoded = (
            event["category"] == "process"
            and image in {"powershell.exe", "pwsh.exe"}
            and bool(
                re.search(
                    r"(?:^|\s)[-/](?:enc|encodedcommand|e)(?:\s|:)",
                    str(fields.get("command_line") or ""),
                    re.I,
                )
            )
        )
        if encoded:
            add("SP-001", [event])
            for network in networks.get(event["process_key"], []):
                delta = (
                    datetime.fromisoformat(network["timestamp"].replace("Z", "+00:00"))
                    - datetime.fromisoformat(event["timestamp"].replace("Z", "+00:00"))
                ).total_seconds()
                if network["process_key"] == event["process_key"] and 0 <= delta <= 300:
                    add("SP-003", [event, network])
        parent = creations.get(event.get("parent_key"))
        if event["category"] == "process" and parent and parent["timestamp"] <= event["timestamp"]:
            parent_image = basename(str(parent["fields"].get("image") or "")).lower()
            if parent_image in {"winword.exe", "excel.exe", "powerpnt.exe", "outlook.exe"} and image in {
                "powershell.exe",
                "pwsh.exe",
                "cmd.exe",
                "wscript.exe",
                "cscript.exe",
                "mshta.exe",
            }:
                add("SP-002", [parent, event])
        if (
            event["category"] == "registry"
            and event["action"] == "value_set"
            and re.search(r"\\CurrentVersion\\Run(?:Once)?\\", str(fields.get("target") or ""), re.I)
        ):
            add("SP-004", [event])
    return matches
