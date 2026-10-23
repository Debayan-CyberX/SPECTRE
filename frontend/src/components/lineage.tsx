"use client";
import { CornerDownRight, FileTerminal, Globe2, GitBranch } from "lucide-react";
import { motion } from "motion/react";
import type { ForensicEvent, Finding } from "@/lib/types";
import { timeLabel } from "@/lib/api";
export function Lineage({
  events,
  findings,
  selected,
  onSelect,
}: {
  events: ForensicEvent[];
  findings: Finding[];
  selected?: string;
  onSelect: (e: ForensicEvent) => void;
}) {
  const processes = events.filter((e) => e.category === "process");
  const flagged = new Set(findings.flatMap((f) => f.event_ids));
  const positions = new Map<string, { x: number; y: number }>();
  const levels = new Map<number, number>();
  function depth(e: ForensicEvent, visited = new Set<string>()): number {
    if (!e.parent_key || visited.has(e.id)) return 0;
    visited.add(e.id);
    const parent = processes.find((p) => p.process_key === e.parent_key);
    return parent ? Math.min(5, 1 + depth(parent, visited)) : 0;
  }
  processes.forEach((e) => {
    const d = depth(e);
    const lane = levels.get(d) || 0;
    positions.set(e.id, { x: 28 + d * 183, y: 105 + lane * 112 });
    levels.set(d, lane + 1);
  });
  const width = Math.max(780, ...[...positions.values()].map((p) => p.x + 170));
  const height = Math.max(
    310,
    ...[...positions.values()].map((p) => p.y + 100),
  );
  return (
    <div className="lineage-scroll">
      <div className="lineage-canvas" style={{ width, height }}>
        <div className="lineage-caption">
          <GitBranch size={13} />
          <span>PROCESS LINEAGE</span>
          <span className="mono">{processes.length} observed processes</span>
        </div>
        <svg
          className="lineage-paths"
          width={width}
          height={height}
          aria-hidden="true"
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M0 0 10 5 0 10" fill="none" stroke="currentColor" />
            </marker>
          </defs>
          {processes.map((e) => {
            const parent = processes.find(
              (p) => p.process_key === e.parent_key,
            );
            if (!parent) return null;
            const a = positions.get(parent.id)!;
            const b = positions.get(e.id)!;
            const active = e.id === selected || parent.id === selected;
            return (
              <path
                key={e.id}
                d={`M${a.x + 155},${a.y + 28} C${a.x + 174},${a.y + 28} ${b.x - 20},${b.y + 28} ${b.x},${b.y + 28}`}
                stroke={active ? "#59d8e8" : "#394652"}
                strokeWidth={active ? 1.5 : 1}
                fill="none"
                markerEnd="url(#arrow)"
              />
            );
          })}
        </svg>
        {processes.map((e) => {
          const p = positions.get(e.id)!;
          const active =
            e.id === selected ||
            (selected &&
              events.find((x) => x.id === selected)?.process_key ===
                e.process_key);
          return (
            <motion.button
              key={e.id}
              className={`lineage-node ${active ? "active" : ""} ${flagged.has(e.id) ? "has-finding" : ""}`}
              style={{ left: p.x, top: p.y }}
              onClick={() => onSelect(e)}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.15 }}
              aria-label={`Inspect ${e.title}`}
            >
              <span className="lineage-node-top">
                <FileTerminal size={13} />
                <span className="mono">PID {e.fields.pid}</span>
                {flagged.has(e.id) && <i />}
              </span>
              <strong>
                {String(e.fields.image || "")
                  .replaceAll("\\", "/")
                  .split("/")
                  .pop()}
              </strong>
              <span className="mono lineage-node-time">
                {timeLabel(e.timestamp)} <CornerDownRight size={10} />
              </span>
            </motion.button>
          );
        })}
        <div className="lineage-footnote">
          <Globe2 size={12} />
          <span>
            Relationships follow recorded process GUIDs. Missing ancestry stays
            unresolved.
          </span>
        </div>
      </div>
    </div>
  );
}
