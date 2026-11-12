import { Suspense } from "react";
import Link from "next/link";
import { getPublicVenue } from "@/queries/venue";
import { getTrainingCatalog } from "@/queries/trainings";
import { SiteHeader } from "@/components/public/SiteHeader";
import { Hero } from "@/components/public/Hero";
import { TodayBadge } from "@/components/public/TodayBadge";
import { LocationSection } from "@/components/public/LocationSection";
import { InfoSection } from "@/components/public/InfoSection";
import { BookingSection, BookingSkeleton } from "@/components/public/BookingSection";
import { Testimonials } from "@/components/public/Testimonials";
import { getTestimonials } from "@/queries/trainings";
import { SiteFooter } from "@/components/public/SiteFooter";
import { ScrollFx } from "@/components/public/ScrollFx";
import { FloodlightStage } from "@/components/public/FloodlightStage";
import { Ambient } from "@/components/public/Ambient";
import { TrainingCuts } from "@/components/public/TrainingCuts";
import { Reveal } from "@/components/public/Reveal";
import { SmoothScroll } from "@/components/public/SmoothScroll";

async function TrainingsTeaser() {
  const catalog = await getTrainingCatalog();
  if (catalog.length === 0) return null;
  return (
    <section className="px-5 pb-6 pt-20 sm:pt-24">
      <Reveal className="mx-auto max-w-5xl">
        <div className="tr-stage is-sm">
        <TrainingCuts />
        <div className="tr-card glass glass-peek glass-lime rounded-[2rem] p-7 pt-14 sm:p-11 sm:pr-[22rem]">
          <span className="tr-clip"><span className="tr-ring" /></span>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-lime-ink">Clases y entrenamiento personal</p>
          <h2 className="font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase leading-none sm:text-6xl">
            Entre<span className="title-grass">namientos</span>
          </h2>
          <p className="mt-4 max-w-xl text-muted sm:text-lg">Para chicos y adultos. Elegí cuántos días por semana querés entrenar e inscribite online; el pago se hace en el predio.</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {catalog.map((a) => (
              <li key={a.id} className="glass rounded-full px-4 py-1.5 text-sm font-medium">{a.name}</li>
            ))}
          </ul>
          <Link href="/entrenamientos" className="cta-sheen relative mt-7 inline-flex h-12 items-center gap-3 overflow-hidden rounded-xl bg-lime px-7 font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-black shadow-[0_14px_34px_-12px_rgba(182,214,26,.8)] transition hover:bg-lime-dark">
            <span className="cta-ball" aria-hidden /> Ver propuestas
          </Link>
        </div>
        </div>
      </Reveal>
    </section>
  );
}

async function HeaderWithTrainings({ name }: { name: string }) {
  const catalog = await getTrainingCatalog();
  return <SiteHeader name={name} hasTrainings={catalog.length > 0} />;
}

async function CourtReviews() {
  return (
    <div className="mx-auto max-w-5xl px-5">
      <Testimonials items={await getTestimonials("courts")} title="Lo que dicen quienes juegan acá" />
    </div>
  );
}

export default async function Home() {
  const venue = await getPublicVenue();

  return (
    <>
      <ScrollFx />
      <SmoothScroll />
      <Suspense fallback={<SiteHeader name={venue.name} />}><HeaderWithTrainings name={venue.name} /></Suspense>
      <main className="flex-1">
        <Hero venueName={venue.name} badge={<Suspense fallback={null}><TodayBadge venue={venue} /></Suspense>} />
        <FloodlightStage>
          <Reveal className="mx-auto max-w-5xl">
            <h2 className="stage-title mb-6 font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase sm:text-6xl">
              Reservar <span className="text-lime">turno</span>
            </h2>
            <Suspense fallback={<BookingSkeleton />}>
              <BookingSection venue={venue} />
            </Suspense>
          </Reveal>
        </FloodlightStage>
        <div className="ambient">
          <Ambient />
          <Reveal><InfoSection venue={venue} /></Reveal>
          <Suspense fallback={null}><TrainingsTeaser /></Suspense>
          <Suspense fallback={null}><CourtReviews /></Suspense>
          <Reveal><LocationSection venue={venue} /></Reveal>
        </div>
      </main>
      <SiteFooter name={venue.name} />
    </>
  );
}
