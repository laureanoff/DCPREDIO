import { Suspense } from "react";
import type { Metadata } from "next";
import { getPublicVenue } from "@/queries/venue";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { MyBookingForm } from "./my-booking-form";

export const metadata: Metadata = { title: "Mi reserva", robots: { index: false } };

async function Shell() {
  const venue = await getPublicVenue();
  return (
    <>
      <SiteHeader name={venue.name} />
      <main className="mx-auto w-full max-w-md px-5 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase">Mi reserva</h1>
        <p className="mt-2 text-sm text-muted">Ingresá el código que te dimos al reservar y el teléfono con el que lo hiciste.</p>
        <MyBookingForm />
      </main>
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
