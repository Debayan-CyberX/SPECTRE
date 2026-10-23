"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock3,
  Command,
  FileCheck2,
  Fingerprint,
  FolderSearch2,
  GitBranch,
  HardDrive,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Pause,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import type {
  DemoData,
  Density,
  EventPage,
  ForensicEvent,
  GraphData,
  Investigation,
  WorkspaceData,
} from "@/lib/types";
import { Badge, Brand, Empty, ErrorState, Loading } from "./primitives";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { AuthScreen } from "./auth-screen";
import { Timeline, EventTable } from "./timeline";
import { OverviewCommand } from "./overview-command";
import { SilverAtmosphere } from "./experience/silver-atmosphere";
import { ImportDialog } from "./import-dialog";
import { EventInspector } from "./event-inspector";
import {
  EvidenceDetail,
  EvidenceVault,
  FindingsView,
  InvestigationsView,
  ReportsView,
} from "./case-views";
const GraphExplorer = dynamic(() => import("./graph-explorer"), {
  ssr: false,
  loading: () => <Loading label="Opening relationship explorer" />,
});
const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "investigations", label: "Investigations", icon: FolderSearch2 },
  { id: "evidence", label: "Evidence Vault", icon: HardDrive },
  { id: "timeline", label: "Timeline", icon: Clock3 },
  { id: "processes", label: "Process Explorer", icon: GitBranch },
  { id: "graph", label: "Relationship Graph", icon: Network },
  { id: "findings", label: "Findings", icon: Fingerprint },
  { id: "reports", label: "Reports", icon: FileCheck2 },
  { id: "settings", label: "Settings", icon: Settings2 },
];
const caseSchema = z.object({
  name: z.string().trim().min(1, "Give this investigation a name.").max(160),
  description: z.string().max(4000),
});
type CaseValues = z.infer<typeof caseSchema>;

