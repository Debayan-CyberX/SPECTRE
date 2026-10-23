"use client";
import { useMemo } from "react";
import { ArrowUpRight, FileTerminal, Globe2, Layers2 } from "lucide-react";
import type { DemoData, ForensicEvent } from "@/lib/types";
import { timeLabel } from "@/lib/api";

export function HeroEvidence({
  data,
  selected,
  onSelect,
}: {
  data: DemoData;
  selected?: string;
  onSelect: (event: ForensicEvent) => void;
}) {
  const events = useMemo(() => {
    const primary = data.events.find((e) =>
      data.findings.some(
        (f) => f.rule_id === "SP-001" && f.event_ids.includes(e.id),
      ),
    );
    const registry = data.events.find((e) => e.category === "registry");
    const network = data.events.find((e) => e.category === "network");
    const ids = new Set([primary?.id, registry?.id, network?.id]);
    return [
      primary,
      registry,
      network,
      ...data.events.filter((e) => e.category === "process" && !ids.has(e.id)),
    ]
      .filter((e): e is ForensicEvent => !!e)
      .slice(0, 8);
  }, [data]);
  return (
    <div
      className="hero-record-projection spatial-hero"
      aria-label="Source records in the evidence environment"
    >
      <svg
        className="record-leaders"
        viewBox="0 0 1000 700"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M305 190L460 285L460 370" />
        <path d="M790 215L770 300L625 340" />
        <path d="M855 400Q855 480 705 495" />
        <circle cx="460" cy="370" r="4" />
        <circle cx="625" cy="340" r="3" />
        <circle cx="705" cy="495" r="3" />
      </svg>
      {events.map((event, i) => {
        const Icon =
          event.category === "network"
            ? Globe2
            : event.category === "registry"
              ? Layers2
              : FileTerminal;
        const name =
          event.category === "process"
            ? String(event.fields.image || event.title)
                .split("\\")
                .pop()
            : event.category === "network"
              ? "Outbound connection"
              : "Registry key modified";
        return (
          <button
            key={event.id}
            className={`spatial-node source-pin source-pin-${i} ${i === 0 ? "primary-source-pin" : ""} ${selected === event.id ? "active" : ""}`}
            onClick={() => onSelect(event)}
            aria-label={`Inspect ${event.title}`}
          >
            <Icon size={i === 0 ? 16 : 12} strokeWidth={1.2} />
            <span>
              <strong>{name}</strong>
              <small>
                {event.category === "process"
                  ? `PID ${event.fields.pid ?? "unknown"}`
                  : event.category === "network"
                    ? String(
                        event.fields.destination_ip ||
                          event.fields.destination ||
                          "Recorded endpoint",
                      )
                    : "Source-backed change"}
              </small>
              {i < 3 && <small>{timeLabel(event.timestamp)} UTC</small>}
            </span>
            {i === 0 && <ArrowUpRight size={11} />}
          </button>
        );
      })}
      <div className="evidence-layer-labels" aria-hidden="true">
        <span>PROCESSES</span>
        <span>REGISTRY</span>
        <span>FILES</span>
        <span>NETWORK</span>
      </div>
      <span className="evidence-stage-provenance">
        SYNTHETIC SOURCE RECORDS / ILLUSTRATIVE SPATIAL MATERIAL
      </span>
    </div>
  );
}
