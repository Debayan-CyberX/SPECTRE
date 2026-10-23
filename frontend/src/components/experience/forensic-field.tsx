"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion, type MotionValue } from "motion/react";

export type FieldMode =
  "network" | "fragments" | "vortex" | "terrain" | "ridge";

/** Illustrative geometry, never presented as telemetry or additional evidence records. */
export default function ForensicField({
  mode = "network",
  paused = false,
  progress,
}: {
  mode?: FieldMode;
  paused?: boolean;
  progress?: MotionValue<number>;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const context = element.getContext("2d", { alpha: true });
    if (!context) return; // Accessible HTML, CSS lighting and evidence controls remain available.
    const parent = element.parentElement!;
    const lowPower =
      (navigator.hardwareConcurrency || 4) < 4 ||
      window.matchMedia("(pointer: coarse)").matches;
    const still = !!reduce || paused;
    let visible = true,
      pageVisible = !document.hidden,
      frame = 0,
      width = 0,
      height = 0;
    let last = 0,
      elapsed = 0,
      pointerX = 0,
      pointerY = 0,
      targetX = 0,
      targetY = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5);
    const rows = lowPower ? 15 : mode === "ridge" ? 28 : 23,
      columns = lowPower ? 48 : mode === "ridge" ? 130 : 76;
    const clamp = (v: number) => Math.max(0, Math.min(1, v));
    function project(x: number, y: number, z: number) {
      const a = pointerX * 0.15,
        b = pointerY * 0.08;
      const tx = x * Math.cos(a) + z * Math.sin(a),
        tz = z * Math.cos(a) - x * Math.sin(a);
      const ty = y * Math.cos(b) - tz * Math.sin(b);
      const depth = 2.9 / (3.15 + tz * 0.6);
      const scale = Math.min(width * 0.62, height * 0.82);
      return {
        x: width * 0.57 + tx * scale * depth,
        y: height * 0.5 + ty * scale * depth,
        depth,
      };
    }
    function geometry(row: number, col: number, time: number) {
      const u = col / (columns - 1),
        v = row / (rows - 1),
        seed = Math.sin(row * 71.13 + col * 17.71);
      const drift = still ? 0 : Math.sin(time * 0.24 + u * 5 + v * 2) * 0.028;
      if (mode === "ridge") {
        const x = (u - 0.5) * 6,
          z = (v - 0.5) * 2.7;
        const ridge = Math.exp(-((x + 1.35) ** 2 * 1.7 + z ** 2 * 0.13));
        return {
          x,
          y:
            0.53 -
            ridge * 0.9 +
            Math.sin(x * 8 + z * 3 + time * 0.07) * Math.cos(z * 8) * 0.055 +
            Math.sin(x * 2.4 + z * 2.2) * 0.12 +
            z * 0.13 +
            drift * 0.35,
          z,
        };
      }
      if (mode === "terrain") {
        const x = (u - 0.5) * 3.6,
          z = (v - 0.5) * 2.2;
        const peak = Math.exp(-((x - 0.55) ** 2 * 3.5 + (z + 0.25) ** 2 * 3));
        return {
          x,
          y:
            0.6 -
            peak * 1.1 +
            Math.sin(x * 5 + z * 4 + time * 0.17) * 0.035 +
            z * 0.2,
          z,
        };
      }
      if (mode === "vortex") {
        const angle = u * Math.PI * 2 + time * 0.018 + v * 0.8;
        const radius = 0.35 + v * 0.65;
        return {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius * 0.9,
          z: Math.sin(u * 13 + v * 3) * 0.22 + (v - 0.5) * 0.45,
        };
      }
      if (mode === "fragments") {
        const assembly = clamp((progress?.get() ?? 0.5) * 1.7);
        const spread = 1 - assembly;
        const sheet = Math.floor(row / 6),
          q = (row % 6) / 6;
        const x = (u - 0.5) * 1.9 + Math.sin(row * 43) * spread * 0.9;
        const y =
          (sheet - 1.5) * 0.27 +
          (q - 0.5) * 0.11 +
          Math.cos(u * 4 + sheet) * 0.08 +
          seed * spread * 0.3;
        return {
          x,
          y: y + drift,
          z: (q - 0.5) * 1.1 + Math.cos(row * 12 + col) * spread * 0.4,
        };
      }
      const strand = (v - 0.5) * 0.52,
        t = u * Math.PI * 2.35;
      return {
        x:
          Math.sin(t + strand * 1.7) * (0.48 + strand * 0.15) +
          (u - 0.5) * 1.05,
        y: (u - 0.5) * 1.8 + Math.cos(t * 1.1 + strand) * 0.14 + drift,
        z: Math.cos(t + strand * 1.7) * 0.53 + strand * 0.75,
      };
    }
    function draw() {
      context!.setTransform(dpr, 0, 0, dpr, 0, 0);
      context!.clearRect(0, 0, width, height);
      const time = elapsed / 1000;
      pointerX += (targetX - pointerX) * 0.055;
      pointerY += (targetY - pointerY) * 0.055;
      context!.globalCompositeOperation = "screen";
      // Threaded surfaces communicate a structure; connections are not randomly generated.
      for (let row = 0; row < rows; row++) {
        context!.beginPath();
        for (let col = 0; col < columns; col++) {
          const p = geometry(row, col, time),
            screen = project(p.x, p.y, p.z);
          if (!col) context!.moveTo(screen.x, screen.y);
          else context!.lineTo(screen.x, screen.y);
        }
        context!.strokeStyle = `rgba(111,193,215,${mode === "terrain" ? 0.13 : 0.095 + (row % 4) * 0.018})`;
        context!.lineWidth = 0.55;
        context!.stroke();
      }
      for (let col = 0; col < columns; col += mode === "terrain" ? 2 : 4) {
        context!.beginPath();
        for (let row = 0; row < rows; row++) {
          const p = geometry(row, col, time),
            screen = project(p.x, p.y, p.z);
          if (!row) context!.moveTo(screen.x, screen.y);
          else context!.lineTo(screen.x, screen.y);
        }
        context!.strokeStyle = "rgba(93,172,199,.075)";
        context!.lineWidth = 0.5;
        context!.stroke();
      }
      for (let row = 0; row < rows; row++)
        for (let col = 0; col < columns; col++) {
          const p = geometry(row, col, time),
            screen = project(p.x, p.y, p.z);
          const light =
            0.3 +
            0.7 * Math.max(0, Math.sin(col * 0.9 + row * 1.2 + time * 0.45));
          const radius =
            (row % 7 === 0 && col % 11 === 0 ? 1.5 : 0.65) * screen.depth;
          context!.fillStyle = `rgba(164,227,240,${(0.18 + light * 0.48) * Math.min(1, screen.depth)})`;
          context!.beginPath();
          context!.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
          context!.fill();
          if (row % 9 === 0 && col % 17 === 0) {
            const glow = context!.createRadialGradient(
              screen.x,
              screen.y,
              0,
              screen.x,
              screen.y,
              22,
            );
            glow.addColorStop(0, "rgba(139,229,244,.24)");
            glow.addColorStop(1, "rgba(89,191,220,0)");
            context!.fillStyle = glow;
            context!.fillRect(screen.x - 22, screen.y - 22, 44, 44);
          }
        }
      // Subtle orbital registration arcs, spatial rather than a rotating globe.
      if (mode === "network" || mode === "vortex") {
        context!.strokeStyle = "rgba(107,178,201,.10)";
        context!.lineWidth = 0.6;
        for (let ring = 0; ring < 3; ring++) {
          context!.beginPath();
          context!.ellipse(
            width * 0.57,
            height * 0.5,
            Math.min(width, height) * (0.3 + ring * 0.085),
            Math.min(width, height) * (0.15 + ring * 0.07),
            -0.65 + ring * 0.45,
            0.1,
            Math.PI * 1.75,
          );
          context!.stroke();
        }
      }
      context!.globalCompositeOperation = "source-over";
      element!.dataset.frames = String(
        Number(element!.dataset.frames || 0) + 1,
      );
    }
    function tick(timestamp: number) {
      frame = 0;
      if (!visible || !pageVisible || still) return;
      if (!last || timestamp - last >= (lowPower ? 66 : 33)) {
        elapsed += last ? Math.min(70, timestamp - last) : 0;
        last = timestamp;
        draw();
      }
      frame = requestAnimationFrame(tick);
    }
    function resume() {
      if (!frame && visible && pageVisible && !still) {
        last = 0;
        frame = requestAnimationFrame(tick);
      }
    }
    function resize() {
      const rect = parent.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      element!.width = Math.round(width * dpr);
      element!.height = Math.round(height * dpr);
      draw();
      resume();
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (!visible && frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        } else resume();
      },
      { rootMargin: "60px" },
    );
    const resizer = new ResizeObserver(resize);
    const onVisibility = () => {
      pageVisible = !document.hidden;
      if (!pageVisible && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else resume();
    };
    const onPointer = (event: PointerEvent) => {
      if (still) return;
      const rect = parent.getBoundingClientRect();
      targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const leave = () => {
      targetX = 0;
      targetY = 0;
    };
    observer.observe(parent);
    resizer.observe(parent);
    parent.addEventListener("pointermove", onPointer, { passive: true });
    parent.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", onVisibility);
    const unsubscribe = progress?.on("change", () => {
      if (visible && pageVisible) draw();
    });
    resize();
    element.dataset.motion = still
      ? "static"
      : lowPower
        ? "low-power"
        : "ambient";
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizer.disconnect();
      unsubscribe?.();
      parent.removeEventListener("pointermove", onPointer);
      parent.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mode, paused, progress, reduce]);
  return (
    <canvas
      ref={canvas}
      className={`forensic-field field-${mode}`}
      aria-hidden="true"
    />
  );
}
