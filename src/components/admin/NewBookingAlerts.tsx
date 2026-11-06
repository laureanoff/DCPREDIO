"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, BellOff, X } from "lucide-react";
import { formatDateShort, formatTime } from "@/lib/datetime";

type Incoming = { id: string; code: string; customer_name: string; start_at: string; end_at: string; status: string; created_at: string };

const POLL_MS = 15000;
const KEY = "dc-last-seen";

function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.18].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = i ? 1040 : 784;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.16);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.18);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* el navegador puede bloquear el sonido hasta que haya un clic: se ignora */
  }
}

function readSeen(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
function writeSeen(v: string) {
  try { localStorage.setItem(KEY, v); } catch { /* almacenamiento no disponible */ }
}

/** Avisos de reservas nuevas mientras el panel está abierto: cartel, sonido y notificación del navegador. */
export function NewBookingAlerts() {
  const router = useRouter();
  const [items, setItems] = useState<Incoming[]>([]);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const baseTitle = useRef<string>("");

  useEffect(() => {
    baseTitle.current = document.title;
    const t = setTimeout(() => setPerm("Notification" in window ? Notification.permission : "unsupported"), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    document.title = items.length ? `(${items.length}) Nueva reserva · ${baseTitle.current}` : baseTitle.current;
  }, [items.length]);

  const poll = useCallback(async () => {
    try {
      const since = readSeen();
      const res = await fetch(`/admin/nuevas${since ? `?since=${encodeURIComponent(since)}` : ""}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { now: string; bookings: Incoming[] };
      writeSeen(data.now);
      if (!data.bookings.length) return;
      setItems((prev) => [...prev, ...data.bookings.filter((b) => !prev.some((p) => p.id === b.id))]);
      beep();
      if ("Notification" in window && Notification.permission === "granted") {
        for (const b of data.bookings) {
          try {
            new Notification("Nueva reserva", {
              body: `${b.customer_name} · ${formatDateShort(b.start_at)} ${formatTime(b.start_at)}–${formatTime(b.end_at)} · ${b.code}`,
              tag: b.id,
            });
          } catch { /* algunos móviles no permiten new Notification */ }
        }
      }
      router.refresh();
    } catch {
      /* sin conexión: se reintenta en el próximo ciclo */
    }
  }, [router]);

  useEffect(() => {
    const first = setTimeout(() => void poll(), 0);
    const t = setInterval(poll, POLL_MS);
    const onVisible = () => { if (!document.hidden) void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(first); clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [poll]);

  async function enable() {
    beep(); // el clic habilita el sonido en este navegador
    if ("Notification" in window) setPerm(await Notification.requestPermission());
  }

  return (
    <>
      {perm === "default" && (
        <button
          type="button"
          onClick={enable}
          className="fixed bottom-4 left-4 z-30 flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm shadow-lg transition hover:border-lime"
        >
          <Bell size={16} className="text-lime-ink" /> Activar avisos de reservas
        </button>
      )}
      {perm === "denied" && (
        <p className="fixed bottom-4 left-4 z-30 flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-xs text-muted shadow-lg">
          <BellOff size={14} /> Avisos del navegador bloqueados (igual vas a ver el cartel)
        </p>
      )}

      <div className="fixed right-4 top-16 z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        {items.map((b) => (
          <div key={b.id} role="alert" className="flex items-start gap-3 rounded-2xl border border-lime bg-surface p-3 shadow-xl">
            <Bell size={20} className="mt-0.5 shrink-0 text-lime-ink" />
            <Link
              href={`/admin/reservas/${b.id}`}
              onClick={() => setItems((p) => p.filter((x) => x.id !== b.id))}
              className="min-w-0 flex-1"
            >
              <span className="block font-semibold">Nueva reserva · {b.customer_name}</span>
              <span className="block text-sm text-muted">
                {formatDateShort(b.start_at)} · {formatTime(b.start_at)}–{formatTime(b.end_at)} · {b.code}
              </span>
            </Link>
            <button type="button" aria-label="Cerrar aviso" onClick={() => setItems((p) => p.filter((x) => x.id !== b.id))} className="text-muted hover:text-foreground">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