export function Workspace() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const client = useQueryClient();
  const demo = searchParams.get("demo") === "1";
  const requestedCase = searchParams.get("case");
  const view = pathname.split("/")[2] || "overview";
  const [mobileNav, setMobileNav] = useState(false);
  const [collapsedNav, setCollapsedNav] = useState(false);
  const [ambientPaused, setAmbientPaused] = useState(false);
  const [inspectorWidth, setInspectorWidth] = useState(340);
  const [command, setCommand] = useState(false);
  const [commandSearch, setCommandSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File>();
  const [evidenceId, setEvidenceId] = useState<string>();
  const [selected, setSelected] = useState<ForensicEvent>();
  const [findingFocus, setFindingFocus] = useState<string>();
  const [local, setLocal] = useState(false);
  const [q, setQ] = useState("");
  const query = useDeferredValue(q);
  const [category, setCategory] = useState("");
  const [host, setHost] = useState("");
  const [account, setAccount] = useState("");
  const [range, setRange] = useState<[number, number]>();
  const [bookmarks, setBookmarks] = useState(false);
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ id: string; username: string }>("/auth/me"),
    enabled: !demo,
  });
  const demoQuery = useQuery({
    queryKey: ["public-demo"],
    queryFn: () => api<DemoData>("/demo"),
    enabled: demo,
  });
  const caseQuery = useQuery({
    queryKey: ["cases"],
    queryFn: () => api<Investigation[]>("/cases"),
    enabled: !demo && !!me.data,
  });
  const caseId = demo
    ? demoQuery.data?.case.id
    : requestedCase || caseQuery.data?.[0]?.id;
  const workspaceQuery = useQuery({
    queryKey: ["workspace", caseId],
    queryFn: () => api<WorkspaceData>(`/cases/${caseId}/workspace`),
    enabled: !demo && !!caseId && !!me.data,
  });
  const data = demo ? demoQuery.data : workspaceQuery.data;
  const pageQuery = useInfiniteQuery({
    queryKey: ["events", caseId, query, category, host, account, range],
    initialPageParam: "",
    placeholderData: keepPreviousData,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: "250",
        ...(query && { q: query }),
        ...(category && { category }),
        ...(host && { host }),
        ...(account && { user: account }),
        ...(pageParam && { cursor: pageParam }),
        ...(range && {
          start: new Date(range[0]).toISOString(),
          end: new Date(range[1]).toISOString(),
        }),
      });
      return api<EventPage>(`/cases/${caseId}/events?${params}`);
    },
    getNextPageParam: (page) => page.next_cursor || undefined,
    enabled: !demo && !!caseId && !!me.data,
  });
  const density = useQuery({
    queryKey: ["density", caseId],
    queryFn: () => api<Density>(`/cases/${caseId}/density`),
    enabled: !demo && !!caseId && !!me.data,
  });
  const graph = useQuery({
    queryKey: ["graph", caseId],
    queryFn: () => api<GraphData>(`/cases/${caseId}/graph`),
    enabled:
      !demo && !!caseId && !!me.data && ["processes", "graph"].includes(view),
  });
  const allEvents = demo
    ? demoQuery.data?.events || []
    : pageQuery.data?.pages.flatMap((page) => page.items) || [];
  const events = allEvents.filter(
    (e) =>
      (!demo ||
        ((!query ||
          `${e.title} ${e.host}`.toLowerCase().includes(query.toLowerCase())) &&
          (!category || e.category === category) &&
          (!host || e.host === host) &&
          (!account || e.user === account) &&
          (!range ||
            (Date.parse(e.timestamp) >= range[0] &&
              Date.parse(e.timestamp) <= range[1])))) &&
      (!bookmarks ||
        data?.annotations.some((a) => a.event_id === e.id && a.bookmarked)),
  );
  const cases = demo ? (data ? [data.case] : []) : caseQuery.data || [];
  const selectedEvent = selected?.case_id === caseId ? selected : undefined;
  const setSelection = useCallback((e: ForensicEvent) => setSelected(e), []);
  const href = (nextView: string, id = caseId) =>
    `/workspace${nextView === "overview" ? "" : `/${nextView}`}?${demo ? "demo=1" : id ? `case=${id}` : ""}`;
  const navigate = (nextView: string) => {
    router.push(href(nextView));
    setMobileNav(false);
    setCommand(false);
  };
  const importDemo = useMutation({
    mutationFn: () =>
      api<Investigation>("/demo/import", { method: "POST", body: "{}" }),
    onSuccess: (c) => {
      client.invalidateQueries({ queryKey: ["cases"] });
      setSelected(undefined);
      router.push(`/workspace?case=${c.id}`);
    },
  });
  const logout = useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      client.clear();
      window.location.replace("/workspace");
    },
  });
  const form = useForm<CaseValues>({
    resolver: zodResolver(caseSchema),
    defaultValues: { name: "", description: "" },
  });
  const createCase = useMutation({
    mutationFn: (values: CaseValues) =>
      api<Investigation>("/cases", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (c) => {
      client.invalidateQueries({ queryKey: ["cases"] });
      setCreateOpen(false);
      form.reset();
      setSelected(undefined);
      router.push(`/workspace?case=${c.id}`);
    },
  });
  const editCase = useMutation({
    mutationFn: (status: string) =>
      api(`/cases/${caseId}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["workspace", caseId] });
      client.invalidateQueries({ queryKey: ["cases"] });
    },
  });
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommand((v) => !v);
      }
      if (e.key === "Escape") {
        setSelected(undefined);
        setMobileNav(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  async function inspectEvent(id: string) {
    const event = allEvents.find((e) => e.id === id);
    if (event) setSelected(event);
    else if (!demo && caseId) {
      try {
        setSelected(await api<ForensicEvent>(`/cases/${caseId}/events/${id}`));
      } catch (error) {
        setEventError(error);
      }
    }
  }
  const [eventError, setEventError] = useState<unknown>();
  if (!demo && me.isPending)
    return (
      <main id="main-content">
        <Loading label="Checking local session" />
      </main>
    );
  if (!demo && me.error)
    return me.error instanceof ApiError && me.error.status === 401 ? (
      <AuthScreen />
    ) : (
      <main id="main-content">
        <ErrorState error={me.error} retry={() => me.refetch()} />
      </main>
    );
  const mainError = demo
    ? demoQuery.error
    : caseQuery.error || workspaceQuery.error;
  const activeNav = NAV.find((n) => n.id === view);
  const totalReview =
    data?.findings.filter((f) => f.status === "unreviewed").length || 0;
  return (
    <div
      className={`workspace-shell intelligence-shell unseen-workspace view-${view} ${selectedEvent ? "with-inspector" : ""} ${mobileNav ? "nav-open" : ""} ${collapsedNav ? "nav-collapsed" : ""}`}
      style={
        { "--inspector-width": `${inspectorWidth}px` } as React.CSSProperties
      }
      data-motion={ambientPaused ? "paused" : "ambient"}
    >
      <aside className="workspace-sidebar">
        <Link href="/" className="sidebar-brand" aria-label="SPECTRE home">
          <Brand compact />
        </Link>
        <button
          className="sidebar-collapse"
          aria-label={collapsedNav ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsedNav((v) => !v)}
        >
          <ChevronDown size={13} />
        </button>
        <div className="workspace-label">
          <span>INVESTIGATION WORKSPACE</span>
          <Badge>LOCAL</Badge>
        </div>
        <div className="case-switcher">
          <FolderSearch2 size={16} />
          <select
            aria-label="Current investigation"
            value={caseId || ""}
            onChange={(e) => {
              setSelected(undefined);
              setRange(undefined);
              setCategory("");
              setHost("");
              setAccount("");
              setQ("");
              router.push(href("overview", e.target.value));
            }}
          >
            <option value="" disabled>
              Select investigation
            </option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown size={12} />
        </div>
        <Button
          variant="ghost"
          className="sidebar-search"
          onClick={() => setCommand(true)}
        >
          <Search size={14} />
          Search workspace <kbd>Ctrl K</kbd>
        </Button>
        <nav aria-label="Investigation navigation">
          {NAV.map((item, index) => (
            <Link
              key={item.id}
              href={href(item.id)}
              className={`${view === item.id ? "active" : ""} ${index === 8 ? "nav-settings" : ""}`}
              onClick={() => setMobileNav(false)}
              aria-current={view === item.id ? "page" : undefined}
              aria-label={item.label}
            >
              <item.icon size={16} strokeWidth={1.5} />
              <span>{item.label}</span>
              {item.id === "findings" && totalReview > 0 ? (
                <span className="nav-count">{totalReview}</span>
              ) : null}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-status">
            <span className="status-dot" />
            <span>LOCAL ENVIRONMENT</span>
            <ShieldCheck size={13} />
          </div>
          <div className="sidebar-user">
            <span className="user-avatar">
              {demo ? "D" : me.data?.username.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{demo ? "Demo analyst" : me.data?.username}</strong>
              <span>{demo ? "Read-only synthetic case" : "Local analyst"}</span>
            </div>
            {!demo && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                onClick={() => logout.mutate()}
              >
                <LogOut size={14} />
              </Button>
            )}
          </div>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="workspace-main">
        <SilverAtmosphere
          className="workspace-atmosphere"
          paused={ambientPaused}
          interactive={false}
        />
        <header className="workspace-topbar">
          <Button
            variant="ghost"
            size="icon"
            className="mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobileNav((v) => !v)}
          >
            <Menu size={18} />
          </Button>
          <div className="breadcrumbs">
            <FolderSearch2 size={13} />
            <span>{data?.case.name || "Workspace"}</span>
            <ChevronRight size={12} />
            <strong>{activeNav?.label || "Unknown view"}</strong>
          </div>
          <div className="topbar-actions">
            <span className="processing-state">
              <span className="status-dot" />
              {data?.jobs.some((j) => j.status === "processing")
                ? "Processing evidence"
                : "No active jobs"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                ambientPaused ? "Resume ambient motion" : "Pause ambient motion"
              }
              aria-pressed={ambientPaused}
              className="workspace-motion-control"
              onClick={() => setAmbientPaused((value) => !value)}
            >
              {ambientPaused ? <Play size={14} /> : <Pause size={14} />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open command palette"
              onClick={() => setCommand(true)}
            >
              <Command size={16} />
            </Button>
            <span className="topbar-divider" />
            <Button
              variant="secondary"
              size="sm"
              aria-label="Import evidence"
              disabled={demo || !caseId}
              onClick={() => setImportOpen(true)}
            >
              <Upload size={13} />
              <span>Import evidence</span>
            </Button>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <span>
              <span className="demo-indicator" />
              SYNTHETIC INVESTIGATION
              <span className="demo-banner-detail">
                {" "}
                / Read-only · actual parser output · no real endpoint data
              </span>
            </span>
            <Link href="/workspace">
              Sign in to investigate <ArrowRight size={12} />
            </Link>
          </div>
        )}
        <main id="main-content" className={`workspace-content content-${view}`}>
          {mainError ? (
            <ErrorState
              error={mainError}
              retry={() => (demo ? demoQuery.refetch() : caseQuery.refetch())}
            />
          ) : (
              demo
                ? demoQuery.isPending
                : caseQuery.isPending || (!!caseId && workspaceQuery.isPending)
            ) ? (
            <Loading label="Opening investigation" />
          ) : view === "investigations" ? (
            <InvestigationsView
              cases={cases}
              onSelect={(id) => {
                setSelected(undefined);
                router.push(href("overview", id));
              }}
              onCreate={() => setCreateOpen(true)}
              onDemo={() => importDemo.mutate()}
              demo={demo}
              pending={importDemo.isPending}
            />
          ) : view === "settings" ? (
            <SettingsView
              local={local}
              onLocal={setLocal}
              demo={demo}
              username={me.data?.username}
            />
          ) : !data ? (
            <div className="welcome-workspace">
              <span className="eyebrow">YOUR FORENSIC WORKSPACE IS READY</span>
              <h1>
                Start with a question.
                <br />
                <span>Follow it with evidence.</span>
              </h1>
              <p>
                Create an investigation for your own artifacts, or import
                Operation Glasshouse to explore a documented synthetic scenario.
              </p>
              <div>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus size={15} />
                  Create investigation
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => importDemo.mutate()}
                  disabled={importDemo.isPending}
                >
                  {importDemo.isPending
                    ? "Importing and processing…"
                    : "Import demo case"}
                  <ArrowRight size={14} />
                </Button>
              </div>
            </div>
          ) : (
            <>
              {view === "overview" && (
                <OverviewCommand
                  paused={ambientPaused}
                  data={data}
                  events={events}
                  density={density.data}
                  selected={selectedEvent?.id}
                  onSelect={setSelection}
                  local={local}
                  demo={demo}
                  onStatus={(status) => editCase.mutate(status)}
                  onNavigate={navigate}
                  onEvidence={setEvidenceId}
                  onFinding={(id) => {
                    setFindingFocus(id);
                    navigate("findings");
                  }}
                />
              )}
              {view === "timeline" && (
                <>
                  <div className="view-heading">
                    <div>
                      <span className="eyebrow">CHRONOLOGY WITH CONTEXT</span>
                      <h1>
                        Timeline Explorer
                        <span className="heading-count">
                          {data.case.event_count}
                        </span>
                      </h1>
                      <p>
                        Zoom into the sequence. Inspect the event behind every
                        point.
                      </p>
                    </div>
                    <button
                      className="timezone-switch"
                      onClick={() => setLocal((v) => !v)}
                    >
                      <Clock3 size={13} />
                      <span className={!local ? "active" : ""}>UTC</span>
                      <span className={local ? "active" : ""}>Local</span>
                    </button>
                  </div>
                  <div className="timeline-filters">
                    <div className="event-search">
                      <Search size={14} />
                      <input
                        aria-label="Search events"
                        placeholder="Search events or hosts…"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                      />
                    </div>
                    <select
                      aria-label="Filter by event source"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">All sources</option>
                      {Object.keys(data.categories).map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by host"
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                    >
                      <option value="">All hosts</option>
                      {data.hosts.map((h) => (
                        <option key={h}>{h}</option>
                      ))}
                    </select>
                    <select
                      aria-label="Filter by account"
                      value={account}
                      onChange={(e) => setAccount(e.target.value)}
                    >
                      <option value="">All accounts</option>
                      {data.users.map((u) => (
                        <option key={u}>{u}</option>
                      ))}
                    </select>
                    <button
                      className={`filter-bookmarks ${bookmarks ? "active" : ""}`}
                      onClick={() => setBookmarks((v) => !v)}
                    >
                      <BookOpen size={13} />
                      Bookmarks
                    </button>
                    {(q ||
                      category ||
                      host ||
                      account ||
                      range ||
                      bookmarks) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Clear filters"
                        onClick={() => {
                          setQ("");
                          setCategory("");
                          setHost("");
                          setAccount("");
                          setRange(undefined);
                          setBookmarks(false);
                        }}
                      >
                        <X size={13} />
                      </Button>
                    )}
                  </div>
                  {pageQuery.error ? (
                    <ErrorState error={pageQuery.error} />
                  ) : !demo && pageQuery.isPending ? (
                    <Loading />
                  ) : (
                    <div className="analytical-panel">
                      <Timeline
                        events={events}
                        findings={data.findings}
                        selected={selectedEvent?.id}
                        onSelect={setSelection}
                        start={data.start}
                        end={data.end}
                        range={range}
                        onRange={setRange}
                        immersive
                        density={density.data}
                        local={local}
                      />
                      <div className="table-section-label">
                        <span>EVENT RECORDS</span>
                        <span>
                          {events.length} loaded / {data.case.event_count} in
                          case
                        </span>
                      </div>
                      <EventTable
                        events={events}
                        findings={data.findings}
                        selected={selectedEvent?.id}
                        onSelect={setSelection}
                        local={local}
                      />
                      {pageQuery.hasNextPage && (
                        <div className="load-more">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => pageQuery.fetchNextPage()}
                            disabled={pageQuery.isFetchingNextPage}
                          >
                            {pageQuery.isFetchingNextPage
                              ? "Loading…"
                              : "Load next 250 events"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              {view === "evidence" && (
                <EvidenceVault
                  data={data}
                  demo={demo}
                  onImport={(file) => {
                    setPendingFile(file);
                    setImportOpen(true);
                  }}
                  onInspect={setEvidenceId}
                />
              )}
              {view === "findings" && (
                <FindingsView
                  data={data}
                  demo={demo}
                  focus={findingFocus}
                  onEvent={inspectEvent}
                />
              )}
              {view === "reports" && <ReportsView data={data} demo={demo} />}
              {["graph", "processes"].includes(view) && (
                <>
                  <div className="view-heading">
                    <div>
                      <span className="eyebrow">DOCUMENTED RELATIONSHIPS</span>
                      <h1>
                        {view === "processes"
                          ? "Process Explorer"
                          : "Relationship Graph"}
                      </h1>
                      <p>
                        {view === "processes"
                          ? "Recorded process identity. Explicit ancestry. Unresolved gaps."
                          : "Every connection traces to a source event. Select a relationship to inspect it."}
                      </p>
                    </div>
                    <Badge tone="cyan">PROVENANCE ATTACHED</Badge>
                  </div>
                  {graph.error ? (
                    <ErrorState error={graph.error} />
                  ) : !demo && graph.isPending ? (
                    <Loading />
                  ) : (
                    <GraphExplorer
                      key={`${caseId}:${view}`}
                      data={demo ? demoQuery.data! : graph.data!}
                      processesOnly={view === "processes"}
                      findings={data.findings}
                      onEvent={inspectEvent}
                      selectedEvent={selectedEvent}
                    />
                  )}
                </>
              )}
              {!activeNav && (
                <Empty title="Unknown workspace view">
                  <Button onClick={() => navigate("overview")}>
                    Return to overview
                  </Button>
                </Empty>
              )}
            </>
          )}
          {importDemo.error && (
            <p className="form-error" role="alert">
              {importDemo.error.message}
            </p>
          )}
          {eventError ? <ErrorState error={eventError} /> : null}
        </main>
        <footer className="workspace-statusbar">
          <span>
            <ShieldCheck size={11} />
            {demo ? "SYNTHETIC DATASET / READ ONLY" : "PRIVATE LOCAL WORKSPACE"}
          </span>
          <span>
            {data
              ? `${data.case.event_count} events · ${data.findings.length} findings`
              : "SPECTRE 0.1.0"}
            <span className="statusbar-divider">/</span>
            <button onClick={() => setCommand(true)}>
              Ctrl K <Command size={10} />
            </button>
          </span>
        </footer>
      </div>
      {selectedEvent && data && (
        <button
          className="inspector-resize-handle"
          aria-label="Resize evidence inspector"
          role="separator"
          aria-orientation="vertical"
          aria-valuemin={290}
          aria-valuemax={520}
          aria-valuenow={inspectorWidth}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              setInspectorWidth((w) =>
                Math.max(
                  290,
                  Math.min(520, w + (event.key === "ArrowLeft" ? 20 : -20)),
                ),
              );
            }
          }}
          onPointerDown={(event) => {
            const startX = event.clientX,
              initial = inspectorWidth;
            const el = event.currentTarget;
            el.setPointerCapture(event.pointerId);
            const move = (e: PointerEvent) =>
              setInspectorWidth(
                Math.max(290, Math.min(520, initial + startX - e.clientX)),
              );
            const stop = () => {
              el.removeEventListener("pointermove", move);
              el.removeEventListener("pointerup", stop);
              el.removeEventListener("pointercancel", stop);
            };
            el.addEventListener("pointermove", move);
            el.addEventListener("pointerup", stop);
            el.addEventListener("pointercancel", stop);
          }}
        />
      )}
      {selectedEvent && data && (
        <EventInspector
          key={selectedEvent.id}
          event={selectedEvent}
          workspace={data}
          demo={demo}
          local={local}
          onClose={() => setSelected(undefined)}
          onEvidence={setEvidenceId}
          onFinding={(id) => {
            setFindingFocus(id);
            navigate("findings");
          }}
        />
      )}
      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New investigation"
        description="Give your evidence a dedicated, private workspace."
      >
        <form
          onSubmit={form.handleSubmit((values) => createCase.mutate(values))}
        >
          <label htmlFor="case-name">Investigation name</label>
          <input
            id="case-name"
            placeholder="e.g. Suspicious activity / finance workstation"
            autoComplete="off"
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="form-error">{form.formState.errors.name.message}</p>
          )}
          <label htmlFor="case-description">Investigation context</label>
          <textarea
            id="case-description"
            rows={4}
            placeholder="What question are you investigating?"
            {...form.register("description")}
          />
          {createCase.error && (
            <p className="form-error" role="alert">
              {createCase.error.message}
            </p>
          )}
          <div className="dialog-actions">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createCase.isPending}>
              {createCase.isPending ? "Creating…" : "Create investigation"}
              <ArrowRight size={14} />
            </Button>
          </div>
        </form>
      </Dialog>
      {caseId && importOpen && (
        <ImportDialog
          key={caseId}
          caseId={caseId}
          open={importOpen}
          initialFile={pendingFile}
          onOpenChange={(value) => {
            setImportOpen(value);
            if (!value) setPendingFile(undefined);
          }}
        />
      )}
      <EvidenceDetail
        evidence={data?.evidence.find((e) => e.id === evidenceId)}
        demo={demo}
        open={!!evidenceId}
        onOpenChange={(value) => {
          if (!value) setEvidenceId(undefined);
        }}
      />
      <Dialog
        open={command}
        onOpenChange={setCommand}
        title="Go anywhere"
        description="Navigate your investigation. Use Ctrl K to open this palette."
        className="command-dialog"
      >
        <div className="command-input">
          <Search size={17} />
          <input
            aria-label="Search workspace commands"
            placeholder="Jump to a view or investigation…"
            value={commandSearch}
            onChange={(e) => setCommandSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div className="command-results">
          {NAV.filter((n) =>
            n.label.toLowerCase().includes(commandSearch.toLowerCase()),
          ).map((n) => (
            <button key={n.id} onClick={() => navigate(n.id)}>
              <n.icon size={16} />
              <span>{n.label}</span>
              <ArrowRight size={13} />
            </button>
          ))}
          {cases
            .filter((c) =>
              c.name.toLowerCase().includes(commandSearch.toLowerCase()),
            )
            .map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  router.push(href("overview", c.id));
                  setCommand(false);
                }}
              >
                <FolderSearch2 size={16} />
                <span>{c.name}</span>
                <Badge>CASE</Badge>
              </button>
            ))}
        </div>
        <div className="command-hint">
          <kbd>Tab</kbd>navigate <kbd>Enter</kbd>open <kbd>Esc</kbd>close
        </div>
      </Dialog>
    </div>
  );
}
function SettingsView({
  local,
  onLocal,
  demo,
  username,
}: {
  local: boolean;
  onLocal: (v: boolean) => void;
  demo: boolean;
  username?: string;
}) {
  return (
    <>
      <div className="view-heading">
        <div>
          <span className="eyebrow">WORKSPACE PREFERENCES</span>
          <h1>Settings & capabilities</h1>
          <p>Understand the boundaries of this local release.</p>
        </div>
        <Badge>v0.1.0 / INITIAL RELEASE</Badge>
      </div>
      <div className="settings-section">
        <h2>Analyst environment</h2>
        <div className="settings-row">
          <div>
            <strong>Account</strong>
            <span>
              {demo
                ? "Public synthetic demonstration / read only"
                : `${username} / private local analyst`}
            </span>
          </div>
          <Badge tone="cyan">{demo ? "DEMO" : "AUTHENTICATED"}</Badge>
        </div>
        <div className="settings-row">
          <div>
            <strong>Timestamp display</strong>
            <span>
              Normalization always stores UTC. Original timestamps are
              preserved.
            </span>
          </div>
          <select
            className="compact-select"
            aria-label="Timestamp display preference"
            value={local ? "local" : "utc"}
            onChange={(e) => onLocal(e.target.value === "local")}
          >
            <option value="utc">UTC</option>
            <option value="local">Browser local time</option>
          </select>
        </div>
      </div>
      <div className="settings-section">
        <h2>Supported in this release</h2>
        {[
          [
            "Structured evidence",
            "Flat Sysmon-style JSON/JSONL and CSV. Event IDs 1, 3, 11, 13, 22, 4624 and 4625, or documented normalized categories.",
          ],
          [
            "Import boundaries",
            "20 MiB per artifact, 10,000 records per artifact, 20,000 events per case. Parser child process has a 20-second deadline.",
          ],
          [
            "Deterministic rules",
            "Encoded PowerShell, Office-to-interpreter ancestry, GUID-linked network activity, and Run/RunOnce registry values.",
          ],
          [
            "Process identity",
            "Host and ProcessGuid. A creation without a GUID uses host, PID and start time; bare-PID network records remain uncorrelated.",
          ],
          [
            "Reports",
            "Stored JSON snapshots and PDF summaries with hashes, custody, findings, notes and source references.",
          ],
        ].map(([name, text]) => (
          <div className="settings-row" key={name}>
            <div>
              <strong>{name}</strong>
              <span>{text}</span>
            </div>
            <ShieldCheck size={17} />
          </div>
        ))}
      </div>
      <div className="settings-section">
        <h2>Planned / not implemented</h2>
        <p className="muted small-text">
          Binary EVTX ingestion · isolated queue workers · multi-analyst sharing
          · saved investigative filters · Plaso · optional AI assistance ·
          signed custody records. No external AI requests are made.
        </p>
        <p className="muted small-text">
          Local storage is protected by application access checks, not by
          tamper-proof media. This release is intended for local evaluation and
          is not a court-grade custody system.
        </p>
      </div>
      <Link href="/" className="text-link">
        <ArrowLeft size={14} />
        Back to the product site
      </Link>
    </>
  );
}
