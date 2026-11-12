export type Billing = "per_class" | "monthly" | "quarterly";

export const BILLING_ORDER: Billing[] = ["per_class", "monthly", "quarterly"];
export const BILLING_LABEL: Record<Billing, string> = { per_class: "Por clase", monthly: "Mensual", quarterly: "Trimestral" };
export const BILLING_SUFFIX: Record<Billing, string> = { per_class: "por clase", monthly: "por mes", quarterly: "por trimestre" };

/** 0 = lunes … 6 = domingo (el orden en que se muestran los días en la web). */
export const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export const ENROLLMENT_STATUS: Record<string, string> = { pending: "Pendiente", active: "Activo", paused: "En pausa", cancelled: "Baja" };

export function ageFrom(birth: string | null): number | null {
  if (!birth) return null;
  const b = new Date(`${birth}T00:00:00`);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a >= 0 ? a : null;
}

/** Íconos disponibles para «Lo que vas a lograr» (clave guardada → nombre que se muestra en el panel). */
export const BENEFIT_ICONS: Record<string, string> = {
  dumbbell: "Pesas", zap: "Rayo (agilidad)", heart: "Corazón", shield: "Escudo", medal: "Medalla", smile: "Carita", users: "Grupo", activity: "Pulso", target: "Objetivo", flame: "Llama", trophy: "Trofeo", timer: "Reloj",
};
