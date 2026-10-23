export interface Investigation {
  id: string;
  name: string;
  description: string;
  status: string;
  is_demo: boolean;
  created_at: string;
  evidence_count: number;
  event_count: number;
  finding_count: number;
}
export interface Evidence {
  id: string;
  case_id: string;
  filename: string;
  sha256: string;
  size: number;
  source: string;
  acquired_at: string | null;
  status: string;
  parser: string;
  record_count: number;
  duplicate_count: number;
  error: string | null;
  created_at: string;
}
export interface ForensicEvent {
  id: string;
  case_id: string;
  evidence_id: string;
  timestamp: string;
  original_timestamp: string;
  precision: string;
  host: string;
  user: string;
  category: string;
  action: string;
  title: string;
  process_key: string | null;
  parent_key: string | null;
  source_format: string;
  record_ref: string;
  fields: Record<string, string | number | null>;
  raw?: Record<string, unknown>;
  sources?: { evidence_id: string; record_ref: string }[];
}
export interface Finding {
  id: string;
  rule_id: string;
  rule_version: string;
  title: string;
  severity: string;
  rationale: string;
  limitations: string;
  mitre: string | null;
  event_ids: string[];
  status: string;
  notes: string;
}
export interface Annotation {
  id: string;
  event_id: string | null;
  text: string;
  created_at: string;
  bookmarked: boolean;
}
export interface Entity {
  id: string;
  kind: string;
  key: string;
  label: string;
  details: Record<string, string | number | null>;
}
export interface Relationship {
  id: string;
  source_id: string;
  target_id: string;
  kind: string;
  event_id: string;
  evidence_id: string;
}
export interface WorkspaceData {
  case: Investigation;
  evidence: Evidence[];
  findings: Finding[];
  annotations: Annotation[];
  jobs: {
    id: string;
    status: string;
    evidence_id: string;
    error: string | null;
  }[];
  hosts: string[];
  users: string[];
  categories: Record<string, number>;
  start: string | null;
  end: string | null;
}
export interface DemoData extends WorkspaceData {
  events: ForensicEvent[];
  entities: Entity[];
  relationships: Relationship[];
}
export interface GraphData {
  entities: Entity[];
  relationships: Relationship[];
  truncated?: boolean;
}
export interface EventPage {
  items: ForensicEvent[];
  next_cursor: string | null;
}
export interface Density {
  bins: { timestamp: string; count: number }[];
  start: string | null;
  end: string | null;
}
export interface Report {
  id: string;
  content_sha256: string;
  created_at: string;
}
