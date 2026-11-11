import { Suspense } from "react";
import type { Metadata } from "next";
import { getPublicVenue } from "@/queries/venue";
import { getTrainingCatalog } from "@/queries/trainings";
import { SiteHeader } from "@/components/public/SiteHeader";
import { SiteFooter } from "@/components/public/SiteFooter";
import { TrainingForm } from "./training-form";

export const metadata: Metadata = {
  title: "Entrenamientos",
  description: "Clases y entrenamientos para chicos y adultos. Elegí tu pack e inscribite online.",
};

async function Catalog() {
  const catalog = await getTrainingCatalog();
  return <TrainingForm catalog={catalog} />;
}

async function Header({ name }: { name: string }) {
  const catalog = await getTrainingCatalog();
  return <SiteHeader name={name} hasTrainings={catalog.length > 0} />;
}

export default async function EntrenamientosPage() {
  const venue = await getPublicVenue();
  return (
    <>
      <Suspense fallback={<SiteHeader name={venue.name} />}><Header name={venue.name} /></Suspense>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-12 sm:py-16">
        <h1 className="font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase sm:text-6xl">
          Entre<span className="text-lime">namientos</span>
        </h1>
        <p className="mb-10 mt-3 max-w-2xl text-muted">
          Clases y entrenamientos personales. Elegí la actividad y el pack que más te sirva, dejanos tus datos y los días que te quedan cómodos, y te contactamos para
          confirmar los horarios.
        </p>
        <Suspense fallback={<p className="text-muted">Cargando…</p>}>
          <Catalog />
        </Suspense>
      </main>
      <SiteFooter name={venue.name} />
    </>
  );
}
