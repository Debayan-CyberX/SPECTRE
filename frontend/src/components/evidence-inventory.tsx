"use client";
import { useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  FileJson2,
  Fingerprint,
  Hash,
  Search,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { WorkspaceData } from "@/lib/types";
import { fileSize, shortId } from "@/lib/api";
import { Badge, Empty } from "./primitives";
import { Button } from "./ui/button";
export function EvidenceInventory({
  data,
  onImport,
  onInspect,
  demo,
}: {
  data: WorkspaceData;
  onImport: (file?: File) => void;
  onInspect: (id: string) => void;
  demo: boolean;
}) {
  const [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string>(),
    [copied, setCopied] = useState(false);
  const [sort, setSort] = useState("recent");
  const artifacts = data.evidence
    .filter((e) =>
      `${e.filename} ${e.sha256} ${e.source}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.filename.localeCompare(b.filename)
        : b.created_at.localeCompare(a.created_at),
    );
  const artifact = data.evidence.find((e) => e.id === selected) || artifacts[0];
  return (
    <>
      <div className="view-heading">
        <div>
          <span className="eyebrow">SOURCE MATERIAL / ORIGINAL ARTIFACTS</span>
          <h1>
            Evidence Vault
            <span className="heading-count">{data.evidence.length}</span>
          </h1>
          <p>
            Preserved originals. Precise provenance. A source for every event.
          </p>
        </div>
        <Button onClick={() => onImport()} disabled={demo}>
          <Upload size={14} />
          Import evidence
        </Button>
      </div>
      <div className="vault-manifest">
        <span>
          <ShieldCheck size={15} />
          SHA-256 calculated on import, verified on original download.
        </span>
        <span>
          ORIGINALS /{" "}
          {data.evidence.reduce((sum, e) => sum + e.size, 0).toLocaleString()}{" "}
          BYTES
        </span>
      </div>
      <div className="vault-workbench">
        <div className="vault-inventory-main">
          <div className="vault-toolbar">
            <div className="event-search">
              <Search size={14} />
              <input
                aria-label="Search evidence files"
                placeholder="Find an artifact, hash or acquisition source…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              aria-label="Sort evidence files"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="recent">Most recent</option>
              <option value="name">Filename</option>
            </select>
          </div>
          {artifacts.length ? (
            <div className="vault-table-scroll">
              <table className="vault-table">
                <thead>
                  <tr>
                    <th>NAME / IDENTITY</th>
                    <th>TYPE</th>
                    <th>SIZE</th>
                    <th>SHA-256</th>
                    <th>IMPORTED / UTC</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {artifacts.map((e) => (
                    <tr
                      className={artifact?.id === e.id ? "selected" : ""}
                      key={e.id}
                    >
                      <td>
                        <button
                          onClick={() => {
                            setSelected(e.id);
                            setCopied(false);
                          }}
                        >
                          <span
                            className={`vault-file-glyph glyph-${e.status}`}
                          >
                            <FileJson2 size={16} />
                          </span>
                          <span>
                            <strong>{e.filename}</strong>
                            <small>
                              EV-{shortId(e.id)} · {e.record_count} normalized
                              events
                            </small>
                          </span>
                        </button>
                      </td>
                      <td className="mono">
                        {e.filename.split(".").pop()?.toUpperCase()}
                      </td>
                      <td className="mono">{fileSize(e.size)}</td>
                      <td>
                        <button
                          className="vault-hash-button mono"
                          title={e.sha256}
                          onClick={() => {
                            setSelected(e.id);
                            setCopied(false);
                          }}
                        >
                          {e.sha256.slice(0, 10)}…{e.sha256.slice(-6)}
                        </button>
                      </td>
                      <td className="mono">
                        {e.created_at.slice(0, 10)}
                        <small>{e.created_at.slice(11, 19)}</small>
                      </td>
                      <td>
                        <Badge
                          tone={
                            e.status === "ready"
                              ? "green"
                              : e.status === "failed"
                                ? "high"
                                : "amber"
                          }
                        >
                          {e.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={
                data.evidence.length
                  ? "No matching evidence"
                  : "No evidence in this investigation"
              }
            >
              <p>
                {data.evidence.length
                  ? "Try a filename, checksum or source fragment."
                  : "Import a supported structured artifact to start reconstructing activity."}
              </p>
              <Button disabled={demo} onClick={() => onImport()}>
                <Upload size={14} />
                Import evidence
              </Button>
            </Empty>
          )}
          <button
            className="vault-drop-hint"
            disabled={demo}
            onClick={() => onImport()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (!demo) onImport(e.dataTransfer.files[0]);
            }}
          >
            <span className="drop-registration">+</span>
            <Upload size={23} strokeWidth={1} />
            <span>
              <strong>Bring the next piece of evidence.</strong>
              <small>Drop a structured artifact here, or choose a file.</small>
            </span>
            <span className="mono">
              JSON / JSONL / CSV
              <br />
              MAX 20 MiB
            </span>
            <ArrowRight size={15} />
          </button>
          <div className="vault-inventory-foot">
            <Fingerprint size={13} />
            <span>
              Original source and normalized events are stored separately.
              Application custody is recorded for every import.
            </span>
          </div>
        </div>
        {artifact && (
          <aside
            className="vault-detail-rail"
            aria-label="Evidence detail rail"
          >
            <span className="eyebrow">
              ORIGINAL EVIDENCE / EV-{shortId(artifact.id)}
            </span>
            <div className="vault-detail-glyph">
              <FileJson2 size={29} strokeWidth={1} />
            </div>
            <h2>{artifact.filename}</h2>
            <Badge tone={artifact.status === "ready" ? "green" : "high"}>
              {artifact.status === "ready"
                ? "Original retained"
                : artifact.status}
            </Badge>
            <dl className="detail-fields">
              <div>
                <dt>Acquisition source</dt>
                <dd>{artifact.source}</dd>
              </div>
              <div>
                <dt>Acquired</dt>
                <dd className="mono">
                  {artifact.acquired_at || "Not supplied"}
                </dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd className="mono">{artifact.size.toLocaleString()} bytes</dd>
              </div>
              <div>
                <dt>Parser identity</dt>
                <dd className="mono">{artifact.parser}</dd>
              </div>
              <div>
                <dt>Derived / duplicate records</dt>
                <dd className="mono">
                  {artifact.record_count} / {artifact.duplicate_count}
                </dd>
              </div>
            </dl>
            <div className="vault-full-hash">
              <span>
                <Hash size={12} />
                SHA-256
              </span>
              <code>{artifact.sha256}</code>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(artifact.sha256);
                  setCopied(true);
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? "Copied" : "Copy checksum"}</span>
              </button>
            </div>
            {artifact.error && <p className="form-error">{artifact.error}</p>}
            <Button variant="secondary" onClick={() => onInspect(artifact.id)}>
              Inspect custody & original
              <ArrowRight size={12} />
            </Button>
          </aside>
        )}
      </div>
    </>
  );
}
