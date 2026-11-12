import { OG_SIZE, ogImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "DC Predio — Reservá tu cancha de fútbol 5";

export default function Image() {
  return ogImage("Reservá tu cancha", "Fútbol 5 · Reservas online · Entrenamientos");
}
