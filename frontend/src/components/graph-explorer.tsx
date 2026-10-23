"use client";
import { useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Node,
  type NodeProps,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Crosshair,
  FileJson2,
  FileTerminal,
  Focus,
  Globe2,
  HardDrive,
  Maximize2,
  Monitor,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { Entity, Finding, ForensicEvent, GraphData } from "@/lib/types";
import { Badge, Empty } from "./primitives";
import { Button } from "./ui/button";
import { shortId, timeLabel } from "@/lib/api";

type EntityNodeData = {
  entity: Entity;
  count: number;
  linked: boolean;
  collapsed: boolean;
  hasChildren: boolean;
  toggle: () => void;
};
type EntityNode = Node<EntityNodeData, "entity">;
const icons: Record<string, typeof Monitor> = {
  process: FileTerminal,
  host: Monitor,
  identity: UserRound,
  endpoint: Globe2,
  file: HardDrive,
  evidence: FileJson2,
};
const colors: Record<string, string> = {
  process: "#8bbad1",
  host: "#85b8d3",
  identity: "#aba3df",
  endpoint: "#75c4cf",
  file: "#9faab6",
  evidence: "#88c6af",
};
function EvidenceNode({ data, selected }: NodeProps<EntityNode>) {
  const Icon = icons[data.entity.kind] || FileJson2,
    entity = data.entity;
  return (
    <div
      className={`graph-entity ${selected || data.linked ? "highlighted" : ""} ${data.count ? "graph-has-lead" : ""} graph-entity-${entity.kind}`}
      style={
        {
          "--entity-color": colors[entity.kind] || "#8bbad1",
        } as React.CSSProperties
      }
    >
      <Handle type="target" position={Position.Left} />
      <div className="graph-node-top">
        <span className="entity-emblem">
          <Icon size={18} strokeWidth={1.3} />
        </span>
        <div>
          <span>{entity.kind}</span>
          <strong title={entity.label}>{entity.label}</strong>
        </div>
        {data.count > 0 && (
          <i
            title={`${data.count} investigative leads`}
            className="graph-lead-dot"
          />
        )}
      </div>
      {entity.kind === "process" ? (
        <>
          <div className="graph-node-meta">
            <span>PID {entity.details.pid ?? "?"}</span>
            <span>{String(entity.details.host)}</span>
          </div>
          <div className="graph-node-time">
            <span>
              {entity.details.timestamp
                ? timeLabel(String(entity.details.timestamp))
                : "Unknown start"}{" "}
              UTC
            </span>
            {entity.details.ancestry === "unresolved" ? (
              <span className="unresolved-ancestry">Parent unresolved</span>
            ) : (
              <span>
                {data.count ? `${data.count} rule matches` : "Recorded process"}
              </span>
            )}
          </div>
        </>
      ) : (
        <span className="graph-node-key">
          {entity.kind === "evidence"
            ? "Preserved original artifact"
            : entity.key}
        </span>
      )}
      {data.hasChildren && (
        <button
          className="graph-collapse nodrag nopan"
          aria-label={`${data.collapsed ? "Expand" : "Collapse"} children of ${entity.label}`}
          onClick={(e) => {
            e.stopPropagation();
            data.toggle();
          }}
        >
          {data.collapsed ? (
            <ChevronRight size={11} />
          ) : (
            <ChevronDown size={11} />
          )}
          {data.collapsed ? "Expand descendants" : "Collapse descendants"}
        </button>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { entity: EvidenceNode };
export default function GraphExplorer({
  data,
  processesOnly,
  findings,
  onEvent,
  selectedEvent,
}: {
  data: GraphData;
  processesOnly: boolean;
  findings: Finding[];
  onEvent: (id: string) => void;
  selectedEvent?: ForensicEvent;
}) {
  const [q, setQ] = useState(""),
    [host, setHost] = useState(""),
    [kind, setKind] = useState(""),
    [relation, setRelation] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set()),
    [active, setActive] = useState<string>(),
    [edgeId, setEdgeId] = useState<string>();
  const [focused, setFocused] = useState(false);
  const instance = useRef<ReactFlowInstance<EntityNode, Edge> | null>(null);
  const reduce = useReducedMotion();
  const { nodes, edges } = useMemo(() => {
    if (!data) return { nodes: [], edges: [] };
    let entities = data.entities.filter(
      (e) =>
        (!processesOnly || e.kind === "process") &&
        (!host || e.kind !== "process" || e.details.host === host) &&
        (!kind || e.kind === kind),
    );
    const childEdges = data.relationships.filter((r) => r.kind === "spawned"),
      hidden = new Set<string>();
    function hide(id: string, visited = new Set<string>()) {
      if (visited.has(id)) return;
      visited.add(id);
      childEdges
        .filter((e) => e.source_id === id)
        .forEach((e) => {
          hidden.add(e.target_id);
          hide(e.target_id, visited);
        });
    }
    collapsed.forEach((id) => hide(id));
    entities = entities.filter((e) => !hidden.has(e.id));
    const linked = new Set<string>();
    function walk(
      id: string,
      direction: "source_id" | "target_id",
      visited = new Set<string>(),
    ) {
      if (visited.has(id)) return;
      visited.add(id);
      linked.add(id);
      childEdges
        .filter((e) => e[direction] === id)
        .forEach((e) =>
          walk(
            e[direction === "source_id" ? "target_id" : "source_id"],
            direction,
            visited,
          ),
        );
    }
    if (active) {
      walk(active, "source_id");
      walk(active, "target_id");
      if (!processesOnly)
        data.relationships
          .filter((r) => r.source_id === active || r.target_id === active)
          .forEach((r) => {
            linked.add(r.source_id);
            linked.add(r.target_id);
          });
    }
    if (focused && active) entities = entities.filter((e) => linked.has(e.id));
    const ids = new Set(entities.map((e) => e.id)),
      rows = new Map<number, number>();
    function depth(entity: Entity, visited = new Set<string>()): number {
      if (visited.has(entity.id)) return 0;
      visited.add(entity.id);
      const parent = entities.find(
        (e) =>
          e.id === childEdges.find((r) => r.target_id === entity.id)?.source_id,
      );
      return parent ? Math.min(8, depth(parent, visited) + 1) : 0;
    }
    const ordered = [...entities].sort((a, b) =>
      String(a.details.timestamp || a.kind).localeCompare(
        String(b.details.timestamp || b.kind),
      ),
    );
    const leadProcess =
      entities.find(
        (e) =>
          e.kind === "process" &&
          findings.some(
            (f) =>
              f.rule_id === "SP-001" &&
              f.event_ids.includes(String(e.details.event_id)),
          ),
      ) ||
      entities.find((e) => e.kind === "process") ||
      entities[0];
    const columns = new Map<number, number>();
    if (processesOnly)
      ordered.forEach((e) => {
        const d = depth(e);
        columns.set(d, (columns.get(d) || 0) + 1);
      });
    const neighbors = entities.filter((e) => e.id !== leadProcess?.id);
    const nodes: EntityNode[] = ordered.map((entity) => {
      let position;
      if (processesOnly) {
        const column = depth(entity),
          row = rows.get(column) || 0;
        rows.set(column, row + 1);
        position = {
          x: column * 270 + 60,
          y:
            320 +
            (row - ((columns.get(column) || 1) - 1) / 2) * 195 +
            (column % 2 ? -55 : 20),
        };
      } else if (entity.id === leadProcess?.id) position = { x: 540, y: 380 };
      else {
        const index = neighbors.findIndex((e) => e.id === entity.id),
          angle =
            (index / Math.max(neighbors.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const ring = neighbors.length > 10 && index % 2 ? 1.45 : 1;
        position = {
          x: 540 + Math.cos(angle) * 440 * ring,
          y: 380 + Math.sin(angle) * 310 * ring,
        };
      }
      const count = findings.filter(
        (f) =>
          f.status !== "rejected" &&
          f.event_ids.includes(String(entity.details.event_id)),
      ).length;
      const matches =
        !q ||
        `${entity.label} ${entity.key} ${entity.details.pid || ""}`
          .toLowerCase()
          .includes(q.toLowerCase());
      return {
        id: entity.id,
        type: "entity",
        ariaLabel: `${entity.kind}: ${entity.label}. Press Enter to inspect its source event.`,
        position,
        selected:
          entity.id === active || entity.details.event_id === selectedEvent?.id,
        style: { opacity: matches ? 1 : 0.22 },
        data: {
          entity,
          count,
          linked: linked.has(entity.id),
          collapsed: collapsed.has(entity.id),
          hasChildren: childEdges.some((e) => e.source_id === entity.id),
          toggle: () =>
            setCollapsed((previous) => {
              const next = new Set(previous);
              if (next.has(entity.id)) next.delete(entity.id);
              else next.add(entity.id);
              return next;
            }),
        },
      };
    });
    const unique = new Map<string, (typeof data.relationships)[number]>();
    data.relationships
      .filter(
        (r) =>
          ids.has(r.source_id) &&
          ids.has(r.target_id) &&
          (!processesOnly || r.kind === "spawned") &&
          (!relation || r.kind === relation),
      )
      .forEach((r) => unique.set(`${r.source_id}:${r.target_id}:${r.kind}`, r));
    const edges: Edge[] = [...unique.values()].map((r) => {
      const lead = nodes.some(
        (n) =>
          (n.id === r.source_id || n.id === r.target_id) && n.data.count > 0,
      );
      return {
        id: r.id,
        source: r.source_id,
        target: r.target_id,
        label: r.kind.replaceAll("_", " "),
        type: processesOnly ? "smoothstep" : "default",
        animated: false,
        selected: r.id === edgeId,
        style: {
          stroke: r.id === edgeId ? "#b8eee6" : lead ? "#b5748b" : "#5a889d",
          strokeWidth: r.id === edgeId ? 1.8 : 1,
          opacity:
            active && !(linked.has(r.source_id) && linked.has(r.target_id))
              ? 0.28
              : 0.75,
        },
        labelStyle: { fill: "#abc5d4", fontSize: 8 },
        labelBgStyle: { fill: "#09121a" },
        labelBgPadding: [5, 3],
        data: { relationship: r },
      };
    });
    return { nodes, edges };
  }, [
    data,
    processesOnly,
    findings,
    selectedEvent?.id,
    host,
    kind,
    relation,
    q,
    collapsed,
    active,
    focused,
    edgeId,
  ]);
  if (!data?.entities.length)
    return (
      <Empty title="No documented relationships yet">
        <p>
          Import process records with process GUIDs to reconstruct explicit
          relationships.
        </p>
      </Empty>
    );
  const defaultEntity =
    data.entities.find(
      (e) =>
        e.kind === "process" &&
        findings.some(
          (f) =>
            f.rule_id === "SP-001" &&
            f.event_ids.includes(String(e.details.event_id)),
        ),
    ) ||
    data.entities.find((e) => e.kind === "process") ||
    data.entities[0];
  const entity = data.entities.find((e) => e.id === active) || defaultEntity;
  const activeEdge = data.relationships.find((r) => r.id === edgeId);
  const provenance = data.relationships.filter(
    (r) => r.source_id === entity?.id || r.target_id === entity?.id,
  );
  const entityEvents = new Set(provenance.map((r) => r.event_id));
  const selectedLeads = findings.filter((f) =>
    f.event_ids.some((id) => entityEvents.has(id)),
  );
  function inspectEntity(entity: Entity) {
    const id =
      entity.details.event_id ||
      data.relationships.find(
        (r) => r.source_id === entity.id || r.target_id === entity.id,
      )?.event_id;
    if (id) onEvent(String(id));
  }
  return (
    <div className="graph-experience">
      <div className="graph-toolbar">
        <div className="event-search">
          <Search size={14} />
          <input
            aria-label="Search graph entities"
            placeholder={
              processesOnly
                ? "Find a process, PID or host…"
                : "Find an entity or identifier…"
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {processesOnly ? (
          <select
            aria-label="Filter processes by host"
            value={host}
            onChange={(e) => setHost(e.target.value)}
          >
            <option value="">All hosts</option>
            {[
              ...new Set(
                data.entities
                  .filter((e) => e.kind === "process")
                  .map((e) => String(e.details.host)),
              ),
            ].map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        ) : (
          <>
            <select
              aria-label="Filter graph entity type"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
            >
              <option value="">All entity types</option>
              {[...new Set(data.entities.map((e) => e.kind))].map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <select
              aria-label="Filter relationship type"
              value={relation}
              onChange={(e) => setRelation(e.target.value)}
            >
              <option value="">All relationships</option>
              {[...new Set(data.relationships.map((r) => r.kind))].map((r) => (
                <option key={r} value={r}>
                  {r.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </>
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={!active}
          onClick={() => setFocused((v) => !v)}
          aria-pressed={focused}
        >
          <Focus size={13} />
          {focused ? "Show context" : "Focus branch"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            instance.current?.fitView({
              nodes: active ? [{ id: active }] : undefined,
              padding: 0.55,
              maxZoom: 1.15,
              duration: reduce ? 0 : 400,
            })
          }
        >
          <Crosshair size={13} />
          Fit selection
        </Button>
      </div>
      <div
        className={`graph-workbench ${selectedEvent ? "has-event-inspector" : ""}`}
      >
        <div className="graph-panel">
          <div className="canvas-registration">
            <span>
              {processesOnly ? "PROCESS LINEAGE" : "RELATIONSHIP FIELD"}
            </span>
            <span>
              {nodes.length} ENTITIES / {edges.length} OBSERVED LINKS
            </span>
          </div>
          <ReactFlow<EntityNode, Edge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={(value) => {
              instance.current = value;
            }}
            fitView
            fitViewOptions={{ padding: 0.22, maxZoom: 0.95 }}
            minZoom={0.12}
            maxZoom={1.8}
            nodesDraggable={false}
            nodesConnectable={false}
            deleteKeyCode={null}
            onKeyDownCapture={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              const target = event.target as Element;
              if (target.closest("button, input, select, textarea")) return;
              const nodeId = target
                .closest(".react-flow__node")
                ?.getAttribute("data-id");
              const edgeId = target
                .closest(".react-flow__edge")
                ?.getAttribute("data-id");
              const entity = data.entities.find((e) => e.id === nodeId);
              const relation = data.relationships.find((r) => r.id === edgeId);
              if (!entity && !relation) return;
              event.preventDefault();
              event.stopPropagation();
              if (entity) {
                setActive(entity.id);
                setEdgeId(undefined);
                inspectEntity(entity);
              } else if (relation) {
                setEdgeId(relation.id);
                setActive(relation.source_id);
                onEvent(relation.event_id);
              }
            }}
            onNodeClick={(_, node) => {
              setActive(node.id);
              setEdgeId(undefined);
              inspectEntity(node.data.entity);
            }}
            onEdgeClick={(_, edge) => {
              setEdgeId(edge.id);
              const relation = data.relationships.find((r) => r.id === edge.id);
              if (relation) {
                setActive(relation.source_id);
                onEvent(relation.event_id);
              }
            }}
            onPaneClick={() => {
              setActive(undefined);
              setEdgeId(undefined);
            }}
            colorMode="dark"
            proOptions={{ hideAttribution: false }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={23}
              size={0.65}
              color="#3a5465"
            />
            <Controls showInteractive={false} />
          </ReactFlow>
          <div className="graph-legend">
            <span>
              <i />
              Observed relationship
            </span>
            <span className="amber-dot">
              <i />
              Rule match / review required
            </span>
          </div>
          <button
            className="graph-fit-all"
            aria-label="Fit all graph entities"
            onClick={() =>
              instance.current?.fitView({
                padding: 0.22,
                duration: reduce ? 0 : 400,
              })
            }
          >
            <Maximize2 size={14} />
          </button>
        </div>
        {!selectedEvent && entity && (
          <aside className="graph-entity-rail" aria-label="Entity detail rail">
            <span className="eyebrow">
              SELECTED {entity.kind.toUpperCase()}
            </span>
            <div className="rail-entity-icon">
              {(() => {
                const Icon = icons[entity.kind] || FileJson2;
                return <Icon size={25} strokeWidth={1.1} />;
              })()}
            </div>
            <h2>{entity.label}</h2>
            <Badge tone={selectedLeads.length ? "high" : "cyan"}>
              {selectedLeads.length ? "Investigative lead" : "Observed entity"}
            </Badge>
            <dl className="detail-fields">
              {Object.entries(entity.details)
                .filter(
                  ([key, value]) =>
                    value !== null &&
                    !["event_id", "parent_key", "process_key"].includes(key),
                )
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>{key.replaceAll("_", " ")}</dt>
                    <dd className="mono">{String(value)}</dd>
                  </div>
                ))}
            </dl>
            <div className="entity-rail-counts">
              <span>
                <strong>{entityEvents.size}</strong>Source events
              </span>
              <span>
                <strong>{provenance.length}</strong>Stored relations
              </span>
            </div>
            <h3>Evidence references</h3>
            {[...new Set(provenance.map((r) => r.event_id))]
              .slice(0, 4)
              .map((id) => (
                <button
                  key={id}
                  className="entity-source-link"
                  onClick={() => onEvent(id)}
                >
                  <FileJson2 size={12} />
                  <span className="mono">EVT-{shortId(id)}</span>
                  <ArrowRight size={11} />
                </button>
              ))}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => inspectEntity(entity)}
            >
              Inspect source event <ArrowRight size={12} />
            </Button>
            <p className="entity-rail-note">
              <ShieldCheck size={12} />
              Documented relationships. Missing ancestry stays unresolved.
            </p>
          </aside>
        )}
      </div>
      <div className="graph-context">
        <span className="eyebrow">
          {activeEdge ? "RELATIONSHIP PROVENANCE" : "SPATIAL NAVIGATION"}
        </span>
        {activeEdge ? (
          <>
            <strong>{activeEdge.kind.replaceAll("_", " ")}</strong>
            <button
              className="text-link"
              onClick={() => onEvent(activeEdge.event_id)}
            >
              Event {shortId(activeEdge.event_id)}
              <ArrowRight size={11} />
            </button>
            <span className="mono">
              Evidence {shortId(activeEdge.evidence_id)}
            </span>
          </>
        ) : (
          <p>
            Scroll to zoom · Drag to pan · Select an entity or link to inspect ·
            Use branch controls to refine the view
          </p>
        )}
      </div>
      {data.truncated && (
        <p className="form-error">
          Graph limited to 150 entities and 500 source relationships. Refine the
          graph API query for a smaller scope.
        </p>
      )}
    </div>
  );
}
