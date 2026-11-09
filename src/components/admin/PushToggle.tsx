"use client";

import { useEffect, useState } from "react";
import { removePushSubscription, savePushSubscription } from "@/app/admin/(panel)/push-actions";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function toKey(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

export function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID) {
        setState(ios && !standalone ? "ios-install" : "unsupported");
        return;
      }
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setState(sub && Notification.permission === "granted" ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID) }));
      const r = await savePushSubscription(sub.toJSON());
      if (!r.ok) throw new Error(r.error);
      setState("on");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron activar los avisos.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;
  const box = "rounded-2xl border border-border bg-surface p-4 text-sm";

  return (
    <section className={box}>
      <h2 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase">Avisos en este celular</h2>
      {state === "on" && (
        <>
          <p className="mt-1 text-muted">Activados: te llega una notificación aunque el celular esté bloqueado.</p>
          <button onClick={disable} disabled={busy} className="mt-3 h-11 rounded-xl border border-border px-4 font-semibold disabled:opacity-50">Desactivar</button>
        </>
      )}
      {state === "off" && (
        <>
          <p className="mt-1 text-muted">Recibí un aviso con sonido cuando entra o se cancela una reserva, incluso con la pantalla bloqueada.</p>
          <button onClick={enable} disabled={busy} className="mt-3 h-11 rounded-xl bg-lime px-4 font-semibold text-black disabled:opacity-50">{busy ? "Activando…" : "Activar avisos"}</button>
        </>
      )}
      {state === "denied" && <p className="mt-1 text-muted">Bloqueaste las notificaciones de este sitio. Habilitalas desde los ajustes del navegador o de la app y volvé a entrar.</p>}
      {state === "ios-install" && <p className="mt-1 text-muted">En iPhone primero tenés que instalar la app: tocá Compartir → «Agregar a pantalla de inicio», abrila desde ahí y activá los avisos.</p>}
      {state === "unsupported" && <p className="mt-1 text-muted">Este navegador no soporta notificaciones push.</p>}
      {error && <p role="alert" className="mt-2 text-danger">{error}</p>}
    </section>
  );
}
