"use client";

import { useSyncExternalStore } from "react";

// Un único reloj compartido por todos los cronómetros de la pantalla (1 tick por segundo).
let current = 0;
const subscribers = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function subscribe(cb: () => void) {
  subscribers.add(cb);
  if (!timer) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      subscribers.forEach((s) => s());
    }, 1000);
  }
  return () => {
    subscribers.delete(cb);
    if (subscribers.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Hora actual en ms, actualizada cada segundo. Vale 0 en el servidor y antes de hidratar. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, () => current, () => 0);
}
