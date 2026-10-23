"use client";
import { useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Minus,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import {
  getCoreRowModel,
  useReactTable,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "./ui/button";
import { Empty } from "./primitives";
import { timeLabel } from "@/lib/api";
import type { Density, Finding, ForensicEvent } from "@/lib/types";

const TRACKS = [
  "authentication",
  "process",
  "dns",
  "network",
  "file",
  "registry",
];
export const categoryColors: Record<string, string> = {
  authentication: "#a8a1df",
  process: "#59d8e8",
  dns: "#829ac3",
  network: "#63bf96",
  file: "#8e9bab",
  registry: "#e8a45a",
};
export function Timeline({
  events,
  findings,
  selected,
  onSelect,
  start,
  end,
  range,
  onRange,
  density,
  local = false,
  compact = false,
  immersive = false,
}: {
  events: ForensicEvent[];
  findings: Finding[];
  selected?: string;
  onSelect: (event: ForensicEvent) => void;
  start: string | null;
  end: string | null;
  range?: [number, number];
  onRange?: (range?: [number, number]) => void;
  density?: Density;
  local?: boolean;
  compact?: boolean;
  immersive?: boolean;
}) {
  const [preview, setPreview] = useState<[number, number]>();
  const [brush, setBrush] = useState<[number, number]>();
  const drag = useRef<{
    x: number;
    lo: number;
    hi: number;
    width: number;
    moved: boolean;
  } | null>(null);
  const brushDrag = useRef<number | null>(null);
  const fullStart = start ? Date.parse(start) : 0;
  const fullEnd = end ? Math.max(Date.parse(end), fullStart + 1000) : 1000;
  const [lo, hi] = preview || range || [fullStart, fullEnd];
  const span = Math.max(hi - lo, 1000);
  const flagged = new Set(
    findings.filter((f) => f.status !== "rejected").flatMap((f) => f.event_ids),
  );
  const chosen = events.find((e) => e.id === selected);
  const tracks = TRACKS.filter((track) =>
    events.some((e) => e.category === track),
  );
  function zoom(factor: number) {
    const center = chosen ? Date.parse(chosen.timestamp) : (lo + hi) / 2;
    const newSpan = Math.min(
      fullEnd - fullStart,
      Math.max(1000, span * factor),
    );
    const left = Math.max(
      fullStart,
      Math.min(center - newSpan / 2, fullEnd - newSpan),
    );
    onRange?.([left, left + newSpan]);
  }
  function pan(direction: number) {
    const left = Math.max(
      fullStart,
      Math.min(lo + direction * span * 0.5, fullEnd - span),
    );
    onRange?.([left, left + span]);
  }
  if (!start || !events.length)
    return (
      <Empty title="No events in this view">
        <p>Import supported evidence or adjust your filters.</p>
      </Empty>
    );
  return (
    <div
      className={`forensic-timeline ${compact ? "timeline-compact" : ""} ${immersive ? "timeline-immersive" : ""}`}
    >
      <div className="timeline-toolbar">
        <span>
          <SlidersHorizontal size={14} /> <strong>Activity timeline</strong>
          <span className="muted">{events.length} loaded events</span>
        </span>
        {onRange && (
          <div className="toolbar-actions">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Pan earlier"
              onClick={() => pan(-1)}
            >
              <ChevronLeft size={15} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Zoom out timeline"
              onClick={() => zoom(2)}
            >
              <Minus size={15} />
            </Button>
            <span className="mono muted">{Math.round(span / 1000)}s</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Zoom in timeline"
              onClick={() => zoom(0.5)}
            >
              <Plus size={15} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Pan later"
              onClick={() => pan(1)}
            >
              <ChevronRight size={15} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Reset time range"
              onClick={() => onRange(undefined)}
            >
              <RotateCcw size={14} />
            </Button>
          </div>
        )}
      </div>
      <div
        className={`timeline-plot ${preview ? "is-panning" : ""}`}
        onPointerDown={(event) => {
          if (
            !onRange ||
            (event.target as HTMLElement).closest("button") ||
            !event.isPrimary
          )
            return;
          const rect = event.currentTarget.getBoundingClientRect();
          drag.current = {
            x: event.clientX,
            lo,
            hi,
            width: Math.max(100, rect.width - 160),
            moved: false,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const d = drag.current;
          if (!d) return;
          const delta = ((event.clientX - d.x) / d.width) * (d.hi - d.lo);
          if (Math.abs(event.clientX - d.x) > 3) d.moved = true;
          const left = Math.max(
            fullStart,
            Math.min(d.lo - delta, fullEnd - (d.hi - d.lo)),
          );
          if (d.moved) setPreview([left, left + d.hi - d.lo]);
        }}
        onPointerUp={() => {
          if (drag.current?.moved && preview) onRange?.(preview);
          drag.current = null;
          setPreview(undefined);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setPreview(undefined);
        }}
      >
        <div className="timeline-ruler">
          <span className="track-heading">EVENT SOURCE</span>
          <div>
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} style={{ left: `${(i / 6) * 100}%` }}>
                {timeLabel(new Date(lo + (span * i) / 6).toISOString(), local)}
              </span>
            ))}
          </div>
        </div>
        {tracks.map((track) => {
          const groups = new Map<number, ForensicEvent[]>();
          events
            .filter((e) => e.category === track)
            .forEach((e) => {
              const pos = (Date.parse(e.timestamp) - lo) / span;
              if (pos < 0 || pos > 1) return;
              const bucket = Math.round(pos * 70);
              groups.set(bucket, [...(groups.get(bucket) || []), e]);
            });
          return (
            <div className="timeline-track" key={track}>
              <span className="track-label">
                <i style={{ background: categoryColors[track] }} />
                {track}
                <small>
                  {events.filter((e) => e.category === track).length}
                </small>
              </span>
              <div className="track-events">
                {Array.from({ length: 7 }, (_, i) => (
                  <i
                    key={i}
                    className="grid-rule"
                    style={{ left: `${(i / 6) * 100}%` }}
                  />
                ))}
                {[...groups].map(([bucket, group]) => {
                  const event =
                    group.find((e) => e.id === selected) || group[0];
                  const suspicious = group.some((e) => flagged.has(e.id));
                  return (
                    <button
                      key={bucket}
                      aria-label={`${event.title} at ${timeLabel(event.timestamp)}${group.length > 1 ? `, ${group.length} grouped events; zoom in to separate` : ""}`}
                      title={`${timeLabel(event.timestamp, local, true)} · ${event.title}`}
                      className={`timeline-event ${event.id === selected ? "selected" : ""} ${suspicious ? "flagged" : ""}`}
                      style={
                        {
                          left: `${((Date.parse(event.timestamp) - lo) / span) * 100}%`,
                          "--event-color": categoryColors[track],
                        } as React.CSSProperties
                      }
                      onClick={() => {
                        onSelect(event);
                        if (group.length > 1 && onRange) {
                          const center = Date.parse(event.timestamp);
                          onRange([
                            Math.max(fullStart, center - span / 8),
                            Math.min(fullEnd, center + span / 8),
                          ]);
                        }
                      }}
                      onKeyDown={(keyEvent) => {
                        if (
                          keyEvent.key !== "ArrowRight" &&
                          keyEvent.key !== "ArrowLeft"
                        )
                          return;
                        keyEvent.preventDefault();
                        const index = events.findIndex(
                          (e) => e.id === (selected || event.id),
                        );
                        const next =
                          events[
                            Math.max(
                              0,
                              Math.min(
                                events.length - 1,
                                index +
                                  (keyEvent.key === "ArrowRight" ? 1 : -1),
                              ),
                            )
                          ];
                        onSelect(next);
                      }}
                    >
                      {group.length > 1 ? group.length : <span />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {chosen &&
          Date.parse(chosen.timestamp) >= lo &&
          Date.parse(chosen.timestamp) <= hi && (
            <div
              className="timeline-playhead"
              style={{
                left: `calc(132px + (100% - 160px) * ${(Date.parse(chosen.timestamp) - lo) / span})`,
              }}
            >
              <span>{timeLabel(chosen.timestamp, local, true)}</span>
            </div>
          )}
      </div>
      <div className="density-strip">
        <span>
          <Crosshair size={12} /> CASE DENSITY
        </span>
        <div className="density-bars" aria-label="Case event density">
          {(
            density?.bins ||
            Array.from({ length: 48 }, (_, i) => {
              const a = fullStart + ((fullEnd - fullStart) * i) / 48;
              return {
                timestamp: new Date(a).toISOString(),
                count: events.filter(
                  (e) =>
                    Date.parse(e.timestamp) >= a &&
                    Date.parse(e.timestamp) <
                      a + (fullEnd - fullStart) / 48 + 1,
                ).length,
              };
            })
          ).map((bin, i, all) => (
            <button
              key={i}
              tabIndex={-1}
              aria-label={`${bin.count} events near ${timeLabel(bin.timestamp)}`}
              title={`${bin.count} events · ${timeLabel(bin.timestamp)}`}
              onClick={() => {
                const center = Date.parse(bin.timestamp);
                const width = (fullEnd - fullStart) / 6;
                onRange?.([
                  Math.max(fullStart, center - width / 2),
                  Math.min(fullEnd, center + width / 2),
                ]);
              }}
            >
              <i
                style={{
                  height: `${Math.max(2, (bin.count / Math.max(...all.map((b) => b.count), 1)) * 22)}px`,
                }}
              />
            </button>
          ))}
        </div>
        <span className="mono">{local ? "LOCAL" : "UTC"}</span>
      </div>
      {onRange && !compact && (
        <div className="time-range-brush">
          <div>
            <span>INVESTIGATIVE WINDOW</span>
            <span>
              {timeLabel(new Date(lo).toISOString(), local)} —{" "}
              {timeLabel(new Date(hi).toISOString(), local)} /{" "}
              {local ? "LOCAL" : "UTC"}
            </span>
          </div>
          <div
            className="brush-track"
            role="group"
            aria-label="Drag to select a time range"
            onPointerDown={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const value = Math.max(
                0,
                Math.min(1, (event.clientX - rect.left) / rect.width),
              );
              brushDrag.current = value;
              setBrush([value, value]);
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (brushDrag.current === null) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const v = Math.max(
                0,
                Math.min(1, (event.clientX - rect.left) / rect.width),
              );
              setBrush([
                Math.min(brushDrag.current, v),
                Math.max(brushDrag.current, v),
              ]);
            }}
            onPointerUp={() => {
              if (brush && brush[1] - brush[0] > 0.005) {
                const left = Math.min(
                  fullEnd - 1000,
                  fullStart + brush[0] * (fullEnd - fullStart),
                );
                onRange([
                  left,
                  Math.max(
                    left + 1000,
                    fullStart + brush[1] * (fullEnd - fullStart),
                  ),
                ]);
              }
              brushDrag.current = null;
              setBrush(undefined);
            }}
            onPointerCancel={() => {
              brushDrag.current = null;
              setBrush(undefined);
            }}
          >
            <span className="brush-background" aria-hidden="true" />
            <span
              className="brush-selected"
              style={{
                left: `${(brush?.[0] ?? (lo - fullStart) / (fullEnd - fullStart)) * 100}%`,
                width: `${(brush ? brush[1] - brush[0] : (hi - lo) / (fullEnd - fullStart)) * 100}%`,
              }}
            >
              <i />
              <i />
            </span>
          </div>
          <div className="brush-accessible-controls">
            <label>
              Window start
              <input
                aria-label="Time window start"
                type="range"
                min={fullStart}
                max={fullEnd - 1000}
                step={1}
                value={lo}
                onChange={(e) =>
                  onRange([Math.min(Number(e.target.value), hi - 1000), hi])
                }
              />
            </label>
            <label>
              Window end
              <input
                aria-label="Time window end"
                type="range"
                min={fullStart + 1000}
                max={fullEnd}
                step={1}
                value={hi}
                onChange={(e) =>
                  onRange([lo, Math.max(Number(e.target.value), lo + 1000)])
                }
              />
            </label>
          </div>
          <p>
            Drag the tracks to pan · Brush a time range · Arrow keys follow
            source events
          </p>
        </div>
      )}
    </div>
  );
}

export function EventTable({
  events,
  findings,
  selected,
  onSelect,
  local = false,
}: {
  events: ForensicEvent[];
  findings: Finding[];
  selected?: string;
  onSelect: (event: ForensicEvent) => void;
  local?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const flagged = useMemo(
    () =>
      new Set(
        findings
          .filter((f) => f.status !== "rejected")
          .flatMap((f) => f.event_ids),
      ),
    [findings],
  );
  const columns = useMemo<ColumnDef<ForensicEvent>[]>(
    () => [
      {
        id: "priority",
        header: "",
        size: 30,
        cell: ({ row }) => (
          <i
            className={`priority-dot ${flagged.has(row.original.id) ? "priority-high" : ""}`}
          />
        ),
      },
      {
        accessorKey: "timestamp",
        header: local ? "LOCAL TIME" : "TIMESTAMP / UTC",
        size: 145,
        cell: ({ row }) => (
          <span className="mono">
            {timeLabel(row.original.timestamp, local, true)}
          </span>
        ),
      },
      {
        accessorKey: "title",
        header: "EVENT",
        size: 330,
        cell: ({ row }) => (
          <button
            className="event-title-button"
            onClick={() => onSelect(row.original)}
          >
            {row.original.title}
          </button>
        ),
      },
      {
        accessorKey: "category",
        header: "SOURCE",
        size: 125,
        cell: ({ row }) => (
          <span className="source-label">
            <i style={{ background: categoryColors[row.original.category] }} />
            {row.original.category}
          </span>
        ),
      },
      {
        accessorKey: "host",
        header: "HOST",
        size: 145,
        cell: ({ row }) => (
          <span className="mono muted">{row.original.host}</span>
        ),
      },
      {
        id: "ref",
        header: "RECORD",
        size: 90,
        cell: ({ row }) => (
          <span className="mono muted">#{row.original.record_ref}</span>
        ),
      },
    ],
    [flagged, local, onSelect],
  );
  // TanStack Table owns mutable accessors; keep it outside React Compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: events,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  const rows = table.getRowModel().rows;
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => ref.current,
    estimateSize: () => 43,
    overscan: 12,
  });
  return (
    <div className="event-table-scroll" ref={ref}>
      <table className="event-table">
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th
                  key={header.id}
                  style={{
                    width: header.getSize(),
                    flex: header.id === "title" ? 1 : undefined,
                  }}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody style={{ height: virtual.getTotalSize() }}>
          {virtual.getVirtualItems().map((item) => {
            const row = rows[item.index];
            return (
              <tr
                key={row.id}
                className={row.original.id === selected ? "selected" : ""}
                style={{
                  transform: `translateY(${item.start}px)`,
                  height: item.size,
                }}
                onClick={() => onSelect(row.original)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{
                      width: cell.column.getSize(),
                      flex: cell.column.id === "title" ? 1 : undefined,
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
