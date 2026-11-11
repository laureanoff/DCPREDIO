import { CutOut } from "./CutOut";
import { TrainingVideo } from "./TrainingVideo";

/** Capa que va DETRÁS del vidrio: video desenfocado + los tres chicos recortados. El padre tiene que ser ".tr-stage". */
export function TrainingCuts({ delay = 0 }: { delay?: number }) {
  return (
    <div className="tr-cuts" aria-hidden>
      <TrainingVideo variant="backdrop" />
      <CutOut src="/trainings/kid-barbell.webp" delay={delay + 0.9} from={50} className="k-bar" />
      <CutOut src="/trainings/kid-squat.webp" delay={delay + 0.5} from={-50} className="k-squat" />
      <CutOut src="/trainings/kids-ball.webp" delay={delay + 0.1} from={50} className="k-ball" />
    </div>
  );
}
