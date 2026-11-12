import { Quote, Star } from "lucide-react";
import type { Testimonial } from "@/queries/trainings";
import { Reveal } from "./Reveal";

function Stars({ n, base }: { n: number; base: number }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`${n} de 5 estrellas`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={18} aria-hidden style={{ "--s": base + i } as React.CSSProperties} className={i < n ? "tm-star fill-lime text-lime" : "text-border"} />
      ))}
    </span>
  );
}

/** Opiniones de alumnos y familias. Se cargan en el panel; sin ninguna, no se muestra. */
export function Testimonials({ items, title = "Lo que dicen de entrenar acá" }: { items: Testimonial[]; title?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="t-tes" className="mb-14">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lime-ink">Testimonios</p>
        <h2 id="t-tes" className="mb-5 font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase sm:text-4xl">{title}</h2>
        <ul className="info-grid tm-grid">
          {items.map((t, i) => (
            <li key={t.id} style={{ "--i": i } as React.CSSProperties} className="tm-card glass glass-lime glass-lift relative flex flex-col gap-3 overflow-hidden rounded-3xl p-6">
              <Quote aria-hidden size={72} className="tm-quote pointer-events-none absolute -right-2 -top-2 text-lime/25" />
              <Stars n={t.rating} base={i * 2} />
              <blockquote className="relative text-base leading-relaxed">{t.body}</blockquote>
              <figcaption className="mt-auto flex items-center gap-3 pt-2">
                <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-lime font-[family-name:var(--font-display)] text-xl font-extrabold text-black">{t.author.trim().charAt(0).toUpperCase()}</span>
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{t.author}</span>
                  {t.detail && <span className="block truncate text-sm text-muted">{t.detail}</span>}
                </span>
              </figcaption>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
