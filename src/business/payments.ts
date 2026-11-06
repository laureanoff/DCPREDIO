/**
 * Parte que le toca pagar a cada jugador del turno. Se calcula en centavos para que la suma
 * de todos los jugadores dé exactamente el total (el último jugador absorbe el resto).
 */
export function playerShare(total: number, players: number, slot: number): number {
  if (players < 1) return total;
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / players);
  const remainder = cents - base * players;
  return (slot === players ? base + remainder : base) / 100;
}
