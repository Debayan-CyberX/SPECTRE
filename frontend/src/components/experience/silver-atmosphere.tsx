"use client";
import { useEffect } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

/** Composited light layers: no evidence claims, pointer interception or canvas render loop. */
export function SilverAtmosphere({
  paused,
  className = "",
  interactive = true,
}: {
  paused: boolean;
  className?: string;
  interactive?: boolean;
}) {
  const reduced = useReducedMotion();
  const pointerX = useMotionValue(0),
    pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 22, damping: 25, mass: 1.1 });
  const y = useSpring(pointerY, { stiffness: 22, damping: 25, mass: 1.1 });
  useEffect(() => {
    if (
      paused ||
      reduced ||
      !interactive ||
      window.matchMedia("(pointer: coarse)").matches
    )
      return;
    const move = (event: PointerEvent) => {
      pointerX.set((event.clientX / innerWidth - 0.5) * 26);
      pointerY.set((event.clientY / innerHeight - 0.5) * 18);
    };
    const leave = () => {
      pointerX.set(0);
      pointerY.set(0);
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [paused, reduced, interactive, pointerX, pointerY]);
  return (
    <div
      className={`silver-atmosphere ${className}`}
      aria-hidden="true"
      data-motion={paused ? "paused" : "ambient"}
    >
      <motion.div className="silver-parallax" style={{ x, y }}>
        <div className="silver-haze" />
        <div className="silver-beam silver-beam-one" />
        <div className="silver-beam silver-beam-two" />
        <div className="silver-beam silver-beam-three" />
        <div className="silver-fine-ray" />
        <div className="silver-horizon-glint" />
      </motion.div>
    </div>
  );
}
