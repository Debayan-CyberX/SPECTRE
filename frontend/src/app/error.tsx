"use client";
import { ErrorState } from "@/components/primitives";
export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main id="main-content">
      <ErrorState error={error} retry={reset} />
    </main>
  );
}
