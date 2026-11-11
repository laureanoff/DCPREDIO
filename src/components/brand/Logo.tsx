import { BRAND } from "@/config/brand";

type LogoProps = {
  /** "full" = logo apilado (DC arriba, PREDIO abajo); "horizontal" = DC | PREDIO en una línea. */
  variant?: "full" | "horizontal";
  className?: string;
};

const SRC = {
  full: { dark: "/brand/logo-stacked-ondark.png", light: "/brand/logo-stacked-onlight.png", w: 712, h: 670 },
  horizontal: { dark: "/brand/logo-horizontal-ondark.png", light: "/brand/logo-horizontal-onlight.png", w: 1488, h: 268 },
} as const;

/** Logo oficial: dos formatos y dos versiones de color; se muestra la que corresponde al tema activo. */
export function Logo({ variant = "full", className }: LogoProps) {
  const s = SRC[variant];
  return (
    <span className={`logo-wrap inline-flex ${className ?? ""}`}>
      {/* eslint-disable @next/next/no-img-element */}
      <img src={s.dark} alt={BRAND.name} width={s.w} height={s.h} className="logo-ondark h-full w-auto" />
      <img src={s.light} alt="" aria-hidden width={s.w} height={s.h} className="logo-onlight h-full w-auto" />
      {/* eslint-enable @next/next/no-img-element */}
    </span>
  );
}
