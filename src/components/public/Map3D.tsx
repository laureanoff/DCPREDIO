"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

type Props = { lat: number; lng: number; title: string; fallbackSrc: string };

// Mapa vectorial gratuito (OpenStreetMap vía OpenFreeMap) con edificios en 3D. Sin clave de API.
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

/** Mapa inclinado en 3D con marcador. Si el dispositivo no soporta WebGL, muestra el mapa común. */
export function Map3D({ lat, lng, title, fallbackSrc }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;

    (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        if (cancelled) return;
        maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        const m = new maplibregl.Map({
          container: el,
          style: STYLE_URL,
          center: [lng, lat],
          zoom: 17,
          pitch: 62,
          bearing: -20,
          maxPitch: 75,
          cooperativeGestures: true, // en el celular, dos dedos para mover el mapa (no bloquea el scroll de la página)
          attributionControl: { compact: true },
        });
        map = m;
        m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
        new maplibregl.Marker({ color: "#B6D61A" }).setLngLat([lng, lat]).setPopup(new maplibregl.Popup({ offset: 24 }).setText(title)).addTo(m);
        m.on("error", (e) => {
          // Un tile suelto que falla no es grave; solo lo dejamos registrado.
          console.error("[map3d]", e.error?.message);
        });
      } catch (e) {
        console.error("[map3d]", e instanceof Error ? e.message : e);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, title]);

  if (failed) {
    return <iframe title={`Mapa: ${title}`} src={fallbackSrc} className="h-full w-full border-0" loading="lazy" allowFullScreen />;
  }
  return <div ref={box} role="img" aria-label={`Mapa 3D: ${title}`} className="h-full w-full" />;
}
