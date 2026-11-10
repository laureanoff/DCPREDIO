"use client";

import dynamic from "next/dynamic";

const Map3D = dynamic(() => import("./Map3D").then((m) => m.Map3D), {
  ssr: false,
  loading: () => <div className="skeleton h-full w-full" aria-hidden />,
});

type Props = { lat: number | null; lng: number | null; title: string; fallbackSrc: string };

/** Mapa 3D si hay coordenadas; si no (dirección sin ubicar todavía), mapa común. */
export function MapLoader({ lat, lng, title, fallbackSrc }: Props) {
  if (lat === null || lng === null) {
    return <iframe title={`Mapa: ${title}`} src={fallbackSrc} className="h-full w-full border-0" loading="lazy" allowFullScreen />;
  }
  return <Map3D lat={lat} lng={lng} title={title} fallbackSrc={fallbackSrc} />;
}
