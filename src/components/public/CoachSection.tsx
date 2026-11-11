import type { Coach } from "@/queries/trainings";
import { TrainingVideo } from "./TrainingVideo";

/** «Tu profe»: retrato, cómo surgió la idea (se edita en el panel) y el video del entrenamiento dentro del vidrio. */
export function CoachSection({ coach }: { coach: Coach }) {
  const paragraphs = coach.story.split(/\n{1,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <section aria-labelledby="coach-title" className="mb-14">
      <div className="glass glass-lime grid gap-7 rounded-[2rem] p-6 sm:p-9 lg:grid-cols-[13rem_1fr_15rem] lg:items-start">
        <div className="coach-photo mx-auto flex h-60 w-52 items-end justify-center overflow-hidden rounded-3xl border border-white/10 lg:h-72 lg:w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/trainings/diego.webp" alt={coach.name} className="h-full w-full object-contain object-bottom" />
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-lime-ink">Tu profe</p>
          <h2 id="coach-title" className="font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-none sm:text-5xl">{coach.name}</h2>
          {coach.title && <p className="mt-2 text-lg font-medium text-lime-ink">{coach.title}</p>}
          {coach.bio && <p className="mt-3 max-w-xl text-muted">{coach.bio}</p>}
          {paragraphs.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-5">
              <h3 className="mb-2 font-[family-name:var(--font-display)] text-xl font-bold uppercase">Cómo surgió la idea</h3>
              <div className="flex max-w-xl flex-col gap-3 text-muted">{paragraphs.map((t, i) => <p key={i}>{t}</p>)}</div>
            </div>
          )}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">Mirá cómo entrenamos</p>
          <TrainingVideo variant="player" className="mx-auto aspect-[9/16] w-full max-w-[15rem] glass-lime border" />
        </div>
      </div>
    </section>
  );
}
