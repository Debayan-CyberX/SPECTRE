import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Timeline } from "@/components/timeline";
import type { ForensicEvent } from "@/lib/types";
const event: ForensicEvent = {
  id: "event-1",
  case_id: "case-1",
  evidence_id: "evidence-1",
  timestamp: "2026-09-14T09:45:00.000000Z",
  original_timestamp: "2026-09-14T15:15:00+05:30",
  precision: "seconds",
  host: "workstation",
  user: "analyst",
  category: "process",
  action: "created",
  title: "PowerShell started",
  process_key: "host:guid",
  parent_key: null,
  source_format: "jsonl",
  record_ref: "2",
  fields: { image: "powershell.exe", pid: 12 },
};
describe("Timeline investigation controls", () => {
  it("selects the exact source event with a keyboard-accessible button", () => {
    const select = vi.fn();
    render(
      <Timeline
        events={[event]}
        findings={[]}
        start="2026-09-14T09:40:00Z"
        end="2026-09-14T09:50:00Z"
        onSelect={select}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /PowerShell started at/ }),
    );
    expect(select).toHaveBeenCalledWith(event);
  });
  it("zooms around the selected source event and can reset the range", () => {
    const range = vi.fn();
    render(
      <Timeline
        events={[event]}
        findings={[]}
        selected={event.id}
        start="2026-09-14T09:40:00Z"
        end="2026-09-14T09:50:00Z"
        onSelect={() => {}}
        onRange={range}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Zoom in timeline" }));
    const [lo, hi] = range.mock.calls[0][0];
    expect(hi - lo).toBe(300_000);
    expect((hi + lo) / 2).toBe(Date.parse(event.timestamp));
    fireEvent.click(screen.getByRole("button", { name: "Reset time range" }));
    expect(range).toHaveBeenLastCalledWith(undefined);
  });
  it("explains a filtered empty view without rendering invented points", () => {
    render(
      <Timeline
        events={[]}
        findings={[]}
        start={null}
        end={null}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("No events in this view")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
