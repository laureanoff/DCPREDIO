"use client";

import { useEffect, useRef } from "react";
import { stageFx } from "@/lib/stage-fx";

/**
 * Video de la cancha controlado por el scroll: al bajar, los reflectores se encienden;
 * al subir, el video corre hacia atrás hasta apagarse. Con los reflectores ya encendidos, la cámara
 * sigue moviéndose sola (un vaivén lento) para que la escena nunca quede quieta. Los archivos están codificados
 * con todos los cuadros clave para que el avance/retroceso sea fluido.
 */
export function StageVideo() {
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = video.current;
    const w = wrap.current;
    if (!v || !w) return;
    const portrait = window.matchMedia("(max-aspect-ratio: 1/1)").matches;
    const base = portrait ? "/stage/portrait" : "/stage/landscape";
    v.poster = `${base}.jpg`;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // queda la imagen con los reflectores encendidos

    let raf = 0;
    let loaded = false;
    let shown = -1;
    const load = () => {
      if (loaded) return;
      loaded = true;
      v.src = `${base}.mp4`;
      v.load();
    };
    const io = new IntersectionObserver((e) => { if (e[0].isIntersecting) load(); }, { rootMargin: "100% 0px" });
    io.observe(w);

    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!stageFx.visible) return;
      const p = stageFx.p;
      w.style.transform = `translate3d(0, ${(0.5 - p) * 90}px, 0) scale(${1.08 - p * 0.06})`;
      if (!v.duration || v.readyState < 2 || v.seeking) return;
      const dur = v.duration - 0.05;
      const lit = Math.min(1, Math.max(0, (p - 0.35) / 0.3)); // 0 = apagado, 1 = encendido
      const drift = 0.5 + 0.5 * Math.sin(performance.now() / 3800); // vaivén lento entre 0 y 1
      const t = Math.min(p, 1) * dur * (1 - 0.3 * lit) + lit * dur * 0.3 * drift + (1 - lit) * dur * 0.05 * drift;
      if (Math.abs(t - shown) > 0.015) { v.currentTime = t; shown = t; }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  return (
    <div ref={wrap} className="stage-video" aria-hidden>
      <video ref={video} muted playsInline preload="auto" disablePictureInPicture tabIndex={-1} />
    </div>
  );
}
