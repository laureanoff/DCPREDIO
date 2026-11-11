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
import { SiteFooter } from "@/components/public/SiteFooter";
import { ScrollFx } from "@/components/public/ScrollFx";
import { FloodlightStage } from "@/components/public/FloodlightStage";
import { Reveal } from "@/components/public/Reveal";
import { SmoothScroll } from "@/components/public/SmoothScroll";

async function TrainingsTeaser() {
  const catalog = await getTrainingCatalog();
  if (catalog.length === 0) return null;
  return (
    <section className="px-5 py-16">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 rounded-3xl border border-border bg-surface p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase">
            Entre<span className="text-lime">namientos</span>
          </h2>
          <p className="mt-2 max-w-xl text-muted">
            {catalog.map((a) => a.name).join(" · ")}. Clases para chicos y adultos: elegí tu pack e inscribite online.
          </p>
        </div>
        <Link href="/entrenamientos" className="inline-flex h-12 shrink-0 items-center rounded-xl bg-lime px-6 font-[family-name:var(--font-display)] text-lg font-bold uppercase tracking-wide text-black transition hover:bg-lime-dark">
          Ver packs
        </Link>
      </div>
    </section>
  );
}

async function HeaderWithTrainings({ name }: { name: string }) {
  const catalog = await getTrainingCatalog();
  return <SiteHeader name={name} hasTrainings={catalog.length > 0} />;
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
        <Suspense fallback={null}><TrainingsTeaser /></Suspense>
        <Reveal><InfoSection venue={venue} /></Reveal>
        <Reveal><LocationSection venue={venue} /></Reveal>
      </main>
      <SiteFooter name={venue.name} />
    </>
  );
}
