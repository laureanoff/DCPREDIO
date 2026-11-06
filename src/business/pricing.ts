export type BookingMode = "individual" | "group";

/** Total a pagar. Es solo para mostrar: el servidor lo recalcula siempre desde la configuración. */
export function computeTotal(
  mode: BookingMode,
  players: number,
  prices: { priceIndividual: number; priceGroup: number },
): number {
  return mode === "group" ? prices.priceGroup : prices.priceIndividual * players;
}
