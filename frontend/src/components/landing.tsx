"use client";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  Check,
  FileJson2,
  Fingerprint,
  Hash,
  LockKeyhole,
  Pause,
  Play,
  ShieldCheck,
  SkipForward,
  X,
} from "lucide-react";
import { api, fileSize, timeLabel } from "@/lib/api";
import type { DemoData, ForensicEvent } from "@/lib/types";
import { Button } from "./ui/button";
import { Badge, Brand, ErrorState, Loading, Mark } from "./primitives";
import { DensityWave } from "./experience/density-wave";
import { SpatialEvidence } from "./experience/spatial-evidence";
import { HeroEvidence } from "./experience/hero-evidence";
import { LivingWorkspace } from "./experience/living-workspace";
import { SilverAtmosphere } from "./experience/silver-atmosphere";
const ForensicField = dynamic(() => import("./experience/forensic-field"), {
  ssr: false,
});
const EvidenceStage = dynamic(() => import("./experience/evidence-stage"), {
  ssr: false,
});
const chapters = [
  "The fragments",
  "The timeline",
  "The connections",
  "The investigation",
  "The evidence",
  "Enter SPECTRE",
];
function Chapter({
  index,
  title,
  subtitle,
  children,
  className = "",
}: {
  index: number;
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={`chapter-${index}`}
      className={`narrative-chapter chapter-${index} ${className}`}
      aria-labelledby={`chapter-title-${index}`}
    >
      <div className="chapter-registration">
        <span className="chapter-number">
          0{index}
          <span> / 06</span>
        </span>
        <span>SIGNALS FROM THE DARK</span>
        <i />
      </div>
      <div className="chapter-copy">
        <motion.div
          initial={{ opacity: 0.35, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
        >
          <span className="eyebrow">RECONSTRUCTION / CHAPTER 0{index}</span>
          <h2 id={`chapter-title-${index}`}>
            <span>{title.slice(0, title.lastIndexOf(" "))} </span>
            <em>{title.slice(title.lastIndexOf(" ") + 1)}.</em>
          </h2>
          <p className="chapter-subtitle">{subtitle}</p>
        </motion.div>
      </div>
      {children}
    </section>
  );
}
function FragmentChapter({
  data,
  paused,
  selected,
  onSelect,
}: {
  data?: DemoData;
  paused: boolean;
  selected?: ForensicEvent;
  onSelect: (event: ForensicEvent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [80, -50]);
  const [source, setSource] = useState("process");
  const selectedEvents =
    data?.events.filter((e) => e.category === source) || [];
  return (
    <Chapter
      index={1}
      title="The fragments"
      subtitle="From raw data to meaningful evidence."
      className="fragment-chapter"
    >
      <p className="chapter-description">
        A file. A process. A trace left behind.
        <br />
        Bring the scattered pieces into focus—while keeping the original in
        sight.
      </p>
      <div className="fragment-scene" ref={ref}>
        <EvidenceStage
          data={data}
          mode="fragments"
          category={source}
          selected={selected}
          onSelect={(event) => {
            setSource(event.category);
            onSelect(event);
          }}
          paused={paused}
          progress={scrollYProgress}
        />
        <motion.div className="fragment-records" style={{ y }}>
          {selectedEvents.slice(0, 3).map((event, i) => (
            <div
              key={event.id}
              className={`floating-record fragment-record-${i}`}
            >
              <FileJson2 size={13} />
              <span className="mono">#{event.record_ref}</span>
              <strong>{event.title}</strong>
              <span>{timeLabel(event.timestamp)} UTC</span>
            </div>
          ))}
        </motion.div>
        <div className="scene-coordinate">
          SOURCE / {data?.evidence[0]?.filename || "WAITING FOR ARTIFACT"}
          <span>ILLUSTRATIVE GEOMETRY · PARSED SYNTHETIC RECORDS</span>
        </div>
      </div>
      <div
        className="fragment-source-strip"
        role="group"
        aria-label="Explore supported evidence categories"
      >
        {[
          "authentication",
          "process",
          "file",
          "network",
          "registry",
          "dns",
        ].map((category) => (
          <button
            key={category}
            onClick={() => {
              setSource(category);
              const event = data?.events.find(
                (event) => event.category === category,
              );
              if (event) onSelect(event);
            }}
            className={source === category ? "active" : ""}
          >
            <span className="source-symbol">
              {category === "process"
                ? "⌘"
                : category === "network"
                  ? "↗"
                  : category === "file"
                    ? "▧"
                    : category === "registry"
                      ? "⌗"
                      : "◈"}
            </span>
            <strong>{category}</strong>
            <span>{data?.categories[category] || 0} records</span>
          </button>
        ))}
      </div>
      {selected && (
        <div className="fragment-focus-readout" role="status">
          <span>SELECTED SOURCE / #{selected.record_ref}</span>
          <strong>{selected.title}</strong>
          <span>{timeLabel(selected.timestamp)} UTC</span>
        </div>
      )}
      <Link href="/workspace/evidence?demo=1" className="narrative-link">
        Explore the evidence sources <ArrowRight size={14} />
      </Link>
    </Chapter>
  );
}
export function Landing() {
  const query = useQuery({
    queryKey: ["public-demo"],
    queryFn: () => api<DemoData>("/demo"),
    staleTime: 300_000,
  });
  const data = query.data;
  const [selection, setSelection] = useState<string>();
  const [paused, setPaused] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [evidenceTab, setEvidenceTab] = useState("Overview");
  const reduce = useReducedMotion();
  const hero = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: hero,
    offset: ["start start", "end start"],
  });
  const heroTypeY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduce ? 0 : 130],
  );
  const heroFieldScale = useTransform(
    scrollYProgress,
    [0, 1],
    [1, reduce ? 1 : 1.12],
  );
  const selected =
    data?.events.find((e) => e.id === selection) ||
    data?.events.find((e) =>
      data.findings.some(
        (f) => f.rule_id === "SP-001" && f.event_ids.includes(e.id),
      ),
    ) ||
    data?.events[0];
  const choose = useCallback((event: ForensicEvent) => {
    setSelection(event.id);
    setInspectorOpen(true);
  }, []);
  useEffect(() => {
    try {
      if (hero.current)
        hero.current.dataset.returning =
          sessionStorage.getItem("spectre-introduction-seen") === "1"
            ? "true"
            : "false";
      sessionStorage.setItem("spectre-introduction-seen", "1");
    } catch {
      /* The introduction remains short and skippable if storage is unavailable. */
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting)
            setActiveChapter(Number(e.target.id.split("-")[1]));
      },
      { rootMargin: "-35% 0px -40% 0px" },
    );
    document
      .querySelectorAll<HTMLElement>(".narrative-chapter")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  const artifact = data?.evidence[0];
  const noMotion = paused || skipped;
  return (
    <div
      className={`spectre-experience unseen-experience ${noMotion ? "experience-still" : ""}`}
    >
      <SilverAtmosphere paused={paused} />
      <header className="experience-header">
        <Link href="/" aria-label="SPECTRE home">
          <Brand />
          <span className="brand-purpose">
            DIGITAL FORENSICS
            <br />
            FOR A MORE SECURE WORLD
          </span>
        </Link>
        <nav aria-label="Product navigation">
          <a href="#main-content">Product</a>
          <a href="#chapter-1">Capabilities</a>
          <Link href="/workspace?demo=1">Cases</Link>
          <a href="#chapter-5">Technology</a>
          <a href="#open-source">Open source</a>
          <a href="#chapter-6">About</a>
        </nav>
        <div>
          <button
            className="motion-control"
            aria-label={
              paused ? "Resume ambient motion" : "Pause ambient motion"
            }
            onClick={() => setPaused((v) => !v)}
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
            <span>{paused ? "Motion paused" : "Ambient motion"}</span>
          </button>
          <Link href="/workspace" className="header-sign-in">
            Sign in
          </Link>
          <Button asChild variant="secondary" size="sm">
            <Link href="/workspace">
              Open workspace <ArrowRight size={13} />
            </Link>
          </Button>
        </div>
      </header>
      <main id="main-content">
        <section
          className={`reconstruction-hero ${skipped ? "intro-skipped" : ""}`}
          ref={hero}
          aria-label="The reconstruction"
        >
          <motion.div
            className="hero-environment"
            style={{ scale: heroFieldScale }}
          >
            <EvidenceStage
              data={data}
              selected={selected}
              onSelect={choose}
              paused={paused}
            />
            <div className="volumetric-wash" />
            <div className="scene-grain" />
            {data && (
              <HeroEvidence
                data={data}
                selected={selected?.id}
                onSelect={choose}
              />
            )}
          </motion.div>
          <div className="hero-terrain" aria-hidden="true">
            <ForensicField mode="ridge" paused={paused} />
          </div>
          <div className="hero-topline">
            <span>
              <i />
              LOCAL-FIRST FORENSIC INTELLIGENCE
            </span>
            <span>SIGNAL 001 / RECONSTRUCTION</span>
          </div>
          <motion.div className="reconstruction-type" style={{ y: heroTypeY }}>
            <p className="hero-pretitle">SPECTRE / DIGITAL FORENSICS</p>
            <h1 aria-label="Reconstruct the unseen.">
              {[
                "Reconstruct",
                <>
                  the <em>unseen.</em>
                </>,
              ].map((line, i) => (
                <span className={`kinetic-line kinetic-line-${i}`} key={i}>
                  <motion.span
                    initial={noMotion ? false : { y: "108%", opacity: 0.2 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      duration: 0.85,
                      delay: noMotion ? 0 : 0.12 + i * 0.12,
                      ease: [0.2, 0.8, 0.2, 1],
                    }}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>
            <p className="hero-promise">
              From raw artifacts to a traceable sequence of events.
              <br />
              Examine process activity, correlate evidence and
              <br className="desktop-break" /> investigate what happened.
            </p>
            <div className="experience-actions">
              <Button asChild>
                <Link href="/workspace">
                  Open workspace <ArrowRight size={15} />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/workspace?demo=1">
                  Explore sample case <ArrowRight size={15} />
                </Link>
              </Button>
            </div>
            <p className="hero-local-note">
              <LockKeyhole size={11} />
              Private by design. Investigate on your machine.
            </p>
          </motion.div>
          {data && (
            <div className="hero-mini-timeline">
              <DensityWave
                events={data.events}
                findings={data.findings}
                selected={selected?.id}
                onSelect={choose}
              />
              <span className="hero-time-range">
                {data.start?.slice(0, 10)}
                <br />
                SOURCE TIMESTAMPS / UTC
              </span>
            </div>
          )}
          <div className="hero-marginalia">
            <span>DIGITAL FORENSICS</span>
            <span>INCIDENT RECONSTRUCTION</span>
            <span>EVIDENCE → UNDERSTANDING</span>
            <i />
            <span>NO CLOUD REQUIRED</span>
          </div>
          <AnimatePresence>
            {inspectorOpen && selected && (
              <motion.div
                className="hero-selection"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
              >
                <div>
                  <span>SELECTED SOURCE RECORD</span>
                  <button
                    aria-label="Close narrative inspector"
                    onClick={() => setInspectorOpen(false)}
                  >
                    <X size={13} />
                  </button>
                </div>
                <Badge tone="cyan">{selected.category}</Badge>
                <h3>{selected.title}</h3>
                <p className="mono">
                  {timeLabel(selected.timestamp, false, true)} UTC
                </p>
                <dl>
                  <div>
                    <dt>Host</dt>
                    <dd>{selected.host}</dd>
                  </div>
                  <div>
                    <dt>Record</dt>
                    <dd>#{selected.record_ref}</dd>
                  </div>
                </dl>
                <span className="selection-provenance">
                  SYNTHETIC / PARSED EVIDENCE
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          {query.error && (
            <div className="hero-api-state">
              <ErrorState error={query.error} retry={() => query.refetch()} />
            </div>
          )}
          <div className="hero-footer">
            <a href="#chapter-1">
              <span className="scroll-track">
                <i />
              </span>
              <span>
                SCROLL <ArrowDown size={12} />
              </span>
            </a>
            <nav
              className="hero-chapter-rail"
              aria-label="Explore the six chapters"
            >
              {chapters.map((chapter, i) => (
                <a key={chapter} href={`#chapter-${i + 1}`}>
                  <span>
                    0{i + 1}
                    <i />
                  </span>
                  <strong>{chapter}</strong>
                </a>
              ))}
            </nav>
            <span className="hero-synthetic-label">
              <Badge tone="cyan">SYNTHETIC EVIDENCE</Badge>ILLUSTRATIVE
              ENVIRONMENT / ACTUAL PARSER OUTPUT
            </span>
            <div>
              <span className="hero-scene-index">
                01<span>/ 07</span>
              </span>
              <button className="skip-intro" onClick={() => setSkipped(true)}>
                <SkipForward size={11} />
                {skipped ? "Introduction settled" : "Skip introduction"}
              </button>
            </div>
          </div>
        </section>
        <div
          className={`story-navigation ${activeChapter ? "in-story" : ""}`}
          aria-label="Narrative chapters"
        >
          {chapters.map((label, i) => (
            <a
              key={label}
              href={`#chapter-${i + 1}`}
              className={activeChapter === i + 1 ? "active" : ""}
              aria-label={`Chapter ${i + 1}: ${label}`}
            >
              <span>0{i + 1}</span>
              <i />
              <span>{label}</span>
            </a>
          ))}
        </div>
        <FragmentChapter
          data={data}
          paused={paused}
          selected={selected}
          onSelect={choose}
        />
        <Chapter
          index={2}
          title="The timeline"
          subtitle="Time makes the fragments speak."
          className="waveform-chapter"
        >
          <p className="chapter-description">
            Not just what happened. What happened next.
            <br />
            Follow the chronology. Select a signal. Examine the source.
          </p>
          <div className="narrative-wave">
            <div className="timeline-depth-scene" aria-hidden="true">
              <EvidenceStage
                data={data}
                selected={selected}
                paused={paused}
                mode="timeline"
              />
            </div>
            {data ? (
              <DensityWave
                events={data.events}
                findings={data.findings}
                selected={selected?.id}
                onSelect={choose}
              />
            ) : (
              <Loading label="Reading the synthetic chronology" />
            )}
          </div>
          <div className="timeline-story-foot">
            <Link href="/workspace/timeline?demo=1" className="narrative-link">
              See the Timeline Explorer <ArrowRight size={14} />
            </Link>
            {selected && (
              <div className="story-current-event">
                <span className="mono">{timeLabel(selected.timestamp)}</span>
                <span>{selected.title}</span>
                <i />
              </div>
            )}
          </div>
        </Chapter>
        <Chapter
          index={3}
          title="The connections"
          subtitle="The space between events tells its own story."
          className="constellation-chapter"
        >
          <div className="chapter-side-copy">
            <p className="chapter-description">
              One process leads to another. A connection becomes a question.
              Explore the relationships the evidence actually supports.
            </p>
            <Link href="/workspace/graph?demo=1" className="narrative-link">
              Explore relationships <ArrowRight size={14} />
            </Link>
            <span className="chapter-note">
              <span className="lead-square" />
              Rule match. Analyst review required.
            </span>
          </div>
          <div className="connections-scene">
            {data && (
              <SpatialEvidence
                data={data}
                selected={selected?.id}
                onSelect={choose}
              />
            )}
            <div className="connection-readout">
              <span>SELECTED / {selected?.category || "PROCESS"}</span>
              <strong>{selected?.title || "Reading evidence…"}</strong>
              <span>
                Source record #{selected?.record_ref} ·{" "}
                {selected && timeLabel(selected.timestamp)} UTC
              </span>
            </div>
          </div>
        </Chapter>
        <Chapter
          index={4}
          title="The investigation"
          subtitle="Your evidence. One field of view."
          className="investigation-chapter"
        >
          <p className="chapter-description">
            Trace the signal from chronology to context.
            <br />
            The timeline, the relationship, the original—connected.
          </p>
          {data && (
            <LivingWorkspace
              data={data}
              selected={selected}
              onSelect={choose}
            />
          )}
          <p className="preview-integrity-note">
            A live projection of the parsed synthetic case. Select a node or
            timeline event; the views share one selection.
          </p>
        </Chapter>
        <Chapter
          index={5}
          title="The evidence"
          subtitle="Preserve the source. Defend the reasoning."
          className="evidence-chapter"
        >
          <div className="chapter-side-copy">
            <p className="chapter-description">
              Every conclusion should lead back to something you can inspect.
              Keep originals, hashes and provenance beside the story you
              reconstruct.
            </p>
            <Link href="/workspace/evidence?demo=1" className="narrative-link">
              Explore the Evidence Vault <ArrowRight size={14} />
            </Link>
            <span className="chapter-note">
              APPLICATION CUSTODY / ORIGINALS RETAINED
            </span>
          </div>
          <div className="evidence-document-scene">
            <div className="document-stack" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{ "--sheet-index": i } as React.CSSProperties}
                >
                  <span>SPECTRE / SOURCE MATERIAL</span>
                  <Fingerprint size={62} strokeWidth={0.6} />
                  <i />
                  <i />
                  <i />
                  <span>SHA-256 / PRESERVED ORIGINAL</span>
                </div>
              ))}
            </div>
            <div className="evidence-material-inspector">
              <div>
                <FileJson2 size={27} strokeWidth={1} />
                <span>
                  <strong>{artifact?.filename || "Original artifact"}</strong>
                  <small>SYNTHETIC / STRUCTURED LOG RECORDS</small>
                </span>
              </div>
              <nav
                className="material-inspection-tabs"
                aria-label="Evidence preview"
              >
                {["Overview", "Raw data", "Metadata"].map((tab) => (
                  <button
                    key={tab}
                    aria-pressed={evidenceTab === tab}
                    onClick={() => setEvidenceTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
              {evidenceTab === "Raw data" ? (
                <pre
                  className="material-raw-record"
                  tabIndex={0}
                  role="region"
                  aria-label="Raw source record"
                >
                  {JSON.stringify(selected, null, 2)}
                </pre>
              ) : evidenceTab === "Metadata" ? (
                <dl>
                  <div>
                    <dt>Record ID</dt>
                    <dd>{selected?.id}</dd>
                  </div>
                  <div>
                    <dt>Original timestamp</dt>
                    <dd>{selected?.original_timestamp}</dd>
                  </div>
                  <div>
                    <dt>Precision</dt>
                    <dd>{selected?.precision}</dd>
                  </div>
                  <div>
                    <dt>Source format</dt>
                    <dd>{selected?.source_format}</dd>
                  </div>
                </dl>
              ) : (
                <>
                  <dl>
                    <div>
                      <dt>Size</dt>
                      <dd>{artifact ? fileSize(artifact.size) : "—"}</dd>
                    </div>
                    <div>
                      <dt>Normalized events</dt>
                      <dd>{artifact?.record_count ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>Parser</dt>
                      <dd>{artifact?.parser || "—"}</dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>{artifact?.source || "—"}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <Badge tone="green">
                          {artifact?.status || "waiting"}
                        </Badge>
                      </dd>
                    </div>
                  </dl>
                  <div className="material-hash">
                    <span>
                      <Hash size={11} />
                      SHA-256 / ORIGINAL FILE
                    </span>
                    <code>
                      {artifact?.sha256 || "Reading the source checksum…"}
                    </code>
                    <span>
                      <Check size={11} />
                      Hash calculated during import
                    </span>
                  </div>
                </>
              )}
              <Link href="/workspace/reports?demo=1">
                From evidence to dossier <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </Chapter>
        <Chapter
          index={6}
          title="Enter SPECTRE"
          subtitle="Turn evidence into understanding."
          className="enter-chapter"
        >
          <div className="closing-environment">
            <div className="portal-artwork">
              <Image
                src="/experience/portal.webp"
                alt=""
                width={1024}
                height={1536}
                unoptimized
              />
            </div>
            <div className="portal-light" />
            <ForensicField mode="vortex" paused={paused} />
            <div className="scene-grain" />
          </div>
          <div className="closing-type">
            <span>GO FROM QUESTIONS TO ANSWERS</span>
            <strong>
              Enter <em>SPECTRE.</em>
            </strong>
            <p>
              A modern forensics platform for
              <br />
              faster investigations and a more secure world.
            </p>
            <div className="experience-actions">
              <Button asChild>
                <Link href="/workspace">
                  Enter SPECTRE <ArrowRight size={15} />
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/workspace?demo=1">
                  Explore Demo Case <ArrowRight size={15} />
                </Link>
              </Button>
            </div>
          </div>
          <div className="closing-manifesto">
            SIGNALS
            <br />
            FROM
            <br />
            THE
            <br />
            <span>DARK.</span>
          </div>
          <div className="closing-baseline">
            <ShieldCheck size={13} />
            LOCAL BY DEFAULT. EVIDENCE ALWAYS.
          </div>
        </Chapter>
      </main>
      <footer className="experience-footer" id="open-source">
        <Link href="/">
          <Mark size={23} />
          SPECTRE
        </Link>
        <span>FORENSIC INTELLIGENCE / NATIVE LOCAL WORKSPACE</span>
        <span>
          JSON · JSONL · CSV
          <span className="footer-release">
            ENGINE 0.1 / NO AI KEY REQUIRED
          </span>
        </span>
        <a href="#main-content">
          BACK TO THE SIGNAL <ArrowRight size={11} />
        </a>
      </footer>
    </div>
  );
}
