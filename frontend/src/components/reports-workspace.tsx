"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  FileCheck2,
  FileJson2,
  Printer,
} from "lucide-react";
import { api, shortId } from "@/lib/api";
import type { Report, WorkspaceData } from "@/lib/types";
import { Badge, ErrorState, Loading } from "./primitives";
import { Button } from "./ui/button";
import { ForensicDossier } from "./forensic-dossier";
interface SavedSnapshot {
  id: string;
  content_sha256: string;
  created_at: string;
  snapshot: WorkspaceData & { exported_at: string };
}
export function ReportsWorkspace({
  data,
  demo,
}: {
  data: WorkspaceData;
  demo: boolean;
}) {
  const client = useQueryClient(),
    [selected, setSelected] = useState<string>(),
    [section, setSection] = useState("summary");
  const reports = useQuery({
    queryKey: ["reports", data.case.id],
    queryFn: () => api<Report[]>(`/cases/${data.case.id}/reports`),
    enabled: !demo,
  });
  const snapshot = useQuery({
    queryKey: ["report-snapshot", data.case.id, selected],
    queryFn: () =>
      api<SavedSnapshot>(`/cases/${data.case.id}/reports/${selected}`),
    enabled: !!selected && !demo,
  });
  const create = useMutation({
    mutationFn: () =>
      api<Report>(`/cases/${data.case.id}/reports`, {
        method: "POST",
        body: "{}",
      }),
    onSuccess: (report) => {
      client.invalidateQueries({ queryKey: ["reports", data.case.id] });
      setSelected(report.id);
    },
  });
  const shown = snapshot.data?.snapshot || data;
  return (
    <>
      <div className="view-heading reports-heading">
        <div>
          <span className="eyebrow">THE INVESTIGATION, ON RECORD</span>
          <h1>Reports & dossiers</h1>
          <p>Freeze the evidence, the reasoning and the review.</p>
        </div>
        <div className="toolbar-actions">
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer size={13} />
            Print preview
          </Button>
          <Button
            disabled={demo || create.isPending}
            onClick={() => create.mutate()}
          >
            <FileCheck2 size={14} />
            {create.isPending ? "Creating snapshot…" : "Create report"}
          </Button>
        </div>
      </div>
      <div className="dossier-workspace">
        <aside className="report-manager" aria-label="Report manager">
          <div className="report-manager-title">
            <BookOpen size={15} />
            <span>INVESTIGATION RECORDS</span>
          </div>
          <button
            className={`report-manager-item ${!selected ? "active" : ""}`}
            onClick={() => setSelected(undefined)}
          >
            <FileJson2 size={18} />
            <span>
              <strong>Live investigation dossier</strong>
              <small>{data.case.name}</small>
            </span>
            <Badge tone="cyan">LIVE</Badge>
          </button>
          <div className="report-manager-section">
            <span>SAVED SNAPSHOTS</span>
            <span>{reports.data?.length || 0}</span>
          </div>
          {demo ? (
            <p className="report-manager-help">
              Sign in and import your own demo copy to create a stored snapshot.
            </p>
          ) : reports.isPending ? (
            <Loading label="Reading snapshots" />
          ) : reports.error ? (
            <ErrorState error={reports.error} />
          ) : reports.data?.length ? (
            reports.data.map((r) => (
              <div
                className={`report-manager-snapshot ${selected === r.id ? "active" : ""}`}
                key={r.id}
              >
                <button onClick={() => setSelected(r.id)}>
                  <FileCheck2 size={18} />
                  <span>
                    <strong>Investigation report</strong>
                    <small>
                      {r.created_at.slice(0, 19).replace("T", " ")} UTC
                    </small>
                    <code>{r.content_sha256.slice(0, 16)}…</code>
                  </span>
                  <ArrowRight size={12} />
                </button>
                <div>
                  <a
                    href={`/api/v1/cases/${data.case.id}/reports/${r.id}?format=json`}
                  >
                    JSON <ArrowDownToLine size={11} />
                  </a>
                  <a
                    href={`/api/v1/cases/${data.case.id}/reports/${r.id}?format=pdf`}
                  >
                    PDF <ArrowDownToLine size={11} />
                  </a>
                </div>
              </div>
            ))
          ) : (
            <p className="report-manager-help">
              No snapshots yet. Create a report to preserve the current case.
            </p>
          )}
          <div className="report-manager-section">
            <span>DOSSIER CONTENTS</span>
            <span>05</span>
          </div>
          <nav aria-label="Dossier sections">
            {["summary", "evidence", "findings", "notes", "limitations"].map(
              (s, i) => (
                <button
                  className={section === s ? "active" : ""}
                  key={s}
                  onClick={() => {
                    setSection(s);
                    document
                      .getElementById(`dossier-${s}`)
                      ?.scrollIntoView({
                        behavior: window.matchMedia(
                          "(prefers-reduced-motion: reduce)",
                        ).matches
                          ? "instant"
                          : "smooth",
                        block: "start",
                      });
                  }}
                >
                  <span>0{i + 1}</span>
                  {s}
                </button>
              ),
            )}
          </nav>
          <div className="report-manager-disclosure">
            <span>SP-{shortId(data.case.id)}</span>
            <p>
              JSON contains all events and custody. PDF is a concise dossier
              with the first 100 timeline events.
            </p>
          </div>
          {create.error && (
            <p className="form-error" role="alert">
              {create.error.message}
            </p>
          )}
        </aside>
        <div className="dossier-preview-area">
          <div className="dossier-viewbar">
            <span>
              {selected
                ? "PRESERVED SNAPSHOT"
                : "LIVE PREVIEW / NOT YET EXPORTED"}
            </span>
            <span>
              {snapshot.data?.content_sha256
                ? `SHA-256 ${snapshot.data.content_sha256.slice(0, 16)}…`
                : "A4 / FORENSIC DOSSIER"}
            </span>
          </div>
          {snapshot.isFetching ? (
            <Loading label="Opening stored dossier" />
          ) : snapshot.error ? (
            <ErrorState error={snapshot.error} />
          ) : (
            <ForensicDossier
              data={shown}
              saved={!!snapshot.data}
              exportedAt={snapshot.data?.snapshot.exported_at}
              snapshotHash={snapshot.data?.content_sha256}
            />
          )}
        </div>
      </div>
    </>
  );
}
