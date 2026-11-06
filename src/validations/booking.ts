import { z } from "zod";

/** Normaliza un teléfono: quita espacios, guiones, paréntesis y puntos; conserva "+" inicial. */
export function normalizePhone(raw: string): string {
  return raw.replace(/[\s\-().]/g, "");
}

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .refine((v) => /^\+?[0-9]{8,15}$/.test(v), { message: "Ingresá un teléfono válido, con código de área." });

export const bookingInputSchema = z.object({
  courtId: z.string().uuid(),
  startAt: z.string().datetime({ offset: true }),
  name: z.string().trim().min(2, "Ingresá nombre y apellido.").max(100),
  phone: phoneSchema,
  mode: z.enum(["individual", "group"]),
  players: z.number().int().min(1).max(50),
  notes: z.string().trim().max(500).optional(),
  /** Campo trampa anti-bots: las personas no lo ven ni lo completan. */
  website: z.string().max(200).optional(),
});

export type BookingInput = z.infer<typeof bookingInputSchema>;
