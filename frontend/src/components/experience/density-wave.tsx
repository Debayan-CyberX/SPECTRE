"use client";
import { useId, useMemo } from "react";
import { timeLabel } from "@/lib/api";
import type { ForensicEvent, Finding, Density } from "@/lib/types";

export function DensityWave({
  events,
  findings,
  selected,
  onSelect,
  density,
  className = "",
}: {
  events: ForensicEvent[];
  findings: Finding[];
  selected?: string;
  onSelect: (event: ForensicEvent) => void;
  density?: Density;
  className?: string;
}) {
  const gradientId = useId();
  const model = useMemo(() => {
    const times = events.map((e) => Date.parse(e.timestamp));
    const lo = density?.start ? Date.parse(density.start) : Math.min(...times);
    const hi = density?.end ? Date.parse(density.end) : Math.max(...times);
    const span = Math.max(hi - lo, 1000);
    const counts =
      density?.bins.map((b) => b.count) ||
      Array.from(
        { length: 96 },
        (_, i) =>
          events.filter((e) => {
            const x = (Date.parse(e.timestamp) - lo) / span;
            return x >= i / 96 && (i === 95 ? x <= 1 : x < (i + 1) / 96);
          }).length,
      );
    return { lo, hi, span, counts, max: Math.max(...counts, 1) };
  }, [events, density]);
  if (!events.length)
    return (
      <div className={`density-wave empty-wave ${className}`}>
        <p>No events in the loaded time range.</p>
      </div>
    );
  const flagged = new Set(
    findings.filter((f) => f.status !== "rejected").flatMap((f) => f.event_ids),
  );
  const lanes: number[] = [];
  const markers = events
    .filter((e) => flagged.has(e.id))
    .map((event) => {
      const position = Math.min(
        92,
        Math.max(
          8,
          ((Date.parse(event.timestamp) - model.lo) / model.span) * 100,
        ),
      );
      let lane = lanes.findIndex((previous) => position - previous > 18);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = position;
      return { event, position, lane };
    });
  return (
    <div className={`density-wave ${className}`}>
      <div className="wave-label">
        <span>
          EVENT DENSITY / {density ? "ALL CASE EVENTS" : "LOADED RECORDS"}
        </span>
        <span>
          {timeLabel(new Date(model.lo).toISOString())} —{" "}
          {timeLabel(new Date(model.hi).toISOString())} UTC
        </span>
      </div>
      <svg viewBox="0 0 1000 210" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            x2="0"
            y1="35"
            y2="179"
          >
            <stop offset="0" stopColor="var(--wave-high, #adf8f4)" />
            <stop
              offset="1"
              stopColor="var(--wave-low, #397b91)"
              stopOpacity=".3"
            />
          </linearGradient>
        </defs>
        {[30, 80, 130, 180].map((y) => (
          <path
            key={y}
            d={`M0 ${y}H1000`}
            stroke="var(--wave-grid, #233846)"
            strokeWidth=".5"
            strokeDasharray="2 8"
          />
        ))}
        {model.counts.map((count, i) => {
          const x = ((i + 0.5) / model.counts.length) * 1000,
            height = (count / model.max) * 142;
          return (
            <g key={i}>
              <path
                d={`M${x} 177V${177 - Math.max(2, height)}`}
                stroke={`url(#${gradientId})`}
                strokeWidth={model.counts.length > 80 ? 2 : 3}
              />
              {count > 0 && (
                <circle
                  cx={x}
                  cy={177 - height}
                  r="1.5"
                  fill="var(--wave-high, #bdf5f1)"
                />
              )}
            </g>
          );
        })}
        <path
          d="M0 179H1000"
          stroke="var(--wave-baseline, #5f9caa)"
          strokeWidth=".8"
        />
      </svg>
      <div className="wave-markers">
        {markers.map(({ event, position, lane }, i) => (
          <button
            key={event.id}
            className={`${selected === event.id ? "selected" : ""} wave-marker-${i % 3}`}
            style={{
              left: `${position}%`,
              top: `${lane * 60}px`,
            }}
            onClick={() => onSelect(event)}
            aria-label={`Inspect ${event.title} on density waveform`}
          >
            <i />
            <span className="mono">{timeLabel(event.timestamp)}</span>
            <strong>{event.title}</strong>
          </button>
        ))}
      </div>
      <div className="wave-axis">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i}>
            {timeLabel(new Date(model.lo + (model.span * i) / 6).toISOString())}
          </span>
        ))}
      </div>
    </div>
  );
}
