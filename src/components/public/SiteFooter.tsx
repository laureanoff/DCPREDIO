import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { summarizeHours } from "@/business/hours";
import { InstagramIcon, WhatsAppIcon } from "@/components/ui/BrandIcons";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { getPublicVenue } from "@/queries/venue";
import { Logo } from "@/components/brand/Logo";
import { FloatingActions } from "./FloatingActions";

const a = "inline-flex items-center gap-2 transition hover:text-foreground";

/** Pie de página: contacto, horarios, redes y accesos rápidos. Todo sale de Configuración en el panel. */
export async function SiteFooter({ name }: { name: string }) {
  const v = await getPublicVenue();
  const wa = v.contactWhatsapp?.replace(/\D/g, "") ?? "";
  const hasWa = wa.length >= 8 && wa.length <= 15;
  const hours = summarizeHours(v.hours);
  const maps = v.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}` : null;

  return (
    <footer className="relative mt-16 px-5 pb-8 pt-12 text-sm text-muted">
      <div aria-hidden className="grass-edge"><i /><i /></div>
      <div className="mx-auto grid max-w-5xl gap-8 pb-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <Logo variant="horizontal" className="h-8 w-auto self-start" />
          <p>Canchas de fútbol 5 y entrenamientos. Reservá online en un minuto.</p>
          <div className="flex gap-2">
            {v.instagramUrl && (
              <a href={v.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram de DC Predio" className="glass flex h-11 w-11 items-center justify-center rounded-full text-foreground transition hover:text-lime-ink"><InstagramIcon /></a>
            )}
            {hasWa && (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de DC Predio" className="glass flex h-11 w-11 items-center justify-center rounded-full text-foreground transition hover:text-lime-ink"><WhatsAppIcon /></a>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <h2 className="font-[family-name:var(--font-display)] text-base font-bold uppercase tracking-wide text-foreground">Contacto</h2>
          {v.address && maps && <a href={maps} target="_blank" rel="noopener noreferrer" className={a}><MapPin size={16} className="shrink-0 text-lime-ink" aria-hidden />{v.address}</a>}
          {hasWa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={a}><WhatsAppIcon size={16} className="shrink-0 text-lime-ink" />WhatsApp</a>}
          {v.contactPhone && <a href={`tel:${v.contactPhone}`} className={a}><Phone size={16} className="shrink-0 text-lime-ink" aria-hidden />{v.contactPhone}</a>}
          {v.contactEmail && <a href={`mailto:${v.contactEmail}`} className={a}><Mail size={16} className="shrink-0 text-lime-ink" aria-hidden />{v.contactEmail}</a>}
          {v.instagramUrl && <a href={v.instagramUrl} target="_blank" rel="noopener noreferrer" className={a}><InstagramIcon size={16} className="shrink-0 text-lime-ink" />@{v.instagramUrl.replace(/\/+$/, "").split("/").pop()}</a>}
        </div>

        <div className="flex flex-col gap-2.5">
          <h2 className="font-[family-name:var(--font-display)] text-base font-bold uppercase tracking-wide text-foreground">Horarios</h2>
          {hours.map((h) => (
            <p key={h.days} className="flex items-start gap-2"><Clock size={16} className="mt-0.5 shrink-0 text-lime-ink" aria-hidden /><span><span className="text-foreground">{h.days}</span><br />{h.time}</span></p>
          ))}
        </div>

        <nav aria-label="Accesos rápidos" className="flex flex-col gap-2.5">
          <h2 className="font-[family-name:var(--font-display)] text-base font-bold uppercase tracking-wide text-foreground">Accesos</h2>
          <Link href="/#reservar" className={a}>Reservar turno</Link>
          <Link href="/entrenamientos" className={a}>Entrenamientos</Link>
          <Link href="/mi-reserva" className={a}>Consultar o cancelar mi reserva</Link>
        </nav>
      </div>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <span>© {v.name || name}</span>
        <ThemeToggle showLabels />
      </div>
      <FloatingActions whatsapp={hasWa ? wa : null} />
    </footer>
  );
}
