import { OG_SIZE, ogImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Entrenamientos en DC Predio";

export default function Image() {
  return ogImage("Entrenamientos", "Niños, jóvenes y adultos · Entrená. Desarrollá. Evolucioná.");
}
