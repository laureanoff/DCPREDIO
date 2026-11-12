import { Suspense } from "react";
import type { Metadata } from "next";
import { getPublicVenue } from "@/queries/venue";
import { getCoach, getPageContent, getTestimonials, getTrainingCatalog, getTrainingSessions } from "@/queries/trainings";
import { SiteHeader } from "@/components/public/SiteHeader";
import { TrainingCuts } from "@/components/public/TrainingCuts";
import { CoachSection } from "@/components/public/CoachSection";
import { PitchDivider } from "@/components/public/PitchDivider";
import { Benefits, Faq, HowItWorks, Proposals, Schedule } from "@/components/public/TrainingLanding";
import { Testimonials } from "@/components/public/Testimonials";
import { Ambient } from "@/components/public/Ambient";
import { SiteFooter } from "@/components/public/SiteFooter";
import { TrainingForm } from "./training-form";

export const metadata: Metadata = {
  title: "Entrenamientos",
  description: "Clases y entrenamientos para chicos y adultos. Elegí cuántos días por semana e inscribite online.",
};

async function Catalog() {
  const [catalog, content] = await Promise.all([getTrainingCatalog(), getPageContent()]);
  return <TrainingForm catalog={catalog} showPrices={content.showPrices} />;
}

async function Ben() {
  const c = await getPageContent();
  return <Benefits title={c.benefitsTitle} items={c.benefits} />;
}

async function Reviews() {
  return <Testimonials items={await getTestimonials("trainings")} />;
}

async function Props() {
  const c = await getPageContent();
  return <Proposals title={c.proposalsTitle} proposals={c.proposals} />;
}

async function Coach() {
  const coach = await getCoach();
  return coach ? <CoachSection coach={coach} /> : null;
}

async function Sessions() {
  const content = await getPageContent();
  return content.showSchedule ? <Schedule sessions={await getTrainingSessions()} /> : null;
}

async function FaqSection() {
  const c = await getPageContent();
  return <Faq showPrices={c.showPrices} />;
}

async function Hero() {
  const c = await getPageContent();
  return (
    <>
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-lime-ink">{c.tagline}</p>
      <h1 className="font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase leading-none sm:text-7xl">
        Entre<span className="title-grass">namientos</span>
      </h1>
      <p className="mt-4 max-w-xl whitespace-pre-line text-muted sm:text-lg">{c.text}</p>
    </>
  );
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
          <Suspense fallback={<h1 className="font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase leading-none sm:text-7xl">Entrenamientos</h1>}><Hero /></Suspense>
          <a href="#inscripcion" className="cta-sheen relative mt-6 inline-flex h-12 items-center overflow-hidden rounded-xl bg-lime px-7 font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-black shadow-[0_14px_34px_-12px_rgba(182,214,26,.8)] transition hover:bg-lime-dark">Ver propuestas e inscribirme</a>
          <ul className="mt-5 flex flex-wrap gap-2 text-sm">
            {["Niños, jóvenes y adultos", "Días por semana a elección", "Pagás en el predio"].map((t) => (
              <li key={t} className="glass rounded-full px-3.5 py-1 font-medium">{t}</li>
            ))}
          </ul>
        </div>
        </div>
        <PitchDivider />
        <Suspense fallback={null}><Ben /></Suspense>
        <Suspense fallback={null}><Props /></Suspense>
        <HowItWorks />
        <Suspense fallback={null}><Sessions /></Suspense>
        <Suspense fallback={null}><Coach /></Suspense>
        <Suspense fallback={null}><Reviews /></Suspense>
        <div id="inscripcion" className="scroll-mt-24">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lime-ink">Inscripción</p>
          <h2 className="mb-5 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase sm:text-4xl">Elegí tus días y anotate</h2>
          <Suspense fallback={<p className="text-muted">Cargando…</p>}>
            <Catalog />
          </Suspense>
        </div>
        <Suspense fallback={null}><FaqSection /></Suspense>
      </main>
      </div>
      <SiteFooter name={venue.name} />
    </>
  );
}
