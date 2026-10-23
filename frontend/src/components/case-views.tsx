"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  FileJson2,
  Fingerprint,
  Hash,
  History,
  Plus,
  ScanLine,
  XCircle,
} from "lucide-react";
import { api, fileSize, shortId } from "@/lib/api";
import type {
  Evidence,
  Finding,
  Investigation,
  WorkspaceData,
} from "@/lib/types";
import { Badge, Empty, ErrorState, Loading } from "./primitives";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";

export function InvestigationsView({
  cases,
  onSelect,
  onCreate,
  onDemo,
  demo,
  pending,
}: {
  cases: Investigation[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDemo: () => void;
  demo: boolean;
  pending: boolean;
}) {
  return (
    <>
      <div className="view-heading">
        <div>
          <span className="eyebrow">CASE MANAGEMENT</span>
          <h1>
            Investigations<span className="heading-count">{cases.length}</span>
          </h1>
          <p>Every investigation starts with a question.</p>
        </div>
        <div className="toolbar-actions">
          <Button
            variant="secondary"
            disabled={demo || pending}
            onClick={onDemo}
          >
            {pending ? "Importing…" : "Import demo case"}
          </Button>
          <Button onClick={onCreate} disabled={demo}>
            <Plus size={15} />
            New investigation
          </Button>
        </div>
      </div>
      {cases.length ? (
        <div className="case-list">
          <div className="case-list-header">
            <span>INVESTIGATION</span>
            <span>STATUS</span>
            <span>EVIDENCE</span>
            <span>FINDINGS</span>
            <span>CREATED / UTC</span>
            <span />
          </div>
          {cases.map((c) => (
            <button
              className="case-list-row"
              key={c.id}
              onClick={() => onSelect(c.id)}
            >
              <div>
                <span className="case-list-icon">
                  <Fingerprint size={19} />
                </span>
                <div>
                  <strong>{c.name}</strong>
                  <span className="mono">
                    SP-{shortId(c.id)}
                    {c.is_demo ? " / SYNTHETIC" : ""}
                  </span>
                </div>
              </div>
              <span>
                <Badge tone={c.status === "open" ? "cyan" : "muted"}>
                  {c.status.replaceAll("_", " ")}
                </Badge>
              </span>
              <span className="mono">{c.evidence_count}</span>
              <span className="mono">{c.finding_count}</span>
              <span className="mono muted">{c.created_at.slice(0, 10)}</span>
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
      ) : (
        <Empty title="Your next investigation starts here">
          <p>
            Create a case to import evidence, or use the synthetic dataset to
            explore the entire workflow.
          </p>
          <Button onClick={onCreate}>
            <Plus size={14} />
            Create investigation
          </Button>
        </Empty>
      )}
    </>
  );
}

export { EvidenceInventory as EvidenceVault } from "./evidence-inventory";

interface CustodyRecord {
  id: string;
  action: string;
  created_at: string;
  details: Record<string, unknown>;
  actor_id: string;
}
export function EvidenceDetail({
  evidence,
  demo,
  open,
  onOpenChange,
}: {
  evidence?: Evidence;
  demo: boolean;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const detail = useQuery({
    queryKey: ["evidence", evidence?.id],
    queryFn: () =>
      api<Evidence & { custody: CustodyRecord[] }>(
        `/cases/${evidence!.case_id}/evidence/${evidence!.id}`,
      ),
    enabled: !!evidence && !demo && open,
  });
  const [copied, setCopied] = useState(false);
  if (!evidence) return null;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={evidence.filename}
      description="Original evidence / artifact record"
    >
      <div className="evidence-detail-status">
        <Badge tone={evidence.status === "ready" ? "green" : "high"}>
          {evidence.status}
        </Badge>
        <span className="mono">
          {fileSize(evidence.size)} · {evidence.record_count} derived events
        </span>
      </div>
      {evidence.error && <p className="form-error">{evidence.error}</p>}
      <dl className="detail-fields">
        <div>
          <dt>Evidence ID</dt>
          <dd className="mono">{evidence.id}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{evidence.source}</dd>
        </div>
        <div>
          <dt>Imported UTC</dt>
          <dd className="mono">{evidence.created_at}</dd>
        </div>
        <div>
          <dt>Acquired at</dt>
          <dd className="mono">{evidence.acquired_at || "Not supplied"}</dd>
        </div>
        <div>
          <dt>Parser</dt>
          <dd className="mono">{evidence.parser}</dd>
        </div>
        <div>
          <dt>Duplicates skipped</dt>
          <dd>{evidence.duplicate_count}</dd>
        </div>
      </dl>
      <div className="evidence-hash">
        <span>
          <Hash size={14} />
          SHA-256 / ORIGINAL FILE
        </span>
        <code>{evidence.sha256}</code>
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(evidence.sha256);
            setCopied(true);
          }}
        >
          {copied ? <Check size={12} /> : <Hash size={12} />}
          {copied ? "Copied" : "Copy hash"}
        </Button>
      </div>
      <div className="section-heading">
        <History size={14} />
        <h3>Custody history</h3>
      </div>
      {demo ? (
        <p className="muted small-text">
          Sign in and import a demo copy to inspect custody and download the
          preserved original.
        </p>
      ) : detail.isPending ? (
        <Loading label="Reading custody records" />
      ) : detail.error ? (
        <ErrorState error={detail.error} />
      ) : (
        <ol className="custody-list">
          {detail.data?.custody.map((c) => (
            <li key={c.id}>
              <i />
              <div>
                <strong>{c.action.replaceAll("_", " ")}</strong>
                <span className="mono">{c.created_at}</span>
                <small>Actor {shortId(c.actor_id)}</small>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="dialog-actions">
        <Button variant="secondary" asChild={!demo} disabled={demo}>
          {demo ? (
            <>
              <ArrowDownToLine size={14} />
              Original download requires sign-in
            </>
          ) : (
            <a
              href={`/api/v1/cases/${evidence.case_id}/evidence/${evidence.id}/original`}
            >
              <ArrowDownToLine size={14} />
              Verify & download original
            </a>
          )}
        </Button>
      </div>
    </Dialog>
  );
}

export function FindingsView({
  data,
  onEvent,
  demo,
  focus,
}: {
  data: WorkspaceData;
  onEvent: (id: string) => void;
  demo: boolean;
  focus?: string;
}) {
  const [selected, setSelected] = useState<string>();
  const [filter, setFilter] = useState("all");
  const findings = data.findings.filter(
    (f) => filter === "all" || f.status === filter,
  );
  const active =
    data.findings.find((f) => f.id === (selected || focus)) || findings[0];
  return (
    <>
      <div className="view-heading">
        <div>
          <span className="eyebrow">INVESTIGATIVE INTELLIGENCE</span>
          <h1>
            Findings
            <span className="heading-count">{data.findings.length}</span>
          </h1>
          <p>What the rules observed. What the evidence supports.</p>
        </div>
        <select
          className="compact-select"
          aria-label="Filter findings by review status"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All review states</option>
          <option value="unreviewed">Unreviewed</option>
          <option value="confirmed">Confirmed by analyst</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div className="findings-state-strip">
        {["unreviewed", "confirmed", "rejected"].map((state) => (
          <button
            key={state}
            onClick={() => setFilter(filter === state ? "all" : state)}
            className={filter === state ? "active" : ""}
          >
            <span className={`review-state-dot state-${state}`} />
            {state}
            <span>
              {data.findings.filter((f) => f.status === state).length}
            </span>
          </button>
        ))}
        <span className="rule-engine-label">DETERMINISTIC / RULES v1.0.0</span>
      </div>
      {findings.length ? (
        <div className="findings-workbench">
          <div className="finding-ledger">
            <div className="finding-ledger-header">
              <span>INVESTIGATIVE LEAD</span>
              <span>PRIORITY / REVIEW</span>
            </div>
            {findings.map((f, i) => (
              <button
                key={f.id}
                className={`finding-ledger-row ${active?.id === f.id ? "active" : ""}`}
                onClick={() => setSelected(f.id)}
              >
                <span className={`finding-index finding-index-${f.severity}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <div>
                    <span className="mono">{f.rule_id}</span>
                    <span>{f.mitre || "Observation"}</span>
                  </div>
                  <strong>{f.title}</strong>
                  <small>
                    {f.event_ids.length} supporting events · Evidence-backed
                    rule match
                  </small>
                </div>
                <div>
                  <Badge tone={f.severity}>{f.severity}</Badge>
                  <span className={`finding-review-state ${f.status}`}>
                    {f.status}
                  </span>
                </div>
                <ChevronRight size={13} />
              </button>
            ))}
            <div className="finding-ledger-foot">
              <ScanLine size={13} />
              <span>
                Rule matches require context. A match is not a
                malicious-activity conclusion.
              </span>
            </div>
          </div>
          {active && (
            <aside className="finding-detail-rail" aria-label="Finding detail">
              <div className="finding-detail-header">
                <span className="mono">{active.rule_id} / ANALYST REVIEW</span>
                <Badge tone={active.severity}>{active.severity}</Badge>
              </div>
              <h2>{active.title}</h2>
              <div className="finding-detail-tabs">
                <span>Overview</span>
                <span>Evidence</span>
                <span>{active.event_ids.length} references</span>
              </div>
              <FindingReview
                key={active.id}
                finding={active}
                caseId={data.case.id}
                demo={demo}
                onEvent={onEvent}
              />
            </aside>
          )}
        </div>
      ) : (
        <Empty title="No findings in this view">
          <p>
            Rule matches appear when evidence satisfies a documented detection.
            No match does not establish a clean system.
          </p>
        </Empty>
      )}
    </>
  );
}

function FindingReview({
  finding,
  caseId,
  demo,
  onEvent,
}: {
  finding: Finding;
  caseId: string;
  demo: boolean;
  onEvent: (id: string) => void;
}) {
  const [notes, setNotes] = useState(finding.notes);
  const client = useQueryClient();
  const review = useMutation({
    mutationFn: (status: string) =>
      api(`/cases/${caseId}/findings/${finding.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status, notes }),
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["workspace", caseId] }),
  });
  return (
    <div className="finding-review">
      <div>
        <span className="eyebrow">DETECTION RATIONALE</span>
        <p>{finding.rationale}</p>
        <span className="eyebrow">ASSUMPTIONS & LIMITATIONS</span>
        <p className="finding-limitations">{finding.limitations}</p>
        <span className="eyebrow">SUPPORTING EVIDENCE</span>
        <div className="finding-event-refs">
          {finding.event_ids.map((id) => (
            <button key={id} onClick={() => onEvent(id)}>
              <FileJson2 size={13} />
              <span className="mono">EVT-{shortId(id)}</span>
              <ArrowRight size={12} />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor={`review-${finding.id}`}>Analyst notes</label>
        <textarea
          id={`review-${finding.id}`}
          placeholder="Why does this lead support or fail to support your hypothesis?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={demo}
          maxLength={8000}
          rows={4}
        />
        <div className="review-actions">
          <Button
            variant="secondary"
            size="sm"
            disabled={demo || review.isPending}
            onClick={() => review.mutate("confirmed")}
          >
            <CheckCheck size={13} />
            Confirm
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={demo || review.isPending}
            onClick={() => review.mutate("rejected")}
          >
            <XCircle size={13} />
            Reject
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={demo || review.isPending}
            onClick={() => review.mutate("unreviewed")}
          >
            Save as unreviewed
          </Button>
        </div>
        {review.error && (
          <p role="alert" className="form-error">
            {review.error.message}
          </p>
        )}
        {review.isSuccess && (
          <p className="form-success" role="status">
            Review saved.
          </p>
        )}
      </div>
    </div>
  );
}

export { ReportsWorkspace as ReportsView } from "./reports-workspace";
