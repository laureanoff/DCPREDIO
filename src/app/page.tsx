import { Suspense } from "react";
import { getPublicVenue } from "@/queries/venue";
import { SiteHeader } from "@/components/public/SiteHeader";
import { Hero } from "@/components/public/Hero";
import { LocationSection } from "@/components/public/LocationSection";
import { InfoSection } from "@/components/public/InfoSection";
import { BookingSection, BookingSkeleton } from "@/components/public/BookingSection";
import { SiteFooter } from "@/components/public/SiteFooter";
import { ScrollFx } from "@/components/public/ScrollFx";
import { FloodlightStage } from "@/components/public/FloodlightStage";
import { Reveal } from "@/components/public/Reveal";
import { SmoothScroll } from "@/components/public/SmoothScroll";

export default async function Home() {
  const venue = await getPublicVenue();

  return (
    <>
      <ScrollFx />
      <SmoothScroll />
      <SiteHeader name={venue.name} logoUrl={venue.logoUrl} />
      <main className="flex-1">
        <Hero venueName={venue.name} />
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
        <Reveal><InfoSection venue={venue} /></Reveal>
        <Reveal><LocationSection venue={venue} /></Reveal>
      </main>
      <SiteFooter name={venue.name} />
    </>
  );
}
