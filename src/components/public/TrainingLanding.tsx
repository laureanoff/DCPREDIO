import { Dumbbell, HeartPulse, Medal, ShieldCheck, Smile, Users, Zap } from "lucide-react";
import { WEEKDAYS } from "@/lib/training";
import type { Proposal, PublicSession } from "@/queries/trainings";
import { Reveal } from "./Reveal";

const BENEFITS = [
  { icon: Dumbbell, title: "Fuerza y estabilidad", text: "Trabajo con el propio cuerpo y con pesas para ganar fuerza de forma progresiva y segura." },
  { icon: Zap, title: "Coordinación y agilidad", text: "Ejercicios de movimiento, escalera y balón que mejoran reflejos, equilibrio y control del cuerpo." },
  { icon: HeartPulse, title: "Resistencia", text: "Más energía para el día a día y para rendir mejor cuando te toca jugar al fútbol." },
  { icon: ShieldCheck, title: "Postura y prevención", text: "Movilidad y técnica correcta para moverte mejor y cuidar articulaciones y espalda." },
  { icon: Medal, title: "Confianza y constancia", text: "Objetivos claros y una rutina que se sostiene: ver el progreso motiva a seguir." },
  { icon: Smile, title: "Diversión en grupo", text: "Clases dinámicas, en un ambiente cómodo, donde entrenar es parte de lo que más se disfruta." },
];

const STEPS = [
  { title: "Elegí tus días", text: "Cuántas veces por semana querés entrenar." },
  { title: "Dejá tus datos", text: "Completás la inscripción online en un minuto y marcás los días que te quedan cómodos." },
  { title: "Te contactamos", text: "Te escribimos por WhatsApp para confirmar días y horarios." },
  { title: "Entrená y pagá en el predio", text: "Sin pagos online: abonás directamente en el predio." },
];

const FAQ = [
  { q: "¿Cómo se paga?", a: "El pago se hace en el predio. La inscripción online no cobra nada: sirve para reservarte el lugar y que nos pongamos en contacto." },
  { q: "¿Cuándo me confirman los horarios?", a: "Apenas recibimos tu solicitud te escribimos por WhatsApp para ponernos de acuerdo. Además, esta pantalla te avisa cuando la aceptamos." },
  { q: "¿Puedo anotar a mi hijo o hija?", a: "Sí. En el formulario elegís si la inscripción es para un chico o para vos, y cargás los datos del responsable." },
  { q: "¿Y si tengo alguna lesión o condición de salud?", a: "Contanos en el formulario (hay un campo para eso) y el profe lo tiene en cuenta al planificar el entrenamiento." },
  { q: "¿Qué tengo que llevar?", a: "Ropa cómoda, zapatillas y agua. Lo demás lo ponemos nosotros." },
];

const H2 = "font-[family-name:var(--font-display)] text-3xl font-extrabold uppercase sm:text-4xl";

export function Benefits() {
  return (
    <section aria-labelledby="t-ben" className="mb-14">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lime-ink">Lo que vas a lograr</p>
        <h2 id="t-ben" className={`${H2} mb-5`}>Entrená mejor, sentite mejor</h2>
        <ul className="info-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, text }, i) => (
            <li key={title} style={{ "--i": i } as React.CSSProperties} className="glass glass-lift rounded-3xl p-5">
              <span className="glass-ico mb-3 inline-flex"><Icon size={22} aria-hidden /></span>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-bold uppercase">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

const PROPOSAL_ICONS = [Smile, Medal, Users, Dumbbell];

/** Propuestas por edad/objetivo: se editan en el panel («Textos y profe»). */
export function Proposals({ title, proposals }: { title: string; proposals: Proposal[] }) {
  if (proposals.length === 0) return null;
  return (
    <section aria-labelledby="t-aud" className="mb-14">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lime-ink">Para quién es</p>
        <h2 id="t-aud" className={`${H2} mb-5`}>{title}</h2>
        <div className="info-grid grid gap-3 md:grid-cols-3">
          {proposals.map((p, i) => {
            const Icon = PROPOSAL_ICONS[i % PROPOSAL_ICONS.length];
            return (
              <article key={`${p.title}-${i}`} style={{ "--i": i } as React.CSSProperties} className="glass glass-lime glass-lift flex flex-col rounded-3xl p-6">
                <div className="mb-3 flex items-center gap-3">
                  <span className="glass-ico shrink-0"><Icon size={22} aria-hidden /></span>
                  <span className="font-[family-name:var(--font-display)] text-3xl font-extrabold text-lime-ink/70">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase leading-tight">{p.title}</h3>
                {p.subtitle && <p className="text-sm font-semibold text-lime-ink">{p.subtitle}</p>}
                {p.text && <p className="mt-2 text-muted">{p.text}</p>}
                {p.tags.length > 0 && (
                  <ul className="mt-auto flex flex-wrap gap-2 pt-4 text-xs font-semibold">
                    {p.tags.map((t) => <li key={t} className="glass rounded-full px-3 py-1">{t}</li>)}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section aria-labelledby="t-how" className="mb-14">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lime-ink">Cómo funciona</p>
        <h2 id="t-how" className={`${H2} mb-5`}>Empezar es simple</h2>
        <ol className="info-grid grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} style={{ "--i": i } as React.CSSProperties} className="glass rounded-3xl p-5">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-lime font-[family-name:var(--font-display)] text-xl font-extrabold text-black">{i + 1}</span>
              <h3 className="font-[family-name:var(--font-display)] text-lg font-bold uppercase leading-tight">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Reveal>
    </section>
  );
}

/** Días y horarios cargados en el panel. Si no hay ninguno, no se muestra la sección. */
export function Schedule({ sessions }: { sessions: PublicSession[] }) {
  if (sessions.length === 0) return null;
  return (
    <section aria-labelledby="t-sch" className="mb-14">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lime-ink">Días y horarios</p>
        <h2 id="t-sch" className={`${H2} mb-5`}>Cuándo entrenamos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {WEEKDAYS.map((d, i) => {
            const list = sessions.filter((s) => s.weekday === i);
            if (list.length === 0) return null;
            return (
              <div key={d} className="glass rounded-3xl p-5">
                <h3 className="font-[family-name:var(--font-display)] text-xl font-bold uppercase text-lime-ink">{d}</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {list.map((s) => (
                    <li key={s.id}>
                      <p className="font-semibold">{s.start}{s.end && ` a ${s.end}`} · {s.title}</p>
                      {s.details && <p className="whitespace-pre-line text-sm text-muted">{s.details}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Reveal>
    </section>
  );
}

export function Faq() {
  return (
    <section aria-labelledby="t-faq" className="mt-16">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-lime-ink">Preguntas frecuentes</p>
        <h2 id="t-faq" className={`${H2} mb-5`}>Dudas comunes</h2>
        <div className="flex flex-col gap-2">
          {FAQ.map((f) => (
            <details key={f.q} className="glass group rounded-2xl px-5 py-4">
              <summary className="cursor-pointer list-none font-semibold marker:hidden">{f.q}</summary>
              <p className="mt-2 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
