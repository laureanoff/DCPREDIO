"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertBooking = { id: string; name: string; startAt: string; endAt: string };
type Alert = { id: string; title: string; detail: string; kind: "start" | "warn" | "end" };

const WARN_BEFORE_END_MS = 5 * 60_000;
const FRESH_MS = 15_000; // solo avisa eventos que acaban de ocurrir (no los de antes de abrir la página)

function beep(ctx: AudioContext, times: number) {
  for (let i = 0; i < times; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + i * 0.35 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.35 + 0.28);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.35);
    osc.stop(ctx.currentTime + i * 0.35 + 0.3);
  }
}

/**
 * Avisa cuando un turno empieza, cuando faltan 5 minutos y cuando termina.
 * Siempre muestra un cartel en pantalla; con "Activar sonido" suma pitido y notificación del navegador.
 * Funciona mientras esta pantalla esté abierta.
 */
export function TurnAlerts({ bookings }: { bookings: AlertBooking[] }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [soundOn, setSoundOn] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const fired = useRef(new Set<string>());
  const soundRef = useRef(false);

  function dismiss(id: string) {
    setAlerts((a) => a.filter((x) => x.id !== id));
  }

  async function enable() {
    if (soundOn) {
      soundRef.current = false;
      setSoundOn(false);
      return;
    }
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      beep(audio.current, 1);
    } catch {
      /* el navegador no permite audio: quedan los carteles */
    }
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      await Notification.requestPermission().catch(() => undefined);
    }
    soundRef.current = true;
    setSoundOn(true);
  }

  useEffect(() => {
    const events = bookings.flatMap((b) => {
      const start = new Date(b.startAt).getTime();
      const end = new Date(b.endAt).getTime();
      return [
        { key: `${b.id}:start`, at: start, kind: "start" as const, b },
        { key: `${b.id}:warn`, at: end - WARN_BEFORE_END_MS, kind: "warn" as const, b },
        { key: `${b.id}:end`, at: end, kind: "end" as const, b },
      ];
    });

    const check = () => {
      const now = Date.now();
      for (const ev of events) {
        if (fired.current.has(ev.key) || now < ev.at || now - ev.at > FRESH_MS) continue;
        fired.current.add(ev.key);
        const title =
          ev.kind === "start" ? "¡Comienza el turno!" : ev.kind === "warn" ? "Quedan 5 minutos" : "¡Terminó el turno!";
        const detail = ev.b.name;
        setAlerts((a) => [...a, { id: ev.key, title, detail, kind: ev.kind }]);
        if (soundRef.current && audio.current) beep(audio.current, ev.kind === "end" ? 3 : 2);
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(title, { body: detail, tag: ev.key });
        }
        if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
      }
    };
    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [bookings]);

  return (
    <>
      <button
        type="button"
        onClick={enable}
        aria-pressed={soundOn}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm transition",
          soundOn ? "border-lime-ink/50 bg-lime/10 text-lime-ink" : "border-border text-muted hover:text-foreground",
        )}
      >
        {soundOn ? <Bell size={16} aria-hidden /> : <BellOff size={16} aria-hidden />}
        {soundOn ? "Avisos con sonido activados" : "Activar sonido y notificaciones"}
      </button>

      <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex flex-col items-center gap-2 px-4" aria-live="assertive">
        {alerts.map((a) => (
          <div
            key={a.id}
            role="alert"
            className={cn(
              "pointer-events-auto flex w-full max-w-md items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-xl",
              a.kind === "warn" ? "border-warning bg-background text-warning" : a.kind === "end" ? "border-danger bg-background text-danger" : "border-lime-ink bg-background text-lime-ink",
            )}
          >
            <div>
              <p className="font-[family-name:var(--font-display)] text-xl font-bold uppercase">{a.title}</p>
              <p className="text-sm text-foreground">{a.detail}</p>
            </div>
            <button type="button" onClick={() => dismiss(a.id)} aria-label="Cerrar aviso" className="rounded-lg p-1 text-muted hover:text-foreground">
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
