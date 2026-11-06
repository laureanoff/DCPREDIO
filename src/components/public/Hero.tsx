function PitchLines() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 600 400"
      className="pointer-events-none absolute -right-24 top-4 h-[120%] w-auto text-lime-ink opacity-[0.07] sm:right-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <rect x="20" y="20" width="560" height="360" rx="6" />
      <line x1="300" y1="20" x2="300" y2="380" />
      <circle cx="300" cy="200" r="62" />
      <circle cx="300" cy="200" r="4" fill="currentColor" />
      <rect x="20" y="115" width="95" height="170" />
      <rect x="485" y="115" width="95" height="170" />
      <rect x="20" y="160" width="38" height="80" />
      <rect x="542" y="160" width="38" height="80" />
    </svg>
  );
}

export function Hero({ venueName }: { venueName: string }) {
  return (
    <section className="relative overflow-hidden px-5 pb-16 pt-14 sm:pb-24 sm:pt-20">
      <PitchLines />
      <div className="relative mx-auto max-w-5xl">
        <p className="font-[family-name:var(--font-display)] text-sm font-semibold uppercase tracking-[0.35em] text-lime-ink">
          Fútbol 5 · {venueName}
        </p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-[4.25rem] font-extrabold uppercase leading-[0.88] sm:text-9xl">
          Reservá
          <br />
          tu <span className="text-lime-ink">cancha</span>
        </h1>
        <p className="mt-6 max-w-md text-lg text-muted">
          Elegí el día y el horario, confirmá tu turno online y pagá en el predio.
        </p>
        <a
          href="#reservar"
          className="mt-9 inline-flex h-14 items-center rounded-2xl bg-lime px-9 font-[family-name:var(--font-display)] text-xl font-bold uppercase tracking-wide text-black shadow-[0_0_40px_-8px] shadow-lime/60 transition hover:bg-lime-dark"
        >
          Reservar ahora
        </a>
      </div>
    </section>
  );
}
