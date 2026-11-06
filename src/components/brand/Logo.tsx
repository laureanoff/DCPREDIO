import { BRAND } from "@/config/brand";

type LogoProps = {
  /** "mark" = solo DC; "full" = DC + línea + PREDIO */
  variant?: "mark" | "full";
  className?: string;
  /** Si hay un logo cargado desde configuración, se usa esta URL. */
  customLogoUrl?: string | null;
};

export function Logo({ variant = "full", className, customLogoUrl }: LogoProps) {
  if (customLogoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={customLogoUrl} alt={BRAND.name} className={className} />;
  }

  if (variant === "mark") {
    return (
      <svg viewBox="95 95 225 160" className={className} role="img" aria-label={BRAND.name}>
        <path
          fill={BRAND.colors.white}
          fillRule="evenodd"
          d="M105 105H160A70 70 0 0 1 160 245H105Z M137 137V213H157A38 38 0 0 0 157 137Z"
        />
        <path
          fill={BRAND.colors.lime}
          stroke="currentColor"
          strokeWidth="7"
          paintOrder="stroke"
          strokeLinejoin="round"
          d="M310 105H255A70 70 0 0 0 255 245H310V205H262A30 30 0 0 1 262 145H310Z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="95 95 225 240" className={className} role="img" aria-label={BRAND.name}>
      <path
        fill={BRAND.colors.white}
        fillRule="evenodd"
        d="M105 105H160A70 70 0 0 1 160 245H105Z M137 137V213H157A38 38 0 0 0 157 137Z"
      />
      <path
        fill={BRAND.colors.lime}
        stroke="currentColor"
        strokeWidth="7"
        paintOrder="stroke"
        strokeLinejoin="round"
        d="M310 105H255A70 70 0 0 0 255 245H310V205H262A30 30 0 0 1 262 145H310Z"
      />
      <rect x="105" y="262" width="205" height="6" fill={BRAND.colors.white} />
      <text
        x="207.5"
        y="318"
        textAnchor="middle"
        fill={BRAND.colors.white}
        fontFamily="'Arial Black','Helvetica Neue',Arial,sans-serif"
        fontWeight={900}
        fontSize={52}
        letterSpacing={2}
        textLength={205}
        lengthAdjust="spacingAndGlyphs"
      >
        PREDIO
      </text>
    </svg>
  );
}
