"use client";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Clock3,
  Copy,
  FileJson2,
  Fingerprint,
  GitBranch,
  HardDrive,
  ShieldCheck,
} from "lucide-react";
import type { Density, ForensicEvent, WorkspaceData } from "@/lib/types";
import { shortId, timeLabel } from "@/lib/api";
import { Badge } from "./primitives";
import { Button } from "./ui/button";
import { DensityWave } from "./experience/density-wave";
import { Timeline } from "./timeline";
import { LiquidGlass } from "./experience/liquid-glass";

export function OverviewCommand({
  data,
  events,
  density,
  selected,
  onSelect,
  local,
  demo,
  paused,
  onStatus,
  onNavigate,
  onFinding,
  onEvidence,
}: {
  data: WorkspaceData;
  events: ForensicEvent[];
  density?: Density;
  selected?: string;
  onSelect: (event: ForensicEvent) => void;
  local: boolean;
  demo: boolean;
  paused: boolean;
  onStatus: (status: string) => void;
  onNavigate: (view: string) => void;
  onFinding: (id: string) => void;
  onEvidence: (id: string) => void;
}) {
  const pending = data.findings.filter((f) => f.status === "unreviewed");
  const titleParts = data.case.name.match(/^(.*\s)(\S+)$/s);
  const metrics = [
    {
      label: "Normalized events",
      value: data.case.event_count,
      icon: Activity,
      detail: `${data.hosts.length} observed host${data.hosts.length !== 1 ? "s" : ""}`,
    },
    {
      label: "Process records",
      value: data.categories.process || 0,
      icon: GitBranch,
      detail: "Recorded execution",
    },
    {
      label: "Original artifacts",
      value: data.evidence.length,
      icon: HardDrive,
      detail: `${data.evidence.filter((e) => e.status === "ready").length} processed`,
    },
    {
      label: "Findings to review",
      value: pending.length,
      icon: Fingerprint,
      detail: "Analyst review required",
    },
  ];
  return (
    <div className="command-center">
      <div className="command-center-main">
        <div className="view-heading overview-heading">
          <div>
            <div className="case-eyebrow">
              <span className="eyebrow">
                ACTIVE INVESTIGATION / SP-{shortId(data.case.id)}
              </span>
              {demo ? (
                <Badge tone="cyan">
                  {data.case.status.replaceAll("_", " ")}
                </Badge>
              ) : (
                <select
                  aria-label="Investigation status"
                  className="case-status-select"
                  value={data.case.status}
                  onChange={(e) => onStatus(e.target.value)}
                >
                  <option value="open">Open</option>
                  <option value="in_review">In review</option>
                  <option value="closed">Closed</option>
                </select>
              )}
            </div>
            <h1>
              {titleParts ? (
                <>
                  {titleParts[1]}
                  <em>{titleParts[2]}</em>
                </>
              ) : (
                data.case.name
              )}
            </h1>
            <p>
              {data.case.description ||
                "No description added to this investigation."}
            </p>
            <div className="case-context-tags">
              <span>
                <ShieldCheck size={11} />
                {data.case.is_demo
                  ? "Synthetic exercise"
                  : "Private investigation"}
              </span>
              <span>
                <Clock3 size={11} />
                {data.start?.slice(0, 10) || "Awaiting evidence"}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(data.case.id)}
              >
                <Copy size={10} />
                Case ID
              </button>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onNavigate("reports")}
          >
            <BookOpen size={13} />
            Case report
          </Button>
        </div>
        <div className="intelligence-metrics">
          {metrics.map((metric) => (
            <LiquidGlass
              className="glass-metric"
              key={metric.label}
              paused={paused}
            >
              <span>
                <metric.icon size={13} />
                {metric.label}
              </span>
              <strong>{metric.value.toLocaleString()}</strong>
              <small>{metric.detail}</small>
            </LiquidGlass>
          ))}
        </div>
        <section className="overview-density">
          <div className="overview-section-heading">
            <div>
              <h2>
                Event <em>horizon.</em>
              </h2>
              <span>A chronological field of view.</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("timeline")}
            >
              Explore timeline <ArrowRight size={12} />
            </Button>
          </div>
          <DensityWave
            events={events}
            density={density}
            findings={data.findings}
            selected={selected}
            onSelect={onSelect}
          />
        </section>
        <section className="overview-reconstruction">
          <div className="overview-section-heading">
            <div>
              <h2>Reconstruct the sequence</h2>
              <span>{events.length} loaded records</span>
            </div>
            <Badge tone="cyan">SOURCE-LINKED</Badge>
          </div>
          <Timeline
            events={events}
            findings={data.findings}
            selected={selected}
            onSelect={onSelect}
            start={data.start}
            end={data.end}
            density={density}
            local={local}
            compact
          />
          <div className="panel-footer">
            <span>All relationships require recorded evidence.</span>
            <span>
              {data.case.event_count > events.length
                ? `${events.length} of ${data.case.event_count} events loaded`
                : "All case events loaded"}
            </span>
          </div>
        </section>
      </div>
      <aside className="case-context-rail" aria-label="Investigation context">
        <section>
          <span className="rail-section-number">
            01 / INVESTIGATIVE ATTENTION
          </span>
          <div className="section-heading">
            <Fingerprint size={14} />
            <h3>Findings to review</h3>
            <span>{pending.length}</span>
          </div>
          {pending.slice(0, 6).map((f) => (
            <button
              className="context-finding"
              key={f.id}
              onClick={() => onFinding(f.id)}
            >
              <div>
                <Badge tone={f.severity}>{f.severity}</Badge>
                <span className="mono">{f.rule_id}</span>
              </div>
              <strong>{f.title}</strong>
              <span>
                {f.event_ids.length} evidence reference
                {f.event_ids.length !== 1 ? "s" : ""}
                <ArrowRight size={11} />
              </span>
            </button>
          ))}
          {!pending.length && (
            <p className="quiet-empty">No findings awaiting review.</p>
          )}
        </section>
        <section>
          <span className="rail-section-number">02 / SOURCE MATERIAL</span>
          <div className="section-heading">
            <FileJson2 size={14} />
            <h3>Evidence activity</h3>
          </div>
          {data.evidence.slice(0, 5).map((e) => (
            <button
              className="context-evidence"
              key={e.id}
              onClick={() => onEvidence(e.id)}
            >
              <span className="context-evidence-glyph">
                <FileJson2 size={16} />
              </span>
              <span>
                <strong>{e.filename}</strong>
                <small>
                  {e.record_count} events / {e.status}
                </small>
                <span className="mono">{timeLabel(e.created_at)} UTC</span>
              </span>
              <i
                className={e.status === "ready" ? "ready-dot" : "failed-dot"}
              />
            </button>
          ))}
          {!data.evidence.length && (
            <p className="quiet-empty">No imported evidence.</p>
          )}
        </section>
        <section>
          <span className="rail-section-number">03 / ANALYST CONTEXT</span>
          <div className="section-heading">
            <BookOpen size={14} />
            <h3>Case notes</h3>
            <span>{data.annotations.length}</span>
          </div>
          {data.annotations
            .slice(-3)
            .reverse()
            .map((a) => (
              <button
                className="context-note"
                key={a.id}
                onClick={() => {
                  const event = events.find((e) => e.id === a.event_id);
                  if (event) onSelect(event);
                }}
              >
                <span>{a.text}</span>
                <small>
                  {a.created_at.slice(0, 10)} ·{" "}
                  {a.bookmarked ? "Bookmarked" : "Observation"}
                </small>
              </button>
            ))}
          {!data.annotations.length && (
            <p className="quiet-empty">
              Select an event to add an observation or bookmark.
            </p>
          )}
        </section>
        <div className="rail-integrity">
          <ShieldCheck size={15} />
          <span>
            Every lead has a source.
            <br />
            Every conclusion needs review.
          </span>
        </div>
      </aside>
    </div>
  );
}
