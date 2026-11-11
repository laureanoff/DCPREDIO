import { Suspense } from "react";
import type { Metadata } from "next";
import { getPublicVenue } from "@/queries/venue";
import { getCoach, getTrainingCatalog } from "@/queries/trainings";
import { SiteHeader } from "@/components/public/SiteHeader";
import { TrainingCuts } from "@/components/public/TrainingCuts";
import { CoachSection } from "@/components/public/CoachSection";
import { Ambient } from "@/components/public/Ambient";
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

async function Coach() {
  const coach = await getCoach();
  return coach ? <CoachSection coach={coach} /> : null;
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
      <div className="ambient flex-1">
      <Ambient />
      <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:py-16">
        <div className="tr-stage mb-12 mt-32 sm:mt-36">
        <TrainingCuts />
        <div className="tr-card tr-hero glass glass-peek glass-lime p-7 pt-36 sm:p-12 sm:pr-[32rem]">
          <span className="tr-clip"><span className="tr-ring" /></span>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-lime-ink">Clases y entrenamiento personal</p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase leading-none sm:text-7xl">
            Entre<span className="title-grass">namientos</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted sm:text-lg">
            Elegí la actividad y el pack que más te sirva, dejanos tus datos y los días que te quedan cómodos. Nosotros te contactamos para confirmar los horarios.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2 text-sm">
            {["Chicos y adultos", "Packs por días a la semana", "Pagás en el predio"].map((t) => (
              <li key={t} className="glass rounded-full px-3.5 py-1 font-medium">{t}</li>
            ))}
          </ul>
        </div>
        </div>
        <Suspense fallback={null}><Coach /></Suspense>
        <Suspense fallback={<p className="text-muted">Cargando…</p>}>
          <Catalog />
        </Suspense>
      </main>
      </div>
      <SiteFooter name={venue.name} />
    </>
  );
}
