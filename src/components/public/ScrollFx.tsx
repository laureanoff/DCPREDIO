"use client";

import { useEffect } from "react";

/** Secuencia de encendido con parpadeo: determinista según el avance, así sube y baja igual que el scroll. */
const FLICKER = [0, 0.9, 0.08, 0.7, 0.15, 1, 0.5, 1, 0.85, 1];
function ignite(t: number) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return FLICKER[Math.floor(t * FLICKER.length)];
}
const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** Scroll atado a la escena: reflectores que se prenden/apagan y portada con parallax, en ambos sentidos. */
export function ScrollFx() {
  useEffect(() => {
    const stage = document.querySelector<HTMLElement>("[data-stage]");
    const hero = document.getElementById("hero-content");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      stage?.style.setProperty("--l1", "1");
      stage?.style.setProperty("--l2", "1");
      return;
    }
    let raf = 0;
    let p = -1; // progreso suavizado del escenario
    let target = 0;
    const measure = () => {
      const vh = window.innerHeight;
      if (stage) {
        const r = stage.getBoundingClientRect();
        // 0 cuando el escenario asoma por abajo; 1 cuando su parte superior llega al 20% de la pantalla
        target = clamp((vh - r.top) / (vh * 0.8));
      }
      if (hero) {
        const h = clamp(window.scrollY / (vh * 0.7));
        hero.style.transform = `translateY(${h * 70}px)`;
        hero.style.opacity = String(1 - h * 0.85);
      }
    };
    const tick = () => {
      measure();
      p = p < 0 ? target : p + (target - p) * 0.12;
      if (Math.abs(target - p) < 0.001) p = target;
      if (stage) {
        stage.style.setProperty("--l1", String(ignite((p - 0.2) / 0.35)));
        stage.style.setProperty("--l2", String(ignite((p - 0.5) / 0.35)));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return null;
}
