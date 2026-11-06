import { Banknote, Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { summarizeHours } from "@/business/hours";
import { formatMoney } from "@/lib/utils";
import type { PublicVenue } from "@/queries/venue";

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime/15 text-lime-ink">{icon}</span>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export function InfoSection({ venue }: { venue: PublicVenue }) {
  const hours = summarizeHours(venue.hours);
  const whatsappDigits = venue.contactWhatsapp?.replace(/\D/g, "");
  const hasContact = venue.address || venue.contactPhone || venue.contactEmail || whatsappDigits;

  return (
    <section className="px-5 py-10">
      <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        <Card icon={<Banknote size={20} />} title="Precios">
          <dl className="space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Turno de cancha
                <span className="block text-xs">hasta {venue.maxPlayers} jugadores</span>
              </dt>
              <dd className="font-[family-name:var(--font-display)] text-3xl font-bold text-lime-ink">
                {formatMoney(venue.priceGroup, venue.currency)}
              </dd>
            </div>
            {venue.maxPlayers > 1 && (
              <div>
                <dt className="sr-only">Por jugador</dt>
                <dd className="text-xs text-muted">
                  Unos {formatMoney(Math.round(venue.priceGroup / venue.maxPlayers), venue.currency)} por jugador si se divide entre {venue.maxPlayers}.
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card icon={<Clock size={20} />} title="Horarios">
          <ul className="space-y-2 text-sm">
            {hours.map((h) => (
              <li key={h.days} className="flex justify-between gap-3">
                <span className="text-muted">{h.days}</span>
                <span className="font-medium">{h.time}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Turnos de {venue.slotDurationMinutes} minutos.</p>
        </Card>

        {hasContact && (
          <Card icon={<MapPin size={20} />} title="Cómo llegar">
            <ul className="space-y-3 text-sm">
              {venue.address && (
                <li className="flex items-start gap-2">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-muted" />
                  <span>{venue.address}</span>
                </li>
              )}
              {venue.address && (
                <li>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center rounded-xl bg-lime px-4 text-sm font-semibold text-black transition hover:bg-lime-dark"
                  >
                    Cómo llegar
                  </a>
                </li>
              )}
              {venue.contactPhone && (
                <li className="flex items-center gap-2">
                  <Phone size={16} className="shrink-0 text-muted" />
                  <a href={`tel:${venue.contactPhone}`} className="hover:text-lime-ink">{venue.contactPhone}</a>
                </li>
              )}
              {whatsappDigits && (
                <li className="flex items-center gap-2">
                  <MessageCircle size={16} className="shrink-0 text-muted" />
                  <a
                    href={`https://wa.me/${whatsappDigits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-lime-ink"
                  >
                    Consultas por WhatsApp
                  </a>
                </li>
              )}
              {venue.contactEmail && (
                <li className="flex items-center gap-2">
                  <Mail size={16} className="shrink-0 text-muted" />
                  <a href={`mailto:${venue.contactEmail}`} className="hover:text-lime-ink">{venue.contactEmail}</a>
                </li>
              )}
            </ul>
          </Card>
        )}
      </div>

      {venue.address && (
        <div className="mx-auto mt-4 max-w-5xl overflow-hidden rounded-3xl border border-border bg-surface">
          <iframe
            title={`Mapa: ${venue.address}`}
            src={`https://www.google.com/maps?q=${encodeURIComponent(venue.address)}&z=16&output=embed`}
            className="h-72 w-full border-0 sm:h-96"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      )}
    </section>
  );
}
