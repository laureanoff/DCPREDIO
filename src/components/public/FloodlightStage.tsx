import { StageVideo } from "./StageVideo";

/** Sección "Reservar turno" sobre una cancha real que se ilumina con el scroll. */
export function FloodlightStage({ children }: { children: React.ReactNode }) {
  return (
    <section id="reservar" data-stage className="stage scroll-mt-20 px-5 py-28 sm:py-40">
      <div aria-hidden className="stage-bg">
        <StageVideo />
        <div className="stage-shade" />
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}
