"use client";
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileJson2, Upload, Fingerprint, LoaderCircle } from "lucide-react";
import { api, fileSize } from "@/lib/api";
import type { Evidence } from "@/lib/types";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
export function ImportDialog({
  caseId,
  open,
  onOpenChange,
  initialFile,
}: {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFile?: File;
}) {
  const [file, setFile] = useState<File | undefined>(initialFile);
  const [source, setSource] = useState("");
  const [acquired, setAcquired] = useState("");
  const [validation, setValidation] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const client = useQueryClient();
  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose an artifact first.");
      return api<Evidence>(`/cases/${caseId}/evidence`, {
        method: "POST",
        headers: {
          "X-Filename": encodeURIComponent(file.name),
          "Content-Type": "application/octet-stream",
          "X-Evidence-Source": encodeURIComponent(source || "Manual import"),
          ...(acquired
            ? { "X-Acquired-At": new Date(acquired).toISOString() }
            : {}),
        },
        body: file,
      });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["workspace", caseId] });
      client.invalidateQueries({ queryKey: ["events", caseId] });
      client.invalidateQueries({ queryKey: ["graph", caseId] });
      client.invalidateQueries({ queryKey: ["density", caseId] });
      client.invalidateQueries({ queryKey: ["cases"] });
    },
  });
  function choose(next?: File) {
    upload.reset();
    setValidation("");
    if (
      next &&
      (!/\.(jsonl|json|csv)$/i.test(next.name) ||
        next.size > 20 * 1024 * 1024 ||
        !next.size)
    ) {
      setValidation(
        "Choose a nonempty JSON, JSONL or CSV artifact up to 20 MiB.",
      );
      setFile(undefined);
      return;
    }
    setFile(next);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!upload.isPending) onOpenChange(next);
      }}
      title="Import evidence"
      description="Preserve the original. Derive the investigation."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          upload.mutate();
        }}
      >
        <button
          className={`import-dropzone ${file ? "has-file" : ""}`}
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            choose(e.dataTransfer.files[0]);
          }}
        >
          <span>
            {file ? (
              <FileJson2 size={27} />
            ) : (
              <Upload size={27} strokeWidth={1.3} />
            )}
          </span>
          <strong>{file?.name || "Drop a forensic artifact here"}</strong>
          <p>
            {file
              ? fileSize(file.size)
              : "or click to select from your machine"}
          </p>
          <small>JSON · JSONL · CSV / MAX 20 MiB</small>
        </button>
        <input
          ref={input}
          type="file"
          className="sr-only"
          accept=".json,.jsonl,.csv"
          aria-label="Choose evidence file"
          onChange={(e) => choose(e.target.files?.[0])}
        />
        <div className="form-grid">
          <div>
            <label htmlFor="evidence-source">Acquisition source</label>
            <input
              id="evidence-source"
              placeholder="e.g. FIN-WS-042 / live response"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              maxLength={200}
            />
          </div>
          <div>
            <label htmlFor="acquired">
              Acquired at{" "}
              <span className="muted">(your local time, optional)</span>
            </label>
            <input
              id="acquired"
              type="datetime-local"
              value={acquired}
              onChange={(e) => setAcquired(e.target.value)}
            />
          </div>
        </div>
        <div className="import-integrity">
          <Fingerprint size={18} />
          <p>
            SHA-256 is calculated while streaming. The original file is
            preserved separately from normalized events. Unsupported records
            fail the import and remain available for inspection.
          </p>
        </div>
        {(validation || upload.error) && (
          <p className="form-error" role="alert">
            {validation || upload.error?.message}
          </p>
        )}
        {upload.data && (
          <div
            className={
              upload.data.status === "ready" ? "form-success" : "form-error"
            }
            role="status"
          >
            {upload.data.status === "ready"
              ? `Import complete. ${upload.data.record_count} normalized events; ${upload.data.duplicate_count} duplicate records. SHA-256 ${upload.data.sha256}`
              : `Original preserved. Parsing failed: ${upload.data.error}`}
          </div>
        )}
        <div className="dialog-actions">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={upload.isPending}
          >
            {upload.data ? "Done" : "Cancel"}
          </Button>
          <Button
            type="submit"
            disabled={!file || upload.isPending || !!upload.data}
          >
            {upload.isPending ? (
              <>
                <LoaderCircle size={15} className="spin" /> Hashing and
                processing…
              </>
            ) : (
              <>
                <Upload size={15} /> Import & process
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
