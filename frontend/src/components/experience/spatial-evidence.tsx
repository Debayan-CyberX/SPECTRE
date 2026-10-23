"use client";
import { useMemo } from "react";
import {
  FileJson2,
  FileTerminal,
  Globe2,
  Monitor,
  UserRound,
  Fingerprint,
} from "lucide-react";
import type { DemoData, Entity, ForensicEvent } from "@/lib/types";
import { timeLabel } from "@/lib/api";
const icons: Record<string, typeof Monitor> = {
  process: FileTerminal,
  host: Monitor,
  identity: UserRound,
  endpoint: Globe2,
  file: FileJson2,
  evidence: Fingerprint,
};
export function SpatialEvidence({
  data,
  selected,
  onSelect,
  variant = "constellation",
}: {
  data: DemoData;
  selected?: string;
  onSelect: (event: ForensicEvent) => void;
  variant?: "hero" | "constellation" | "mini";
}) {
  const { nodes, edges } = useMemo(() => {
    const priority = new Set(
      data.findings
        .filter((f) => f.status !== "rejected")
        .flatMap((f) => f.event_ids),
    );
    const processes = data.entities.filter((e) => e.kind === "process");
    const center =
      processes.find((e) =>
        data.findings.some(
          (f) =>
            f.rule_id === "SP-001" &&
            f.event_ids.includes(String(e.details.event_id)),
        ),
      ) || processes[0];
    const neighbors = new Set(
      data.relationships
        .filter((r) => r.source_id === center?.id || r.target_id === center?.id)
        .flatMap((r) => [r.source_id, r.target_id]),
    );
    const candidates = data.entities.filter(
      (e) => e.id === center?.id || neighbors.has(e.id) || e.kind === "process",
    );
    const chosen = [center, ...candidates.filter((e) => e.id !== center?.id)]
      .filter((e): e is Entity => !!e)
      .slice(0, variant === "hero" ? 8 : 11);
    const nodes = chosen.map((entity, i) => {
      const event =
        data.events.find((e) => e.id === entity.details.event_id) ||
        data.events.find((e) =>
          data.relationships.some(
            (r) =>
              (r.source_id === entity.id || r.target_id === entity.id) &&
              r.event_id === e.id,
          ),
        );
      const angle =
        ((i - 1) / Math.max(1, chosen.length - 1)) * Math.PI * 2 -
        Math.PI * 0.8;
      return {
        entity,
        event,
        x: i === 0 ? 52 : 52 + Math.cos(angle) * 35,
        y: i === 0 ? 48 : 48 + Math.sin(angle) * 34,
        flagged: !!event && priority.has(event.id),
      };
    });
    const ids = new Set(nodes.map((n) => n.entity.id));
    const unique = new Map<string, (typeof data.relationships)[number]>();
    data.relationships
      .filter((r) => ids.has(r.source_id) && ids.has(r.target_id))
      .forEach((r) => unique.set(`${r.source_id}:${r.target_id}:${r.kind}`, r));
    return { nodes, edges: [...unique.values()] };
  }, [data, variant]);
  const active = nodes.find((n) => n.event?.id === selected) || nodes[0];
  return (
    <div
      className={`spatial-evidence spatial-${variant}`}
      aria-label="Evidence relationship constellation"
    >
      <div className="spatial-registration" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <svg
        viewBox="0 0 1000 640"
        preserveAspectRatio="none"
        className="spatial-lines"
        aria-hidden="true"
      >
        {edges.map((edge) => {
          const a = nodes.find((n) => n.entity.id === edge.source_id)!,
            b = nodes.find((n) => n.entity.id === edge.target_id)!;
          const lit =
            edge.source_id === active?.entity.id ||
            edge.target_id === active?.entity.id;
          return (
            <g key={edge.id} className={lit ? "lit" : ""}>
              <path
                d={`M${a.x * 10} ${a.y * 6.4} Q${(a.x + b.x) * 5 + 25} ${(a.y + b.y) * 3.2 - 28} ${b.x * 10} ${b.y * 6.4}`}
                stroke={lit && (a.flagged || b.flagged) ? "#b7707f" : "#75aebc"}
              />
              <circle
                cx={(a.x + b.x) * 5 + 12}
                cy={(a.y + b.y) * 3.2 - 14}
                r="2"
                fill={lit ? "#a6e8e8" : "#406b7b"}
              />
            </g>
          );
        })}
      </svg>
      {nodes.map(({ entity, event, x, y, flagged }, i) => {
        const Icon = icons[entity.kind] || FileJson2;
        return (
          <button
            key={entity.id}
            className={`spatial-node node-${entity.kind} ${i === 0 ? "center-node" : ""} ${entity.id === active?.entity.id ? "active" : ""} ${flagged ? "lead-node" : ""}`}
            style={
              {
                left: `${x}%`,
                top: `${y}%`,
                "--node-delay": `${i * 0.08}s`,
              } as React.CSSProperties
            }
            aria-label={
              event ? `Inspect ${event.title}` : `Inspect ${entity.label}`
            }
            onClick={() => {
              if (event) onSelect(event);
            }}
          >
            <span className="spatial-node-icon">
              <Icon size={i === 0 ? 24 : 15} strokeWidth={1.25} />
            </span>
            <span>
              <strong>{entity.label}</strong>
              <small>
                {entity.kind === "process"
                  ? `PID ${entity.details.pid} / ${entity.details.timestamp ? timeLabel(String(entity.details.timestamp)) : "unknown time"}`
                  : entity.kind === "endpoint"
                    ? "Observed connection"
                    : entity.kind === "host"
                      ? "Observed endpoint"
                      : entity.kind.replace("identity", "Account")}
              </small>
            </span>
            {flagged && <i className="node-lead-indicator" />}
          </button>
        );
      })}
      <div className="spatial-caption">
        <span>EXPLICIT RELATIONSHIPS</span>
        <span>
          {nodes.length} entities / {edges.length} documented links
        </span>
      </div>
    </div>
  );
}
