import { Suspense } from "react";
import { getPublicVenue } from "@/queries/venue";
import { SiteHeader } from "@/components/public/SiteHeader";
import { Hero } from "@/components/public/Hero";
import { InfoSection } from "@/components/public/InfoSection";
import { BookingSection, BookingSkeleton } from "@/components/public/BookingSection";
import { SiteFooter } from "@/components/public/SiteFooter";

export default async function Home() {
  const venue = await getPublicVenue();

  return (
    <>
      <SiteHeader name={venue.name} logoUrl={venue.logoUrl} />
      <main className="flex-1">
        <Hero venueName={venue.name} />
        <InfoSection venue={venue} />
        <section id="reservar" className="scroll-mt-20 px-5 py-10">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-6 font-[family-name:var(--font-display)] text-5xl font-extrabold uppercase sm:text-6xl">
              Reservar <span className="text-lime-ink">turno</span>
            </h2>
            <Suspense fallback={<BookingSkeleton />}>
              <BookingSection venue={venue} />
            </Suspense>
          </div>
        </section>
      </main>
      <SiteFooter name={venue.name} />
    </>
  );
}
