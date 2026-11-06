/**
 * Identidad oficial del proyecto.
 * "DC Predio" es el nombre predeterminado. Solo puede sobrescribirse mediante
 * la configuración explícita `venue_settings.venue_name` (panel de administración).
 */
export const BRAND = {
  name: "DC Predio",
  shortMark: "DC",
  tagline: "PREDIO",
  description: "Reservá tu cancha de fútbol 5 online en DC Predio.",
  logoPath: "/brand/dc-predio-logo.svg",
  colors: {
    lime: "#B6D61A",
    black: "#0A0A0A",
    white: "#FFFFFF",
  },
} as const;

export const TIMEZONE = "America/Argentina/Cordoba";
export const CURRENCY = "ARS";
export const LOCALE = "es-AR";
