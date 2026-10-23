"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion, type MotionValue } from "motion/react";
import type { DemoData, ForensicEvent } from "@/lib/types";
import ForensicField from "./forensic-field";

type StageMode = "stack" | "fragments" | "timeline";
const layerIndex: Record<string, number> = {
  process: 0,
  registry: 1,
  file: 2,
  network: 3,
  dns: 3,
  authentication: 3,
};

/** The scatter is illustrative material. Source tiles and documents use stored records. */
export default function EvidenceStage({
  data,
  selected,
  onSelect,
  paused = false,
  mode = "stack",
  progress,
  category,
}: {
  data?: DemoData;
  selected?: ForensicEvent;
  onSelect?: (event: ForensicEvent) => void;
  paused?: boolean;
  mode?: StageMode;
  progress?: MotionValue<number>;
  category?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  const [awakened, setAwakened] = useState(false);
  const repaint = useRef<() => void>(() => {});
  const reduce = useReducedMotion();
  const input = useRef({ data, selected, onSelect, category });
  useEffect(() => {
    input.current = { data, selected, onSelect, category };
    repaint.current();
  }, [data, selected, onSelect, category]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setAwakened(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = canvas.current;
    if (!element || !awakened) return;
    let disposed = false;
    let release = () => {};
    void import("three")
      .then((T) => {
        if (disposed) return;
        let renderer: InstanceType<typeof T.WebGLRenderer>;
        try {
          renderer = new T.WebGLRenderer({
            canvas: element,
            alpha: true,
            antialias: true,
            powerPreference: "low-power",
          });
        } catch {
          setFallback(true);
          return;
        }
        const parent = element.parentElement!;
        const lowPower =
          window.matchMedia("(pointer: coarse)").matches ||
          (navigator.hardwareConcurrency || 4) < 4;
        const still = !!reduce || paused;
        renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1 : 1.5));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.45;
        const scene = new T.Scene();
        scene.fog = new T.FogExp2(0x050807, 0.026);
        const camera = new T.PerspectiveCamera(34, 1, 0.1, 60);
        camera.position.set(8, 7, 11.8);
        camera.lookAt(0, 0, 0);
        const world = new T.Group();
        world.rotation.y = -0.22;
        scene.add(world);
        scene.add(new T.AmbientLight(0xbac7be, 1.3));
        const key = new T.DirectionalLight(0xfff6ea, 4.5);
        key.position.set(-2, 8, 4);
        scene.add(key);
        const rim = new T.DirectionalLight(0xabb9b1, 2);
        rim.position.set(4, 1, -5);
        scene.add(rim);
        const redLight = new T.PointLight(0xff3b32, 10, 5, 2);
        redLight.position.set(0, 2.1, 0);
        world.add(redLight);
        let seed = 76213;
        const random = () => {
          seed = (seed * 16807) % 2147483647;
          return (seed - 1) / 2147483646;
        };
        const geometries: InstanceType<typeof T.BufferGeometry>[] = [];
        const materials: InstanceType<typeof T.Material>[] = [];
        const textures: InstanceType<typeof T.Texture>[] = [];
        const layers: InstanceType<typeof T.Group>[] = [];
        const shardGeometry = new T.BoxGeometry(1, 0.016, 1);
        geometries.push(shardGeometry);
        const shardMaterial = new T.MeshStandardMaterial({
          color: 0xcbd0c8,
          roughness: 0.48,
          metalness: 0.35,
          transparent: true,
          opacity: 0.78,
        });
        materials.push(shardMaterial);
        const dummy = new T.Object3D();
        const color = new T.Color();
        for (let layer = 0; layer < 4; layer++) {
          const group = new T.Group();
          group.position.y = 1.55 - layer * 1.04;
          layers.push(group);
          world.add(group);
          const box = new T.BoxGeometry(6.3, 0.018, 4.2);
          const plateMaterial = new T.MeshStandardMaterial({
            color: 0x18211d,
            roughness: 0.18,
            metalness: 0.8,
            transparent: true,
            opacity: 0.24,
            depthWrite: false,
          });
          const plate = new T.Mesh(box, plateMaterial);
          group.add(plate);
          const edgeGeometry = new T.EdgesGeometry(box);
          const edgeMaterial = new T.LineBasicMaterial({
            color: 0xa5b2a6,
            transparent: true,
            opacity: 0.24,
          });
          group.add(new T.LineSegments(edgeGeometry, edgeMaterial));
          geometries.push(box, edgeGeometry);
          materials.push(plateMaterial, edgeMaterial);
          const count = lowPower ? 220 : 1100;
          const shards = new T.InstancedMesh(
            shardGeometry,
            shardMaterial,
            count,
          );
          for (let i = 0; i < count; i++) {
            const x = (random() - 0.5) * 5.9,
              z = (random() - 0.5) * 3.9;
            const island =
              Math.sin(x * 2.3 + layer * 3.4) * Math.cos(z * 3.7 - layer);
            dummy.position.set(
              x,
              0.018 + random() * (island > 0.15 ? 0.09 : 0.32),
              z,
            );
            const size =
              island > 0.15
                ? 0.018 + random() * 0.075
                : 0.008 + random() * 0.022;
            dummy.scale.set(
              size * (0.5 + random() * 1.9),
              0.25 + random() * 1.8,
              size,
            );
            dummy.rotation.set(0, random() * 1.8, 0);
            dummy.updateMatrix();
            shards.setMatrixAt(i, dummy.matrix);
            const light =
              island > 0.15 ? 0.3 + random() * 0.65 : 0.08 + random() * 0.22;
            color.setRGB(light, light * 0.99, light * 0.93);
            shards.setColorAt(i, color);
          }
          group.add(shards);
          const gridPoints: number[] = [];
          for (let i = -3; i <= 3; i++) gridPoints.push(i, 0, -2.1, i, 0, 2.1);
          for (let i = -2; i <= 2; i++)
            gridPoints.push(-3.15, 0, i, 3.15, 0, i);
          const gridGeometry = new T.BufferGeometry();
          gridGeometry.setAttribute(
            "position",
            new T.Float32BufferAttribute(gridPoints, 3),
          );
          const gridMaterial = new T.LineBasicMaterial({
            color: 0xb9c6b8,
            transparent: true,
            opacity: 0.11,
          });
          group.add(new T.LineSegments(gridGeometry, gridMaterial));
          geometries.push(gridGeometry);
          materials.push(gridMaterial);
        }
        const dataEvents = data?.events || [];
        const times = dataEvents.map((event) => Date.parse(event.timestamp));
        const lo = Math.min(...times),
          span = Math.max(1000, Math.max(...times) - lo);
        const sourceGeometry = new T.BoxGeometry(0.38, 0.035, 0.3);
        const sourceMaterial = new T.MeshStandardMaterial({
          color: 0xc0bcb1,
          emissive: 0x4b493e,
          emissiveIntensity: 0.35,
          metalness: 0.7,
          roughness: 0.25,
        });
        const threatMaterial = new T.MeshBasicMaterial({
          color: 0xff6559,
          transparent: true,
          opacity: 0.9,
        });
        const flagged = new Set(
          data?.findings
            .filter((f) => f.status !== "rejected")
            .flatMap((f) => f.event_ids),
        );
        const sourceMeshes: InstanceType<typeof T.Mesh>[] = [];
        const sourceLocations: Record<
          string,
          InstanceType<typeof T.Vector3>
        > = {};
        const documentMeshes: InstanceType<typeof T.Mesh>[] = [];
        geometries.push(sourceGeometry);
        materials.push(sourceMaterial, threatMaterial);
        for (const [i, event] of dataEvents.entries()) {
          const layer = layerIndex[event.category] ?? 3;
          const pos = new T.Vector3(
            ((Date.parse(event.timestamp) - lo) / span - 0.5) * 5.2,
            1.59 - layer * 1.04,
            Math.sin(i * 4.7) * 1.6,
          );
          sourceLocations[event.id] = pos;
          const mesh = new T.Mesh(
            sourceGeometry,
            flagged.has(event.id) ? threatMaterial : sourceMaterial,
          );
          mesh.position.copy(pos);
          mesh.userData.event = event;
          world.add(mesh);
          sourceMeshes.push(mesh);
          const lineGeometry = new T.BufferGeometry().setFromPoints([
            pos,
            new T.Vector3(
              pos.x,
              pos.y + (flagged.has(event.id) ? 1.8 : 0.3 + random()),
              pos.z,
            ),
          ]);
          const lineMaterial = new T.LineBasicMaterial({
            color: flagged.has(event.id) ? 0xff7c71 : 0xc4c7b8,
            transparent: true,
            opacity: flagged.has(event.id) ? 0.72 : 0.35,
          });
          const line = new T.Line(lineGeometry, lineMaterial);
          world.add(line);
          const pinGeometry = new T.SphereGeometry(
            flagged.has(event.id) ? 0.035 : 0.015,
            8,
            8,
          );
          const pinMaterial = new T.MeshBasicMaterial({
            color: flagged.has(event.id) ? 0xff6a61 : 0xe8e3d5,
          });
          const pin = new T.Mesh(pinGeometry, pinMaterial);
          pin.position.set(
            pos.x,
            pos.y + (flagged.has(event.id) ? 1.8 : 0.5),
            pos.z,
          );
          world.add(pin);
          geometries.push(lineGeometry, pinGeometry);
          materials.push(lineMaterial, pinMaterial);
          if (mode === "fragments") {
            const image = document.createElement("canvas");
            image.width = 384;
            image.height = 512;
            const ctx = image.getContext("2d")!;
            ctx.fillStyle = "#0c1210";
            ctx.fillRect(0, 0, 384, 512);
            ctx.strokeStyle = "#6a7367";
            ctx.strokeRect(1, 1, 382, 510);
            ctx.fillStyle = "#d2d0c3";
            ctx.font = "13px monospace";
            ctx.fillText(`SOURCE RECORD / ${event.record_ref}`, 26, 40);
            ctx.fillStyle = flagged.has(event.id) ? "#ff736a" : "#a9b3a5";
            ctx.fillRect(26, 64, 330, 2);
            ctx.font = "16px monospace";
            ctx.fillText(event.title.slice(0, 29), 26, 98);
            ctx.fillStyle = "#9da99b";
            ctx.font = "11px monospace";
            const lines =
              JSON.stringify(
                {
                  timestamp: event.timestamp,
                  source: event.source_format,
                  host: event.host,
                  ...event.fields,
                },
                null,
                2,
              ).match(/.{1,47}/g) || [];
            lines
              .slice(0, 24)
              .forEach((text, index) =>
                ctx.fillText(text, 26, 135 + index * 13),
              );
            ctx.fillStyle = "#434e43";
            ctx.fillRect(26, 465, 330, 1);
            ctx.fillText("SYNTHETIC / PARSED EVIDENCE", 26, 486);
            const texture = new T.CanvasTexture(image);
            texture.colorSpace = T.SRGBColorSpace;
            const geometry = new T.PlaneGeometry(1.1, 1.6),
              material = new T.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 0.92,
                side: T.DoubleSide,
              });
            const panel = new T.Mesh(geometry, material);
            panel.position.set(
              (random() - 0.5) * 6.5,
              (random() - 0.5) * 4.2 + 1.2,
              (random() - 0.5) * 3 + 2,
            );
            panel.rotation.y = -0.45 + random() * 0.8;
            panel.userData.event = event;
            panel.userData.scatter = panel.position.clone();
            panel.userData.rest = pos.clone();
            panel.userData.angle = panel.rotation.y;
            world.add(panel);
            documentMeshes.push(panel);
            geometries.push(geometry);
            materials.push(material);
            textures.push(texture);
          }
        }
        const pulses: {
          mesh: InstanceType<typeof T.Mesh>;
          curve: InstanceType<typeof T.CatmullRomCurve3>;
        }[] = [];
        for (const relation of data?.relationships.filter(
          (r) => r.kind === "spawned",
        ) || []) {
          const from = data?.entities.find(
            (entity) => entity.id === relation.source_id,
          );
          const to = data?.entities.find(
            (entity) => entity.id === relation.target_id,
          );
          const start = sourceLocations[String(from?.details.event_id)],
            end = sourceLocations[String(to?.details.event_id)];
          if (!start || !end) continue;
          const middle = start.clone().lerp(end, 0.5);
          middle.y += 0.4;
          const curve = new T.CatmullRomCurve3([start, middle, end]);
          const geometry = new T.BufferGeometry().setFromPoints(
            curve.getPoints(36),
          );
          const material = new T.LineBasicMaterial({
            color: 0xc1bca8,
            transparent: true,
            opacity: 0.27,
          });
          world.add(new T.Line(geometry, material));
          const pinGeometry = new T.SphereGeometry(0.024, 8, 8),
            pinMaterial = new T.MeshBasicMaterial({ color: 0xf6e8ce });
          const mesh = new T.Mesh(pinGeometry, pinMaterial);
          world.add(mesh);
          pulses.push({ mesh, curve });
          geometries.push(geometry, pinGeometry);
          materials.push(material, pinMaterial);
        }
        const glowCanvas = document.createElement("canvas");
        glowCanvas.width = glowCanvas.height = 128;
        const gc = glowCanvas.getContext("2d")!;
        const gradient = gc.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, "rgba(255,91,70,.8)");
        gradient.addColorStop(0.3, "rgba(255,55,30,.25)");
        gradient.addColorStop(1, "rgba(255,30,10,0)");
        gc.fillStyle = gradient;
        gc.fillRect(0, 0, 128, 128);
        const glowTexture = new T.CanvasTexture(glowCanvas);
        const glowMaterial = new T.MeshBasicMaterial({
          map: glowTexture,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
          blending: T.AdditiveBlending,
          side: T.DoubleSide,
        });
        const glowGeometry = new T.PlaneGeometry(2.8, 2.8);
        const glow = new T.Mesh(glowGeometry, glowMaterial);
        glow.rotation.x = -Math.PI / 2;
        world.add(glow);
        geometries.push(glowGeometry);
        materials.push(glowMaterial);
        textures.push(glowTexture);
        const dustPositions = new Float32Array((lowPower ? 130 : 480) * 3);
        for (let i = 0; i < dustPositions.length; i += 3) {
          dustPositions[i] = (random() - 0.5) * 9;
          dustPositions[i + 1] = (random() - 0.5) * 7;
          dustPositions[i + 2] = (random() - 0.5) * 7;
        }
        const dustGeometry = new T.BufferGeometry();
        dustGeometry.setAttribute(
          "position",
          new T.BufferAttribute(dustPositions, 3),
        );
        const dustMaterial = new T.PointsMaterial({
          size: 0.016,
          color: 0xe8e5d9,
          transparent: true,
          opacity: 0.4,
          sizeAttenuation: true,
          depthWrite: false,
        });
        const dust = new T.Points(dustGeometry, dustMaterial);
        world.add(dust);
        geometries.push(dustGeometry);
        materials.push(dustMaterial);
        let width = 0,
          height = 0,
          frame = 0,
          last = 0,
          elapsed = 0,
          visible = true;
        let px = 0,
          py = 0,
          targetX = 0,
          targetY = 0;
        const raycaster = new T.Raycaster(),
          pointer = new T.Vector2();
        const tap = { x: 0, y: 0 };
        function draw() {
          px += (targetX - px) * 0.045;
          py += (targetY - py) * 0.045;
          const time = elapsed / 1000;
          world.rotation.y =
            -0.22 + px * 0.085 + (still ? 0 : Math.sin(time * 0.14) * 0.025);
          world.rotation.x = py * 0.035;
          layers.forEach((layer, index) => {
            layer.position.y =
              (mode === "timeline" ? 0.3 - index * 0.15 : 1.55 - index * 1.04) +
              (still ? 0 : Math.sin(time * 0.4 + index) * 0.025);
            layer.rotation.y =
              mode === "fragments"
                ? Math.sin(index * 2) * (0.12 + (progress?.get() || 0) * 0.1)
                : Math.sin(time * 0.13 + index) * (still ? 0 : 0.008);
          });
          documentMeshes.forEach((panel, index) => {
            const material = panel.material as InstanceType<
              typeof T.MeshBasicMaterial
            >;
            material.opacity =
              !input.current.category ||
              panel.userData.event.category === input.current.category
                ? 0.94
                : 0.18;
            const assembly = reduce
              ? 0.45
              : Math.max(0, Math.min(1, ((progress?.get() || 0) - 0.15) / 0.6));
            panel.position.lerpVectors(
              panel.userData.scatter,
              panel.userData.rest,
              assembly * 0.75,
            );
            panel.rotation.x = -Math.PI * 0.35 * assembly;
            panel.rotation.y = panel.userData.angle * (1 - assembly);
            panel.rotation.z =
              Math.sin(time * 0.22 + index) * (still ? 0 : 0.018);
          });
          dust.rotation.y = still ? 0 : time * 0.006;
          pulses.forEach(({ mesh, curve }, index) =>
            mesh.position.copy(
              curve.getPoint((time * 0.08 + index * 0.21) % 1),
            ),
          );
          const position =
            input.current.selected &&
            sourceLocations[input.current.selected.id];
          if (position) {
            glow.position.copy(position);
            glow.position.y += 0.05;
            redLight.position.copy(position);
            redLight.position.y += 0.6;
          }
          glowMaterial.opacity = still
            ? 0.6
            : 0.55 + Math.sin(time * 1.4) * 0.12;
          threatMaterial.opacity = still
            ? 0.9
            : 0.85 + Math.sin(time * 1.6) * 0.12;
          renderer.render(scene, camera);
          element!.dataset.frames = String(
            Number(element!.dataset.frames || 0) + 1,
          );
        }
        function tick(timestamp: number) {
          frame = 0;
          if (!visible || document.hidden || still || disposed) return;
          if (!last || timestamp - last >= (lowPower ? 66 : 33)) {
            elapsed += last ? Math.min(100, timestamp - last) : 0;
            last = timestamp;
            draw();
          }
          frame = requestAnimationFrame(tick);
        }
        function resume() {
          if (!frame && visible && !document.hidden && !still && !disposed) {
            last = 0;
            frame = requestAnimationFrame(tick);
          }
        }
        function resize() {
          const rect = parent.getBoundingClientRect();
          width = rect.width;
          height = rect.height;
          renderer.setSize(width, height, false);
          camera.aspect = width / Math.max(1, height);
          camera.updateProjectionMatrix();
          draw();
          resume();
        }
        const observer = new IntersectionObserver(
          ([entry]) => {
            visible = entry.isIntersecting;
            if (!visible) {
              cancelAnimationFrame(frame);
              frame = 0;
            } else resume();
          },
          { rootMargin: "50px" },
        );
        const resizer = new ResizeObserver(resize);
        const move = (event: PointerEvent) => {
          const rect = parent.getBoundingClientRect();
          if (!still) {
            targetX = (event.clientX - rect.left) / rect.width - 0.5;
            targetY = (event.clientY - rect.top) / rect.height - 0.5;
          }
        };
        const leave = () => {
          targetX = targetY = 0;
        };
        const down = (event: PointerEvent) => {
          tap.x = event.clientX;
          tap.y = event.clientY;
        };
        const up = (event: PointerEvent) => {
          if (
            (event.target as Element).closest("button,a") ||
            Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 5
          )
            return;
          const rect = parent.getBoundingClientRect();
          pointer.set(
            ((event.clientX - rect.left) / width) * 2 - 1,
            -((event.clientY - rect.top) / height) * 2 + 1,
          );
          raycaster.setFromCamera(pointer, camera);
          const hit = raycaster.intersectObjects([
            ...documentMeshes,
            ...sourceMeshes,
          ])[0];
          if (hit?.object.userData.event)
            input.current.onSelect?.(hit.object.userData.event);
        };
        const visibility = () => {
          if (document.hidden) {
            cancelAnimationFrame(frame);
            frame = 0;
          } else resume();
        };
        const lost = (event: Event) => {
          event.preventDefault();
          release();
          setFallback(true);
        };
        element.addEventListener("webglcontextlost", lost);
        parent.addEventListener("pointermove", move, { passive: true });
        parent.addEventListener("pointerleave", leave);
        parent.addEventListener("pointerdown", down);
        parent.addEventListener("pointerup", up);
        document.addEventListener("visibilitychange", visibility);
        const unsubscribe = progress?.on("change", () => {
          if (visible) draw();
        });
        observer.observe(parent);
        resizer.observe(parent);
        resize();
        element.dataset.motion = still
          ? "static"
          : lowPower
            ? "low-power"
            : "ambient";
        element.dataset.renderer = "webgl";
        release = () => {
          repaint.current = () => {};
          cancelAnimationFrame(frame);
          observer.disconnect();
          resizer.disconnect();
          unsubscribe?.();
          parent.removeEventListener("pointermove", move);
          parent.removeEventListener("pointerleave", leave);
          parent.removeEventListener("pointerdown", down);
          parent.removeEventListener("pointerup", up);
          document.removeEventListener("visibilitychange", visibility);
          element.removeEventListener("webglcontextlost", lost);
          geometries.forEach((geometry) => geometry.dispose());
          materials.forEach((material) => material.dispose());
          textures.forEach((texture) => texture.dispose());
          scene.traverse((object) => {
            if (object instanceof T.InstancedMesh) object.dispose();
          });
          renderer.dispose();
        };
        repaint.current = draw;
      })
      .catch(() => {
        if (!disposed) setFallback(true);
      });
    return () => {
      disposed = true;
      release();
    };
  }, [awakened, data, mode, paused, progress, reduce]);
  return fallback ? (
    <ForensicField
      mode={mode === "fragments" ? "fragments" : "network"}
      paused={paused}
      progress={progress}
    />
  ) : (
    <canvas
      ref={canvas}
      className={`evidence-stage stage-${mode}`}
      aria-hidden="true"
    />
  );
}
