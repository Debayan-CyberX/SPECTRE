"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, FileTerminal, Fingerprint } from "lucide-react";
import type { DemoData, ForensicEvent } from "@/lib/types";
import { timeLabel } from "@/lib/api";
import { Badge, Brand } from "../primitives";
import { Timeline } from "../timeline";
import { DensityWave } from "./density-wave";
import { SpatialEvidence } from "./spatial-evidence";

const views = [
  "Overview",
  "Timeline",
  "Processes",
  "Relationships",
  "Evidence",
  "Findings",
];
export function LivingWorkspace({
  data,
  selected,
  onSelect,
}: {
  data: DemoData;
  selected?: ForensicEvent;
  onSelect: (event: ForensicEvent) => void;
}) {
  const [view, setView] = useState("Processes");
  const ancestry = useMemo(() => {
    let entity = data.entities.find(
      (e) =>
        e.kind === "process" &&
        data.findings.some(
          (f) =>
            f.rule_id === "SP-001" &&
            f.event_ids.includes(String(e.details.event_id)),
        ),
    );
    const result = [],
      seen = new Set();
    while (entity && !seen.has(entity.id)) {
      seen.add(entity.id);
      result.unshift(entity);
      const parent = data.relationships.find(
        (r) => r.kind === "spawned" && r.target_id === entity?.id,
      );
      entity = data.entities.find((e) => e.id === parent?.source_id);
    }
    return result;
  }, [data]);
  const target =
    view === "Overview"
      ? ""
      : view === "Relationships"
        ? "graph"
        : view.toLowerCase();
  return (
    <div className="living-workspace-preview">
      <div className="mini-topbar">
        <Brand compact />
        <span>{data.case.name}</span>
        <Badge tone="cyan">INTERACTIVE DEMO</Badge>
        <Link
          href="/workspace?demo=1"
          aria-label="Open the complete demo workspace"
        >
          <ArrowRight size={14} />
        </Link>
      </div>
      <div className="mini-workspace-grid">
        <div className="mini-navigation" aria-label="Interactive preview views">
          {views.map((label) => (
            <button
              key={label}
              className={view === label ? "active" : ""}
              aria-pressed={view === label}
              onClick={() => setView(label)}
            >
              <i />
              {label}
            </button>
          ))}
        </div>
        <div className={`mini-analysis preview-${view.toLowerCase()}`}>
          <div className="mini-case-heading">
            <span>
              {view === "Processes"
                ? "FOLLOW THE RECORDED PARENTAGE"
                : view.toUpperCase()}
            </span>
            <span>
              {data.case.event_count} EVENTS / {data.findings.length} LEADS
            </span>
          </div>
          {view === "Processes" && (
            <div className="process-story-chain">
              {ancestry.map((entity, index) => {
                const event = data.events.find(
                  (e) => e.id === entity.details.event_id,
                );
                const flagged = data.findings.some((f) =>
                  f.event_ids.includes(String(entity.details.event_id)),
                );
                return (
                  <div className="process-story-step" key={entity.id}>
                    <span className="process-story-index">0{index + 1}</span>
                    <button
                      className={`${flagged ? "has-lead" : ""} ${event?.id === selected?.id ? "selected" : ""}`}
                      disabled={!event}
                      onClick={() => event && onSelect(event)}
                      aria-label={`Inspect ${event?.title || entity.label} in process preview`}
                    >
                      <FileTerminal size={21} strokeWidth={1} />
                      <span>
                        <strong>{entity.label}</strong>
                        <small>
                          PID {String(entity.details.pid)} /{" "}
                          {event && timeLabel(event.timestamp)} UTC
                        </small>
                      </span>
                      {flagged && <i />}
                    </button>
                    {index < ancestry.length - 1 && (
                      <span className="process-story-connector">
                        <i />
                        spawned
                      </span>
                    )}
                  </div>
                );
              })}
              <span className="process-story-source">
                EXPLICIT PARENT GUIDS / SYNTHETIC SOURCE RECORDS
              </span>
            </div>
          )}
          {view === "Timeline" && (
            <Timeline
              events={data.events}
              findings={data.findings}
              selected={selected?.id}
              onSelect={onSelect}
              start={data.start}
              end={data.end}
              compact
            />
          )}
          {view === "Relationships" && (
            <SpatialEvidence
              data={data}
              selected={selected?.id}
              onSelect={onSelect}
              variant="mini"
            />
          )}
          {view === "Overview" && (
            <div className="preview-overview">
              <h3>{data.case.name}</h3>
              <p>{data.case.description}</p>
              <div>
                <span>
                  <strong>{data.case.event_count}</strong>Normalized events
                </span>
                <span>
                  <strong>{data.findings.length}</strong>Investigative leads
                </span>
              </div>
              <DensityWave
                events={data.events}
                findings={data.findings}
                selected={selected?.id}
                onSelect={onSelect}
              />
            </div>
          )}
          {view === "Evidence" && (
            <div className="preview-source-record">
              <span>PARSED RECORD / #{selected?.record_ref}</span>
              <h3>{data.evidence[0]?.filename}</h3>
              <pre
                tabIndex={0}
                role="region"
                aria-label="Parsed evidence record"
              >
                {JSON.stringify(selected, null, 2)}
              </pre>
              <Link href="/workspace/evidence?demo=1">
                Inspect the original artifact <ArrowRight size={12} />
              </Link>
            </div>
          )}
          {view === "Findings" && (
            <div className="preview-findings">
              {data.findings.map((finding) => (
                <button
                  key={finding.id}
                  onClick={() => {
                    const event = data.events.find((e) =>
                      finding.event_ids.includes(e.id),
                    );
                    if (event) onSelect(event);
                  }}
                >
                  <span>
                    {finding.rule_id} / {finding.severity}
                  </span>
                  <strong>{finding.title}</strong>
                  <small>{finding.event_ids.length} supporting records</small>
                  <ArrowRight size={13} />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mini-inspector">
          <Fingerprint size={20} />
          <span className="eyebrow">SOURCE RECORD / PROCESS DETAILS</span>
          <h3>{selected?.title}</h3>
          <p className="mono">
            {selected && timeLabel(selected.timestamp, false, true)} UTC
          </p>
          <dl>
            {[
              ["Image", selected?.fields.image],
              ["Command line", selected?.fields.command_line],
              ["User", selected?.user],
              ["Host", selected?.host],
              ["Source record", selected && `#${selected.record_ref}`],
              ["Process identity", selected?.process_key],
            ]
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={String(label)}>
                  <dt>{String(label)}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
          </dl>
          <Link href={`/workspace/${target}?demo=1`}>
            Continue investigation <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
