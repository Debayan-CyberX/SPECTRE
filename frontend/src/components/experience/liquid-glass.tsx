"use client";
import { useEffect, type PointerEvent, type ReactNode } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

/** Small decorative tilts keep analytical canvases and their hit targets stable. */
export function LiquidGlass({
  children,
  className = "",
  paused = false,
}: {
  children: ReactNode;
  className?: string;
  paused?: boolean;
}) {
  const reduced = useReducedMotion();
  const pitch = useMotionValue(0);
  const yaw = useMotionValue(0);
  const lightX = useMotionValue(50);
  const lightY = useMotionValue(0);
  const rotateX = useSpring(pitch, { stiffness: 180, damping: 24 });
  const rotateY = useSpring(yaw, { stiffness: 180, damping: 24 });
  const reflection = useMotionTemplate`radial-gradient(ellipse at ${lightX}% ${lightY}%, #ffffff25, #ffffff06 35%, transparent 68%)`;
  const reset = () => {
    pitch.set(0);
    yaw.set(0);
    lightX.set(50);
    lightY.set(0);
  };
  useEffect(() => {
    if (paused || reduced) {
      pitch.set(0);
      yaw.set(0);
      lightX.set(50);
      lightY.set(0);
    }
  }, [paused, reduced, pitch, yaw, lightX, lightY]);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (paused || reduced || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(1, (event.clientX - bounds.left) / bounds.width),
    );
    const y = Math.max(
      0,
      Math.min(1, (event.clientY - bounds.top) / bounds.height),
    );
    pitch.set((0.5 - y) * 5);
    yaw.set((x - 0.5) * 5);
    lightX.set(x * 100);
    lightY.set(y * 100);
  };
  return (
    <motion.div
      className={`liquid-glass ${className}`}
      style={{ rotateX, rotateY, transformPerspective: 950 }}
      onPointerMove={move}
      onPointerLeave={reset}
      onPointerCancel={reset}
    >
      <motion.i
        className="glass-reflection"
        style={{ background: reflection }}
        aria-hidden="true"
      />
      {children}
    </motion.div>
  );
}
