import { Suspense } from "react";
import type { Metadata } from "next";
import { getPublicVenue } from "@/queries/venue";
import { getCoach, getTrainingCatalog, getTrainingSessions } from "@/queries/trainings";
import { SiteHeader } from "@/components/public/SiteHeader";
import { TrainingCuts } from "@/components/public/TrainingCuts";
import { CoachSection } from "@/components/public/CoachSection";
import { PitchDivider } from "@/components/public/PitchDivider";
import { Audience, Benefits, Faq, HowItWorks, Schedule } from "@/components/public/TrainingLanding";
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

async function Sessions() {
  return <Schedule sessions={await getTrainingSessions()} />;
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
        <div className="tr-stage mb-14 mt-16 sm:mt-20">
        <TrainingCuts />
        <div className="tr-card tr-hero glass glass-peek glass-lime p-7 pt-14 sm:p-12 sm:pr-[24rem]">
          <span className="tr-clip"><span className="tr-ring" /></span>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-lime-ink">Clases y entrenamiento personal</p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase leading-none sm:text-7xl">
            Entre<span className="title-grass">namientos</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted sm:text-lg">
            Elegí la actividad y el pack que más te sirva, dejanos tus datos y los días que te quedan cómodos. Nosotros te contactamos para confirmar los horarios.
          </p>
          <a href="#inscripcion" className="cta-sheen relative mt-6 inline-flex h-12 items-center overflow-hidden rounded-xl bg-lime px-7 font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-black shadow-[0_14px_34px_-12px_rgba(182,214,26,.8)] transition hover:bg-lime-dark">Ver packs e inscribirme</a>
          <ul className="mt-5 flex flex-wrap gap-2 text-sm">
            {["Chicos y adultos", "Packs por días a la semana", "Pagás en el predio"].map((t) => (
              <li key={t} className="glass rounded-full px-3.5 py-1 font-medium">{t}</li>
            ))}
          </ul>
        </div>
        </div>
        <PitchDivider />
        <Benefits />
        <Audience />
        <HowItWorks />
        <Suspense fallback={null}><Sessions /></Suspense>
        <Suspense fallback={null}><Coach /></Suspense>
        <div id="inscripcion" className="scroll-mt-24">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lime-ink">Inscripción</p>
          <h2 className="mb-5 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase sm:text-4xl">Elegí tu pack y anotate</h2>
          <Suspense fallback={<p className="text-muted">Cargando…</p>}>
            <Catalog />
          </Suspense>
        </div>
        <Faq />
      </main>
      </div>
      <SiteFooter name={venue.name} />
    </>
  );
}
