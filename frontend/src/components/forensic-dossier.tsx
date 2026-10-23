"use client";
import type { WorkspaceData } from "@/lib/types";
import { shortId } from "@/lib/api";
import { Mark } from "./primitives";
export function ForensicDossier({
  data,
  exportedAt,
  snapshotHash,
  saved = false,
}: {
  data: WorkspaceData;
  exportedAt?: string;
  snapshotHash?: string;
  saved?: boolean;
}) {
  return (
    <article
      className="forensic-dossier"
      aria-label="Forensic investigation dossier"
    >
      <div className="dossier-letterhead">
        <div>
          <Mark size={27} />
          <span>
            SPECTRE<small>FORENSIC INTELLIGENCE</small>
          </span>
        </div>
        <span>
          INVESTIGATION DOSSIER
          <br />
          {saved ? "STORED SNAPSHOT" : "LIVE CASE PREVIEW"}
        </span>
      </div>
      <div className="dossier-classification">
        {data.case.is_demo
          ? "SYNTHETIC INVESTIGATION / TRAINING MATERIAL"
          : "PRIVATE INVESTIGATION / CONTROLLED MATERIAL"}
      </div>
      <h2>{data.case.name}</h2>
      <p className="dossier-subtitle">
        Evidence-backed incident reconstruction
      </p>
      <dl className="dossier-metadata">
        <div>
          <dt>Case reference</dt>
          <dd>SP-{shortId(data.case.id)}</dd>
        </div>
        <div>
          <dt>Case created</dt>
          <dd>{data.case.created_at.slice(0, 19).replace("T", " ")} UTC</dd>
        </div>
        <div>
          <dt>Case status</dt>
          <dd>{data.case.status.replaceAll("_", " ")}</dd>
        </div>
        <div>
          <dt>Exported</dt>
          <dd>
            {exportedAt
              ? `${exportedAt.slice(0, 19).replace("T", " ")} UTC`
              : "Not exported / live preview"}
          </dd>
        </div>
      </dl>
      <section id="dossier-summary">
        <div className="dossier-section-title">
          <span>01</span>
          <h3>Executive context</h3>
        </div>
        <p>
          {data.case.description ||
            "No analyst description has been added to this case."}
        </p>
        <div className="dossier-stats">
          <span>
            <strong>{data.case.event_count}</strong>Normalized events
          </span>
          <span>
            <strong>{data.evidence.length}</strong>Original artifacts
          </span>
          <span>
            <strong>{data.findings.length}</strong>Investigative leads
          </span>
        </div>
        <p className="dossier-caution">
          Rule matches are investigative leads. They do not independently
          establish malicious activity or intent.
        </p>
      </section>
      <section id="dossier-evidence">
        <div className="dossier-section-title">
          <span>02</span>
          <h3>Evidence inventory & integrity</h3>
        </div>
        {data.evidence.map((e) => (
          <div className="dossier-artifact" key={e.id}>
            <div>
              <strong>{e.filename}</strong>
              <span>
                {e.size.toLocaleString()} bytes / {e.status}
              </span>
            </div>
            <dl>
              <div>
                <dt>Evidence ID</dt>
                <dd>{e.id}</dd>
              </div>
              <div>
                <dt>Parser</dt>
                <dd>{e.parser}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{e.source}</dd>
              </div>
              <div>
                <dt>SHA-256</dt>
                <dd className="dossier-hash">{e.sha256}</dd>
              </div>
            </dl>
          </div>
        ))}
        {!data.evidence.length && <p>No artifacts have been imported.</p>}
      </section>
      <section id="dossier-findings">
        <div className="dossier-section-title">
          <span>03</span>
          <h3>Investigative findings</h3>
        </div>
        {data.findings.map((f, i) => (
          <div className="dossier-finding" key={f.id}>
            <span className="dossier-finding-index">
              F{String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <div>
                <span>
                  {f.rule_id} / {f.severity.toUpperCase()}
                </span>
                <span>{f.status.toUpperCase()}</span>
              </div>
              <h4>{f.title}</h4>
              <p>{f.rationale}</p>
              <p className="dossier-limitation">
                <strong>Limitations.</strong> {f.limitations}
              </p>
              <div className="dossier-event-references">
                {f.event_ids.map((id) => (
                  <span key={id}>EVT-{shortId(id)}</span>
                ))}
              </div>
              {f.notes && (
                <p>
                  <strong>Analyst note.</strong> {f.notes}
                </p>
              )}
            </div>
          </div>
        ))}
        {!data.findings.length && <p>No rule matches have been recorded.</p>}
      </section>
      <section id="dossier-notes">
        <div className="dossier-section-title">
          <span>04</span>
          <h3>Analyst observations</h3>
        </div>
        {data.annotations.length ? (
          data.annotations.map((a) => (
            <div className="dossier-annotation" key={a.id}>
              <span>
                {a.created_at.slice(0, 19).replace("T", " ")} UTC
                {a.bookmarked ? " / BOOKMARKED" : ""}
              </span>
              <p>{a.text}</p>
              {a.event_id && <code>Event {a.event_id}</code>}
            </div>
          ))
        ) : (
          <p>No analyst observations stored.</p>
        )}
      </section>
      <section id="dossier-limitations">
        <div className="dossier-section-title">
          <span>05</span>
          <h3>Scope & limitations</h3>
        </div>
        <p>
          Analysis covers the supported ingested records. Original timestamps
          are retained and normalized UTC values are stored separately. Missing
          events and ancestry are not inferred as facts. Application custody
          history is not tamper-proof storage.
        </p>
        <p>
          Structured JSON, JSONL and CSV ingestion. Binary EVTX is not
          supported. PDF exports summarize the first 100 timeline events;
          structured JSON includes every stored event and custody record.
        </p>
      </section>
      <footer className="dossier-footer">
        <span>SPECTRE / SP-{shortId(data.case.id)}</span>
        <span>
          {saved
            ? "STORED SNAPSHOT"
            : "LIVE PREVIEW · CREATE A SNAPSHOT TO EXPORT"}
        </span>
      </footer>
      {snapshotHash && (
        <div className="dossier-snapshot-hash">
          <span>SNAPSHOT CONTENT SHA-256</span>
          <code>{snapshotHash}</code>
        </div>
      )}
    </article>
  );
}
