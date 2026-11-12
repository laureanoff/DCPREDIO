"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { WhatsAppIcon } from "@/components/ui/BrandIcons";
import { cn } from "@/lib/utils";

/**
 * Botón flotante de WhatsApp y, en el celular, una barra con la acción principal de la página
 * (Reservar / Inscribirme). Aparece después de pasar el inicio y se esconde al llegar al formulario.
 */
export function FloatingActions({ whatsapp }: { whatsapp: string | null }) {
  const path = usePathname();
  const training = path.startsWith("/entrenamientos");
  const home = path === "/";
  const target = training ? "inscripcion" : home ? "reservar" : null;
  const [past, setPast] = useState(false);
  const [atTarget, setAtTarget] = useState(false);

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > 520);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!target) return;
    const el = document.getElementById(target);
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setAtTarget(e.isIntersecting), { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, [target, path]);

  if (!whatsapp && !target) return null;
  const msg = training ? "Hola! Quiero consultar por los entrenamientos." : "Hola! Quiero consultar por una reserva.";
  const showBar = Boolean(target) && past && !atTarget;

  return (
    <>
      {target && (
        <div className={cn("fab-bar fixed bottom-4 left-4 right-[5.25rem] z-30 sm:hidden", showBar ? "fab-on" : "fab-off")} aria-hidden={!showBar}>
          <Link href={`#${target}`} tabIndex={showBar ? 0 : -1} className="cta-sheen relative flex h-14 items-center justify-center overflow-hidden rounded-2xl bg-lime font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-wide text-black shadow-[0_14px_34px_-10px_rgba(182,214,26,.85)]">
            {training ? "Inscribirme" : "Reservar turno"}
          </Link>
        </div>
      )}
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribinos por WhatsApp"
          className={cn("fab-wa fixed bottom-4 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_30px_-8px_rgba(37,211,102,.7)] transition hover:scale-105", past ? "fab-on" : "fab-off")}
        >
          <WhatsAppIcon size={30} />
        </a>
      )}
    </>
  );
}
