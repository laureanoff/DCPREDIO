"use client";

import { useEffect } from "react";
import { stageFx } from "@/lib/stage-fx";

const clamp = (n: number) => Math.min(1, Math.max(0, n));

/** Scroll atado a la escena: avance del video de la cancha y portada con movimiento, en ambos sentidos. */
export function ScrollFx() {
  useEffect(() => {
    const stage = document.querySelector<HTMLElement>("[data-stage]");
    const hero = document.getElementById("hero-content");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stageFx.p = 1;
      return;
    }
    let raf = 0;
    let p = -1;
    let target = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const vh = window.innerHeight;
      if (stage) {
        const r = stage.getBoundingClientRect();
        // 0 cuando el escenario asoma por abajo; 1 cuando su parte superior llega al 10% de la pantalla
        target = clamp((vh - r.top) / (vh * 0.9));
        stageFx.visible = r.bottom > 0 && r.top < vh;
      }
      if (hero) {
        const h = clamp(window.scrollY / (vh * 0.7));
        hero.style.transform = `translateY(${-h * 60}px)`;
        hero.style.opacity = String(1 - h * 0.9);
      }
      p = p < 0 ? target : p + (target - p) * 0.14;
      if (Math.abs(target - p) < 0.0008) p = target;
      stageFx.p = p;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return null;
}
