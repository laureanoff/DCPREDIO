import { Suspense } from "react";
import type { Metadata } from "next";
import { Ticket } from "lucide-react";
import { getPublicVenue } from "@/queries/venue";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { Ambient } from "@/components/public/Ambient";
import { MyBookingForm } from "./my-booking-form";

export const metadata: Metadata = { title: "Mi reserva", robots: { index: false } };

async function Shell() {
  const venue = await getPublicVenue();
  return (
    <>
      <SiteHeader name={venue.name} />
      <div className="ambient flex-1">
        <Ambient />
        <main className="mx-auto w-full max-w-lg px-5 py-12 sm:py-16">
          <div className="glass glass-lime step-enter relative mb-6 overflow-hidden rounded-[2rem] p-7 sm:p-9">
            <span className="tr-clip"><span className="tr-ring" /></span>
            <span className="glass-ico mb-4 inline-flex"><Ticket size={24} aria-hidden /></span>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-lime-ink">Tu turno</p>
            <h1 className="font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase leading-none">
              Mi <span className="title-grass">reserva</span>
            </h1>
            <p className="mt-3 text-muted">Ingresá el código que te dimos al reservar y el teléfono con el que lo hiciste. Podés ver los detalles y cancelar si hace falta.</p>
          </div>
          <MyBookingForm />
        </main>
      </div>
      <SiteFooter name={venue.name} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-muted">Cargando…</p>}>
      <Shell />
    </Suspense>
  );
}
