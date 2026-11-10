import { connection } from "next/server";
import { todayKey } from "@/lib/datetime";
import type { PublicVenue } from "@/queries/venue";
import { BookingWidget } from "./BookingWidget";

/** Calcula "hoy" en el servidor, en el momento de cada request (la fecha no puede quedar congelada en el build). */
export async function BookingSection({ venue }: { venue: PublicVenue }) {
  await connection();
  return <BookingWidget venue={venue} today={todayKey(venue.timezone)} />;
}

export function BookingSkeleton() {
  return <div className="h-[34rem] animate-pulse rounded-3xl border border-border bg-surface" aria-busy />;
}
