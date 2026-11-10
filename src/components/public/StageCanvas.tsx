"use client";

import { useEffect, useRef } from "react";

/** Escena WebGL de los reflectores. Se carga bajo demanda; si no hay WebGL queda el fondo CSS. */
export function StageCanvas() {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      try {
        const c = document.createElement("canvas");
        if (!(c.getContext("webgl2") || c.getContext("webgl"))) return;
        const { createStageScene } = await import("./stage-scene");
        if (cancelled || !host.current || !canvas.current) return;
        const s = createStageScene(canvas.current, host.current);
        dispose = s.dispose;
        host.current.closest("[data-stage]")?.classList.add("stage-gl");
      } catch {
        /* sin WebGL: se mantiene el fondo CSS */
      }
    })();
    return () => { cancelled = true; dispose?.(); };
  }, []);
  return (
    <div ref={host} className="stage-gl-host" aria-hidden>
      <canvas ref={canvas} className="stage-canvas" />
    </div>
  );
}
