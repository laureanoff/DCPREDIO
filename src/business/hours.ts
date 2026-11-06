const DAY_NAMES: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};
// Semana argentina: de lunes a domingo
const ORDER = [1, 2, 3, 4, 5, 6, 0];

type Hours = { weekday: number; isOpen: boolean; open: string; close: string };

/** Agrupa días consecutivos con el mismo horario: [{ days: "Lunes a domingo", time: "16:00 a 00:00" }]. */
export function summarizeHours(hours: Hours[]): { days: string; time: string }[] {
  const byDay = new Map(hours.map((h) => [h.weekday, h]));
  const sig = (d: number) => {
    const h = byDay.get(d);
    return !h || !h.isOpen ? "closed" : `${h.open} a ${h.close}`;
  };

  const groups: { days: number[]; time: string }[] = [];
  for (const d of ORDER) {
    const s = sig(d);
    const last = groups[groups.length - 1];
    if (last && last.time === (s === "closed" ? "Cerrado" : s)) last.days.push(d);
    else groups.push({ days: [d], time: s === "closed" ? "Cerrado" : s });
  }

  return groups.map((g) => ({
    days:
      g.days.length === 1
        ? DAY_NAMES[g.days[0]]
        : g.days.length === 7
          ? "Todos los días"
          : `${DAY_NAMES[g.days[0]]} a ${DAY_NAMES[g.days[g.days.length - 1]].toLowerCase()}`,
    time: g.time,
  }));
}
