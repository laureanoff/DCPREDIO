import { DecoSet } from "./Deco";
import { TrainingVideo } from "./TrainingVideo";

/** Capa detrás del vidrio de la tarjeta de entrenamientos: video desenfocado fundido con el vidrio + ilustraciones de línea. El padre es ".tr-stage". */
export function TrainingCuts() {
  return (
    <>
      <TrainingVideo variant="backdrop" />
      <DecoSet variant="hero" />
    </>
  );
}
