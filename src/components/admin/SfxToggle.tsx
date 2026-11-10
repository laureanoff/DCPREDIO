"use client";

import { useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { playGoal, sfxEnabled, setSfxEnabled } from "@/lib/sfx";

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb); }; };

/** Activa o apaga el sonido de gol al confirmar o cobrar. */
export function SfxToggle() {
  const on = useSyncExternalStore(subscribe, sfxEnabled, () => true);
  return (
    <button
      type="button"
      aria-label={on ? "Silenciar sonidos del panel" : "Activar sonidos del panel"}
      aria-pressed={on}
      onClick={() => {
        setSfxEnabled(!on);
        listeners.forEach((l) => l());
        if (!on) playGoal();
      }}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition hover:border-lime hover:text-lime-ink"
    >
      {on ? <Volume2 size={16} /> : <VolumeX size={16} />}
    </button>
  );
}
