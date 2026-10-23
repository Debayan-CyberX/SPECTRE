"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookmarkPlus, ChevronRight, Copy, FileJson2, X } from "lucide-react";
import { api, shortId, timeLabel } from "@/lib/api";
import type { Annotation, ForensicEvent, WorkspaceData } from "@/lib/types";
import { Badge, ErrorState } from "./primitives";
import { Button } from "./ui/button";
export function EventInspector({
  event,
  workspace,
  demo,
  local,
  onClose,
  onEvidence,
  onFinding,
}: {
  event: ForensicEvent;
  workspace: WorkspaceData;
  demo: boolean;
  local: boolean;
  onClose: () => void;
  onEvidence: (id: string) => void;
  onFinding: (id: string) => void;
}) {
  const [tab, setTab] = useState("details");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const client = useQueryClient();
  const detail = useQuery({
    queryKey: ["event", workspace.case.id, event.id],
    queryFn: () =>
      api<ForensicEvent>(`/cases/${workspace.case.id}/events/${event.id}`),
    enabled: !demo,
  });
  const full = detail.data || event;
  const findings = workspace.findings.filter((f) =>
    f.event_ids.includes(event.id),
  );
  const notes = workspace.annotations.filter((a) => a.event_id === event.id);
  const annotation = useMutation({
    mutationFn: (bookmark: boolean) =>
      api<Annotation>(`/cases/${workspace.case.id}/annotations`, {
        method: "POST",
        body: JSON.stringify({
          event_id: event.id,
          text: note || "Bookmarked for review",
          bookmarked: bookmark,
        }),
      }),
    onSuccess: () => {
      setNote("");
      client.invalidateQueries({ queryKey: ["workspace", workspace.case.id] });
    },
  });
  return (
    <aside className="event-inspector" aria-label="Event inspector">
      <div className="inspector-header">
        <span>
          <FileJson2 size={14} /> EVIDENCE INSPECTOR
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Close event inspector"
          onClick={onClose}
        >
          <X size={16} />
        </Button>
      </div>
      <div className="inspector-heading">
        <div>
          <Badge tone={findings.length ? "amber" : "cyan"}>
            {event.category}
          </Badge>
          <span className="mono muted">#{event.record_ref}</span>
        </div>
        <h2>{event.title}</h2>
        <p className="mono time-cyan">
          {timeLabel(event.timestamp, local, true)}{" "}
          <span>{local ? "LOCAL" : "UTC"}</span>
        </p>
      </div>
      <div className="inspector-tabs">
        {["details", "source", "notes"].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "notes" && notes.length > 0 ? ` (${notes.length})` : ""}
          </button>
        ))}
      </div>
      <div className="inspector-body">
        {detail.error && <ErrorState error={detail.error} />}
        {tab === "details" ? (
          <>
            <dl className="detail-fields">
              <div>
                <dt>Host</dt>
                <dd>{event.host}</dd>
              </div>
              <div>
                <dt>Account</dt>
                <dd>{event.user}</dd>
              </div>
              <div>
                <dt>Normalized UTC</dt>
                <dd className="mono">{event.timestamp}</dd>
              </div>
              <div>
                <dt>Original timestamp</dt>
                <dd className="mono">{event.original_timestamp}</dd>
              </div>
              <div>
                <dt>Source precision</dt>
                <dd>{event.precision}</dd>
              </div>
              {Object.entries(event.fields)
                .filter(([, value]) => value !== null)
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>{key.replaceAll("_", " ")}</dt>
                    <dd className="mono">{String(value)}</dd>
                  </div>
                ))}
            </dl>
            <span className="eyebrow inspector-section-label">PROVENANCE</span>
            <button
              className="provenance-link"
              onClick={() => onEvidence(event.evidence_id)}
            >
              <FileJson2 size={16} />
              <span>
                {workspace.evidence.find((e) => e.id === event.evidence_id)
                  ?.filename || shortId(event.evidence_id)}
                <small>Source record #{event.record_ref}</small>
              </span>
              <ChevronRight size={14} />
            </button>
            {findings.length > 0 && (
              <>
                <span className="eyebrow inspector-section-label">
                  INVESTIGATIVE LEADS
                </span>
                {findings.map((f) => (
                  <button
                    className="finding-link"
                    key={f.id}
                    onClick={() => onFinding(f.id)}
                  >
                    <span className="mono">{f.rule_id}</span>
                    {f.title}
                    <ChevronRight size={13} />
                  </button>
                ))}
              </>
            )}
          </>
        ) : tab === "source" ? (
          <>
            <p className="inspector-note">
              Untrusted artifact content. Displayed as text; never executed.
            </p>
            {full.raw ? (
              <pre className="raw-json">
                {JSON.stringify(full.raw, null, 2)}
              </pre>
            ) : (
              <pre className="raw-json">
                {JSON.stringify(
                  {
                    record_ref: full.record_ref,
                    original_timestamp: full.original_timestamp,
                    fields: full.fields,
                  },
                  null,
                  2,
                )}
              </pre>
            )}
            {full.sources && (
              <>
                <span className="eyebrow">ALL SOURCE REFERENCES</span>
                {full.sources.map((s) => (
                  <p
                    className="mono inspector-note"
                    key={`${s.evidence_id}:${s.record_ref}`}
                  >
                    {s.evidence_id} / #{s.record_ref}
                  </p>
                ))}
              </>
            )}
          </>
        ) : (
          <>
            {notes.length ? (
              notes.map((a) => (
                <article className="annotation" key={a.id}>
                  <span className="mono muted">
                    {a.created_at.slice(0, 19).replace("T", " ")}
                    {a.bookmarked ? " · BOOKMARK" : ""}
                  </span>
                  <p>{a.text}</p>
                </article>
              ))
            ) : (
              <p className="muted">No analyst notes for this event.</p>
            )}
            {demo ? (
              <p className="inspector-note">
                Sign in and import your own demo copy to add notes.
              </p>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  annotation.mutate(false);
                }}
              >
                <label htmlFor="annotation">Analyst note</label>
                <textarea
                  id="annotation"
                  rows={5}
                  maxLength={8000}
                  placeholder="Observation, alternative explanation, or next step…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!note.trim() || annotation.isPending}
                >
                  Save note
                </Button>
                {annotation.error && (
                  <p className="form-error" role="alert">
                    {annotation.error.message}
                  </p>
                )}
              </form>
            )}
          </>
        )}
      </div>
      <div className="inspector-footer">
        <Button
          variant="ghost"
          size="sm"
          disabled={demo || annotation.isPending}
          onClick={() => annotation.mutate(true)}
        >
          <BookmarkPlus size={14} /> Bookmark
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(event.id);
            setCopied(true);
          }}
        >
          <Copy size={13} />
          {copied ? "Copied" : "Event ID"}
        </Button>
      </div>
    </aside>
  );
}
