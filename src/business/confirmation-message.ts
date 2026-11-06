import { BRAND } from "@/config/brand";

export type ConfirmationData = {
  venueName?: string | null;
  customerName: string;
  code: string;
  dateLabel: string; // ej. "sábado 7 de noviembre de 2026"
  startTime: string;
  endTime: string;
  players: number;
};

/** Mensaje de confirmación prearmado con los datos reales de la reserva. */
export function confirmationMessage(d: ConfirmationData): string {
  const venue = d.venueName?.trim() || BRAND.name;
  return [
    `¡Hola ${d.customerName}! ✅ Tu reserva en ${venue} quedó confirmada.`,
    ``,
    `📅 Día: ${d.dateLabel}`,
    `🕐 Horario: ${d.startTime} a ${d.endTime} hs`,
    `⚽ Turno completo de la cancha de fútbol 5 (hasta ${d.players} jugadores)`,
    `🔖 Código de reserva: ${d.code}`,
    ``,
    `Guardá este código para cualquier consulta. ¡Te esperamos!`,
  ].join("\n");
}

export function whatsappLink(phone: string, text: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
