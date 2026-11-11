import type { Coach } from "@/queries/trainings";
import { CutOut } from "./CutOut";
import { TrainingVideo } from "./TrainingVideo";

/** «Tu profe»: foto recortada detrás del vidrio + video del entrenamiento. Nombre y título salen de Configuración. */
export function CoachSection({ coach }: { coach: Coach }) {
  return (
    <section aria-labelledby="coach-title" className="tr-stage coach-stage mb-12 mt-36 sm:mt-40">
      <div className="tr-cuts" aria-hidden>
        <CutOut src="/trainings/diego.webp" delay={0.2} from={-40} float={false} className="k-diego" />
      </div>
      <div className="tr-card glass glass-peek glass-lime grid gap-6 rounded-[2rem] p-7 pt-32 sm:grid-cols-[1fr_15rem] sm:items-center sm:p-10 sm:pl-[16rem] sm:pt-10">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-lime-ink">Tu profe</p>
          <h2 id="coach-title" className="font-[family-name:var(--font-display)] text-4xl font-extrabold uppercase leading-none sm:text-5xl">{coach.name}</h2>
          {coach.title && <p className="mt-2 text-lg font-medium text-lime-ink">{coach.title}</p>}
          {coach.bio && <p className="mt-3 max-w-md text-muted">{coach.bio}</p>}
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted">Mirá cómo entrenamos</p>
          <TrainingVideo variant="player" className="mx-auto aspect-[9/16] w-full max-w-[15rem] glass-lime border" />
        </div>
      </div>
    </section>
  );
}
