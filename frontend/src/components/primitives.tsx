import { AlertCircle, Fingerprint, LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";
import type { ReactNode } from "react";
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M20 3 36 12v16L20 37 4 28V12L20 3Z"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path
        d="m20 10 10 6v8l-10 6-10-6v-8l10-6Z"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <path d="m20 16 4 2.4v3.2L20 24l-4-2.4v-3.2l4-2.4Z" fill="currentColor" />
      <path
        d="M20 3v7m16 2-6 4m6 12-6-4m-10 6v7M4 28l6-4M4 12l6 4"
        stroke="currentColor"
        strokeWidth=".8"
      />
    </svg>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <Mark size={compact ? 24 : 30} />
      <span>
        SPECTRE<span className="brand-period">.</span>
      </span>
    </span>
  );
}
export function Badge({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Loading({ label = "Loading evidence" }: { label?: string }) {
  return (
    <div className="state-message" role="status">
      <LoaderCircle className="spin" size={20} />
      <span>{label}</span>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="state-message error" role="alert">
      <AlertCircle size={21} />
      <p>{error instanceof Error ? error.message : "Something went wrong."}</p>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <Fingerprint size={32} strokeWidth={1} />
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}
