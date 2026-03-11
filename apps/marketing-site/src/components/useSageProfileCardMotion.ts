import { useEffect, type RefObject } from "react";

interface UseSageProfileCardMotionOptions {
  appRef: RefObject<HTMLDivElement | null>;
  cardRef: RefObject<HTMLDivElement | null>;
  enabled?: boolean;
}

const clamp = (v: number, min = 0, max = 100): number => Math.min(Math.max(v, min), max);
const round = (v: number, precision = 3): number => parseFloat(v.toFixed(precision));
const adjust = (v: number, fMin: number, fMax: number, tMin: number, tMax: number): number =>
  round(tMin + ((tMax - tMin) * (v - fMin)) / (fMax - fMin));

export function useSageProfileCardMotion({
  appRef,
  cardRef,
  enabled = true,
}: UseSageProfileCardMotionOptions) {
  useEffect(() => {
    const container = appRef.current;
    const card = cardRef.current;

    if (!enabled || !container || !card) return;

    let rafId: number | null = null;
    let running = false;
    let lastTs = 0;

    let currentX = 0;
    let currentY = 0;
    let targetX = 0;
    let targetY = 0;

    const DEFAULT_TAU = 0.14;
    const INITIAL_TAU = 0.6;
    let initialUntil = 0;

    const setVarsFromXY = (x: number, y: number): void => {
      if (!card || !container) return;

      const width = card.clientWidth || 1;
      const height = card.clientHeight || 1;

      const percentX = clamp((100 / width) * x);
      const percentY = clamp((100 / height) * y);

      const centerX = percentX - 50;
      const centerY = percentY - 50;

      container.style.setProperty("--pointer-x", `${percentX}%`);
      container.style.setProperty("--pointer-y", `${percentY}%`);
      container.style.setProperty("--background-x", `${adjust(percentX, 0, 100, 35, 65)}%`);
      container.style.setProperty("--background-y", `${adjust(percentY, 0, 100, 35, 65)}%`);
      container.style.setProperty("--pointer-from-center", `${clamp(Math.hypot(percentY - 50, percentX - 50) / 50, 0, 1)}`);
      container.style.setProperty("--pointer-from-top", `${percentY / 100}`);
      container.style.setProperty("--pointer-from-left", `${percentX / 100}`);
      container.style.setProperty("--rotate-x", `${round(-(centerX / 5))}deg`);
      container.style.setProperty("--rotate-y", `${round(centerY / 4)}deg`);
    };

    const step = (ts: number): void => {
      if (!running) return;
      if (lastTs === 0) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;

      const tau = ts < initialUntil ? INITIAL_TAU : DEFAULT_TAU;
      const k = 1 - Math.exp(-dt / tau);

      currentX += (targetX - currentX) * k;
      currentY += (targetY - currentY) * k;

      setVarsFromXY(currentX, currentY);

      const stillFar = Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05;

      if (stillFar || document.hasFocus()) {
        rafId = requestAnimationFrame(step);
      } else {
        running = false;
        lastTs = 0;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }
    };

    const start = (): void => {
      if (running) return;
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(step);
    };

    const setImmediate = (x: number, y: number): void => {
      currentX = x;
      currentY = y;
      setVarsFromXY(currentX, currentY);
    };

    const setTarget = (x: number, y: number): void => {
      targetX = x;
      targetY = y;
      start();
    };

    const toCenter = (): void => {
      if (!card) return;
      setTarget(card.clientWidth / 2, card.clientHeight / 2);
    };

    const beginInitial = (durationMs: number): void => {
      initialUntil = performance.now() + durationMs;
      start();
    };

    const handlePointerMove = (e: MouseEvent): void => {
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setTarget(x, y);
    };

    const handlePointerEnter = (): void => {
      card?.classList.add("active");
    };

    const handlePointerLeave = (): void => {
      toCenter();
      setTimeout(() => {
        card?.classList.remove("active");
      }, 300);
    };

    card.addEventListener("pointerenter", handlePointerEnter);
    card.addEventListener("pointermove", handlePointerMove);
    card.addEventListener("pointerleave", handlePointerLeave);

    // Start with initial animation
    const initialX = (card.clientWidth || 0) - 70;
    const initialY = 60;
    setImmediate(initialX, initialY);
    toCenter();
    beginInitial(1200);

    return () => {
      card.removeEventListener("pointerenter", handlePointerEnter);
      card.removeEventListener("pointermove", handlePointerMove);
      card.removeEventListener("pointerleave", handlePointerLeave);
      if (rafId) cancelAnimationFrame(rafId);
      card?.classList.remove("active");
    };
  }, [appRef, cardRef, enabled]);
}
