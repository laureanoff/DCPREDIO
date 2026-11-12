import { ImageResponse } from "next/og";
import { BRAND } from "@/config/brand";

export const OG_SIZE = { width: 1200, height: 630 };

/** Imagen que se ve al compartir el link (WhatsApp, Instagram, Facebook…). */
export function ogImage(title: string, subtitle: string) {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg,#0a0a0a 0%,#141a06 100%)", color: "#fff", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", width: 76, height: 76, borderRadius: 18, background: BRAND.colors.lime, color: "#000", fontSize: 40, fontWeight: 900, alignItems: "center", justifyContent: "center" }}>{BRAND.shortMark}</div>
          <div style={{ display: "flex", fontSize: 38, fontWeight: 800, letterSpacing: 6 }}>{BRAND.tagline}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 108, fontWeight: 900, lineHeight: 1, textTransform: "uppercase" }}>{title}</div>
          <div style={{ display: "flex", fontSize: 40, color: "#c9d0b8" }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", height: 14, width: "100%", background: BRAND.colors.lime, borderRadius: 7 }} />
      </div>
    ),
    OG_SIZE,
  );
}
