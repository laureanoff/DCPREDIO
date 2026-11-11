import { DecoSet } from "./Deco";

/** Fondo ambiental: luces, líneas de cancha y puntos suaves. Va dentro de un contenedor con la clase "ambient". */
export function Ambient() {
  return (
    <div className="ambient-bg" aria-hidden>
      <i className="amb-lines" />
      <i className="amb-dots" />
      <i className="amb-orb a" />
      <i className="amb-orb b" />
      <i className="amb-orb c" />
      <i className="amb-cone l" />
      <i className="amb-cone r" />
      <i className="amb-grain" />
      <DecoSet />
    </div>
  );
}
